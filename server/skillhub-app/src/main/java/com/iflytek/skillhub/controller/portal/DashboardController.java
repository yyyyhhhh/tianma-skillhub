package com.iflytek.skillhub.controller.portal;

import com.iflytek.skillhub.controller.BaseApiController;
import com.iflytek.skillhub.dto.ApiResponse;
import com.iflytek.skillhub.dto.ApiResponseFactory;
import com.iflytek.skillhub.dto.dashboard.DashboardContributionsResponse;
import com.iflytek.skillhub.dto.dashboard.DashboardMetricsResponse;
import com.iflytek.skillhub.dto.dashboard.DashboardSummaryResponse;
import com.iflytek.skillhub.dto.dashboard.DashboardTopItemResponse;
import com.iflytek.skillhub.ratelimit.RateLimit;
import com.iflytek.skillhub.service.DashboardAppService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * ACP-compatible ops dashboard endpoints for the landing/home workbench.
 */
@RestController
@RequestMapping("/api/web/dashboard")
public class DashboardController extends BaseApiController {

    private final DashboardAppService dashboardAppService;

    public DashboardController(DashboardAppService dashboardAppService, ApiResponseFactory responseFactory) {
        super(responseFactory);
        this.dashboardAppService = dashboardAppService;
    }

    @GetMapping("/summary")
    @RateLimit(category = "search", authenticated = 60, anonymous = 30)
    public ApiResponse<DashboardSummaryResponse> summary() {
        return ok("response.success.read", dashboardAppService.summary());
    }

    @GetMapping("/top10")
    @RateLimit(category = "search", authenticated = 60, anonymous = 30)
    public ApiResponse<List<DashboardTopItemResponse>> top10(
            @RequestParam(defaultValue = "SKILL") String type) {
        return ok("response.success.read", dashboardAppService.top10(type));
    }

    @GetMapping("/metrics")
    @RateLimit(category = "search", authenticated = 60, anonymous = 30)
    public ApiResponse<DashboardMetricsResponse> metrics() {
        return ok("response.success.read", dashboardAppService.metrics());
    }

    @GetMapping("/contributions")
    @RateLimit(category = "search", authenticated = 60, anonymous = 30)
    public ApiResponse<DashboardContributionsResponse> contributions() {
        return ok("response.success.read", dashboardAppService.contributions());
    }
}
