import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigateMock = vi.fn()
const useSearchMock = vi.fn()
const buttonRecords: Array<{ label: string; variant?: string | null; onClick?: (() => void) | undefined }> = []
const paginationProps: Array<{ onPageChange: (page: number) => void }> = []
const searchBarProps: Array<{ value?: string; onSearch?: (query: string) => void }> = []
const searchSkillParams: Array<Record<string, unknown>> = []

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  useSearch: () => useSearchMock(),
}))

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next')
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        if (options && typeof options.count === 'number') {
          return `${key}:${options.count}`
        }
        return key
      },
    }),
  }
})

vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
  }),
}))

vi.mock('@/features/search/search-bar', () => ({
  SearchBar: (props: { value?: string; onSearch?: (query: string) => void }) => {
    searchBarProps.push(props)
    return <div>search-bar</div>
  },
}))

vi.mock('@/features/skill/skill-card', () => ({
  SkillCard: () => <div>skill-card</div>,
}))

vi.mock('@/shared/components/skeleton-loader', () => ({
  SkeletonList: () => <div>skeleton</div>,
}))

vi.mock('@/shared/components/empty-state', () => ({
  EmptyState: ({ title, description }: { title: string; description?: string }) => (
    <div>
      empty-state
      <span>{title}</span>
      {description ? <span>{description}</span> : null}
    </div>
  ),
}))

vi.mock('@/shared/components/pagination', () => ({
  Pagination: (props: { onPageChange: (page: number) => void }) => {
    paginationProps.push(props)
    return <div>pagination</div>
  },
}))

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    onClick,
    variant,
  }: {
    children?: ReactNode
    onClick?: () => void
    variant?: string
  }) => {
    const label = Array.isArray(children) ? children.join('') : String(children ?? '')
    buttonRecords.push({ label, variant, onClick })
    return <button data-variant={variant}>{children}</button>
  },
}))

vi.mock('@/app/page-shell-style', () => ({
  APP_SHELL_PAGE_CLASS_NAME: 'page-shell',
}))

const useSearchSkillsMock = vi.fn()

vi.mock('@/shared/hooks/use-skill-queries', () => ({
  useSearchSkills: (params: Record<string, unknown>) => {
    searchSkillParams.push(params)
    return useSearchSkillsMock()
  },
}))

vi.mock('@/shared/hooks/use-label-queries', () => ({
  useVisibleLabels: () => ({
    data: [
      { slug: 'scope-zhimou', type: 'RECOMMENDED', displayName: '智谋', parentSlug: null },
      { slug: 'scope-zhice', type: 'RECOMMENDED', displayName: '智测', parentSlug: null },
      { slug: 'req-analysis', type: 'RECOMMENDED', displayName: '需求分析', parentSlug: 'scope-zhimou' },
    ],
  }),
}))

vi.mock('@/shared/hooks/use-dashboard-queries', () => ({
  useAssetDepartments: () => ({
    data: ['域名管理产品部', '溯源产品部'],
  }),
}))

vi.mock('@/shared/hooks/use-user-queries', () => ({
  useMyStars: () => ({
    data: [],
    isLoading: false,
    isFetching: false,
  }),
}))

import { SearchPage } from './search'

function findButton(label: string) {
  const record = buttonRecords.find((item) => item.label === label)
  if (!record) {
    throw new Error(`Missing button: ${label}`)
  }
  return record
}

