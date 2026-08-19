-- Extra ACP-style publish metadata that varies by package type
ALTER TABLE skill
    ADD COLUMN IF NOT EXISTS business_scope VARCHAR(50),
    ADD COLUMN IF NOT EXISTS access_url VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS related_product VARCHAR(200),
    ADD COLUMN IF NOT EXISTS spec_level VARCHAR(30),
    ADD COLUMN IF NOT EXISTS mcp_mode VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_skill_business_scope ON skill (business_scope);
CREATE INDEX IF NOT EXISTS idx_skill_related_product ON skill (related_product);
