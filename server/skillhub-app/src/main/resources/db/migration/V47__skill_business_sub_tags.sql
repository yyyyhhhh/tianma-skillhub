-- Persist optional business sub-tags selected at publish time.
ALTER TABLE skill
    ADD COLUMN IF NOT EXISTS business_sub_tags VARCHAR(500);
