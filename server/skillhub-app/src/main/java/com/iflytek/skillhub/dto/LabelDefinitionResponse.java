package com.iflytek.skillhub.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;

public record LabelDefinitionResponse(
        String slug,
        String type,
        boolean visibleInFilter,
        int sortOrder,
        List<LabelTranslationResponse> translations,
        Instant createdAt,
        @JsonInclude(JsonInclude.Include.ALWAYS) String parentSlug
) {}
