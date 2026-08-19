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
