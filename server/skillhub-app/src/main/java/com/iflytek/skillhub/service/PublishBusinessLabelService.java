package com.iflytek.skillhub.service;

import com.iflytek.skillhub.domain.label.BusinessLabelCatalog;
import com.iflytek.skillhub.domain.label.SkillLabelService;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Auto-mounts business-scope / sub-tag labels onto a skill after publish.
 */
@Service
public class PublishBusinessLabelService {

    private static final Logger log = LoggerFactory.getLogger(PublishBusinessLabelService.class);

    private final SkillLabelService skillLabelService;
    private final LabelSearchSyncService labelSearchSyncService;

    public PublishBusinessLabelService(SkillLabelService skillLabelService,
                                       LabelSearchSyncService labelSearchSyncService) {
        this.skillLabelService = skillLabelService;
        this.labelSearchSyncService = labelSearchSyncService;
    }

    @Transactional
    public void attachAfterPublish(Long skillId, String businessScope, String businessSubTagsCsv, String operatorId) {
        List<String> slugs = BusinessLabelCatalog.resolveSlugs(businessScope, businessSubTagsCsv);
        if (slugs.isEmpty()) {
            return;
        }
        try {
            skillLabelService.attachLabelsForPublish(skillId, slugs, operatorId);
            afterCommit(() -> labelSearchSyncService.rebuildSkill(skillId));
        } catch (RuntimeException ex) {
            // Publish itself already succeeded; do not fail the API if label mount has issues.
            log.warn("Failed to auto-attach business labels for skillId={}: {}", skillId, ex.getMessage());
        }
    }

    private void afterCommit(Runnable runnable) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            runnable.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                runnable.run();
            }
        });
    }
}
