/**
 * Builds a store-only ZIP containing a root SKILL.md (and optional extra files).
 */

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i]
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1)
      crc = (crc >>> 1) ^ (0xedb88320 & mask)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function u16(value: number): Uint8Array {
  const out = new Uint8Array(2)
  out[0] = value & 0xff
  out[1] = (value >>> 8) & 0xff
  return out
}

function u32(value: number): Uint8Array {
  const out = new Uint8Array(4)
  out[0] = value & 0xff
  out[1] = (value >>> 8) & 0xff
  out[2] = (value >>> 16) & 0xff
  out[3] = (value >>> 24) & 0xff
  return out
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function escapeYaml(value: string): string {
  if (/[:#{}[\],&*?|<>=!%@`'"\\]/.test(value) || value.includes('\n')) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return value
}

export function buildSkillMarkdown(params: {
  name: string
  description: string
  body?: string
}): string {
  const body = params.body?.trim() || `# ${params.name}\n\n${params.description}\n`
  const lines = [
    '---',
    `name: ${escapeYaml(params.name)}`,
    `description: ${escapeYaml(params.description)}`,
  ]
  lines.push('---', '', body, '')
  return lines.join('\n')
}

export type ZipEntryInput = {
  path: string
  content: Uint8Array
}

export function buildStoreZip(entries: ZipEntryInput[]): Uint8Array {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const fileNameBytes = new TextEncoder().encode(entry.path)
    const data = entry.content
    const checksum = crc32(data)
    const localHeader = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(checksum),
      u32(data.length),
      u32(data.length),
      u16(fileNameBytes.length),
      u16(0),
      fileNameBytes,
    ])
    const centralHeader = concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(checksum),
      u32(data.length),
      u32(data.length),
      u16(fileNameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      fileNameBytes,
    ])
    localParts.push(localHeader, data)
    centralParts.push(centralHeader)
    offset += localHeader.length + data.length
  }

  const central = concat(centralParts)
  const local = concat(localParts)
  const endRecord = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(central.length),
    u32(local.length),
    u16(0),
  ])
  return concat([local, central, endRecord])
}

function sanitizeEntryName(name: string): string {
  const base = name.replace(/\\/g, '/').split('/').filter(Boolean).pop() || 'attachment.bin'
  if (base === 'SKILL.md' || base.includes('..')) {
    return `files/${base === 'SKILL.md' ? 'attachment.md' : base}`
  }
  return base
}

export function buildMinimalSkillZip(params: {
  name: string
  description: string
  body?: string
  fileName?: string
  extraFiles?: Array<{ name: string; content: Uint8Array }>
}): File {
  const content = buildSkillMarkdown(params)
  const entries: ZipEntryInput[] = [
    {
      path: 'SKILL.md',
      content: new TextEncoder().encode(content),
    },
  ]
  for (const extra of params.extraFiles ?? []) {
    entries.push({
      path: sanitizeEntryName(extra.name),
      content: extra.content,
    })
  }
  return buildZipFile(entries, params.fileName ?? 'asset.zip')
}

export function buildZipFile(entries: ZipEntryInput[], fileName: string): File {
  const zipBytes = buildStoreZip(entries)
  const ab = new ArrayBuffer(zipBytes.byteLength)
  new Uint8Array(ab).set(zipBytes)
  return new File([ab], fileName, { type: 'application/zip' })
}
