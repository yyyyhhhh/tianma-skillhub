import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  useDashboardContributions,
  useDashboardMetrics,
  useDashboardSummary,
  useDashboardTop10,
} from '@/shared/hooks/use-dashboard-queries'
import { formatCompactCount } from '@/shared/lib/number-format'

/**
 * ACP-style workbench: asset counts by type, department metrics, top lists, contributions.
 */
export function OpsBoard() {
  const { t, i18n } = useTranslation()
  const locale = i18n?.resolvedLanguage ?? i18n?.language ?? 'zh'
  const { data: summary } = useDashboardSummary()
  const { data: metrics } = useDashboardMetrics()
  const { data: contributions } = useDashboardContributions()
  const skillTop = useDashboardTop10('SKILL')
  const skillContributions = contributions?.byType?.SKILL

  const updatedAt = new Date().toLocaleTimeString(locale.startsWith('zh') ? 'zh-CN' : 'en-US')

  return (
    <section className="space-y-10 animate-fade-up">
      <div className="text-center space-y-2">
        <h3 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
          {t('opsBoard.title')}
        </h3>
        <p className="text-sm md:text-base max-w-3xl mx-auto" style={{ color: 'hsl(var(--text-secondary))' }}>
          {t('opsBoard.subtitle')}
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: 'hsl(var(--border-card))' }}>
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">{t('opsBoard.totalAssets')}</p>
            <p className="text-4xl font-bold text-brand-gradient">{formatCompactCount(summary?.total ?? 0)}</p>
          </div>
          <p className="text-xs text-muted-foreground">{t('opsBoard.updatedAt', { time: updatedAt })}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <MetricCard label={t('opsBoard.totalDownloads')} value={summary?.totalDownloads ?? 0} />
          <MetricCard label={t('opsBoard.totalViews')} value={summary?.totalViews ?? 0} />
          <MetricCard label={t('opsBoard.openShareRate')} value={`${summary?.overallOpenShareRate ?? 0}%`} />
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm overflow-x-auto" style={{ borderColor: 'hsl(var(--border-card))' }}>
        <h4 className="text-lg font-semibold mb-1">{t('opsBoard.deptOverview')}</h4>
        <p className="text-sm text-muted-foreground mb-4">{t('opsBoard.deptOverviewHint')}</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="py-2 pr-3 font-medium">{t('opsBoard.colDepartment')}</th>
              <th className="py-2 pr-3 font-medium">{t('opsBoard.colTotal')}</th>
              <th className="py-2 pr-3 font-medium">{t('opsBoard.colReuse')}</th>
              <th className="py-2 pr-3 font-medium">{t('opsBoard.colActivity')}</th>
              <th className="py-2 pr-3 font-medium">{t('opsBoard.colContribution')}</th>
              <th className="py-2 font-medium">{t('opsBoard.colOpenShare')}</th>
            </tr>
          </thead>
          <tbody>
            {(metrics?.departments ?? []).map((row) => (
              <tr key={row.department} className="border-b last:border-0">
                <td className="py-2.5 pr-3">{row.department}</td>
                <td className="py-2.5 pr-3">{row.total} {t('opsBoard.items')}</td>
                <td className="py-2.5 pr-3">{row.reuseRate}%</td>
                <td className="py-2.5 pr-3">{row.activityRate}%</td>
                <td className="py-2.5 pr-3">{row.contributionRate}%</td>
                <td className="py-2.5">{row.openShareRate}%</td>
              </tr>
            ))}
            {(metrics?.departments?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted-foreground">{t('opsBoard.empty')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h4 className="text-lg font-semibold mb-4">{t('opsBoard.hotAssets')}</h4>
        <TopTable title={t('opsBoard.hotAssets')} items={skillTop.data ?? []} />
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: 'hsl(var(--border-card))' }}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold">{t('opsBoard.contributions')}</h4>
          <span className="text-sm text-muted-foreground">
            {t('opsBoard.totalCount', { count: contributions?.total ?? 0 })}
          </span>
        </div>
        <ul className="space-y-1.5 text-sm">
          {(skillContributions?.departments ?? []).slice(0, 12).map((dept) => (
            <li key={dept.name} className="flex justify-between gap-2 text-muted-foreground">
              <span className="truncate">{dept.name}</span>
              <span>{dept.count} / {dept.percentage}%</span>
            </li>
          ))}
          {(skillContributions?.departments?.length ?? 0) === 0 && (
            <li className="text-muted-foreground">{t('opsBoard.empty')}</li>
          )}
        </ul>
      </div>
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-1">
        {typeof value === 'number' ? formatCompactCount(value) : value}
      </p>
    </div>
  )
}

function TopTable({
  title,
  items,
}: {
  title: string
  items: Array<{ name: string; slug: string; namespaceSlug: string; downloads: number; views: number; department: string }>
}) {
  const { t } = useTranslation()
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: 'hsl(var(--border-card))' }}>
      <h5 className="font-semibold mb-3">{title}</h5>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b">
            <th className="py-1.5 pr-2 font-medium">{t('opsBoard.colName')}</th>
            <th className="py-1.5 pr-2 font-medium">{t('opsBoard.colDepartment')}</th>
            <th className="py-1.5 pr-2 font-medium">{t('opsBoard.colViews')}</th>
            <th className="py-1.5 font-medium">{t('opsBoard.colDownloads')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.namespaceSlug}/${item.slug}`} className="border-b last:border-0">
              <td className="py-2 pr-2">
                <Link
                  to="/space/$namespace/$slug"
                  params={{ namespace: item.namespaceSlug, slug: item.slug }}
                  className="hover:text-primary truncate block max-w-[10rem]"
                >
                  {item.name}
                </Link>
              </td>
              <td className="py-2 pr-2 text-muted-foreground truncate max-w-[7rem]">{item.department}</td>
              <td className="py-2 pr-2">{item.views}</td>
              <td className="py-2">{item.downloads}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-muted-foreground">{t('opsBoard.empty')}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
