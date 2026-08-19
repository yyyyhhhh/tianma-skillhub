package com.iflytek.skillhub.compat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.iflytek.skillhub.auth.rbac.PlatformPrincipal;
import com.iflytek.skillhub.compat.dto.ClawHubJsonPublishRequest;
import com.iflytek.skillhub.compat.dto.ClawHubPublishResponse;
import com.iflytek.skillhub.compat.dto.ClawHubUploadUrlRequest;
import com.iflytek.skillhub.compat.dto.ClawHubUploadUrlResponse;
import com.iflytek.skillhub.controller.support.MultipartPackageExtractor;
import com.iflytek.skillhub.controller.support.ZipPackageExtractor;
import com.iflytek.skillhub.domain.audit.AuditLogService;
import com.iflytek.skillhub.domain.namespace.Namespace;
import com.iflytek.skillhub.domain.shared.exception.DomainBadRequestException;
import com.iflytek.skillhub.domain.shared.exception.DomainNotFoundException;
import com.iflytek.skillhub.domain.skill.Skill;
import com.iflytek.skillhub.domain.skill.SkillVersion;
import com.iflytek.skillhub.domain.skill.SkillVersionStatus;
import com.iflytek.skillhub.domain.skill.SkillVisibility;
import com.iflytek.skillhub.domain.skill.service.PublishMetadata;
import com.iflytek.skillhub.domain.skill.service.SkillPublishService;
import com.iflytek.skillhub.domain.skill.service.SkillQueryService;
import com.iflytek.skillhub.domain.social.SkillStarService;
import com.iflytek.skillhub.observability.RequestIdAccessor;
import com.iflytek.skillhub.service.PublishBusinessLabelService;
import com.iflytek.skillhub.service.SkillSearchAppService;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

class ClawHubCompatAppServiceTest {

    private final SkillSearchAppService skillSearchAppService = mock(SkillSearchAppService.class);
    private final SkillQueryService skillQueryService = mock(SkillQueryService.class);
    private final SkillPublishService skillPublishService = mock(SkillPublishService.class);
    private final ZipPackageExtractor zipPackageExtractor = mock(ZipPackageExtractor.class);
    private final MultipartPackageExtractor multipartPackageExtractor = mock(MultipartPackageExtractor.class);
    private final AuditLogService auditLogService = mock(AuditLogService.class);
    private final CompatSkillLookupService compatSkillLookupService = mock(CompatSkillLookupService.class);
    private final SkillStarService skillStarService = mock(SkillStarService.class);
    private final ClawHubUploadSessionService uploadSessionService = mock(ClawHubUploadSessionService.class);
    private final PublishBusinessLabelService publishBusinessLabelService = mock(PublishBusinessLabelService.class);

    private final ClawHubCompatAppService service = new ClawHubCompatAppService(
            new CanonicalSlugMapper(),
            skillSearchAppService,
            skillQueryService,
            skillPublishService,
            zipPackageExtractor,
            multipartPackageExtractor,
            auditLogService,
            compatSkillLookupService,
            skillStarService,
            new RequestIdAccessor(),
            uploadSessionService,
            publishBusinessLabelService,
            "https://skillhub.example"
    );

    @Test
    void downloadLocationByQuery_throwsNotFound_whenLegacySkillIsPrivateForAnonymousCaller() {
        Namespace namespace = new Namespace("team-a", "Team A", "owner-1");
        Skill privateSkill = new Skill(1L, "priv", "owner-1", SkillVisibility.PRIVATE);
        CompatSkillLookupService.CompatSkillContext context = new CompatSkillLookupService.CompatSkillContext(
                namespace,
                privateSkill,
                Optional.empty()
        );

        when(compatSkillLookupService.findByLegacySlug("priv")).thenReturn(context);
        when(compatSkillLookupService.canAccess(privateSkill, null, Map.of())).thenReturn(false);

        assertThatThrownBy(() -> service.downloadLocationByQuery("priv", "latest", null, null))
                .isInstanceOf(DomainNotFoundException.class);
    }

    @Test
    void downloadLocationByQuery_returnsCanonicalPath_whenLegacySkillIsVisible() {
        Namespace namespace = new Namespace("team-a", "Team A", "owner-1");
        Skill publicSkill = new Skill(1L, "my-skill", "owner-1", SkillVisibility.PUBLIC);
        CompatSkillLookupService.CompatSkillContext context = new CompatSkillLookupService.CompatSkillContext(
                namespace,
                publicSkill,
                Optional.empty()
        );

        when(compatSkillLookupService.findByLegacySlug("my-skill")).thenReturn(context);
        when(compatSkillLookupService.canAccess(publicSkill, null, Map.of())).thenReturn(true);

        String location = service.downloadLocationByQuery("my-skill", "latest", null, null);

        assertThat(location).isEqualTo("/api/v1/skills/team-a/my-skill/download");
    }

    @Test
    void downloadLocationByQuery_percentEncodesNonAsciiSlug() {
        Namespace namespace = new Namespace("global", "Global", "owner-1");
        Skill cjkSkill = new Skill(1L, "需求", "owner-1", SkillVisibility.PUBLIC);
        CompatSkillLookupService.CompatSkillContext context = new CompatSkillLookupService.CompatSkillContext(
                namespace,
                cjkSkill,
                Optional.empty()
        );

        when(compatSkillLookupService.findByLegacySlug("需求")).thenReturn(context);
        when(compatSkillLookupService.canAccess(cjkSkill, null, Map.of())).thenReturn(true);

        String location = service.downloadLocationByQuery("需求", "20260707.025847", null, null);

        assertThat(location)
                .isEqualTo("/api/v1/skills/global/%E9%9C%80%E6%B1%82/versions/20260707.025847/download");
        assertThat(java.nio.charset.StandardCharsets.ISO_8859_1.newEncoder().canEncode(location)).isTrue();
    }

