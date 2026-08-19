package com.iflytek.skillhub.compat;

import static org.assertj.core.api.Assertions.assertThat;

import com.iflytek.skillhub.domain.skill.PackageType;
import com.iflytek.skillhub.domain.skill.validation.PackageEntry;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;

class CompatPackageTypeResolverTest {

    @Test
    void resolve_alwaysReturnsSkillEvenWhenLegacyTypeIsPassed() {
        PackageType type = CompatPackageTypeResolver.resolve(
                "MCP",
                List.of("APP"),
                List.of("SPEC"),
                List.of(skillMd("APP"))
        );
        assertThat(type).isEqualTo(PackageType.SKILL);
    }

    @Test
    void resolve_ignoresCategoriesAndTags() {
        PackageType type = CompatPackageTypeResolver.resolve(
                null,
                List.of("latest", "packageType:KNOWLEDGE"),
                List.of("APP"),
                List.of(skillMd("SPEC"))
        );
        assertThat(type).isEqualTo(PackageType.SKILL);
    }

    @Test
    void resolveMetadata_readsDepartmentBusinessScopeAndSummary() {
        var metadata = CompatPackageTypeResolver.resolveMetadata(
                "KNOWLEDGE",
                "KB Name",
                List.of("KNOWLEDGE"),
                null,
                List.of(skillMdWithMeta())
        );
        assertThat(metadata.packageType()).isEqualTo(PackageType.SKILL);
        assertThat(metadata.displayName()).isEqualTo("KB Name");
        assertThat(metadata.department()).isEqualTo("后端开发");
        assertThat(metadata.businessScope()).isEqualTo("智码");
        assertThat(metadata.summary()).isEqualTo("from frontmatter");
    }

    @Test
    void resolve_coercesAgentAliasToSkill() {
        assertThat(CompatPackageTypeResolver.resolve("AGENT", null, null, null))
                .isEqualTo(PackageType.SKILL);
    }

    @Test
    void resolve_defaultsToSkill() {
        assertThat(CompatPackageTypeResolver.resolve(null, List.of("latest"), null, List.of(skillMd(null))))
                .isEqualTo(PackageType.SKILL);
    }

    @Test
    void resolve_coercesUnknownExplicitTypeToSkill() {
        assertThat(CompatPackageTypeResolver.resolve("NOT_A_TYPE", null, null, null))
                .isEqualTo(PackageType.SKILL);
    }

    private static PackageEntry skillMd(String packageType) {
        String frontmatter = packageType == null
                ? """
                ---
                name: demo
                description: demo skill
                ---

                # Demo
                """
                : """
                ---
                name: demo
                description: demo skill
                packageType: %s
                ---

                # Demo
                """.formatted(packageType);
        byte[] bytes = frontmatter.getBytes(StandardCharsets.UTF_8);
        return new PackageEntry("SKILL.md", bytes, bytes.length, "text/markdown");
    }

    private static PackageEntry skillMdWithMeta() {
        String frontmatter = """
                ---
                name: demo
                description: demo skill
                summary: from frontmatter
                department: 后端开发
                businessScope: 智码
                ---

                # Demo
                """;
        byte[] bytes = frontmatter.getBytes(StandardCharsets.UTF_8);
        return new PackageEntry("SKILL.md", bytes, bytes.length, "text/markdown");
    }
}
