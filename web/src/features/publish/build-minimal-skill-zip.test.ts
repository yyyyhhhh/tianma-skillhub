import { describe, expect, it } from 'vitest'
import { buildMinimalSkillZip, buildSkillMarkdown } from './build-minimal-skill-zip'

describe('buildMinimalSkillZip', () => {
  it('creates a zip containing SKILL.md frontmatter', async () => {
    const file = buildMinimalSkillZip({
      name: 'demo-kb',
      description: 'demo knowledge',
      body: '# demo\n',
    })

    expect(file.name).toBe('asset.zip')
    expect(file.type).toBe('application/zip')
    expect(file.size).toBeGreaterThan(40)

    const bytes = new Uint8Array(await file.arrayBuffer())
    const asText = new TextDecoder().decode(bytes)
    expect(asText).toContain('SKILL.md')
    expect(asText).toContain('demo-kb')
    expect(asText).toContain('demo knowledge')
  })

  it('escapes yaml special characters in name/description', () => {
    const md = buildSkillMarkdown({
      name: 'a:b',
      description: 'x: y',
    })
    expect(md).toContain('name: "a:b"')
    expect(md).toContain('description: "x: y"')
  })
})
