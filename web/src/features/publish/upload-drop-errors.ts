import type { FileRejection } from 'react-dropzone'

/**
 * 将 react-dropzone 的 fileRejections 映射为 upload.* i18n key。
 * 无拒绝时返回 null。
 */
export function resolveDropRejectionMessageKey(rejections: FileRejection[]): string | null {
  if (rejections.length === 0) {
    return null
  }
  const codes = new Set(
    rejections.flatMap((rejection) => rejection.errors.map((error) => error.code)),
  )
  if (codes.has('file-invalid-type')) {
    return 'upload.fileTypeRejected'
  }
  if (codes.has('too-many-files')) {
    return 'upload.tooManyFiles'
  }
  return 'upload.fileRejected'
}
