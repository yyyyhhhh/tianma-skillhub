-- Seed ACP-aligned business scope + sub-tag labels for search filters and publish auto-mount.
-- Slugs are ASCII; zh/en display names live in label_translation.

INSERT INTO label_definition (slug, type, visible_in_filter, sort_order, created_by, created_at, updated_at)
SELECT v.slug, 'RECOMMENDED', v.visible, v.sort_order, NULL, NOW(), NOW()
FROM (VALUES
    ('scope-zhimou', TRUE, 10),
    ('scope-zhima', TRUE, 20),
    ('scope-zhice', TRUE, 30),
    ('scope-zhiyu', TRUE, 40),
    ('scope-zhiyun', TRUE, 50),
    ('scope-other', TRUE, 60),
    ('nesma-split', FALSE, 110),
    ('req-analysis', FALSE, 120),
    ('req-design', FALSE, 130),
    ('cosmic-split', FALSE, 140),
    ('code-kb', FALSE, 210),
    ('sdd-dev', FALSE, 220),
    ('code-review', FALSE, 230),
    ('code-gen', FALSE, 240),
    ('code-scan', FALSE, 310),
    ('parse-features', FALSE, 320),
    ('api-test', FALSE, 330),
    ('func-test', FALSE, 340),
    ('perf-test', FALSE, 350),
    ('whitebox-test', FALSE, 360),
    ('blackbox-test', FALSE, 370),
    ('compliance-audit', FALSE, 380),
    ('testcase-gen', FALSE, 390),
    ('auto-ui-test', FALSE, 400),
    ('pentest', FALSE, 510),
    ('sec-scan', FALSE, 520),
    ('vuln-verify', FALSE, 530),
    ('deploy-ops', FALSE, 610),
    ('fault-locate', FALSE, 620),
    ('kb-qa', FALSE, 630),
    ('sales', FALSE, 710),
    ('presales', FALSE, 720),
    ('project-profile', FALSE, 730),
    ('tech-spec', FALSE, 740),
    ('operations', FALSE, 750),
    ('general-tools', FALSE, 760),
    ('spec-docs', FALSE, 770),
    ('data-service', FALSE, 780)
) AS v(slug, visible, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM label_definition d WHERE d.slug = v.slug);

INSERT INTO label_translation (label_id, locale, display_name, created_at, updated_at)
SELECT d.id, t.locale, t.display_name, NOW(), NOW()
FROM label_definition d
JOIN (VALUES
    ('scope-zhimou', 'zh', '智谋'),
    ('scope-zhimou', 'en', 'Strategy'),
    ('scope-zhima', 'zh', '智码'),
    ('scope-zhima', 'en', 'Coding'),
    ('scope-zhice', 'zh', '智测'),
    ('scope-zhice', 'en', 'Testing'),
    ('scope-zhiyu', 'zh', '智御'),
    ('scope-zhiyu', 'en', 'Security'),
    ('scope-zhiyun', 'zh', '智运'),
    ('scope-zhiyun', 'en', 'Ops'),
    ('scope-other', 'zh', '其他'),
    ('scope-other', 'en', 'Other'),
    ('nesma-split', 'zh', 'nesma拆分'),
    ('nesma-split', 'en', 'NESMA Split'),
    ('req-analysis', 'zh', '需求分析'),
    ('req-analysis', 'en', 'Requirement Analysis'),
    ('req-design', 'zh', '需求设计'),
    ('req-design', 'en', 'Requirement Design'),
    ('cosmic-split', 'zh', 'COSMIC拆分'),
    ('cosmic-split', 'en', 'COSMIC Split'),
    ('code-kb', 'zh', '代码知识库'),
    ('code-kb', 'en', 'Code Knowledge Base'),
    ('sdd-dev', 'zh', 'SDD开发'),
    ('sdd-dev', 'en', 'SDD Development'),
    ('code-review', 'zh', '代码Review'),
    ('code-review', 'en', 'Code Review'),
    ('code-gen', 'zh', '代码生成'),
    ('code-gen', 'en', 'Code Generation'),
    ('code-scan', 'zh', '代码扫描'),
    ('code-scan', 'en', 'Code Scan'),
    ('parse-features', 'zh', '解析功能点'),
    ('parse-features', 'en', 'Parse Features'),
    ('api-test', 'zh', '接口测试'),
    ('api-test', 'en', 'API Testing'),
    ('func-test', 'zh', '功能测试'),
    ('func-test', 'en', 'Functional Testing'),
    ('perf-test', 'zh', '性能测试'),
    ('perf-test', 'en', 'Performance Testing'),
    ('whitebox-test', 'zh', '白盒测试'),
    ('whitebox-test', 'en', 'White-box Testing'),
    ('blackbox-test', 'zh', '黑盒测试'),
    ('blackbox-test', 'en', 'Black-box Testing'),
    ('compliance-audit', 'zh', '合规审计'),
    ('compliance-audit', 'en', 'Compliance Audit'),
    ('testcase-gen', 'zh', '测试用例生成'),
    ('testcase-gen', 'en', 'Test Case Generation'),
    ('auto-ui-test', 'zh', '自动化UI测试'),
    ('auto-ui-test', 'en', 'Automated UI Testing'),
    ('pentest', 'zh', '渗透测试'),
    ('pentest', 'en', 'Penetration Testing'),
    ('sec-scan', 'zh', '安全扫描'),
    ('sec-scan', 'en', 'Security Scan'),
    ('vuln-verify', 'zh', '漏洞验证'),
    ('vuln-verify', 'en', 'Vulnerability Verification'),
    ('deploy-ops', 'zh', '部署运维'),
    ('deploy-ops', 'en', 'Deploy & Ops'),
    ('fault-locate', 'zh', '故障定位'),
    ('fault-locate', 'en', 'Fault Localization'),
    ('kb-qa', 'zh', '知识问答'),
    ('kb-qa', 'en', 'Knowledge Q&A'),
    ('sales', 'zh', '销售'),
    ('sales', 'en', 'Sales'),
    ('presales', 'zh', '售前'),
    ('presales', 'en', 'Presales'),
    ('project-profile', 'zh', '项目画像'),
    ('project-profile', 'en', 'Project Profile'),
    ('tech-spec', 'zh', '技术规范'),
    ('tech-spec', 'en', 'Technical Spec'),
    ('operations', 'zh', '运营'),
    ('operations', 'en', 'Operations'),
    ('general-tools', 'zh', '通用工具'),
    ('general-tools', 'en', 'General Tools'),
    ('spec-docs', 'zh', '规范文档'),
    ('spec-docs', 'en', 'Specification Docs'),
    ('data-service', 'zh', '数据服务'),
    ('data-service', 'en', 'Data Service')
) AS t(slug, locale, display_name) ON d.slug = t.slug
WHERE NOT EXISTS (
    SELECT 1 FROM label_translation lt
    WHERE lt.label_id = d.id AND lt.locale = t.locale
);

