package com.iflytek.skillhub.domain.skill;

/**
 * Registry package kind. Only {@code SKILL} is supported; legacy ACP values
 * ({@code APP}/{@code MCP}/{@code SPEC}/{@code KNOWLEDGE}/{@code AGENT}) coerce to {@code SKILL}.
 */
public enum PackageType {
    SKILL;

    public static PackageType fromNullable(String raw) {
        return SKILL;
    }

    /**
     * Parses a package type token. Blank input returns {@code null};
     * any other value (including legacy ACP types) is treated as {@code SKILL}.
     */
    public static PackageType parseStrict(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return SKILL;
    }

    public static PackageType parseOrNull(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return SKILL;
    }
}
