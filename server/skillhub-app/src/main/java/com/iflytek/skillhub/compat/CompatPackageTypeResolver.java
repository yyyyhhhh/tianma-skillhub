package com.iflytek.skillhub.compat;

import com.iflytek.skillhub.domain.skill.PackageType;
import com.iflytek.skillhub.domain.skill.service.PublishMetadata;
import com.iflytek.skillhub.domain.skill.validation.PackageEntry;
import com.iflytek.skillhub.domain.skill.validation.SkillPackagePolicy;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.yaml.snakeyaml.Yaml;

/**
 * Resolves publish metadata for ClawHub flows.
 *
 * <p>Package type is always {@code SKILL}. Department / businessScope / summary
 * are read from SKILL.md frontmatter when present.
 */
public final class CompatPackageTypeResolver {

    private static final String FRONTMATTER_DELIMITER = "---";

    private CompatPackageTypeResolver() {
    }

    public static PackageType resolve(String explicitPackageType,
                                      Collection<String> tags,
                                      Collection<String> categories,
                                      List<PackageEntry> entries) {
        return PackageType.SKILL;
    }

    public static PublishMetadata resolveMetadata(String explicitPackageType,
                                                  String displayName,
                                                  Collection<String> tags,
                                                  Collection<String> categories,
                                                  List<PackageEntry> entries) {
        Map<String, Object> frontmatter = readFrontmatter(entries);
        String businessScope = firstString(frontmatter, "businessScope", "business_scope");
        String department = firstString(frontmatter, "department");
        String summary = firstString(frontmatter, "summary");

        return new PublishMetadata(
                PackageType.SKILL,
                department,
                displayName,
                summary,
                businessScope,
                null,
                null,
                null,
                null
        ).withDefaults();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> readFrontmatter(List<PackageEntry> entries) {
        if (entries == null || entries.isEmpty()) {
            return Map.of();
        }
        PackageEntry skillMd = entries.stream()
                .filter(entry -> SkillPackagePolicy.SKILL_MD_PATH.equals(entry.path()))
                .findFirst()
                .orElse(null);
        if (skillMd == null || skillMd.content() == null || skillMd.content().length == 0) {
            return Map.of();
        }

        try {
            String content = new String(skillMd.content(), StandardCharsets.UTF_8).trim();
            if (!content.startsWith(FRONTMATTER_DELIMITER)) {
                return Map.of();
            }
            int firstNewline = content.indexOf('\n', FRONTMATTER_DELIMITER.length());
            if (firstNewline < 0) {
                return Map.of();
            }
            int secondDelimiter = content.indexOf(FRONTMATTER_DELIMITER, firstNewline + 1);
            if (secondDelimiter < 0) {
                return Map.of();
            }
            String yamlContent = content.substring(firstNewline + 1, secondDelimiter).trim();
            Object loaded = new Yaml().load(yamlContent);
            if (!(loaded instanceof Map<?, ?> map)) {
                return Map.of();
            }
            return (Map<String, Object>) map;
        } catch (RuntimeException ignored) {
            return Map.of();
        }
    }

    private static String firstString(Map<String, Object> frontmatter, String... keys) {
        if (frontmatter == null || frontmatter.isEmpty()) {
            return null;
        }
        for (String key : keys) {
            Object value = frontmatter.get(key);
            if (value == null) {
                continue;
            }
            String text = value.toString();
            if (!text.isBlank()) {
                return text.trim();
            }
        }
        Object nested = frontmatter.get("metadata");
        if (nested instanceof Map<?, ?> nestedMap) {
            for (String key : keys) {
                Object value = nestedMap.get(key);
                if (value == null) {
                    continue;
                }
                String text = value.toString();
                if (!text.isBlank()) {
                    return text.trim();
                }
            }
        }
        return null;
    }
}
