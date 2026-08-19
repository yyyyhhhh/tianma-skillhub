package com.iflytek.skillhub.compat;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflytek.skillhub.domain.shared.exception.DomainBadRequestException;
import com.iflytek.skillhub.domain.shared.exception.DomainForbiddenException;
import com.iflytek.skillhub.domain.skill.validation.SkillPackagePolicy;
import com.iflytek.skillhub.storage.ObjectStorageService;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Temporary upload tickets for ClawHub CLI's two-step publish flow
 * ({@code /skills/-/upload-url} then raw binary POST).
 */
@Service
public class ClawHubUploadSessionService {

    private static final Duration TICKET_TTL = Duration.ofHours(1);
    private static final String META_KEY_PREFIX = "clawhub:upload:ticket:";
    private static final String STORAGE_META_KEY_PREFIX = "clawhub:upload:storage:";
    private static final String STORAGE_KEY_PREFIX = "clawhub-tmp/";

    private final StringRedisTemplate redisTemplate;
    private final ObjectStorageService objectStorageService;
    private final ObjectMapper objectMapper;

    public ClawHubUploadSessionService(StringRedisTemplate redisTemplate,
                                       ObjectStorageService objectStorageService,
                                       ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectStorageService = objectStorageService;
        this.objectMapper = objectMapper;
    }

    public TicketSession createTicket(String userId, String path, Long size, String sha256, String contentType) {
        if (userId == null || userId.isBlank()) {
            throw new DomainForbiddenException("error.auth.required");
        }
        if (path == null || path.isBlank()) {
            throw new DomainBadRequestException("error.skill.publish.package.invalid", "path is required");
        }
        if (size == null || size <= 0) {
            throw new DomainBadRequestException("error.skill.publish.package.invalid", "size must be > 0");
        }
        if (size > SkillPackagePolicy.MAX_SINGLE_FILE_SIZE) {
            throw new DomainBadRequestException(
                    "error.skill.publish.package.invalid",
                    "size exceeds max single file size of " + SkillPackagePolicy.MAX_SINGLE_FILE_SIZE + " bytes");
        }
        String normalizedSha = StringUtils.hasText(sha256) ? normalizeSha256(sha256) : null;

        String ticket = UUID.randomUUID().toString().replace("-", "");
        TicketMeta meta = new TicketMeta(userId, path, size, normalizedSha, contentType, null);
        persistTicketMeta(ticket, meta);
        return new TicketSession(ticket, meta);
    }

    public String storeUpload(String ticket, String userId, byte[] bytes, String contentType) {
        TicketMeta meta = requireTicket(ticket);
        if (!meta.userId().equals(userId)) {
            throw new DomainForbiddenException("error.auth.required");
        }
        if (meta.storageId() != null && !meta.storageId().isBlank()) {
            return meta.storageId();
        }
        byte[] payload = bytes == null ? new byte[0] : bytes;
        if (payload.length == 0) {
            throw new DomainBadRequestException("error.skill.publish.package.invalid", "Uploaded body is empty");
        }
        if (payload.length > SkillPackagePolicy.MAX_SINGLE_FILE_SIZE) {
            throw new DomainBadRequestException(
                    "error.skill.publish.package.invalid",
                    "Uploaded size exceeds max single file size of " + SkillPackagePolicy.MAX_SINGLE_FILE_SIZE + " bytes");
        }
        if (payload.length != meta.size()) {
            throw new DomainBadRequestException(
                    "error.skill.publish.package.invalid",
                    "Uploaded size mismatch: expected " + meta.size() + " got " + payload.length);
        }
        String actualSha = sha256Hex(payload);
        if (StringUtils.hasText(meta.sha256()) && !actualSha.equalsIgnoreCase(meta.sha256())) {
            throw new DomainBadRequestException(
                    "error.skill.publish.package.invalid",
                    "Uploaded sha256 mismatch");
        }

        String storageId = UUID.randomUUID().toString().replace("-", "");
        String resolvedType = contentType != null && !contentType.isBlank()
                ? contentType
                : (meta.contentType() != null ? meta.contentType() : "application/octet-stream");
        objectStorageService.putObject(
                STORAGE_KEY_PREFIX + storageId,
                new ByteArrayInputStream(payload),
                payload.length,
                resolvedType
        );
        TicketMeta updated = new TicketMeta(
                meta.userId(),
                meta.path(),
                meta.size(),
                StringUtils.hasText(meta.sha256()) ? meta.sha256() : actualSha,
                resolvedType,
                storageId
        );
        persistTicketMeta(ticket, updated);
        persistStorageMeta(storageId, updated);
        return storageId;
    }

