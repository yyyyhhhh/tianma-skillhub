import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Filter, Hash } from 'lucide-react'
import type { LabelItem } from '@/api/types'
import { Button } from '@/shared/ui/button'
import {
  BUSINESS_SCOPES,
  COLLAPSED_SEARCH_TAG_COUNT,
  findScopeForLabelSlug,
  isBusinessScopeSlug,
  listBusinessSubTagOptions,
  slugForBusinessLabel,
} from '@/shared/lib/business-scope'
import { cn } from '@/shared/lib/utils'

interface SearchFilterPanelProps {
  labels: LabelItem[]
  departments: string[]
  selectedLabel: string
  selectedDepartment: string
  onLabelToggle: (slug: string) => void
  onDepartmentToggle: (department: string) => void
}

function FilterChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: string
}) {
  return (
    <Button
      type="button"
      variant={selected ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      className={cn(
        'h-8 rounded-full px-3 text-sm font-normal shadow-none',
        selected
          ? 'border-slate-700 bg-slate-800 text-white hover:bg-slate-800'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
      )}
    >
      {children}
    </Button>
  )
}

function FilterRow({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex w-[9.5rem] shrink-0 items-center gap-2 pt-1.5">
        {icon}
        <span className="text-sm font-medium text-slate-700">{title}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {children}
      </div>
    </div>
  )
}

export function SearchFilterPanel({
  labels,
  departments,
  selectedLabel,
  selectedDepartment,
  onLabelToggle,
  onDepartmentToggle,
}: SearchFilterPanelProps) {
  const { t } = useTranslation()
  const [tagsExpanded, setTagsExpanded] = useState(false)
  const activeScope = findScopeForLabelSlug(selectedLabel)
  const activeScopeSlug = activeScope ? slugForBusinessLabel(activeScope) : undefined

  const scopeOptions = labels.filter((label) => isBusinessScopeSlug(label.slug))
  const scopes = scopeOptions.length > 0
    ? scopeOptions
    : BUSINESS_SCOPES.map((displayName) => ({
        slug: slugForBusinessLabel(displayName) ?? displayName,
        type: 'RECOMMENDED',
        displayName,
      }))

  const catalogTags = listBusinessSubTagOptions(activeScope)
  const extraTags = activeScope
    ? []
    : labels.filter((label) => {
        if (isBusinessScopeSlug(label.slug)) {
          return false
        }
        return !catalogTags.some((tag) => tag.slug === label.slug)
      })
  const tagOptions = [
    ...catalogTags,
    ...extraTags.map((label) => ({ slug: label.slug, displayName: label.displayName })),
  ]
  const hiddenTagCount = Math.max(0, tagOptions.length - COLLAPSED_SEARCH_TAG_COUNT)
  const visibleTags = tagsExpanded || hiddenTagCount === 0
    ? tagOptions
    : tagOptions.slice(0, COLLAPSED_SEARCH_TAG_COUNT)

  return (
    <div className="space-y-3 rounded-xl border border-slate-100 bg-white p-4">
      <FilterRow
        icon={<Filter className="h-4 w-4 text-emerald-500" />}
        title={t('search.filters.businessCategory')}
      >
        {scopes.map((scope) => (
          <FilterChip
            key={scope.slug}
            selected={selectedLabel === scope.slug || activeScopeSlug === scope.slug}
            onClick={() => onLabelToggle(scope.slug)}
          >
            {scope.displayName}
          </FilterChip>
        ))}
      </FilterRow>

      {departments.length > 0 && (
        <FilterRow
          icon={<Building2 className="h-4 w-4 text-orange-500" />}
          title={t('search.filters.department')}
        >
          {departments.map((department) => (
            <FilterChip
              key={department}
              selected={selectedDepartment === department}
              onClick={() => onDepartmentToggle(department)}
            >
              {department}
            </FilterChip>
          ))}
        </FilterRow>
      )}

      {tagOptions.length > 0 && (
        <FilterRow
          icon={<Hash className="h-4 w-4 text-sky-500" />}
          title={t('search.filters.tags')}
        >
          {visibleTags.map((tag) => (
            <FilterChip
              key={tag.slug}
              selected={selectedLabel === tag.slug}
              onClick={() => onLabelToggle(tag.slug)}
            >
              {`#${tag.displayName}`}
            </FilterChip>
          ))}
          {hiddenTagCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-sm font-medium text-sky-600 hover:bg-sky-50 hover:text-sky-700"
              onClick={() => setTagsExpanded((current) => !current)}
            >
              {tagsExpanded
                ? t('search.filters.collapseTags')
                : t('search.filters.expandTags', { count: tagOptions.length })}
            </Button>
          )}
        </FilterRow>
      )}
    </div>
  )
}
