import { describe, expect, it } from 'vitest'
import type { FileRejection } from 'react-dropzone'
import { resolveDropRejectionMessageKey } from './upload-drop-errors'

function rejection(code: string): FileRejection {
  return {
    file: new File(['x'], 'notes.txt'),
    errors: [{ code, message: code }],
  }
}

describe('resolveDropRejectionMessageKey', () => {
  it('returns null when there are no rejections', () => {
    expect(resolveDropRejectionMessageKey([])).toBeNull()
  })

  it('maps invalid type rejections to fileTypeRejected', () => {
    expect(resolveDropRejectionMessageKey([rejection('file-invalid-type')])).toBe(
      'upload.fileTypeRejected',
    )
  })

  it('maps too-many-files rejections', () => {
    expect(resolveDropRejectionMessageKey([rejection('too-many-files')])).toBe(
      'upload.tooManyFiles',
    )
  })
})