-- Backfill labels for skills that already stored business_scope / business_sub_tags.
INSERT INTO skill_label (skill_id, label_id, created_by, created_at)
SELECT s.id, d.id, s.owner_id, NOW()
FROM skill s
JOIN label_definition d ON d.slug = CASE s.business_scope
    WHEN '智谋' THEN 'scope-zhimou'
    WHEN '智码' THEN 'scope-zhima'
    WHEN '智测' THEN 'scope-zhice'
    WHEN '智御' THEN 'scope-zhiyu'
    WHEN '智运' THEN 'scope-zhiyun'
    WHEN '其他' THEN 'scope-other'
    ELSE NULL
END
WHERE s.business_scope IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM skill_label sl WHERE sl.skill_id = s.id AND sl.label_id = d.id
  );

INSERT INTO skill_label (skill_id, label_id, created_by, created_at)
SELECT s.id, d.id, s.owner_id, NOW()
FROM skill s
CROSS JOIN LATERAL unnest(string_to_array(s.business_sub_tags, ',')) AS raw(tag)
JOIN label_definition d ON d.slug = CASE trim(raw.tag)
    WHEN 'nesma拆分' THEN 'nesma-split'
    WHEN '需求分析' THEN 'req-analysis'
    WHEN '需求设计' THEN 'req-design'
    WHEN 'COSMIC拆分' THEN 'cosmic-split'
    WHEN '代码知识库' THEN 'code-kb'
    WHEN 'SDD开发' THEN 'sdd-dev'
    WHEN '代码Review' THEN 'code-review'
    WHEN '代码生成' THEN 'code-gen'
    WHEN '代码扫描' THEN 'code-scan'
    WHEN '解析功能点' THEN 'parse-features'
    WHEN '接口测试' THEN 'api-test'
    WHEN '功能测试' THEN 'func-test'
    WHEN '性能测试' THEN 'perf-test'
    WHEN '白盒测试' THEN 'whitebox-test'
    WHEN '黑盒测试' THEN 'blackbox-test'
    WHEN '合规审计' THEN 'compliance-audit'
    WHEN '测试用例生成' THEN 'testcase-gen'
    WHEN '自动化UI测试' THEN 'auto-ui-test'
    WHEN '渗透测试' THEN 'pentest'
    WHEN '安全扫描' THEN 'sec-scan'
    WHEN '漏洞验证' THEN 'vuln-verify'
    WHEN '部署运维' THEN 'deploy-ops'
    WHEN '故障定位' THEN 'fault-locate'
    WHEN '知识问答' THEN 'kb-qa'
    WHEN '销售' THEN 'sales'
    WHEN '售前' THEN 'presales'
    WHEN '项目画像' THEN 'project-profile'
    WHEN '技术规范' THEN 'tech-spec'
    WHEN '运营' THEN 'operations'
    WHEN '通用工具' THEN 'general-tools'
    WHEN '规范文档' THEN 'spec-docs'
    WHEN '数据服务' THEN 'data-service'
    ELSE NULL
END
WHERE s.business_sub_tags IS NOT NULL
  AND trim(raw.tag) <> ''
  AND NOT EXISTS (
      SELECT 1 FROM skill_label sl WHERE sl.skill_id = s.id AND sl.label_id = d.id
  );
