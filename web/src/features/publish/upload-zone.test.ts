import { describe, expect, it } from 'vitest'
import * as mod from './upload-zone'

/**
 * upload-zone.tsx exports the UploadZone component. Package packing lives in
 * pack-skill-folder.ts; this test only guards the public module export.
 */
describe('upload-zone module exports', () => {
  it('exports the UploadZone component', () => {
    expect(mod.UploadZone).toBeDefined()
    expect(typeof mod.UploadZone).toBe('function')
  })
})
