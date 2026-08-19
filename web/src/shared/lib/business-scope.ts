export const BUSINESS_SCOPES = ['智谋', '智码', '智测', '智御', '智运', '其他'] as const

export type BusinessScope = (typeof BUSINESS_SCOPES)[number]

/** ACP-aligned sub-tags per business scope (visual classification only). */
export const BUSINESS_SCOPE_SUBTAGS: Record<BusinessScope, readonly string[]> = {
  智谋: ['nesma拆分', '需求分析', '需求设计', 'COSMIC拆分'],
  智码: ['代码知识库', 'SDD开发', '代码Review', '代码生成'],
  智测: [
    '代码扫描',
    '解析功能点',
    '接口测试',
    '功能测试',
    '性能测试',
    '白盒测试',
    '黑盒测试',
    '合规审计',
    '测试用例生成',
    '自动化UI测试',
  ],
  智御: ['渗透测试', '安全扫描', '漏洞验证'],
  智运: ['部署运维', '故障定位', '知识问答'],
  其他: ['销售', '售前', '项目画像', '技术规范', '运营', '通用工具', '规范文档', '数据服务'],
}

export type ScopeTone = {
  outline: string
  solid: string
  subtag: string
  subtagActive: string
}

export const BUSINESS_SCOPE_TONES: Record<BusinessScope, ScopeTone> = {
  智谋: {
    outline: 'border-blue-500 text-blue-600 bg-white',
    solid: 'border-blue-500 bg-blue-500 text-white shadow-sm',
    subtag: 'border-blue-400 text-blue-600 bg-white hover:bg-blue-50',
    subtagActive: 'border-blue-500 bg-blue-500 text-white',
  },
  智码: {
    outline: 'border-sky-500 text-sky-600 bg-white',
    solid: 'border-sky-500 bg-sky-500 text-white shadow-sm',
    subtag: 'border-sky-400 text-sky-600 bg-white hover:bg-sky-50',
    subtagActive: 'border-sky-500 bg-sky-500 text-white',
  },
  智测: {
    outline: 'border-emerald-500 text-emerald-600 bg-white',
    solid: 'border-emerald-500 bg-emerald-500 text-white shadow-sm',
    subtag: 'border-emerald-500 text-emerald-600 bg-white hover:bg-emerald-50',
    subtagActive: 'border-emerald-500 bg-emerald-500 text-white',
  },
  智御: {
    outline: 'border-amber-500 text-amber-600 bg-white',
    solid: 'border-amber-500 bg-amber-500 text-white shadow-sm',
    subtag: 'border-amber-400 text-amber-600 bg-white hover:bg-amber-50',
    subtagActive: 'border-amber-500 bg-amber-500 text-white',
  },
  智运: {
    outline: 'border-red-500 text-red-500 bg-white',
    solid: 'border-red-500 bg-red-500 text-white shadow-sm',
    subtag: 'border-red-400 text-red-500 bg-white hover:bg-red-50',
    subtagActive: 'border-red-500 bg-red-500 text-white',
  },
  其他: {
    outline: 'border-violet-500 text-violet-500 bg-white',
    solid: 'border-violet-500 bg-violet-500 text-white shadow-sm',
    subtag: 'border-violet-400 text-violet-500 bg-white hover:bg-violet-50',
    subtagActive: 'border-violet-500 bg-violet-500 text-white',
  },
}

export function getScopeTone(scope: string): ScopeTone {
  if (scope in BUSINESS_SCOPE_TONES) {
    return BUSINESS_SCOPE_TONES[scope as BusinessScope]
  }
  return {
    outline: 'border-slate-300 text-slate-600 bg-white',
    solid: 'border-slate-500 bg-slate-500 text-white shadow-sm',
    subtag: 'border-slate-300 text-slate-600 bg-white hover:bg-slate-50',
    subtagActive: 'border-slate-500 bg-slate-500 text-white',
  }
}

export function getBusinessSubTags(scope: string): readonly string[] {
  if (scope in BUSINESS_SCOPE_SUBTAGS) {
    return BUSINESS_SCOPE_SUBTAGS[scope as BusinessScope]
  }
  return []
}

export const BUSINESS_SCOPE_SLUGS: Record<BusinessScope, string> = {
  智谋: 'scope-zhimou',
  智码: 'scope-zhima',
  智测: 'scope-zhice',
  智御: 'scope-zhiyu',
  智运: 'scope-zhiyun',
  其他: 'scope-other',
}

export const BUSINESS_SUBTAG_SLUGS: Record<string, string> = {
  nesma拆分: 'nesma-split',
  需求分析: 'req-analysis',
  需求设计: 'req-design',
  COSMIC拆分: 'cosmic-split',
  代码知识库: 'code-kb',
  SDD开发: 'sdd-dev',
  '代码Review': 'code-review',
  代码生成: 'code-gen',
  代码扫描: 'code-scan',
  解析功能点: 'parse-features',
  接口测试: 'api-test',
  功能测试: 'func-test',
  性能测试: 'perf-test',
  白盒测试: 'whitebox-test',
  黑盒测试: 'blackbox-test',
  合规审计: 'compliance-audit',
  测试用例生成: 'testcase-gen',
  自动化UI测试: 'auto-ui-test',
  渗透测试: 'pentest',
  安全扫描: 'sec-scan',
  漏洞验证: 'vuln-verify',
  部署运维: 'deploy-ops',
  故障定位: 'fault-locate',
  知识问答: 'kb-qa',
  销售: 'sales',
  售前: 'presales',
  项目画像: 'project-profile',
  技术规范: 'tech-spec',
  运营: 'operations',
  通用工具: 'general-tools',
  规范文档: 'spec-docs',
  数据服务: 'data-service',
}

export const COLLAPSED_SEARCH_TAG_COUNT = 8

export function isBusinessScopeSlug(slug: string) {
  return slug.startsWith('scope-')
}

export function slugForBusinessLabel(displayName: string) {
  if (displayName in BUSINESS_SCOPE_SLUGS) {
    return BUSINESS_SCOPE_SLUGS[displayName as BusinessScope]
  }
  return BUSINESS_SUBTAG_SLUGS[displayName]
}

export function findScopeForSubTag(tag: string): BusinessScope | undefined {
  return BUSINESS_SCOPES.find((scope) => (BUSINESS_SCOPE_SUBTAGS[scope] as readonly string[]).includes(tag))
}

export function findScopeForLabelSlug(slug: string): BusinessScope | undefined {
  const scopeMatch = (Object.entries(BUSINESS_SCOPE_SLUGS) as Array<[BusinessScope, string]>).find(([, value]) => value === slug)
  if (scopeMatch) {
    return scopeMatch[0]
  }
  const tagMatch = Object.entries(BUSINESS_SUBTAG_SLUGS).find(([, value]) => value === slug)
  if (tagMatch) {
    return findScopeForSubTag(tagMatch[0])
  }
  return undefined
}

export function getAllBusinessSubTags(): string[] {
  return BUSINESS_SCOPES.flatMap((scope) => [...BUSINESS_SCOPE_SUBTAGS[scope]])
}

export function listBusinessSubTagOptions(scope?: string): Array<{ slug: string; displayName: string }> {
  const names = scope ? [...getBusinessSubTags(scope)] : getAllBusinessSubTags()
  return names
    .map((displayName) => {
      const slug = slugForBusinessLabel(displayName)
      return slug ? { slug, displayName } : null
    })
    .filter((item): item is { slug: string; displayName: string } => item !== null)
}
