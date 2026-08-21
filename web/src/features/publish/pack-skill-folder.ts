import { buildZipFile, type ZipEntryInput } from './build-minimal-skill-zip'

const SKIP_NAMES = new Set(['.ds_store', 'thumbs.db'])
const SKIP_DIRS = new Set(['.git', 'node_modules', '__macosx'])

export const MAX_FOLDER_FILE_COUNT = 500
export const MAX_FOLDER_FILE_SIZE = 10 * 1024 * 1024
export const MAX_FOLDER_TOTAL_SIZE = 100 * 1024 * 1024

/** 与后端 SkillPackagePolicy.ALLOWED_EXTENSIONS 对齐 */
export const ALLOWED_PACKAGE_EXTENSIONS = [
  '.md',
  '.txt',
  '.json',
  '.yaml',
  '.yml',
  '.html',
  '.css',
  '.csv',
  '.pdf',
  '.toml',
  '.xml',
  '.xsd',
  '.xsl',
  '.dtd',
  '.ini',
  '.cfg',
  '.env',
  '.js',
  '.cjs',
  '.mjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.py',
  '.sh',
  '.rb',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.lua',
  '.sql',
  '.r',
  '.bat',
  '.ps1',
  '.zsh',
  '.bash',
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.gif',
  '.webp',
  '.ico',
  '.doc',
  '.xls',
  '.ppt',
  '.docx',
  '.xlsx',
  '.pptx',
] as const

export function hasAllowedPackageExtension(path: string): boolean {
  const lower = path.toLowerCase()
  return ALLOWED_PACKAGE_EXTENSIONS.some((extension) => lower.endsWith(extension))
}

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

const SKILL_MD_PATH = 'SKILL.md'

/** 与后端 SkillPackagePolicy.canonicalizeSkillMdPath 一致：文件名大小写无关归一为 SKILL.md */
export function canonicalizeSkillMdPath(path: string): string {
  const slash = path.lastIndexOf('/')
  const fileName = slash === -1 ? path : path.slice(slash + 1)
  if (fileName.toLowerCase() !== SKILL_MD_PATH.toLowerCase()) {
    return path
  }
  return slash === -1 ? SKILL_MD_PATH : `${path.slice(0, slash + 1)}${SKILL_MD_PATH}`
}

function isSkillMdPath(path: string): boolean {
  const fileName = path.split('/').pop() || ''
  return fileName.toLowerCase() === SKILL_MD_PATH.toLowerCase()
}

/** 与后端路径规范化一致：禁止 `.` / `..` 路径段，防止逃逸包根。 */
export function hasUnsafePackagePath(path: string): boolean {
  return path.split('/').filter(Boolean).some((segment) => segment === '.' || segment === '..')
}

export function resolveSkillPackageRoot(paths: string[]): string | null {
  const skillRoots = [
    ...new Set(
      paths
        .filter((path) => isSkillMdPath(path))
        .map((path) => {
          const slash = path.lastIndexOf('/')
          return slash === -1 ? '' : path.slice(0, slash)
        }),
    ),
  ]

  if (skillRoots.length === 0) {
    return null
  }
  // 根目录已有 SKILL.md 时整包视为单一技能（与后端 promote 行为一致）
  if (skillRoots.includes('')) {
    return ''
  }

  // 只保留最外层技能根：被其他技能根包含的嵌套 SKILL.md 不单独计为包根
  const minimalRoots = skillRoots.filter(
    (root) => !skillRoots.some((other) => other !== root && root.startsWith(`${other}/`)),
  )
  if (minimalRoots.length > 1) {
    throw new PackSkillFolderError('upload.folderAmbiguousSkillRoots', {
      roots: [...minimalRoots].sort().join(', '),
    })
  }

  return minimalRoots[0]
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
    if (hasUnsafePackagePath(relative)) {
      throw new PackSkillFolderError('upload.folderUnsafePath', { file: relative })
    }
    if (file.size > MAX_FOLDER_FILE_SIZE) {
      throw new PackSkillFolderError('upload.folderFileTooLarge', { file: relative })
    }
    const entryPath = canonicalizeSkillMdPath(relative)
    if (!hasAllowedPackageExtension(entryPath)) {
      throw new PackSkillFolderError('upload.folderDisallowedExtension', { file: relative })
    }
    totalSize += file.size
    if (totalSize > MAX_FOLDER_TOTAL_SIZE) {
      throw new PackSkillFolderError('upload.folderTooLarge')
    }
    entries.push({
      path: entryPath,
      content: new Uint8Array(await file.arrayBuffer()),
    })
  }

  if (entries.length === 0) {
    throw new PackSkillFolderError('upload.folderEmpty')
  }
  if (entries.length > MAX_FOLDER_FILE_COUNT) {
    throw new PackSkillFolderError('upload.folderTooManyFiles', { count: MAX_FOLDER_FILE_COUNT })
  }
  if (!entries.some((entry) => entry.path === SKILL_MD_PATH)) {
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

  const keptPaths = files
    .map(filePackagePath)
    .filter((path) => !shouldSkipPackagePath(path))
  const hasDirectoryStructure = keptPaths.some((path) => path.includes('/'))
  const hasSkillMd = keptPaths.some((path) => isSkillMdPath(path))

  // 单个（或若干）散落普通文件：不是 zip，也不是技能文件夹结构
  if (!hasDirectoryStructure && !hasSkillMd) {
    throw new PackSkillFolderError('upload.invalidDropType')
  }

  return packSkillFolder(files, preferredName)
}
