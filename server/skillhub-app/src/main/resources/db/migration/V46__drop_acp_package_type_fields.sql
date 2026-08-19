-- Collapse extra ACP package types back to SKILL and drop type-specific columns.
UPDATE skill SET package_type = 'SKILL' WHERE package_type <> 'SKILL';

DROP INDEX IF EXISTS idx_skill_related_product;

ALTER TABLE skill DROP COLUMN IF EXISTS kb_type;
ALTER TABLE skill DROP COLUMN IF EXISTS access_url;
ALTER TABLE skill DROP COLUMN IF EXISTS related_product;
ALTER TABLE skill DROP COLUMN IF EXISTS spec_level;
ALTER TABLE skill DROP COLUMN IF EXISTS mcp_mode;
