package com.iflytek.skillhub.dto.dashboard;

import java.util.Map;

public record DashboardSummaryResponse(
        long total,
        Map<String, Long> byType,
        long totalDownloads,
        long totalViews,
        double skillGrowth,
        double downloadGrowth,
        double viewGrowth,
        long newThisWeek,
        Map<String, Long> newThisWeekByType,
        double overallOpenShareRate,
        long newThisMonth
) {}
