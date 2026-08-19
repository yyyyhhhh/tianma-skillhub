package com.iflytek.skillhub.service;

import com.iflytek.skillhub.domain.label.LabelDefinition;
import com.iflytek.skillhub.domain.label.LabelDefinitionService;
import com.iflytek.skillhub.dto.SkillLabelDto;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class PublicLabelAppService {

    private final LabelDefinitionService labelDefinitionService;
    private final LabelLocalizationService labelLocalizationService;

    public PublicLabelAppService(LabelDefinitionService labelDefinitionService,
                                 LabelLocalizationService labelLocalizationService) {
        this.labelDefinitionService = labelDefinitionService;
        this.labelLocalizationService = labelLocalizationService;
    }

    public List<SkillLabelDto> listVisibleFilters() {
        List<LabelDefinition> definitions = labelDefinitionService.listVisibleFilters();
        java.util.Map<Long, java.util.List<com.iflytek.skillhub.domain.label.LabelTranslation>> translationsByLabelId =
                labelDefinitionService.listTranslationsByLabelIds(definitions.stream().map(LabelDefinition::getId).toList());
        Map<Long, String> slugById = slugById(definitions);
        return definitions.stream()
                .map(labelDefinition -> toDto(labelDefinition, translationsByLabelId, slugById))
                .toList();
    }

    private SkillLabelDto toDto(LabelDefinition labelDefinition,
                                java.util.Map<Long, java.util.List<com.iflytek.skillhub.domain.label.LabelTranslation>> translationsByLabelId,
                                Map<Long, String> slugById) {
        String parentSlug = labelDefinition.getParentId() == null ? null : slugById.get(labelDefinition.getParentId());
        return new SkillLabelDto(
                labelDefinition.getSlug(),
                labelDefinition.getType().name(),
                labelLocalizationService.resolveDisplayName(
                        labelDefinition.getSlug(),
                        translationsByLabelId.getOrDefault(labelDefinition.getId(), List.of())),
                parentSlug
        );
    }

    private Map<Long, String> slugById(List<LabelDefinition> definitions) {
        Map<Long, String> slugById = new LinkedHashMap<>();
        for (LabelDefinition definition : definitions) {
            if (definition.getId() != null) {
                slugById.put(definition.getId(), definition.getSlug());
            }
        }
        List<Long> missingParentIds = definitions.stream()
                .map(LabelDefinition::getParentId)
                .filter(parentId -> parentId != null && !slugById.containsKey(parentId))
                .distinct()
                .toList();
        if (!missingParentIds.isEmpty()) {
            for (LabelDefinition parent : labelDefinitionService.listByIds(missingParentIds)) {
                slugById.put(parent.getId(), parent.getSlug());
            }
        }
        return slugById;
    }
}
