package com.iflytek.skillhub.dto;

import com.iflytek.skillhub.domain.label.LabelType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record AdminLabelUpdateRequest(
        @NotNull LabelType type,
        boolean visibleInFilter,
        int sortOrder,
        @Size(max = 64) String parentSlug,
        @Valid @NotEmpty List<LabelTranslationItemRequest> translations
) {}
