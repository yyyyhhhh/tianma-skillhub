import { describe, expect, it } from 'vitest'
import {
  findScopeForLabelSlug,
  getAllBusinessSubTags,
  isBusinessScopeSlug,
  listBusinessSubTagOptions,
  listManagedScopeLabels,
  listManagedSubTagLabels,
  slugForBusinessLabel,
} from './business-scope'

describe('business-scope search helpers', () => {
  it('maps display names to the seeded ASCII slugs', () => {
    expect(slugForBusinessLabel('智测')).toBe('scope-zhice')
    expect(slugForBusinessLabel('接口测试')).toBe('api-test')
    expect(isBusinessScopeSlug('scope-zhice')).toBe(true)
    expect(isBusinessScopeSlug('api-test')).toBe(false)
  })

  it('resolves a selected slug back to its business scope', () => {
    expect(findScopeForLabelSlug('scope-zhima')).toBe('智码')
    expect(findScopeForLabelSlug('req-analysis')).toBe('智谋')
    expect(findScopeForLabelSlug('unknown')).toBeUndefined()
  })

  it('lists all catalog sub-tags and can narrow them by scope', () => {
    expect(getAllBusinessSubTags()).toHaveLength(32)
    expect(listBusinessSubTagOptions('智御').map((item) => item.displayName)).toEqual([
      '渗透测试',
      '安全扫描',
      '漏洞验证',
    ])
  })

  it('keeps publish/search pickers aligned with managed label records', () => {
    const labels = [
      { slug: 'scope-zhice', type: 'RECOMMENDED', displayName: '智测' },
      { slug: 'api-test', type: 'RECOMMENDED', displayName: '接口测试' },
      { slug: 'func-test', type: 'RECOMMENDED', displayName: '功能测试' },
      { slug: 'custom-label', type: 'RECOMMENDED', displayName: '自定义' },
      { slug: 'verified', type: 'PRIVILEGED', displayName: '官方' },
    ]

    expect(listManagedScopeLabels(labels).map((item) => item.slug)).toEqual(['scope-zhice'])
    expect(listManagedSubTagLabels(labels, 'scope-zhice').map((item) => item.slug)).toEqual([
      'api-test',
      'func-test',
      'custom-label',
    ])
    expect(listManagedSubTagLabels(labels, 'scope-zhima').map((item) => item.slug)).toEqual(['custom-label'])
  })

  it('groups publish/search pickers by managed parentSlug when the API provides it', () => {
    const labels = [
      { slug: 'scope-zhimou', type: 'RECOMMENDED', displayName: '智谋', parentSlug: null },
      { slug: 'scope-zhice', type: 'RECOMMENDED', displayName: '智测', parentSlug: null },
      { slug: 'req-analysis', type: 'RECOMMENDED', displayName: '需求分析', parentSlug: 'scope-zhimou' },
      { slug: 'api-test', type: 'RECOMMENDED', displayName: '接口测试', parentSlug: 'scope-zhice' },
      { slug: 'custom-root', type: 'RECOMMENDED', displayName: '自定义根', parentSlug: null },
      { slug: 'custom-child', type: 'RECOMMENDED', displayName: '自定义子', parentSlug: 'custom-root' },
      { slug: 'verified', type: 'PRIVILEGED', displayName: '官方', parentSlug: null },
    ]

    expect(listManagedScopeLabels(labels).map((item) => item.slug)).toEqual([
      'scope-zhimou',
      'scope-zhice',
      'custom-root',
    ])
    expect(listManagedSubTagLabels(labels, 'scope-zhimou').map((item) => item.slug)).toEqual(['req-analysis'])
    expect(listManagedSubTagLabels(labels, 'req-analysis').map((item) => item.slug)).toEqual(['req-analysis'])
    expect(listManagedSubTagLabels(labels, 'custom-root').map((item) => item.slug)).toEqual(['custom-child'])
    expect(listManagedSubTagLabels(labels, 'scope-zhice').map((item) => item.slug)).toEqual(['api-test'])
  })
})
