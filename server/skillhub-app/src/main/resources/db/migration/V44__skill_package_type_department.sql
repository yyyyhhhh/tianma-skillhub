-- ACP-style multi-asset metadata on skill
ALTER TABLE skill
    ADD COLUMN IF NOT EXISTS package_type VARCHAR(20) NOT NULL DEFAULT 'SKILL',
    ADD COLUMN IF NOT EXISTS department VARCHAR(100),
    ADD COLUMN IF NOT EXISTS view_count BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS kb_type VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_skill_package_type ON skill (package_type);
CREATE INDEX IF NOT EXISTS idx_skill_department ON skill (department);
