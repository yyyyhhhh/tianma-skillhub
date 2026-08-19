package com.iflytek.skillhub.repository;

import com.iflytek.skillhub.dto.dashboard.DashboardContributionsResponse;
import com.iflytek.skillhub.dto.dashboard.DashboardMetricsResponse;
import com.iflytek.skillhub.dto.dashboard.DashboardSummaryResponse;
import com.iflytek.skillhub.dto.dashboard.DashboardTopItemResponse;
import java.util.List;

public interface DashboardQueryRepository {
    DashboardSummaryResponse summary();

    List<DashboardTopItemResponse> top10(String packageType);

    DashboardMetricsResponse metrics();

    DashboardContributionsResponse contributions();
}
