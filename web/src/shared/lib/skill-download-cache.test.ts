import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import type { PagedResponse, SkillDetail, SkillSummary } from '@/api/types'
import { getSkillDetailQueryKey } from '@/shared/hooks/query-keys'
import { incrementSkillDownloadCount, parseContentDispositionFilename } from './skill-download-cache'

const publishedLifecycleVersion = {
  id: 100,
  version: '1.0.0',
  status: 'PUBLISHED',
} as const

function createSkillSummary(overrides: Partial<SkillSummary> = {}): SkillSummary {
  return {
    id: 1,
    slug: 'demo-skill',
    displayName: 'Demo Skill',
    summary: 'summary',
    status: 'PUBLISHED',
    downloadCount: 10,
    starCount: 2,
    ratingAvg: 5,
    ratingCount: 1,
    namespace: 'team',
    updatedAt: '2026-03-16T00:00:00Z',
    canSubmitPromotion: false,
    headlineVersion: publishedLifecycleVersion,
    publishedVersion: publishedLifecycleVersion,
    ownerPreviewVersion: undefined,
    resolutionMode: 'PUBLISHED',
    ...overrides,
  }
}

function createSkillDetail(overrides: Partial<SkillDetail> = {}): SkillDetail {
  return {
    id: 1,
    slug: 'demo-skill',
    displayName: 'Demo Skill',
    summary: 'summary',
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    downloadCount: 10,
    starCount: 2,
    ratingAvg: 5,
    ratingCount: 1,
    hidden: false,
    namespace: 'team',
    canManageLifecycle: false,
    canSubmitPromotion: false,
    canInteract: true,
    canReport: true,
    headlineVersion: publishedLifecycleVersion,
    publishedVersion: publishedLifecycleVersion,
    ownerPreviewVersion: undefined,
    resolutionMode: 'PUBLISHED',
    ...overrides,
  }
}

describe('incrementSkillDownloadCount', () => {
  it('increments the skill detail and cached list entries for the downloaded skill', () => {
    const queryClient = new QueryClient()
    const searchPage: PagedResponse<SkillSummary> = {
      items: [
        createSkillSummary(),
        createSkillSummary({ id: 2, slug: 'other-skill', displayName: 'Other Skill', downloadCount: 4 }),
      ],
      total: 2,
      page: 0,
      size: 12,
    }

    const detailKey = getSkillDetailQueryKey('@team', 'demo-skill')
    queryClient.setQueryData(detailKey, createSkillDetail({ namespace: 'team' }))
    queryClient.setQueryData(['skills', 'my'], searchPage.items)
    queryClient.setQueryData(['skills', 'stars'], searchPage.items)
    queryClient.setQueryData(['skills', 'search', { q: '', sort: 'downloads', page: 0, size: 12, starredOnly: false }], searchPage)

    incrementSkillDownloadCount(queryClient, { namespace: '@team', slug: 'demo-skill' })

    expect(queryClient.getQueryData<SkillDetail>(detailKey)?.downloadCount).toBe(11)
    expect(queryClient.getQueryData<SkillSummary[]>(['skills', 'my'])?.[0]?.downloadCount).toBe(11)
    expect(queryClient.getQueryData<SkillSummary[]>(['skills', 'stars'])?.[0]?.downloadCount).toBe(11)
    expect(
      queryClient.getQueryData<PagedResponse<SkillSummary>>(
        ['skills', 'search', { q: '', sort: 'downloads', page: 0, size: 12, starredOnly: false }],
      )?.items[0]?.downloadCount,
    ).toBe(11)
    expect(
      queryClient.getQueryData<PagedResponse<SkillSummary>>(
        ['skills', 'search', { q: '', sort: 'downloads', page: 0, size: 12, starredOnly: false }],
      )?.items[1]?.downloadCount,
    ).toBe(4)
  })
})

describe('parseContentDispositionFilename', () => {
  it('parses plain and utf-8 filenames', () => {
    expect(parseContentDispositionFilename('attachment; filename="demo.zip"')).toBe('demo.zip')
    expect(parseContentDispositionFilename("attachment; filename*=UTF-8''Jsct%20Aaa.zip")).toBe('Jsct Aaa.zip')
  })
})
