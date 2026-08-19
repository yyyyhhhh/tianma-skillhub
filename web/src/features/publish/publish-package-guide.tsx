import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/button'
import { copyToClipboard } from '@/shared/lib/clipboard'
import { toast } from '@/shared/lib/toast'
import type { PublishTypeGuide } from '@/features/publish/publish-type-guides'

const ZIP_TREE = `example-skill.zip
  ├── SKILL.md
  ├── scripts/
  │   └── main.py
  ├── rules/
  │   └── security.json
  └── README.md`

type PublishPackageGuideProps = {
  guide: PublishTypeGuide
  isZh: boolean
}

export function PublishPackageGuide({ guide, isZh }: PublishPackageGuideProps) {
  const { t } = useTranslation()
  const [zipOpen, setZipOpen] = useState(true)

  const handleCopy = async () => {
    try {
      await copyToClipboard(guide.template)
      toast.success(t('publish.templateCopied'))
    } catch {
      toast.error(t('publish.templateCopyFailed'))
    }
  }

  return (
    <div className="rounded-xl border border-sky-200/80 bg-sky-50/40 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>{guide.icon}</span>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">
            <span className="font-mono">{guide.descriptorFile}</span>
            <span className="mx-1.5 text-muted-foreground">·</span>
            {t('publish.descriptorFileLabel')}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isZh ? guide.descriptionZh : guide.descriptionEn}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {t('publish.formatNotes')}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isZh ? guide.formatHintZh : guide.formatHintEn}
        </p>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setZipOpen((open) => !open)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7h6l2 2h8v10a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z" />
              </svg>
              {t('publish.zipFormatTitle', { file: guide.descriptorFile })}
            </span>
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform ${zipOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {zipOpen && (
            <div className="border-t border-slate-100 px-4 pb-4 pt-3">
              <pre className="rounded-xl bg-slate-900 text-slate-100 text-xs leading-relaxed p-4 overflow-x-auto whitespace-pre font-mono">
                {ZIP_TREE.replace(/SKILL\.md/g, guide.descriptorFile)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {guide.template ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{t('publish.templateTitle')}</p>
            <Button type="button" variant="outline" size="sm" className="h-7 rounded-[10px] px-3 text-xs" onClick={handleCopy}>
              {t('publish.copyTemplate')}
            </Button>
          </div>
          <pre className="rounded-2xl bg-slate-900 text-slate-100 text-xs leading-relaxed p-4 overflow-x-auto whitespace-pre-wrap font-mono">
            {guide.template}
          </pre>
          <p className="text-xs text-muted-foreground">{t('publish.templateHint')}</p>
        </div>
      ) : null}
    </div>
  )
}
