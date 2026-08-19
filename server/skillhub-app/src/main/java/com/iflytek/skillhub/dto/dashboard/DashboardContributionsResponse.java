package com.iflytek.skillhub.dto.dashboard;

import java.util.List;
import java.util.Map;

public record DashboardContributionsResponse(
        long total,
        long allTotal,
        Map<String, TypeContribution> byType
) {
    public record TypeContribution(
            long total,
            List<DepartmentShare> departments
    ) {}

    public record DepartmentShare(
            String name,
            long count,
            double percentage
    ) {}
}
