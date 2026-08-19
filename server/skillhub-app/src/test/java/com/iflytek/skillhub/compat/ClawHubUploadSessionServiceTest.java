package com.iflytek.skillhub.compat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflytek.skillhub.domain.shared.exception.DomainBadRequestException;
import com.iflytek.skillhub.domain.shared.exception.DomainForbiddenException;
import com.iflytek.skillhub.storage.ObjectStorageService;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

class ClawHubUploadSessionServiceTest {

    private final ConcurrentHashMap<String, String> redis = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, byte[]> objects = new ConcurrentHashMap<>();

    private StringRedisTemplate redisTemplate;
    private ObjectStorageService objectStorageService;
    private ClawHubUploadSessionService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        redis.clear();
        objects.clear();
        redisTemplate = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(anyString())).thenAnswer(invocation -> redis.get(invocation.getArgument(0)));
        doNothing().when(valueOps).set(anyString(), anyString(), any(Duration.class));
        org.mockito.Mockito.doAnswer(invocation -> {
            redis.put(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(valueOps).set(anyString(), anyString(), any(Duration.class));
        when(redisTemplate.delete(anyString())).thenAnswer(invocation -> {
            redis.remove(invocation.getArgument(0));
            return true;
        });

        objectStorageService = mock(ObjectStorageService.class);
        when(objectStorageService.exists(anyString())).thenAnswer(invocation ->
                objects.containsKey(invocation.getArgument(0)));
        when(objectStorageService.getObject(anyString())).thenAnswer(invocation ->
                new ByteArrayInputStream(objects.get(invocation.getArgument(0))));
        org.mockito.Mockito.doAnswer(invocation -> {
            String key = invocation.getArgument(0);
            InputStream in = invocation.getArgument(1);
            objects.put(key, in.readAllBytes());
            return null;
        }).when(objectStorageService).putObject(anyString(), any(InputStream.class), anyLong(), anyString());
        doNothing().when(objectStorageService).deleteObject(anyString());

        service = new ClawHubUploadSessionService(redisTemplate, objectStorageService, new ObjectMapper());
    }

    @Test
    void createTicket_rejectsMissingOrZeroSize() {
        assertThatThrownBy(() -> service.createTicket("u1", "SKILL.md", null, null, "text/plain"))
                .isInstanceOf(DomainBadRequestException.class);
        assertThatThrownBy(() -> service.createTicket("u1", "SKILL.md", 0L, null, "text/plain"))
                .isInstanceOf(DomainBadRequestException.class);
    }

    @Test
    void storeAndLoad_byStorageId_enforcesOwnerAndSha256() {
        byte[] body = "hello".getBytes(StandardCharsets.UTF_8);
        String sha = ClawHubUploadSessionService.sha256Hex(body);
        ClawHubUploadSessionService.TicketSession ticket =
                service.createTicket("owner", "SKILL.md", (long) body.length, sha, "text/plain");

        String storageId = service.storeUpload(ticket.ticket(), "owner", body, "text/plain");
        ClawHubUploadSessionService.LoadedFile loaded =
                service.loadForPublish(storageId, "owner", "SKILL.md", sha);

        assertThat(loaded.path()).isEqualTo("SKILL.md");
        assertThat(loaded.content()).isEqualTo(body);
        assertThat(loaded.sha256()).isEqualTo(sha);

        assertThatThrownBy(() -> service.loadForPublish(storageId, "other", "SKILL.md", sha))
                .isInstanceOf(DomainForbiddenException.class);
    }

    @Test
    void storeUpload_rejectsSizeMismatch() {
        ClawHubUploadSessionService.TicketSession ticket =
                service.createTicket("owner", "a.txt", 4L, null, "text/plain");
        assertThatThrownBy(() -> service.storeUpload(ticket.ticket(), "owner", "abc".getBytes(StandardCharsets.UTF_8), null))
                .isInstanceOf(DomainBadRequestException.class);
    }

    @Test
    void loadForPublish_rejectsUnknownStorageIdWithoutMeta() {
        assertThatThrownBy(() -> service.loadForPublish("missing", "owner", "SKILL.md", null))
                .isInstanceOf(DomainBadRequestException.class);
    }

    @Test
    void cleanup_removesObject() {
        byte[] body = "cleanup".getBytes(StandardCharsets.UTF_8);
        ClawHubUploadSessionService.TicketSession ticket =
                service.createTicket("owner", "a.txt", (long) body.length, null, "text/plain");
        String storageId = service.storeUpload(ticket.ticket(), "owner", body, "text/plain");

        service.cleanup(storageId);

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(objectStorageService).deleteObject(keyCaptor.capture());
        assertThat(keyCaptor.getValue()).isEqualTo("clawhub-tmp/" + storageId);
        assertThatThrownBy(() -> service.loadForPublish(storageId, "owner", "a.txt", null))
                .isInstanceOf(DomainBadRequestException.class);
    }
}
