package com.iflytek.skillhub.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

public record SkillLabelDto(
        String slug,
        String type,
        String displayName,
        @JsonInclude(JsonInclude.Include.ALWAYS) String parentSlug
) {
    public SkillLabelDto(String slug, String type, String displayName) {
        this(slug, type, displayName, null);
    }
}
