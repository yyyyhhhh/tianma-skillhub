import { buildZipFile, type ZipEntryInput } from './build-minimal-skill-zip'

const SKIP_NAMES = new Set(['.ds_store', 'thumbs.db'])
const SKIP_DIRS = new Set(['.git', 'node_modules', '__macosx'])

export const MAX_FOLDER_FILE_COUNT = 500
export const MAX_FOLDER_FILE_SIZE = 10 * 1024 * 1024
export const MAX_FOLDER_TOTAL_SIZE = 100 * 1024 * 1024

export type PublishPackageSource = 'zip' | 'folder'

/** 发布页选包结果：始终带可上传 zip，并标明来源便于展示。 */
export type PublishPackageSelection = {
  file: File
  source: PublishPackageSource
  displayName: string
}

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

type FileWithDropPath = File & {
  path?: string
  relativePath?: string
}

export function filePackagePath(file: File): string {
  const withPath = file as FileWithDropPath
  const webkitPath = withPath.webkitRelativePath?.trim()
  if (webkitPath) {
    return webkitPath.replace(/\\/g, '/')
  }
  // react-dropzone/file-selector 拖拽目录时写入 path，形如 /folder/SKILL.md
  const dropPath = (withPath.relativePath || withPath.path || '').trim()
  if (dropPath) {
    return dropPath.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '')
  }
  return file.name.replace(/\\/g, '/')
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

export function folderDisplayName(root: string, preferredName?: string): string {
  const segment = root.split('/').filter(Boolean).pop() || preferredName?.trim()
  return (segment || 'skill').replace(/\.zip$/i, '')
}

function folderZipName(root: string, preferredName?: string): string {
  return `${folderDisplayName(root, preferredName)}.zip`
}

/**
 * Drag-drop 文件夹时的次要回退：从 DataTransfer 取目录名。
 * 主路径应依赖 file.path / webkitRelativePath。
 */
export function extractDroppedFolderName(event: unknown): string | undefined {
  if (!event || typeof event !== 'object') {
    return undefined
  }

  let dataTransfer: DataTransfer | null = null
  if ('dataTransfer' in event) {
    dataTransfer = (event as DragEvent).dataTransfer
  } else if ('nativeEvent' in event) {
    const nativeEvent = (event as { nativeEvent?: DragEvent }).nativeEvent
    dataTransfer = nativeEvent?.dataTransfer ?? null
  }
  if (!dataTransfer?.items?.length) {
    return undefined
  }

  const directoryNames: string[] = []
  for (let index = 0; index < dataTransfer.items.length; index += 1) {
    const item = dataTransfer.items[index]
    if (item.kind !== 'file') {
      continue
    }
    const entry = item.webkitGetAsEntry?.()
    if (entry?.isDirectory && entry.name) {
      directoryNames.push(entry.name)
    }
  }
  return directoryNames.length === 1 ? directoryNames[0] : undefined
}

export async function packSkillFolder(
  files: File[],
  preferredName?: string,
): Promise<PublishPackageSelection> {
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

  const displayName = folderDisplayName(root, preferredName)
  const file = await buildZipFile(entries, folderZipName(root, preferredName))
  return { file, source: 'folder', displayName }
}

export async function resolvePublishPackage(
  files: File[],
  preferredName?: string,
): Promise<PublishPackageSelection> {
  if (files.length === 0) {
    throw new PackSkillFolderError('upload.folderEmpty')
  }
  if (files.length === 1 && isPlainZip(files[0])) {
    return {
      file: files[0],
      source: 'zip',
      displayName: files[0].name,
    }
  }
  return packSkillFolder(files, preferredName)
}
