import { describe, expect, it } from 'vitest'
import {
  findScopeForLabelSlug,
  getAllBusinessSubTags,
  isBusinessScopeSlug,
  listBusinessSubTagOptions,
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
})
