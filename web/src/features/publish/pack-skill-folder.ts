import { buildZipFile, type ZipEntryInput } from './build-minimal-skill-zip'

const SKIP_NAMES = new Set(['.ds_store', 'thumbs.db'])
const SKIP_DIRS = new Set(['.git', 'node_modules', '__macosx'])

export const MAX_FOLDER_FILE_COUNT = 500
export const MAX_FOLDER_FILE_SIZE = 10 * 1024 * 1024
export const MAX_FOLDER_TOTAL_SIZE = 100 * 1024 * 1024

export class PackSkillFolderError extends Error {
  readonly key: string
  readonly params?: Record<string, string | number>

  constructor(key: string, params?: Record<string, string | number>) {
    super(key)
    this.name = 'PackSkillFolderError'
    this.key = key
    this.params = params
  }
}

export function filePackagePath(file: File): string {
  const relative = file.webkitRelativePath?.trim()
  const raw = relative && relative.length > 0 ? relative : file.name
  return raw.replace(/\\/g, '/')
}

export function shouldSkipPackagePath(path: string): boolean {
  return path.split('/').filter(Boolean).some((part) => {
    const lower = part.toLowerCase()
    return SKIP_DIRS.has(lower) || SKIP_NAMES.has(lower)
  })
}

export function resolveSkillPackageRoot(paths: string[]): string | null {
  const skillMdPaths = paths
    .filter((path) => path.split('/').pop() === 'SKILL.md')
    .sort((left, right) => left.split('/').length - right.split('/').length || left.length - right.length)

  const skillMd = skillMdPaths[0]
  if (!skillMd) {
    return null
  }
  const slash = skillMd.lastIndexOf('/')
  return slash === -1 ? '' : skillMd.slice(0, slash)
}

function isPlainZip(file: File): boolean {
  const path = filePackagePath(file)
  if (!path.toLowerCase().endsWith('.zip')) {
    return false
  }
  return path.split('/').filter(Boolean).length <= 1
}

function folderZipName(root: string): string {
  const segment = root.split('/').filter(Boolean).pop()
  const base = (segment || 'skill').replace(/\.zip$/i, '')
  return `${base}.zip`
}

export async function packSkillFolder(files: File[]): Promise<File> {
  const kept = files.filter((file) => !shouldSkipPackagePath(filePackagePath(file)))
  if (kept.length === 0) {
    throw new PackSkillFolderError('upload.folderEmpty')
  }

  const root = resolveSkillPackageRoot(kept.map(filePackagePath))
  if (root === null) {
    throw new PackSkillFolderError('upload.folderMissingSkillMd')
  }

  const prefix = root === '' ? '' : `${root}/`
  const entries: ZipEntryInput[] = []
  let totalSize = 0

  for (const file of kept) {
    const path = filePackagePath(file)
    if (prefix && !path.startsWith(prefix)) {
      continue
    }
    const relative = prefix ? path.slice(prefix.length) : path
    if (!relative || relative.endsWith('/')) {
      continue
    }
    if (relative.includes('..')) {
      continue
    }
    if (file.size > MAX_FOLDER_FILE_SIZE) {
      throw new PackSkillFolderError('upload.folderFileTooLarge', { file: relative })
    }
    totalSize += file.size
    if (totalSize > MAX_FOLDER_TOTAL_SIZE) {
      throw new PackSkillFolderError('upload.folderTooLarge')
    }
    entries.push({
      path: relative,
      content: new Uint8Array(await file.arrayBuffer()),
    })
  }

  if (entries.length === 0) {
    throw new PackSkillFolderError('upload.folderEmpty')
  }
  if (entries.length > MAX_FOLDER_FILE_COUNT) {
    throw new PackSkillFolderError('upload.folderTooManyFiles', { count: MAX_FOLDER_FILE_COUNT })
  }
  if (!entries.some((entry) => entry.path === 'SKILL.md')) {
    throw new PackSkillFolderError('upload.folderMissingSkillMd')
  }

  return buildZipFile(entries, folderZipName(root))
}

export async function resolvePublishPackage(files: File[]): Promise<File> {
  if (files.length === 0) {
    throw new PackSkillFolderError('upload.folderEmpty')
  }
  if (files.length === 1 && isPlainZip(files[0])) {
    return files[0]
  }
  return packSkillFolder(files)
}
