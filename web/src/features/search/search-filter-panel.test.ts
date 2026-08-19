import { describe, expect, it } from 'vitest'
import * as mod from './search-filter-panel'

describe('search-filter-panel module exports', () => {
  it('exports the SearchFilterPanel component', () => {
    expect(mod.SearchFilterPanel).toBeDefined()
    expect(typeof mod.SearchFilterPanel).toBe('function')
  })
})
