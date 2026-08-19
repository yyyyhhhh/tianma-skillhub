import type { QueryClient } from '@tanstack/react-query'
import type { PagedResponse, SkillDetail, SkillSummary } from '@/api/types'

type SkillIdentity = {
  namespace: string
  slug: string
}

function normalizeNamespace(namespace: string): string {
  return namespace.startsWith('@') ? namespace.slice(1) : namespace
}

function matchesSkill(skill: SkillIdentity, target: SkillIdentity): boolean {
  return normalizeNamespace(skill.namespace) === normalizeNamespace(target.namespace) && skill.slug === target.slug
}

function incrementSummaryDownloadCount(skill: SkillSummary, target: SkillIdentity): SkillSummary {
  if (!matchesSkill(skill, target)) {
    return skill
  }
  return {
    ...skill,
    downloadCount: skill.downloadCount + 1,
  }
}

function incrementDetailDownloadCount(skill: SkillDetail | undefined, target: SkillIdentity): SkillDetail | undefined {
  if (!skill || !matchesSkill(skill, target)) {
    return skill
  }
  return {
    ...skill,
    downloadCount: skill.downloadCount + 1,
  }
}

function incrementSummaryList(
  skills: SkillSummary[] | undefined,
  target: SkillIdentity,
): SkillSummary[] | undefined {
  return skills?.map((skill) => incrementSummaryDownloadCount(skill, target))
}

function incrementPagedSummaryList(
  page: PagedResponse<SkillSummary> | undefined,
  target: SkillIdentity,
): PagedResponse<SkillSummary> | undefined {
  if (!page) {
    return page
  }
  return {
    ...page,
    items: page.items.map((skill) => incrementSummaryDownloadCount(skill, target)),
  }
}

function isSkillDetailQueryKey(key: readonly unknown[], target: SkillIdentity): boolean {
  return Array.isArray(key)
    && key[0] === 'skills'
    && typeof key[1] === 'string'
    && key[2] === target.slug
    && normalizeNamespace(key[1]) === normalizeNamespace(target.namespace)
    && key.length === 4
    && typeof key[3] === 'string'
    && key[3] !== 'versions'
}

export function incrementSkillDownloadCount(
  queryClient: QueryClient,
  target: SkillIdentity,
): void {
  // Detail queries are keyed as ['skills', ns, slug, locale].
  queryClient.setQueriesData<SkillDetail>(
    {
      predicate: (query) => isSkillDetailQueryKey(query.queryKey, target),
    },
    (current) => incrementDetailDownloadCount(current, target),
  )
  queryClient.setQueryData<SkillSummary[]>(
    ['skills', 'my'],
    (current) => incrementSummaryList(current, target),
  )
  queryClient.setQueryData<SkillSummary[]>(
    ['skills', 'stars'],
    (current) => incrementSummaryList(current, target),
  )
  queryClient.setQueriesData<PagedResponse<SkillSummary>>(
    { queryKey: ['skills', 'search'] },
    (current) => incrementPagedSummaryList(current, target),
  )
}

export function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) {
    return null
  }
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/^"|"$/g, ''))
    } catch {
      return utf8Match[1].trim().replace(/^"|"$/g, '')
    }
  }
  const plainMatch = /filename="?([^";]+)"?/i.exec(header)
  return plainMatch?.[1]?.trim() ?? null
}