    public LoadedFile loadForPublish(String storageIdOrTicket, String userId, String expectedPath, String expectedSha256) {
        TicketMeta meta = resolveOwnedMeta(storageIdOrTicket, userId);
        if (!StringUtils.hasText(meta.storageId())) {
            throw new DomainBadRequestException("error.skill.publish.package.invalid",
                    "Upload not completed for ticket: " + storageIdOrTicket);
        }
        String resolvedStorageId = meta.storageId();
        String path = StringUtils.hasText(expectedPath) ? expectedPath : meta.path();
        String objectKey = STORAGE_KEY_PREFIX + resolvedStorageId;
        if (!objectStorageService.exists(objectKey)) {
            throw new DomainBadRequestException("error.skill.publish.package.invalid",
                    "Unknown upload storageId: " + storageIdOrTicket);
        }
        try (InputStream in = objectStorageService.getObject(objectKey)) {
            byte[] content = in.readAllBytes();
            if (content.length > SkillPackagePolicy.MAX_SINGLE_FILE_SIZE) {
                throw new DomainBadRequestException(
                        "error.skill.publish.package.invalid",
                        "Stored upload exceeds max single file size");
            }
            String actualSha = sha256Hex(content);
            if (StringUtils.hasText(meta.sha256()) && !actualSha.equalsIgnoreCase(meta.sha256())) {
                throw new DomainBadRequestException(
                        "error.skill.publish.package.invalid",
                        "Stored upload sha256 mismatch");
            }
            if (StringUtils.hasText(expectedSha256) && !actualSha.equalsIgnoreCase(normalizeSha256(expectedSha256))) {
                throw new DomainBadRequestException(
                        "error.skill.publish.package.invalid",
                        "Publish sha256 mismatch for path: " + path);
            }
            return new LoadedFile(path, content, actualSha);
        } catch (IOException e) {
            throw new DomainBadRequestException("error.skill.publish.package.invalid",
                    "Failed to read uploaded file: " + e.getMessage());
        }
    }

    public void cleanup(String storageIdOrTicket) {
        TicketMeta ticketMeta = findTicketMeta(storageIdOrTicket);
        TicketMeta storageMeta = findStorageMeta(storageIdOrTicket);
        TicketMeta meta = ticketMeta != null ? ticketMeta : storageMeta;

        String storageId = null;
        if (meta != null && StringUtils.hasText(meta.storageId())) {
            storageId = meta.storageId();
        } else if (storageMeta != null) {
            storageId = storageIdOrTicket;
        } else if (ticketMeta == null) {
            storageId = storageIdOrTicket;
        }

        if (ticketMeta != null) {
            redisTemplate.delete(META_KEY_PREFIX + storageIdOrTicket);
        }
        if (storageId != null && !storageId.isBlank()) {
            redisTemplate.delete(STORAGE_META_KEY_PREFIX + storageId);
            try {
                objectStorageService.deleteObject(STORAGE_KEY_PREFIX + storageId);
            } catch (Exception ignored) {
                // best-effort cleanup
            }
        }
    }

    private TicketMeta resolveOwnedMeta(String storageIdOrTicket, String userId) {
        if (!StringUtils.hasText(storageIdOrTicket)) {
            throw new DomainBadRequestException("error.skill.publish.package.invalid", "storageId is required");
        }
        TicketMeta byTicket = findTicketMeta(storageIdOrTicket);
        if (byTicket != null) {
            assertOwner(byTicket, userId);
            return byTicket;
        }
        TicketMeta byStorage = findStorageMeta(storageIdOrTicket);
        if (byStorage != null) {
            assertOwner(byStorage, userId);
            return byStorage;
        }
        throw new DomainBadRequestException(
                "error.skill.publish.package.invalid",
                "Unknown or expired upload storageId: " + storageIdOrTicket);
    }

    private static void assertOwner(TicketMeta meta, String userId) {
        if (meta == null || userId == null || !meta.userId().equals(userId)) {
            throw new DomainForbiddenException("error.auth.required");
        }
    }

    private void persistTicketMeta(String ticket, TicketMeta meta) {
        persistMeta(META_KEY_PREFIX + ticket, meta);
    }

    private void persistStorageMeta(String storageId, TicketMeta meta) {
        persistMeta(STORAGE_META_KEY_PREFIX + storageId, meta);
    }

    private void persistMeta(String key, TicketMeta meta) {
        try {
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(meta), TICKET_TTL);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize upload ticket", e);
        }
    }

    private TicketMeta requireTicket(String ticket) {
        TicketMeta meta = findTicketMeta(ticket);
        if (meta == null) {
            throw new DomainBadRequestException("error.skill.publish.package.invalid",
                    "Unknown or expired upload ticket");
        }
        return meta;
    }

    private TicketMeta findTicketMeta(String ticket) {
        return readMeta(META_KEY_PREFIX, ticket);
    }

    private TicketMeta findStorageMeta(String storageId) {
        return readMeta(STORAGE_META_KEY_PREFIX, storageId);
    }

    private TicketMeta readMeta(String prefix, String id) {
        if (id == null || id.isBlank()) {
            return null;
        }
        String raw = redisTemplate.opsForValue().get(prefix + id);
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(raw, TicketMeta.class);
        } catch (IOException e) {
            return null;
        }
    }

    static String sha256Hex(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private static String normalizeSha256(String sha256) {
        String normalized = sha256.trim().toLowerCase(Locale.ROOT);
        if (normalized.startsWith("sha256:")) {
            normalized = normalized.substring("sha256:".length());
        }
        if (!normalized.matches("^[a-f0-9]{64}$")) {
            throw new DomainBadRequestException("error.skill.publish.package.invalid", "sha256 must be 64 hex chars");
        }
        return normalized;
    }

    public record TicketSession(String ticket, TicketMeta meta) {}

    public record TicketMeta(
            String userId,
            String path,
            long size,
            String sha256,
            String contentType,
            String storageId
    ) {}

    public record LoadedFile(String path, byte[] content, String sha256) {}
}
