package com.iflytek.skillhub.dto.dashboard;

import java.util.List;

public record DashboardMetricsResponse(
        long total,
        double reuseRate,
        double activityRate,
        double contributionRate,
        double openShareRate,
        List<DepartmentMetric> departments
) {
    public record DepartmentMetric(
            String department,
            long total,
            double reuseRate,
            double activityRate,
            double contributionRate,
            double openShareRate
    ) {}
}
