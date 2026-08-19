package com.iflytek.skillhub.domain.label;

import com.iflytek.skillhub.domain.shared.exception.DomainBadRequestException;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class LabelDefinitionServiceTest {

    private final LabelDefinitionRepository labelDefinitionRepository = mock(LabelDefinitionRepository.class);
    private final LabelTranslationRepository labelTranslationRepository = mock(LabelTranslationRepository.class);
    private final LabelPermissionChecker labelPermissionChecker = mock(LabelPermissionChecker.class);
    private final LabelDefinitionService service = new LabelDefinitionService(
            labelDefinitionRepository,
            labelTranslationRepository,
            labelPermissionChecker,
            100
    );

    @Test
    void constructorShouldRejectNonPositiveDefinitionLimit() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> new LabelDefinitionService(
                labelDefinitionRepository,
                labelTranslationRepository,
                labelPermissionChecker,
                0
        ));

        assertEquals("skillhub.label.max-definitions must be greater than 0", ex.getMessage());
    }

    @Test
    void createShouldRejectDuplicateLocalesIgnoringCase() {
        when(labelPermissionChecker.canManageDefinitions(Set.of("SUPER_ADMIN"))).thenReturn(true);
        when(labelDefinitionRepository.count()).thenReturn(0L);
        when(labelDefinitionRepository.findBySlugIgnoreCase("official")).thenReturn(Optional.empty());

        DomainBadRequestException ex = assertThrows(DomainBadRequestException.class, () -> service.create(
                "Official",
                LabelType.RECOMMENDED,
                true,
                0,
                null,
                List.of(
                        new LabelTranslation(null, "en", "Official"),
                        new LabelTranslation(null, "EN", "Official EN")
                ),
                "admin",
                Set.of("SUPER_ADMIN")
        ));

        assertEquals("label.translation.locale.duplicate", ex.messageCode());
    }

    @Test
    void createShouldRejectWhenDefinitionLimitReached() {
        when(labelPermissionChecker.canManageDefinitions(Set.of("SUPER_ADMIN"))).thenReturn(true);
        when(labelDefinitionRepository.count()).thenReturn(100L);

        DomainBadRequestException ex = assertThrows(DomainBadRequestException.class, () -> service.create(
                "official",
                LabelType.RECOMMENDED,
                true,
                0,
                null,
                List.of(new LabelTranslation(null, "en", "Official")),
                "admin",
                Set.of("SUPER_ADMIN")
        ));

        assertEquals("label.definition.too_many", ex.messageCode());
    }

    @Test
    void getBySlugShouldIgnoreCase() {
        LabelDefinition definition = new LabelDefinition("official", LabelType.RECOMMENDED, true, 0, "admin");
        when(labelDefinitionRepository.findBySlugIgnoreCase("official")).thenReturn(Optional.of(definition));

        LabelDefinition result = service.getBySlug("Official");

        assertEquals("official", result.getSlug());
    }

    @Test
    void updateSortOrdersShouldRejectMissingLabels() {
        when(labelPermissionChecker.canManageDefinitions(Set.of("SUPER_ADMIN"))).thenReturn(true);
        when(labelDefinitionRepository.findByIdIn(List.of(1L, 2L))).thenReturn(List.of(
                new LabelDefinition("official", LabelType.RECOMMENDED, true, 0, "admin")
        ));

        DomainBadRequestException ex = assertThrows(DomainBadRequestException.class, () -> service.updateSortOrders(
                List.of(
                        new LabelDefinitionService.LabelSortOrderUpdate(1L, 0),
                        new LabelDefinitionService.LabelSortOrderUpdate(2L, 1)
                ),
                Set.of("SUPER_ADMIN")
        ));

        assertEquals("label.not_found", ex.messageCode());
    }

    @Test
    void updateShouldFlushDeletedTranslationsBeforeSavingReplacements() {
        when(labelPermissionChecker.canManageDefinitions(Set.of("SUPER_ADMIN"))).thenReturn(true);
        LabelDefinition definition = new LabelDefinition("official", LabelType.RECOMMENDED, true, 0, "admin");
        setField(definition, "id", 10L);
        when(labelDefinitionRepository.findBySlugIgnoreCase("official")).thenReturn(Optional.of(definition));
        when(labelDefinitionRepository.save(definition)).thenReturn(definition);
        when(labelTranslationRepository.findByLabelId(10L)).thenReturn(List.of(
                new LabelTranslation(10L, "en", "Official")
        ));

        service.update(
                "official",
                LabelType.RECOMMENDED,
                true,
                1,
                null,
                List.of(new LabelTranslation(null, "en", "Official Updated")),
                Set.of("SUPER_ADMIN")
        );

        var inOrder = inOrder(labelTranslationRepository);
        inOrder.verify(labelTranslationRepository).deleteAll(org.mockito.ArgumentMatchers.any());
        inOrder.verify(labelTranslationRepository).flush();
        inOrder.verify(labelTranslationRepository).saveAll(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void listVisibleFiltersShouldIncludeRecommendedAndVisiblePrivilegedLabels() {
        LabelDefinition recommendedHidden = new LabelDefinition("api-test", LabelType.RECOMMENDED, false, 0, "admin");
        LabelDefinition privilegedVisible = new LabelDefinition("verified", LabelType.PRIVILEGED, true, 1, "admin");
        LabelDefinition privilegedHidden = new LabelDefinition("internal", LabelType.PRIVILEGED, false, 2, "admin");
        when(labelDefinitionRepository.findAllByOrderBySortOrderAscIdAsc())
                .thenReturn(List.of(recommendedHidden, privilegedVisible, privilegedHidden));

        List<LabelDefinition> actual = service.listVisibleFilters();

        assertEquals(List.of(recommendedHidden, privilegedVisible), actual);
        verify(labelDefinitionRepository).findAllByOrderBySortOrderAscIdAsc();
    }

    @Test
    void createShouldAttachParentWhenParentIsARootRecommendedLabel() {
        when(labelPermissionChecker.canManageDefinitions(Set.of("SUPER_ADMIN"))).thenReturn(true);
        when(labelDefinitionRepository.count()).thenReturn(0L);
        when(labelDefinitionRepository.findBySlugIgnoreCase("req-analysis")).thenReturn(Optional.empty());
        LabelDefinition parent = new LabelDefinition("scope-zhimou", LabelType.RECOMMENDED, true, 0, "admin");
        setField(parent, "id", 1L);
        when(labelDefinitionRepository.findBySlugIgnoreCase("scope-zhimou")).thenReturn(Optional.of(parent));
        when(labelDefinitionRepository.save(org.mockito.ArgumentMatchers.any(LabelDefinition.class)))
                .thenAnswer(invocation -> {
                    LabelDefinition saved = invocation.getArgument(0);
                    setField(saved, "id", 2L);
                    return saved;
                });

        LabelDefinition created = service.create(
                "req-analysis",
                LabelType.RECOMMENDED,
                false,
                1,
                "scope-zhimou",
                List.of(new LabelTranslation(null, "zh", "需求分析")),
                "admin",
                Set.of("SUPER_ADMIN")
        );

        assertEquals(1L, created.getParentId());
        assertEquals(2L, created.getId());
    }

    @Test
    void createShouldRejectParentThatIsItselfAChild() {
        when(labelPermissionChecker.canManageDefinitions(Set.of("SUPER_ADMIN"))).thenReturn(true);
        when(labelDefinitionRepository.count()).thenReturn(0L);
        when(labelDefinitionRepository.findBySlugIgnoreCase("nested")).thenReturn(Optional.empty());
        LabelDefinition parent = new LabelDefinition("req-analysis", LabelType.RECOMMENDED, false, 0, "admin");
        setField(parent, "id", 2L);
        parent.setParentId(1L);
        when(labelDefinitionRepository.findBySlugIgnoreCase("req-analysis")).thenReturn(Optional.of(parent));

        DomainBadRequestException ex = assertThrows(DomainBadRequestException.class, () -> service.create(
                "nested",
                LabelType.RECOMMENDED,
                false,
                1,
                "req-analysis",
                List.of(new LabelTranslation(null, "zh", "嵌套")),
                "admin",
                Set.of("SUPER_ADMIN")
        ));

        assertEquals("label.parent.not_root", ex.messageCode());
    }

    @Test
    void createShouldRejectPrivilegedChildWithParent() {
        when(labelPermissionChecker.canManageDefinitions(Set.of("SUPER_ADMIN"))).thenReturn(true);
        when(labelDefinitionRepository.count()).thenReturn(0L);
        when(labelDefinitionRepository.findBySlugIgnoreCase("official")).thenReturn(Optional.empty());

        DomainBadRequestException ex = assertThrows(DomainBadRequestException.class, () -> service.create(
                "official",
                LabelType.PRIVILEGED,
                true,
                0,
                "scope-zhimou",
                List.of(new LabelTranslation(null, "en", "Official")),
                "admin",
                Set.of("SUPER_ADMIN")
        ));

        assertEquals("label.parent.privileged_child", ex.messageCode());
    }

    @Test
    void updateShouldRejectAssigningParentToALabelThatAlreadyHasChildren() {
        when(labelPermissionChecker.canManageDefinitions(Set.of("SUPER_ADMIN"))).thenReturn(true);
        LabelDefinition existing = new LabelDefinition("scope-zhimou", LabelType.RECOMMENDED, true, 0, "admin");
        setField(existing, "id", 1L);
        LabelDefinition newParent = new LabelDefinition("scope-other", LabelType.RECOMMENDED, true, 1, "admin");
        setField(newParent, "id", 9L);
        when(labelDefinitionRepository.findBySlugIgnoreCase("scope-zhimou")).thenReturn(Optional.of(existing));
        when(labelDefinitionRepository.findBySlugIgnoreCase("scope-other")).thenReturn(Optional.of(newParent));
        when(labelDefinitionRepository.existsByParentId(1L)).thenReturn(true);

        DomainBadRequestException ex = assertThrows(DomainBadRequestException.class, () -> service.update(
                "scope-zhimou",
                LabelType.RECOMMENDED,
                true,
                0,
                "scope-other",
                List.of(new LabelTranslation(null, "zh", "智谋")),
                Set.of("SUPER_ADMIN")
        ));

        assertEquals("label.parent.has_children", ex.messageCode());
    }

    @Test
    void deleteShouldRejectWhenLabelStillHasChildren() {
        when(labelPermissionChecker.canManageDefinitions(Set.of("SUPER_ADMIN"))).thenReturn(true);
        LabelDefinition existing = new LabelDefinition("scope-zhimou", LabelType.RECOMMENDED, true, 0, "admin");
        setField(existing, "id", 1L);
        when(labelDefinitionRepository.findBySlugIgnoreCase("scope-zhimou")).thenReturn(Optional.of(existing));
        when(labelDefinitionRepository.existsByParentId(1L)).thenReturn(true);

        DomainBadRequestException ex = assertThrows(DomainBadRequestException.class, () ->
                service.delete("scope-zhimou", Set.of("SUPER_ADMIN")));

        assertEquals("label.parent.has_children", ex.messageCode());
    }

    private void setField(Object target, String fieldName, Object value) {
        try {
            var field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
