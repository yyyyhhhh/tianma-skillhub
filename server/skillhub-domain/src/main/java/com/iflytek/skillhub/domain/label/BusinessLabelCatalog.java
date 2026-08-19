package com.iflytek.skillhub.domain.label;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Canonical mapping from ACP-style Chinese business scope / sub-tag display names
 * to ASCII label slugs seeded in the database.
 */
public final class BusinessLabelCatalog {

    private static final Map<String, String> DISPLAY_NAME_TO_SLUG = buildCatalog();

    private BusinessLabelCatalog() {
    }

    public static String slugForDisplayName(String displayName) {
        if (displayName == null || displayName.isBlank()) {
            return null;
        }
        String trimmed = displayName.trim();
        String mapped = DISPLAY_NAME_TO_SLUG.get(trimmed);
        if (mapped != null) {
            return mapped;
        }
        try {
            return LabelSlugValidator.normalize(trimmed);
        } catch (RuntimeException ex) {
            return null;
        }
    }

    public static List<String> resolveSlugs(String businessScope, String businessSubTagsCsv) {
        List<String> slugs = new ArrayList<>();
        String scopeSlug = slugForDisplayName(businessScope);
        if (scopeSlug != null) {
            slugs.add(scopeSlug);
        }
        if (businessSubTagsCsv != null && !businessSubTagsCsv.isBlank()) {
            for (String part : businessSubTagsCsv.split(",")) {
                String slug = slugForDisplayName(part.trim());
                if (slug != null && !slugs.contains(slug)) {
                    slugs.add(slug);
                }
            }
        }
        return List.copyOf(slugs);
    }

    public static Map<String, String> allDisplayNameToSlug() {
        return Map.copyOf(DISPLAY_NAME_TO_SLUG);
    }

    private static Map<String, String> buildCatalog() {
        Map<String, String> map = new LinkedHashMap<>();
        // Business scopes (visible in search filters)
        map.put("智谋", "scope-zhimou");
        map.put("智码", "scope-zhima");
        map.put("智测", "scope-zhice");
        map.put("智御", "scope-zhiyu");
        map.put("智运", "scope-zhiyun");
        map.put("其他", "scope-other");

        // 智谋
        map.put("nesma拆分", "nesma-split");
        map.put("需求分析", "req-analysis");
        map.put("需求设计", "req-design");
        map.put("COSMIC拆分", "cosmic-split");

        // 智码
        map.put("代码知识库", "code-kb");
        map.put("SDD开发", "sdd-dev");
        map.put("代码Review", "code-review");
        map.put("代码生成", "code-gen");

        // 智测
        map.put("代码扫描", "code-scan");
        map.put("解析功能点", "parse-features");
        map.put("接口测试", "api-test");
        map.put("功能测试", "func-test");
        map.put("性能测试", "perf-test");
        map.put("白盒测试", "whitebox-test");
        map.put("黑盒测试", "blackbox-test");
        map.put("合规审计", "compliance-audit");
        map.put("测试用例生成", "testcase-gen");
        map.put("自动化UI测试", "auto-ui-test");

        // 智御
        map.put("渗透测试", "pentest");
        map.put("安全扫描", "sec-scan");
        map.put("漏洞验证", "vuln-verify");

        // 智运
        map.put("部署运维", "deploy-ops");
        map.put("故障定位", "fault-locate");
        map.put("知识问答", "kb-qa");

        // 其他
        map.put("销售", "sales");
        map.put("售前", "presales");
        map.put("项目画像", "project-profile");
        map.put("技术规范", "tech-spec");
        map.put("运营", "operations");
        map.put("通用工具", "general-tools");
        map.put("规范文档", "spec-docs");
        map.put("数据服务", "data-service");

        // Also allow looking up by already-normalized slug
        Map<String, String> withSlugKeys = new LinkedHashMap<>(map);
        for (String slug : map.values()) {
            withSlugKeys.putIfAbsent(slug, slug);
            withSlugKeys.putIfAbsent(slug.toLowerCase(Locale.ROOT), slug);
        }
        return Map.copyOf(withSlugKeys);
    }
}