describe('SearchPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    buttonRecords.length = 0
    paginationProps.length = 0
    searchBarProps.length = 0
    searchSkillParams.length = 0
    useSearchMock.mockReturnValue({
      q: 'agent',
      namespace: 'team-ai',
      label: 'req-analysis',
      sort: 'downloads',
      page: 1,
      starredOnly: false,
    })
    useSearchSkillsMock.mockReturnValue({
      data: {
        items: [{ id: 1, displayName: 'Demo Skill', summary: 'summary', namespace: 'global', slug: 'demo', downloadCount: 1, starCount: 1, ratingCount: 0, updatedAt: '2026-03-20T00:00:00Z', canSubmitPromotion: false }],
        total: 24,
        page: 1,
        size: 12,
      },
      isLoading: false,
      isFetching: false,
    })
  })

  it('renders the three filter rows and marks the selected tag as active', () => {
    const html = renderToStaticMarkup(<SearchPage />)

    expect(html).toContain('search.filters.businessCategory')
    expect(html).toContain('search.filters.department')
    expect(html).toContain('search.filters.tags')
    expect(html).toContain('#需求分析')
    expect(findButton('#需求分析').variant).toBe('default')
    expect(findButton('智谋').variant).toBe('default')
    expect(findButton('智测').variant).toBe('outline')
    expect(findButton('域名管理产品部').variant).toBe('outline')
  })

  it('wraps the filter chip row so many labels can flow onto multiple lines', () => {
    const html = renderToStaticMarkup(<SearchPage />)

    expect(html).toContain('flex flex-wrap items-center gap-2')
  })

  it('toggles the selected tag off and resets paging', () => {
    renderToStaticMarkup(<SearchPage />)

    findButton('#需求分析').onClick?.()

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/search',
      search: {
        q: 'agent',
        namespace: 'team-ai',
        label: '',
        sort: 'downloads',
        page: 0,
        starredOnly: false,
      },
    })
  })

  it('preserves the active label when changing sort', () => {
    renderToStaticMarkup(<SearchPage />)

    findButton('search.sort.newest').onClick?.()

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/search',
      search: {
        q: 'agent',
        namespace: 'team-ai',
        label: 'req-analysis',
        sort: 'newest',
        page: 0,
        starredOnly: false,
      },
    })
  })

  it('preserves the active label when paging and when toggling starred-only', () => {
    renderToStaticMarkup(<SearchPage />)

    paginationProps[0]?.onPageChange(2)
    findButton('search.filterStarred').onClick?.()

    expect(navigateMock).toHaveBeenNthCalledWith(1, {
      to: '/search',
      search: {
        q: 'agent',
        namespace: 'team-ai',
        label: 'req-analysis',
        sort: 'downloads',
        page: 2,
        starredOnly: false,
      },
    })
    expect(navigateMock).toHaveBeenNthCalledWith(2, {
      to: '/search',
      search: {
        q: 'agent',
        namespace: 'team-ai',
        label: 'req-analysis',
        sort: 'downloads',
        page: 0,
        starredOnly: true,
      },
    })
  })

  it('passes the namespace URL state into skill search', () => {
    renderToStaticMarkup(<SearchPage />)

    expect(searchSkillParams[0]).toMatchObject({
      q: 'agent',
      namespace: 'team-ai',
      label: 'req-analysis',
      sort: 'downloads',
      page: 1,
      size: 12,
    })
  })

  it('extracts a leading namespace token from the search input', () => {
    renderToStaticMarkup(<SearchPage />)

    searchBarProps[0]?.onSearch?.('@product-team onboarding')

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/search',
      search: {
        q: 'onboarding',
        namespace: 'product-team',
        label: 'req-analysis',
        sort: 'downloads',
        page: 0,
        starredOnly: false,
      },
      replace: true,
    })
  })

  it('renders the default skill list when the empty query still returns items', () => {
    useSearchMock.mockReturnValue({
      q: '',
      label: '',
      sort: 'newest',
      page: 0,
      starredOnly: false,
    })
    useSearchSkillsMock.mockReturnValue({
      data: {
        items: [{ id: 1, displayName: 'Demo Skill', summary: 'summary', namespace: 'global', slug: 'demo', downloadCount: 1, starCount: 1, ratingCount: 0, updatedAt: '2026-03-20T00:00:00Z', canSubmitPromotion: false }],
        total: 1,
        page: 0,
        size: 12,
      },
      isLoading: false,
      isFetching: false,
    })

    const html = renderToStaticMarkup(<SearchPage />)

    expect(html).toContain('skill-card')
    expect(html).not.toContain('empty-state')
  })

  it('shows a generic empty state when the default discovery list is empty', () => {
    useSearchMock.mockReturnValue({
      q: '',
      label: '',
      sort: 'newest',
      page: 0,
      starredOnly: false,
    })
    useSearchSkillsMock.mockReturnValue({
      data: {
        items: [],
        total: 0,
        page: 0,
        size: 12,
      },
      isLoading: false,
      isFetching: false,
    })

    const html = renderToStaticMarkup(<SearchPage />)

    expect(html).toContain('empty-state')
    expect(html).toContain('search.noResults')
    expect(html).not.toContain('search.enterKeyword')
  })

  it('filters by functional department pills', () => {
    renderToStaticMarkup(<SearchPage />)

    findButton('域名管理产品部').onClick?.()

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/search',
      search: {
        q: 'agent',
        namespace: 'team-ai',
        label: 'req-analysis',
        sort: 'downloads',
        starredOnly: false,
        department: '域名管理产品部',
        page: 0,
      },
    })
  })
})
