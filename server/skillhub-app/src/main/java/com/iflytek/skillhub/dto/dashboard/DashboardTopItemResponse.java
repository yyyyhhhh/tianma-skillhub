package com.iflytek.skillhub.dto.dashboard;

public record DashboardTopItemResponse(
        String name,
        String slug,
        String namespaceSlug,
        long downloads,
        long views,
        String department
) {}
