export interface PublishTypeGuide {
  descriptorFile: string
  icon: string
  descriptionZh: string
  descriptionEn: string
  formatHintZh: string
  formatHintEn: string
  template: string
  namePlaceholderZh: string
  namePlaceholderEn: string
  requiresZip: boolean
}

export const PUBLISH_TYPE_GUIDES: Record<'SKILL', PublishTypeGuide> = {
  SKILL: {
    descriptorFile: 'SKILL.md',
    icon: '🛠️',
    descriptionZh: '描述该技能的名称、功能和用法，是识别和展示技能的核心文件。',
    descriptionEn: 'Describes the skill name, capabilities, and usage.',
    formatHintZh:
      '可上传 ZIP，或直接选择包含 SKILL.md 的文件夹（系统会在浏览器中自动打包）。资产名称 name 可通过 YAML frontmatter（文件顶部 --- 包裹的 name 字段）或文件一级标题（# 标题）提供，至少填写其一；description 建议填写，未填写时使用表单中的资产描述。',
    formatHintEn:
      'Upload a ZIP, or select the folder that contains SKILL.md (it is packed in the browser). Provide name via YAML frontmatter (--- name ---) or a top-level # heading. description is recommended; otherwise the form summary is used.',
    namePlaceholderZh: '如：安全代码审计技能',
    namePlaceholderEn: 'e.g. Secure code audit skill',
    requiresZip: true,
    template: `---
name: 安全代码审计
description: 对 Pull Request 进行自动化安全审查，支持 SQL 注入、XSS、CSRF 等常见漏洞检测
---

# 安全代码审计

## 功能
- 自动扫描 PR 中的安全漏洞
- 支持自定义规则配置
- 生成可视化审计报告
`,
  },
}
