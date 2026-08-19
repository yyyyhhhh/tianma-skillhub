package com.iflytek.skillhub.controller.portal;

import com.iflytek.skillhub.controller.BaseApiController;
import com.iflytek.skillhub.dto.ApiResponse;
import com.iflytek.skillhub.dto.ApiResponseFactory;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Static asset metadata for publish/search filters (departments, business scopes).
 */
@RestController
@RequestMapping("/api/web/asset-meta")
public class AssetMetaController extends BaseApiController {

    private final List<String> departments;
    private final List<String> businessScopes;

    public AssetMetaController(
            ApiResponseFactory responseFactory,
            @Value("${skillhub.asset.departments:后端开发,前端开发,UI,产品,测试,运维}")
            String departmentsCsv,
            @Value("${skillhub.asset.business-scopes:智谋,智码,智测,智御,智运,其他}")
            String businessScopesCsv) {
        super(responseFactory);
        this.departments = splitCsv(departmentsCsv);
        this.businessScopes = splitCsv(businessScopesCsv);
    }

    @GetMapping("/departments")
    public ApiResponse<List<String>> departments() {
        return ok("response.success.read", departments);
    }

    @GetMapping("/business-scopes")
    public ApiResponse<List<String>> businessScopes() {
        return ok("response.success.read", businessScopes);
    }

    private static List<String> splitCsv(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toList();
    }
}
