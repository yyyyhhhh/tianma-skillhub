package com.iflytek.skillhub.domain.label;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class BusinessLabelCatalogTest {

    @Test
    void resolveSlugs_mapsScopeAndSubTags() {
        List<String> slugs = BusinessLabelCatalog.resolveSlugs("智测", "接口测试,功能测试,unknown");
        assertThat(slugs).containsExactly("scope-zhice", "api-test", "func-test");
    }

    @Test
    void resolveSlugs_ignoresBlankInput() {
        assertThat(BusinessLabelCatalog.resolveSlugs(null, null)).isEmpty();
        assertThat(BusinessLabelCatalog.resolveSlugs("  ", "")).isEmpty();
    }
}