    @Test
    void downloadLocationByQuery_includesVersionSegmentForAsciiSlug() {
        Namespace namespace = new Namespace("team-a", "Team A", "owner-1");
        Skill publicSkill = new Skill(1L, "my-skill", "owner-1", SkillVisibility.PUBLIC);
        CompatSkillLookupService.CompatSkillContext context = new CompatSkillLookupService.CompatSkillContext(
                namespace,
                publicSkill,
                Optional.empty()
        );

        when(compatSkillLookupService.findByLegacySlug("my-skill")).thenReturn(context);
        when(compatSkillLookupService.canAccess(publicSkill, null, Map.of())).thenReturn(true);

        String location = service.downloadLocationByQuery("my-skill", "20260707.025847", null, null);

        assertThat(location).isEqualTo("/api/v1/skills/team-a/my-skill/versions/20260707.025847/download");
    }

    @Test
    void createUploadUrl_buildsPublicAbsoluteUploadLink() {
        when(uploadSessionService.createTicket(eq("user-42"), eq("SKILL.md"), eq(12L), eq("abc"), isNull()))
                .thenReturn(new ClawHubUploadSessionService.TicketSession(
                        "ticket-1",
                        new ClawHubUploadSessionService.TicketMeta("user-42", "SKILL.md", 12L, "abc", null, null)
                ));

        ClawHubUploadUrlResponse response = service.createUploadUrl(
                new ClawHubUploadUrlRequest("SKILL.md", 12L, "abc", null),
                principal()
        );

        assertThat(response.uploadTicket()).isEqualTo("ticket-1");
        assertThat(response.uploadUrl()).isEqualTo("https://skillhub.example/api/v1/skills/-/upload/ticket-1");
    }

    @Test
    void publishJson_passesSlugVersionChangelogAndCleansUp() {
        byte[] content = """
                ---
                name: other-name
                description: demo
                version: 0.0.1
                ---
                """.getBytes(StandardCharsets.UTF_8);
        when(uploadSessionService.loadForPublish(eq("storage-1"), eq("user-42"), eq("SKILL.md"), eq("sha-1")))
                .thenReturn(new ClawHubUploadSessionService.LoadedFile("SKILL.md", content, "sha-1"));

        SkillVersion version = new SkillVersion(12L, "2.0.0", "user-42");
        version.setStatus(SkillVersionStatus.PENDING_REVIEW);
        ReflectionTestUtils.setField(version, "id", 99L);
        when(skillPublishService.publishFromEntries(
                eq("global"),
                anyList(),
                eq("user-42"),
                eq(SkillVisibility.PUBLIC),
                anySet(),
                anyBoolean(),
                any(PublishMetadata.class)))
                .thenReturn(new SkillPublishService.PublishResult(12L, "my-skill", version));

        ClawHubJsonPublishRequest request = new ClawHubJsonPublishRequest(
                "my-skill",
                "Display",
                null,
                null,
                null,
                "2.0.0",
                "fixed bug",
                true,
                true,
                null,
                null,
                null,
                null,
                null,
                List.of(new ClawHubJsonPublishRequest.UploadedFile(
                        "SKILL.md", (long) content.length, "storage-1", "sha-1", "text/markdown", null
                ))
        );

        ClawHubPublishResponse response = service.publishJson(request, null, principal(), "127.0.0.1", "test");

        assertThat(response.ok()).isTrue();
        assertThat(response.skillId()).isEqualTo("12");

        ArgumentCaptor<PublishMetadata> metaCaptor = ArgumentCaptor.forClass(PublishMetadata.class);
        verify(skillPublishService).publishFromEntries(
                eq("global"),
                anyList(),
                eq("user-42"),
                eq(SkillVisibility.PUBLIC),
                anySet(),
                eq(true),
                metaCaptor.capture()
        );
        assertThat(metaCaptor.getValue().slug()).isEqualTo("my-skill");
        assertThat(metaCaptor.getValue().version()).isEqualTo("2.0.0");
        assertThat(metaCaptor.getValue().changelog()).isEqualTo("fixed bug");
        verify(uploadSessionService).cleanup("storage-1");
    }

    @Test
    void publishJson_cleansUpEvenWhenPublishFails() {
        byte[] content = "x".getBytes(StandardCharsets.UTF_8);
        when(uploadSessionService.loadForPublish(anyString(), anyString(), anyString(), any()))
                .thenReturn(new ClawHubUploadSessionService.LoadedFile("SKILL.md", content, "sha"));
        when(skillPublishService.publishFromEntries(
                anyString(), anyList(), anyString(), any(), anySet(), anyBoolean(), any()))
                .thenThrow(new DomainBadRequestException("error.skill.publish.package.invalid", "boom"));

        ClawHubJsonPublishRequest request = new ClawHubJsonPublishRequest(
                "my-skill", null, null, null, null, "1.0.0", null, true, false, null, null, null, null, null,
                List.of(new ClawHubJsonPublishRequest.UploadedFile(
                        "SKILL.md", 1L, "storage-x", "sha", "text/plain", null
                ))
        );

        assertThatThrownBy(() -> service.publishJson(request, null, principal(), "127.0.0.1", "test"))
                .isInstanceOf(DomainBadRequestException.class);
        verify(uploadSessionService).cleanup("storage-x");
    }

    private static PlatformPrincipal principal() {
        return new PlatformPrincipal(
                "user-42",
                "tester",
                "tester@example.com",
                null,
                "github",
                Set.of("SUPER_ADMIN")
        );
    }
}
