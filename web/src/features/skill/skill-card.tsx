import { Link } from '@tanstack/react-router'
import type { LabelItem, SkillSummary } from '@/api/types'
import { useAuth } from '@/features/auth/use-auth'
import { useStarredIdSet } from '@/features/social/use-star'
import { Card } from '@/shared/ui/card'
import { NamespaceBadge } from '@/shared/components/namespace-badge'
import { getHeadlineVersion } from '@/shared/lib/skill-lifecycle'
import { formatCompactCount } from '@/shared/lib/number-format'
import { getSkillLabelSearch } from '@/shared/lib/skill-navigation'
import { isBusinessScopeSlug } from '@/shared/lib/business-scope'
import { cn } from '@/shared/lib/utils'
import { Bookmark } from 'lucide-react'

const CARD_LABEL_LIMIT = 4

function cardLabels(labels: LabelItem[]) {
  const ordered = [...labels].sort((left, right) => {
    const leftRank = isBusinessScopeSlug(left.slug) ? 0 : 1
    const rightRank = isBusinessScopeSlug(right.slug) ? 0 : 1
    return leftRank - rightRank
  })
  return {
    shown: ordered.slice(0, CARD_LABEL_LIMIT),
    extra: Math.max(0, ordered.length - CARD_LABEL_LIMIT),
  }
}

interface SkillCardProps {
  skill: SkillSummary
  onClick?: () => void
  highlightStarred?: boolean
}

/**
 * Reusable card for displaying one skill in lists such as landing, namespace, search, and stars.
 */
export function SkillCard({ skill, onClick, highlightStarred = true }: SkillCardProps) {
  const { isAuthenticated } = useAuth()
  // Batch highlight via shared ['skills','stars'] — never N× useStar per grid row.
  const { starredIds } = useStarredIdSet(highlightStarred && isAuthenticated)
  const showStarredHighlight = highlightStarred && isAuthenticated && starredIds.has(skill.id)
  const headlineVersion = getHeadlineVersion(skill)
  const isInteractive = typeof onClick === 'function'
  const { shown: labels, extra: extraLabelCount } = cardLabels(skill.labels ?? [])
  const hasChips = Boolean(skill.department) || labels.length > 0

  return (
    <Card
      className="h-full p-5 cursor-pointer group relative overflow-hidden bg-white border shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2"
      style={{ borderColor: 'hsl(var(--border-card))' }}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!isInteractive) {
          return
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      role={isInteractive ? 'link' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors" style={{ color: 'hsl(var(--foreground))' }}>
              {skill.displayName}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <NamespaceBadge type="TEAM" name={`@${skill.namespace}`} />
          </div>
        </div>

        {skill.summary && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
            {skill.summary}
          </p>
        )}

        {hasChips && (
          <div className="flex items-center gap-1.5 mb-4 flex-wrap">
            {skill.department && (
              <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 truncate max-w-[10rem]">
                {skill.department}
              </span>
            )}
            {labels.map((label) => (
              <Link
                key={label.slug}
                to="/search"
                search={getSkillLabelSearch(label.slug)}
                onClick={(event) => event.stopPropagation()}
                className={cn(
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2',
                  isBusinessScopeSlug(label.slug)
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : label.type === 'PRIVILEGED'
                      ? 'border-amber-500/40 bg-amber-100 text-amber-900 hover:bg-amber-200/80'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
                )}
              >
                {isBusinessScopeSlug(label.slug) ? label.displayName : `#${label.displayName}`}
              </Link>
            ))}
            {extraLabelCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                +{extraLabelCount}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center gap-4 text-xs text-muted-foreground">
          {headlineVersion && (
            <span className="px-2.5 py-1 rounded-full bg-secondary/60 font-mono">
              v{headlineVersion.version}
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            {formatCompactCount(skill.downloadCount)}
          </span>
          {typeof skill.viewCount === 'number' && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {formatCompactCount(skill.viewCount)}
            </span>
          )}
          <span
            className={`flex items-center gap-1 ${showStarredHighlight ? 'font-semibold text-primary' : ''}`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${showStarredHighlight ? 'fill-current' : ''}`} />
            {skill.starCount}
          </span>
          {skill.ratingAvg !== undefined && skill.ratingCount > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {skill.ratingAvg.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}
