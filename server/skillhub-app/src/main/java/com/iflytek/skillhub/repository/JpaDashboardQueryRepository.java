package com.iflytek.skillhub.repository;

import com.iflytek.skillhub.dto.dashboard.DashboardContributionsResponse;
import com.iflytek.skillhub.dto.dashboard.DashboardMetricsResponse;
import com.iflytek.skillhub.dto.dashboard.DashboardSummaryResponse;
import com.iflytek.skillhub.dto.dashboard.DashboardTopItemResponse;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Repository;

/**
 * Aggregates ACP-style ops dashboard metrics from skill rows.
 *
 * <p>Uses native SQL because the dashboard needs multi-dimensional group-bys
 * that do not map cleanly onto domain repository ports.
 */
@Repository
public class JpaDashboardQueryRepository implements DashboardQueryRepository {

    private static final List<String> TYPES = List.of("SKILL");

    private final EntityManager entityManager;

    public JpaDashboardQueryRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    public DashboardSummaryResponse summary() {
        Object[] totals = (Object[]) entityManager.createNativeQuery("""
                SELECT COUNT(*),
                       COALESCE(SUM(download_count), 0),
                       COALESCE(SUM(view_count), 0),
                       COALESCE(SUM(CASE WHEN visibility = 'PUBLIC' THEN 1 ELSE 0 END), 0),
                       COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END), 0),
                       COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END), 0),
                       COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '14 days'
                                           AND created_at < NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END), 0)
                FROM skill
                WHERE status = 'ACTIVE' AND hidden = FALSE AND visibility = 'PUBLIC'
                """).getSingleResult();

        long total = asLong(totals[0]);
        long totalDownloads = asLong(totals[1]);
        long totalViews = asLong(totals[2]);
        long publicCount = asLong(totals[3]);
        long newThisWeek = asLong(totals[4]);
        long newThisMonth = asLong(totals[5]);
        long prevWeek = asLong(totals[6]);

        Map<String, Long> byType = countByType(null);
        Map<String, Long> newThisWeekByType = countByType("created_at >= NOW() - INTERVAL '7 days'");

        double openShare = total == 0 ? 0 : round2(publicCount * 100.0 / total);
        double skillGrowth = prevWeek == 0
                ? (newThisWeek > 0 ? 100.0 : 0.0)
                : round2((newThisWeek - prevWeek) * 100.0 / prevWeek);

        return new DashboardSummaryResponse(
                total,
                byType,
                totalDownloads,
                totalViews,
                skillGrowth,
                0,
                0,
                newThisWeek,
                newThisWeekByType,
                openShare,
                newThisMonth
        );
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<DashboardTopItemResponse> top10(String packageType) {
        String type = normalizeType(packageType);
        Query query = entityManager.createNativeQuery("""
                SELECT s.display_name, s.slug, n.slug AS namespace_slug,
                       s.download_count, s.view_count, s.department
                FROM skill s
                JOIN namespace n ON n.id = s.namespace_id
                WHERE s.status = 'ACTIVE' AND s.hidden = FALSE AND s.visibility = 'PUBLIC'
                  AND s.package_type = :packageType
                ORDER BY s.download_count DESC, s.view_count DESC, s.updated_at DESC
                LIMIT 10
                """);
        query.setParameter("packageType", type);
        List<Object[]> rows = query.getResultList();
        List<DashboardTopItemResponse> items = new ArrayList<>();
        for (Object[] row : rows) {
            items.add(new DashboardTopItemResponse(
                    stringOr(row[0], stringOr(row[1], "")),
                    stringOr(row[1], ""),
                    stringOr(row[2], "global"),
                    asLong(row[3]),
                    asLong(row[4]),
                    stringOr(row[5], "未分配职能")
            ));
        }
        return items;
    }

    @Override
    @SuppressWarnings("unchecked")
    public DashboardMetricsResponse metrics() {
        Object[] overall = (Object[]) entityManager.createNativeQuery("""
                SELECT COUNT(*),
                       COALESCE(SUM(CASE WHEN download_count > 0 THEN 1 ELSE 0 END), 0),
                       COALESCE(SUM(CASE WHEN view_count > 0 OR updated_at >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END), 0),
                       COALESCE(SUM(CASE WHEN visibility = 'PUBLIC' THEN 1 ELSE 0 END), 0)
                FROM skill
                WHERE status = 'ACTIVE' AND hidden = FALSE AND visibility = 'PUBLIC'
                """).getSingleResult();
        long total = asLong(overall[0]);
        double reuseRate = pct(asLong(overall[1]), total);
        double activityRate = pct(asLong(overall[2]), total);
        double openShareRate = pct(asLong(overall[3]), total);

        List<Object[]> deptRows = entityManager.createNativeQuery("""
                SELECT COALESCE(NULLIF(TRIM(department), ''), '未分配职能') AS dept,
                       COUNT(*) AS total,
                       COALESCE(SUM(CASE WHEN download_count > 0 THEN 1 ELSE 0 END), 0) AS reused,
                       COALESCE(SUM(CASE WHEN view_count > 0 OR updated_at >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END), 0) AS active,
                       COALESCE(SUM(CASE WHEN visibility = 'PUBLIC' THEN 1 ELSE 0 END), 0) AS open_cnt
                FROM skill
                WHERE status = 'ACTIVE' AND hidden = FALSE AND visibility = 'PUBLIC'
                GROUP BY 1
                ORDER BY total DESC
                """).getResultList();

        List<DashboardMetricsResponse.DepartmentMetric> departments = new ArrayList<>();
        for (Object[] row : deptRows) {
            long deptTotal = asLong(row[1]);
            departments.add(new DashboardMetricsResponse.DepartmentMetric(
                    stringOr(row[0], "未分配职能"),
                    deptTotal,
                    pct(asLong(row[2]), deptTotal),
                    pct(asLong(row[3]), deptTotal),
                    pct(deptTotal, total),
                    pct(asLong(row[4]), deptTotal)
            ));
        }

        return new DashboardMetricsResponse(total, reuseRate, activityRate, 100.0, openShareRate, departments);
    }

    @Override
    @SuppressWarnings("unchecked")
    public DashboardContributionsResponse contributions() {
        long total = asLong(entityManager.createNativeQuery("""
                SELECT COUNT(*) FROM skill
                WHERE status = 'ACTIVE' AND hidden = FALSE AND visibility = 'PUBLIC'
                """).getSingleResult());

        Map<String, DashboardContributionsResponse.TypeContribution> byType = new LinkedHashMap<>();
        for (String type : TYPES) {
            List<Object[]> rows = entityManager.createNativeQuery("""
                    SELECT COALESCE(NULLIF(TRIM(department), ''), '未分配职能') AS dept, COUNT(*) AS cnt
                    FROM skill
                    WHERE status = 'ACTIVE' AND hidden = FALSE AND visibility = 'PUBLIC'
                      AND package_type = :packageType
                    GROUP BY 1
                    ORDER BY cnt DESC
                    """)
                    .setParameter("packageType", type)
                    .getResultList();
            long typeTotal = rows.stream().mapToLong(r -> asLong(r[1])).sum();
            List<DashboardContributionsResponse.DepartmentShare> shares = new ArrayList<>();
            for (Object[] row : rows) {
                long count = asLong(row[1]);
                shares.add(new DashboardContributionsResponse.DepartmentShare(
                        stringOr(row[0], "未分配职能"),
                        count,
                        typeTotal == 0 ? 0 : round2(count * 100.0 / typeTotal)
                ));
            }
            byType.put(type, new DashboardContributionsResponse.TypeContribution(typeTotal, shares));
        }
        return new DashboardContributionsResponse(total, total, byType);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Long> countByType(String extraWhere) {
        String sql = """
                SELECT package_type, COUNT(*)
                FROM skill
                WHERE status = 'ACTIVE' AND hidden = FALSE AND visibility = 'PUBLIC'
                """;
        if (extraWhere != null && !extraWhere.isBlank()) {
            sql += " AND " + extraWhere;
        }
        sql += " GROUP BY package_type";
        List<Object[]> rows = entityManager.createNativeQuery(sql).getResultList();
        Map<String, Long> map = new LinkedHashMap<>();
        for (String type : TYPES) {
            map.put(type, 0L);
        }
        for (Object[] row : rows) {
            map.put(stringOr(row[0], "SKILL"), asLong(row[1]));
        }
        return map;
    }

    private static String normalizeType(String packageType) {
        return "SKILL";
    }

    private static long asLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }

    private static String stringOr(Object value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String text = value.toString();
        return text.isBlank() ? fallback : text;
    }

    private static double pct(long part, long total) {
        if (total <= 0) {
            return 0;
        }
        return round2(part * 100.0 / total);
    }

    private static double round2(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
