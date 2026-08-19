package com.iflytek.skillhub.domain.skill.service;

import com.iflytek.skillhub.domain.skill.PackageType;

/**
 * Optional form overrides applied during publish.
 */
public record PublishMetadata(
        PackageType packageType,
        String department,
        String displayName,
        String summary,
        String businessScope,
        String slug,
        String version,
        String changelog,
        String businessSubTags
) {
    public static PublishMetadata empty() {
        return new PublishMetadata(PackageType.SKILL, null, null, null, null, null, null, null, null);
    }

    public PublishMetadata withDefaults() {
        return new PublishMetadata(
                PackageType.SKILL,
                blankToNull(department),
                blankToNull(displayName),
                blankToNull(summary),
                blankToNull(businessScope),
                blankToNull(slug),
                blankToNull(version),
                blankToNull(changelog),
                blankToNull(businessSubTags)
        );
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
