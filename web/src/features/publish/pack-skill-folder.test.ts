import { describe, expect, it } from 'vitest'
import {
  MAX_FOLDER_FILE_COUNT,
  PackSkillFolderError,
  filePackagePath,
  packSkillFolder,
  resolvePublishPackage,
  resolveSkillPackageRoot,
  shouldSkipPackagePath,
} from './pack-skill-folder'

function fileAt(relativePath: string, content = 'x', size?: number): File {
  const name = relativePath.split('/').pop() || 'file'
  const body = size && size > content.length ? content.padEnd(size, '0') : content
  const file = new File([body], name, { type: 'text/plain' })
  Object.defineProperty(file, 'webkitRelativePath', { value: relativePath })
  return file
}

describe('pack-skill-folder helpers', () => {
  it('prefers webkitRelativePath for package paths', () => {
    expect(filePackagePath(fileAt('demo/SKILL.md', '# demo'))).toBe('demo/SKILL.md')
  })

  it('skips macOS and git junk paths', () => {
    expect(shouldSkipPackagePath('demo/.DS_Store')).toBe(true)
    expect(shouldSkipPackagePath('demo/.git/config')).toBe(true)
    expect(shouldSkipPackagePath('demo/__MACOSX/foo')).toBe(true)
    expect(shouldSkipPackagePath('demo/SKILL.md')).toBe(false)
  })

  it('uses the shallowest SKILL.md as the package root', () => {
    expect(resolveSkillPackageRoot(['demo/SKILL.md', 'demo/scripts/main.py'])).toBe('demo')
    expect(resolveSkillPackageRoot(['SKILL.md', 'scripts/main.py'])).toBe('')
    expect(resolveSkillPackageRoot(['nested/demo/SKILL.md', 'other/readme.md'])).toBe('nested/demo')
    expect(resolveSkillPackageRoot(['readme.md'])).toBeNull()
  })
})

describe('resolvePublishPackage', () => {
  it('returns a single dropped zip as-is', async () => {
    const zip = new File([new Uint8Array([0x50, 0x4b])], 'skill.zip', { type: 'application/zip' })
    await expect(resolvePublishPackage([zip])).resolves.toBe(zip)
  })

  it('packs a folder so SKILL.md sits at the zip root', async () => {
    const packed = await packSkillFolder([
      fileAt('my-skill/SKILL.md', '---\nname: demo\n---\n'),
      fileAt('my-skill/scripts/run.py', 'print(1)\n'),
      fileAt('my-skill/.DS_Store', 'junk'),
    ])

    expect(packed.name).toBe('my-skill.zip')
    expect(packed.type).toBe('application/zip')
    const text = new TextDecoder().decode(await packed.arrayBuffer())
    expect(text).toContain('SKILL.md')
    expect(text).toContain('scripts/run.py')
    expect(text).not.toContain('.DS_Store')
  })

  it('rejects a folder without SKILL.md', async () => {
    await expect(packSkillFolder([fileAt('demo/readme.md', 'hi')])).rejects.toMatchObject({
      key: 'upload.folderMissingSkillMd',
    } satisfies Partial<PackSkillFolderError>)
  })

  it('rejects packages that exceed the file count limit', async () => {
    const files = [
      fileAt('demo/SKILL.md', 'ok'),
      ...Array.from({ length: MAX_FOLDER_FILE_COUNT }, (_, index) => fileAt(`demo/extra-${index}.txt`, 'x')),
    ]
    await expect(packSkillFolder(files)).rejects.toMatchObject({
      key: 'upload.folderTooManyFiles',
    })
  })
})
