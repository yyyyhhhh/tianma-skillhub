package com.iflytek.skillhub.service;

import com.iflytek.skillhub.dto.dashboard.DashboardContributionsResponse;
import com.iflytek.skillhub.dto.dashboard.DashboardMetricsResponse;
import com.iflytek.skillhub.dto.dashboard.DashboardSummaryResponse;
import com.iflytek.skillhub.dto.dashboard.DashboardTopItemResponse;
import com.iflytek.skillhub.repository.DashboardQueryRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DashboardAppService {

    private final DashboardQueryRepository dashboardQueryRepository;

    public DashboardAppService(DashboardQueryRepository dashboardQueryRepository) {
        this.dashboardQueryRepository = dashboardQueryRepository;
    }

    public DashboardSummaryResponse summary() {
        return dashboardQueryRepository.summary();
    }

    public List<DashboardTopItemResponse> top10(String packageType) {
        return dashboardQueryRepository.top10(packageType);
    }

    public DashboardMetricsResponse metrics() {
        return dashboardQueryRepository.metrics();
    }

    public DashboardContributionsResponse contributions() {
        return dashboardQueryRepository.contributions();
    }
}
