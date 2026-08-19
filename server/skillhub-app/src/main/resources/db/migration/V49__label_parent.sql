-- Two-level parent/child association for managed labels.
-- Roots (parent_id IS NULL) are business scopes; children are sub-tags.

ALTER TABLE label_definition
    ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES label_definition(id) ON DELETE RESTRICT;

ALTER TABLE label_definition
    DROP CONSTRAINT IF EXISTS label_definition_parent_not_self;

ALTER TABLE label_definition
    ADD CONSTRAINT label_definition_parent_not_self
        CHECK (parent_id IS NULL OR parent_id <> id);

CREATE INDEX IF NOT EXISTS idx_label_definition_parent_id ON label_definition(parent_id);

UPDATE label_definition AS child
SET parent_id = parent.id
FROM label_definition AS parent
JOIN (
    VALUES
        ('scope-zhimou', 'nesma-split'),
        ('scope-zhimou', 'req-analysis'),
        ('scope-zhimou', 'req-design'),
        ('scope-zhimou', 'cosmic-split'),
        ('scope-zhima', 'code-kb'),
        ('scope-zhima', 'sdd-dev'),
        ('scope-zhima', 'code-review'),
        ('scope-zhima', 'code-gen'),
        ('scope-zhice', 'code-scan'),
        ('scope-zhice', 'parse-features'),
        ('scope-zhice', 'api-test'),
        ('scope-zhice', 'func-test'),
        ('scope-zhice', 'perf-test'),
        ('scope-zhice', 'whitebox-test'),
        ('scope-zhice', 'blackbox-test'),
        ('scope-zhice', 'compliance-audit'),
        ('scope-zhice', 'testcase-gen'),
        ('scope-zhice', 'auto-ui-test'),
        ('scope-zhiyu', 'pentest'),
        ('scope-zhiyu', 'sec-scan'),
        ('scope-zhiyu', 'vuln-verify'),
        ('scope-zhiyun', 'deploy-ops'),
        ('scope-zhiyun', 'fault-locate'),
        ('scope-zhiyun', 'kb-qa'),
        ('scope-other', 'sales'),
        ('scope-other', 'presales'),
        ('scope-other', 'project-profile'),
        ('scope-other', 'tech-spec'),
        ('scope-other', 'operations'),
        ('scope-other', 'general-tools'),
        ('scope-other', 'spec-docs'),
        ('scope-other', 'data-service')
) AS mapping(parent_slug, child_slug)
    ON parent.slug = mapping.parent_slug
WHERE child.parent_id IS NULL
  AND child.slug = mapping.child_slug;
