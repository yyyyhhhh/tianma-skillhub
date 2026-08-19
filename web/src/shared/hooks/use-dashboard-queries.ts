import { useQuery } from '@tanstack/react-query'
import { fetchJson, WEB_API_PREFIX } from '@/api/client'

export interface DashboardSummary {
  total: number
  byType: Record<string, number>
  totalDownloads: number
  totalViews: number
  skillGrowth: number
  downloadGrowth: number
  viewGrowth: number
  newThisWeek: number
  newThisWeekByType: Record<string, number>
  overallOpenShareRate: number
  newThisMonth: number
}

export interface DashboardTopItem {
  name: string
  slug: string
  namespaceSlug: string
  downloads: number
  views: number
  department: string
}

export interface DashboardMetrics {
  total: number
  reuseRate: number
  activityRate: number
  contributionRate: number
  openShareRate: number
  departments: Array<{
    department: string
    total: number
    reuseRate: number
    activityRate: number
    contributionRate: number
    openShareRate: number
  }>
}

export interface DashboardContributions {
  total: number
  allTotal: number
  byType: Record<string, {
    total: number
    departments: Array<{ name: string; count: number; percentage: number }>
  }>
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => fetchJson<DashboardSummary>(`${WEB_API_PREFIX}/dashboard/summary`),
  })
}

export function useDashboardTop10(type: string) {
  return useQuery({
    queryKey: ['dashboard', 'top10', type],
    queryFn: () => fetchJson<DashboardTopItem[]>(`${WEB_API_PREFIX}/dashboard/top10?type=${encodeURIComponent(type)}`),
  })
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => fetchJson<DashboardMetrics>(`${WEB_API_PREFIX}/dashboard/metrics`),
  })
}

export function useDashboardContributions() {
  return useQuery({
    queryKey: ['dashboard', 'contributions'],
    queryFn: () => fetchJson<DashboardContributions>(`${WEB_API_PREFIX}/dashboard/contributions`),
  })
}

export function useAssetDepartments() {
  return useQuery({
    queryKey: ['asset-meta', 'departments'],
    queryFn: () => fetchJson<string[]>(`${WEB_API_PREFIX}/asset-meta/departments`),
    staleTime: 60_000,
  })
}

export function useBusinessScopes() {
  return useQuery({
    queryKey: ['asset-meta', 'business-scopes'],
    queryFn: async () => {
      try {
        return await fetchJson<string[]>(`${WEB_API_PREFIX}/asset-meta/business-scopes`)
      } catch {
        // Fallback to built-in ACP-style scopes when API is unavailable.
        return ['智谋', '智码', '智测', '智御', '智运', '其他']
      }
    },
    staleTime: 60_000,
    retry: false,
    meta: { skipGlobalErrorHandler: true },
  })
}
