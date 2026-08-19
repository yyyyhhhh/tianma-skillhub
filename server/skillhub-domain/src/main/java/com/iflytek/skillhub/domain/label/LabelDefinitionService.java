package com.iflytek.skillhub.domain.label;

import com.iflytek.skillhub.domain.shared.exception.DomainBadRequestException;
import com.iflytek.skillhub.domain.shared.exception.DomainForbiddenException;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LabelDefinitionService {

    private final int maxLabelDefinitions;

    private final LabelDefinitionRepository labelDefinitionRepository;
    private final LabelTranslationRepository labelTranslationRepository;
    private final LabelPermissionChecker labelPermissionChecker;

    public LabelDefinitionService(LabelDefinitionRepository labelDefinitionRepository,
                                  LabelTranslationRepository labelTranslationRepository,
                                  LabelPermissionChecker labelPermissionChecker,
                                  @Value("${skillhub.label.max-definitions:100}") int maxLabelDefinitions) {
        this.labelDefinitionRepository = labelDefinitionRepository;
        this.labelTranslationRepository = labelTranslationRepository;
        this.labelPermissionChecker = labelPermissionChecker;
        this.maxLabelDefinitions = requirePositive(maxLabelDefinitions, "skillhub.label.max-definitions");
    }

    public List<LabelDefinition> listAll() {
        return labelDefinitionRepository.findAllByOrderBySortOrderAscIdAsc();
    }

    /**
     * Labels selectable in publish / search pickers.
     * Includes every RECOMMENDED definition (even if hidden from the old single-row filter)
     * plus PRIVILEGED labels that are still marked visible.
     */
    public List<LabelDefinition> listVisibleFilters() {
        return labelDefinitionRepository.findAllByOrderBySortOrderAscIdAsc().stream()
                .filter(definition -> definition.getType() == LabelType.RECOMMENDED || definition.isVisibleInFilter())
                .toList();
    }

    public List<LabelDefinition> listByIds(List<Long> labelIds) {
        if (labelIds == null || labelIds.isEmpty()) {
            return List.of();
        }
        return labelDefinitionRepository.findByIdIn(labelIds);
    }

    public LabelDefinition getBySlug(String slug) {
        String normalizedSlug = LabelSlugValidator.normalize(slug);
        return labelDefinitionRepository.findBySlugIgnoreCase(normalizedSlug)
                .orElseThrow(() -> new DomainBadRequestException("label.not_found", normalizedSlug));
    }

    @Transactional
    public LabelDefinition create(String slug,
                                  LabelType type,
                                  boolean visibleInFilter,
                                  int sortOrder,
                                  String parentSlug,
                                  List<LabelTranslation> translations,
                                  String operatorId,
                                  Set<String> platformRoles) {
        requireDefinitionAdmin(platformRoles);
        String normalizedSlug = LabelSlugValidator.normalize(slug);
        List<LabelTranslation> normalizedTranslations = normalizeTranslations(translations);
        if (labelDefinitionRepository.count() >= maxLabelDefinitions) {
            throw new DomainBadRequestException("label.definition.too_many", maxLabelDefinitions);
        }
        if (labelDefinitionRepository.findBySlugIgnoreCase(normalizedSlug).isPresent()) {
            throw new DomainBadRequestException("label.slug.duplicate", normalizedSlug);
        }
        try {
            LabelDefinition labelDefinition = new LabelDefinition(
                    normalizedSlug, type, visibleInFilter, sortOrder, operatorId
            );
            labelDefinition.setParentId(resolveParentId(parentSlug, type, null));
            LabelDefinition saved = labelDefinitionRepository.save(labelDefinition);
            replaceTranslations(saved.getId(), normalizedTranslations);
            return saved;
        } catch (DataIntegrityViolationException ex) {
            throw mapConstraintViolation(normalizedSlug, ex);
        }
    }

    @Transactional
    public LabelDefinition update(String slug,
                                  LabelType type,
                                  boolean visibleInFilter,
                                  int sortOrder,
                                  String parentSlug,
                                  List<LabelTranslation> translations,
                                  Set<String> platformRoles) {
        requireDefinitionAdmin(platformRoles);
        LabelDefinition existing = getBySlug(slug);
        List<LabelTranslation> normalizedTranslations = normalizeTranslations(translations);
        Long parentId = resolveParentId(parentSlug, type, existing.getId());
        if (parentId != null && labelDefinitionRepository.existsByParentId(existing.getId())) {
            throw new DomainBadRequestException("label.parent.has_children");
        }
        existing.setType(type);
        existing.setVisibleInFilter(visibleInFilter);
        existing.setSortOrder(sortOrder);
        existing.setParentId(parentId);
        try {
            LabelDefinition saved = labelDefinitionRepository.save(existing);
            replaceTranslations(saved.getId(), normalizedTranslations);
            return saved;
        } catch (DataIntegrityViolationException ex) {
            throw mapConstraintViolation(existing.getSlug(), ex);
        }
    }

    @Transactional
    public void delete(String slug, Set<String> platformRoles) {
        requireDefinitionAdmin(platformRoles);
        LabelDefinition existing = getBySlug(slug);
        if (labelDefinitionRepository.existsByParentId(existing.getId())) {
            throw new DomainBadRequestException("label.parent.has_children");
        }
        labelDefinitionRepository.delete(existing);
    }

    @Transactional
    public List<LabelDefinition> updateSortOrders(List<LabelSortOrderUpdate> updates, Set<String> platformRoles) {
        requireDefinitionAdmin(platformRoles);
        if (updates == null || updates.isEmpty()) {
            throw new DomainBadRequestException("label.sort_order.empty");
        }
        List<LabelDefinition> labels = labelDefinitionRepository.findByIdIn(
                updates.stream().map(LabelSortOrderUpdate::labelId).toList()
        );
        if (labels.size() != updates.size()) {
            throw new DomainBadRequestException("label.not_found");
        }
        for (LabelDefinition label : labels) {
            updates.stream()
                    .filter(update -> update.labelId().equals(label.getId()))
                    .findFirst()
                    .ifPresent(update -> label.setSortOrder(update.sortOrder()));
        }
        return labelDefinitionRepository.saveAll(labels);
    }

    public List<LabelTranslation> listTranslations(Long labelId) {
        return labelTranslationRepository.findByLabelId(labelId);
    }

    public Map<Long, List<LabelTranslation>> listTranslationsByLabelIds(List<Long> labelIds) {
        if (labelIds == null || labelIds.isEmpty()) {
            return Map.of();
        }
        return labelTranslationRepository.findByLabelIdIn(labelIds).stream()
                .collect(java.util.stream.Collectors.groupingBy(LabelTranslation::getLabelId));
    }

    private Long resolveParentId(String parentSlug, LabelType type, Long selfId) {
        if (parentSlug == null || parentSlug.isBlank()) {
            return null;
        }
        if (type == LabelType.PRIVILEGED) {
            throw new DomainBadRequestException("label.parent.privileged_child");
        }
        LabelDefinition parent = getBySlug(parentSlug);
        if (selfId != null && selfId.equals(parent.getId())) {
            throw new DomainBadRequestException("label.parent.self");
        }
        if (parent.getType() != LabelType.RECOMMENDED) {
            throw new DomainBadRequestException("label.parent.invalid_type");
        }
        if (parent.getParentId() != null) {
            throw new DomainBadRequestException("label.parent.not_root");
        }
        return parent.getId();
    }

    private void replaceTranslations(Long labelId, List<LabelTranslation> translations) {
        List<LabelTranslation> existingTranslations = labelTranslationRepository.findByLabelId(labelId);
        if (!existingTranslations.isEmpty()) {
            labelTranslationRepository.deleteAll(existingTranslations);
            labelTranslationRepository.flush();
        }
        if (!translations.isEmpty()) {
            labelTranslationRepository.saveAll(translations.stream()
                    .map(translation -> new LabelTranslation(labelId, translation.getLocale(), translation.getDisplayName()))
                    .toList());
        }
    }

    private List<LabelTranslation> normalizeTranslations(List<LabelTranslation> translations) {
        if (translations == null || translations.isEmpty()) {
            throw new DomainBadRequestException("label.translation.empty");
        }
        List<LabelTranslation> normalized = translations.stream()
                .map(translation -> new LabelTranslation(
                        null,
                        normalizeLocale(translation.getLocale()),
                        normalizeDisplayName(translation.getDisplayName())))
                .toList();
        Map<String, Long> counts = normalized.stream()
                .map(LabelTranslation::getLocale)
                .collect(java.util.stream.Collectors.groupingBy(Function.identity(), java.util.stream.Collectors.counting()));
        String duplicateLocale = counts.entrySet().stream()
                .filter(entry -> entry.getValue() > 1)
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse(null);
        if (duplicateLocale != null) {
            throw new DomainBadRequestException("label.translation.locale.duplicate", duplicateLocale);
        }
        return normalized;
    }

    private String normalizeLocale(String locale) {
        if (locale == null || locale.isBlank()) {
            throw new DomainBadRequestException("label.translation.locale.blank");
        }
        return locale.trim().replace('_', '-').toLowerCase(Locale.ROOT);
    }

    private String normalizeDisplayName(String displayName) {
        if (displayName == null || displayName.isBlank()) {
            throw new DomainBadRequestException("label.translation.display_name.blank");
        }
        return displayName.trim();
    }

    private void requireDefinitionAdmin(Set<String> platformRoles) {
        if (!labelPermissionChecker.canManageDefinitions(platformRoles)) {
            throw new DomainForbiddenException("label.definition.no_permission");
        }
    }

    private DomainBadRequestException mapConstraintViolation(String slug, DataIntegrityViolationException ex) {
        String message = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        if (message != null && message.contains("label_translation")) {
            return new DomainBadRequestException("label.translation.locale.conflict");
        }
        if (message != null && (message.contains("parent_id") || message.contains("label_definition_parent"))) {
            return new DomainBadRequestException("label.parent.has_children");
        }
        return new DomainBadRequestException("label.slug.duplicate", slug);
    }

    private int requirePositive(int value, String propertyName) {
        if (value <= 0) {
            throw new IllegalArgumentException(propertyName + " must be greater than 0");
        }
        return value;
    }

    public record LabelSortOrderUpdate(Long labelId, int sortOrder) {
    }
}
