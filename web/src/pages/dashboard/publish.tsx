import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { UploadZone } from '@/features/publish/upload-zone'
import type { PublishPackageSelection } from '@/features/publish/pack-skill-folder'
import { PublishPackageGuide } from '@/features/publish/publish-package-guide'
import { PUBLISH_TYPE_GUIDES } from '@/features/publish/publish-type-guides'
import {
  extractPrecheckWarnings,
  isFrontmatterFailureMessage,
  isPrecheckConfirmationMessage,
  isPrecheckFailureMessage,
  isVersionExistsMessage,
} from '@/features/publish/publish-error-utils'
import { normalizePublishPrefill } from '@/features/publish/publish-prefill'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  normalizeSelectValue,
} from '@/shared/ui/select'
import { Label } from '@/shared/ui/label'
import { Card } from '@/shared/ui/card'
import { usePublishSkill } from '@/shared/hooks/use-skill-queries'
import { useMyNamespaces } from '@/shared/hooks/use-namespace-queries'
import { useAssetDepartments } from '@/shared/hooks/use-dashboard-queries'
import { useVisibleLabels } from '@/shared/hooks/use-label-queries'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'
import { DashboardPageHeader } from '@/shared/components/dashboard-page-header'
import { navigateAfterOverlays } from '@/shared/lib/navigate-after-overlays'
import {
  findScopeForLabelSlug,
  getScopeTone,
  listManagedScopeLabels,
  listManagedSubTagLabels,
} from '@/shared/lib/business-scope'
import { toast } from '@/shared/lib/toast'
import { ApiError } from '@/api/client'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'

const EMPTY_NAMESPACE_VALUE = '__select_namespace__'
const EMPTY_LABELS: Array<{ slug: string; type: string; displayName: string }> = []

export function PublishPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const search = useSearch({ from: '/dashboard/publish' })
  const prefill = normalizePublishPrefill(search)
  const [selectedPackage, setSelectedPackage] = useState<PublishPackageSelection | null>(null)
  const [namespaceSlug, setNamespaceSlug] = useState<string>(prefill.namespace)
  const [visibility, setVisibility] = useState<string>(prefill.visibility)
  const [displayName, setDisplayName] = useState('')
  const [summary, setSummary] = useState('')
  const [department, setDepartment] = useState('')
  const [businessScope, setBusinessScope] = useState('')
  const [businessSubTags, setBusinessSubTags] = useState<string[]>([])
  const [warningDialogOpen, setWarningDialogOpen] = useState(false)
  const [precheckWarnings, setPrecheckWarnings] = useState<string[]>([])

  const { data: namespaces, isLoading: isLoadingNamespaces } = useMyNamespaces()
  const { data: departments } = useAssetDepartments()
  const { data: visibleLabels } = useVisibleLabels()
  const managedLabels = visibleLabels ?? EMPTY_LABELS
  const publishMutation = usePublishSkill()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const isZh = locale.startsWith('zh')
  const guide = PUBLISH_TYPE_GUIDES.SKILL
  const scopeOptions = useMemo(() => listManagedScopeLabels(managedLabels), [managedLabels])
  const availableSubTags = useMemo(
    () => listManagedSubTagLabels(managedLabels, businessScope || undefined),
    [managedLabels, businessScope],
  )
  const selectedScope = scopeOptions.find((label) => label.slug === businessScope)
  const selectedNamespace = namespaces?.find((ns) => ns.slug === namespaceSlug)
  const namespaceOnlyLabel = selectedNamespace?.type === 'GLOBAL'
    ? t('publish.visibilityOptions.loggedInUsersOnly')
    : t('publish.visibilityOptions.namespaceOnly')
  const scopeSlugKey = scopeOptions.map((label) => label.slug).join(',')
  const allowedSubTagKey = availableSubTags.map((label) => label.slug).join(',')

  useEffect(() => {
    setNamespaceSlug(prefill.namespace)
    setVisibility(prefill.visibility)
  }, [prefill.namespace, prefill.visibility])

  const handleRemoveSelectedFile = () => {
    setSelectedPackage(null)
    setPrecheckWarnings([])
    setWarningDialogOpen(false)
  }

  const handleFileSelect = (selection: PublishPackageSelection) => {
    setSelectedPackage(selection)
    setPrecheckWarnings([])
    setWarningDialogOpen(false)
  }

  const validateForm = (): string | null => {
    if (!namespaceSlug) {
      return t('publish.selectNamespace')
    }
    if (!displayName.trim() || !summary.trim()) {
      return t('publish.selectRequired')
    }
    if (!selectedPackage) {
      return t('publish.fileRequired')
    }
    return null
  }

  const missingRequirements = useMemo(() => {
    const missing: string[] = []
    if (!namespaceSlug) missing.push(t('publish.namespace'))
    if (!displayName.trim()) missing.push(t('publish.displayName'))
    if (!summary.trim()) missing.push(t('publish.summary'))
    if (!selectedPackage) missing.push(t('publish.file'))
    return missing
  }, [
    displayName,
    namespaceSlug,
    selectedPackage,
    summary,
    t,
  ])

  useEffect(() => {
    if (!scopeSlugKey) {
      if (businessScope) {
        setBusinessScope('')
      }
      return
    }
    const slugs = scopeSlugKey.split(',')
    if (!slugs.includes(businessScope)) {
      const preferred = slugs.includes('scope-other') ? 'scope-other' : slugs[0]
      if (preferred) {
        setBusinessScope(preferred)
      }
    }
  }, [businessScope, scopeSlugKey])

  useEffect(() => {
    const allowed = new Set(allowedSubTagKey ? allowedSubTagKey.split(',') : [])
    setBusinessSubTags((current) => {
      const next = current.filter((slug) => allowed.has(slug))
      return next.length === current.length ? current : next
    })
  }, [allowedSubTagKey])

  useEffect(() => {
    if (namespaceSlug || !namespaces?.length) {
      return
    }
    const globalNs = namespaces.find((ns) => ns.slug === 'global')
    setNamespaceSlug(globalNs?.slug ?? namespaces[0].slug)
  }, [namespaceSlug, namespaces])

  const resolvePublishFile = async (): Promise<File> => {
    if (!selectedPackage) {
      throw new Error(t('publish.fileRequired'))
    }
    return selectedPackage.file
  }

  const publishSkill = async (confirmWarnings = false) => {
    const validationError = validateForm()
    if (validationError) {
      toast.error(validationError)
      return
    }

    try {
      const file = await resolvePublishFile()
      const result = await publishMutation.mutateAsync({
        namespace: namespaceSlug,
        file,
        visibility,
        confirmWarnings,
        packageType: 'SKILL',
        department: department.trim() || undefined,
        displayName: displayName.trim(),
        summary: summary.trim(),
        businessScope: selectedScope?.displayName || businessScope || undefined,
        businessSubTags: businessSubTags.length > 0 ? businessSubTags : undefined,
      })
      setPrecheckWarnings([])
      setWarningDialogOpen(false)
      const skillLabel = `${result.namespace}/${result.slug}@${result.version}`
      if (result.status === 'PUBLISHED') {
        toast.success(
          t('publish.publishedTitle'),
          t('publish.publishedDescription', { skill: skillLabel })
        )
      } else {
        toast.success(
          t('publish.pendingReviewTitle'),
          t('publish.pendingReviewDescription', { skill: skillLabel })
        )
      }
      navigateAfterOverlays(() => {
        navigate({ to: '/dashboard/skills' })
      })
    } catch (error) {
      if (error instanceof ApiError && error.status === 408) {
        toast.error(t('publish.timeoutTitle'), t('publish.timeoutDescription'))
        return
      }

      if (error instanceof ApiError && isVersionExistsMessage(error.serverMessage || error.message)) {
        toast.error(
          t('publish.versionExistsTitle'),
          t('publish.versionExistsDescription'),
        )
        return
      }

      if (error instanceof ApiError && isPrecheckConfirmationMessage(error.serverMessage || error.message)) {
        setPrecheckWarnings(extractPrecheckWarnings(error.serverMessage || error.message))
        setWarningDialogOpen(true)
        return
      }

      if (error instanceof ApiError && isPrecheckFailureMessage(error.serverMessage || error.message)) {
        toast.error(
          t('publish.precheckFailedTitle'),
          error.serverMessage || t('publish.precheckFailedDescription'),
        )
        return
      }

      if (error instanceof ApiError && isFrontmatterFailureMessage(error.serverMessage || error.message)) {
        toast.error(
          t('publish.frontmatterFailedTitle'),
          error.serverMessage || t('publish.frontmatterFailedDescription'),
        )
        return
      }

      toast.error(t('publish.error'), error instanceof Error ? error.message : '')
    }
  }

  const handlePublish = async () => {
    await publishSkill(false)
  }

  const canSubmit = !publishMutation.isPending && !validateForm()

  const activeScopeTone = getScopeTone(findScopeForLabelSlug(businessScope) ?? selectedScope?.displayName ?? '')

  const handleBusinessScopeChange = (scopeSlug: string) => {
    setBusinessScope(scopeSlug)
    setBusinessSubTags([])
  }

  const toggleBusinessSubTag = (tagSlug: string) => {
    setBusinessSubTags((prev) =>
      prev.includes(tagSlug) ? prev.filter((item) => item !== tagSlug) : [...prev, tagSlug],
    )
  }

  const stepTitle = (label: string) => (
    <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
      <span className="inline-block h-4 w-1 rounded-full bg-[#6466F1]" aria-hidden />
      {label}
    </h3>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up pb-10">
      <DashboardPageHeader title={t('publish.title')} subtitle={t('publish.subtitle')} />

      <Card className="p-4 rounded-2xl bg-indigo-50/70 border-indigo-100 shadow-none">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-[#6466F1] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground mb-1">{t('publish.reviewNotice.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('publish.reviewNotice.description')}</p>
          </div>
        </div>
      </Card>

      <Card className="p-8 space-y-8 rounded-2xl border-slate-100 shadow-sm">
        <section className="space-y-6">
          {stepTitle(t('publish.stepBasic'))}

          <div className="space-y-3">
            <Label htmlFor="namespace" className="text-sm font-semibold font-heading">{t('publish.namespace')}</Label>
            {isLoadingNamespaces ? (
              <div className="h-11 animate-shimmer rounded-lg" />
            ) : (
              <Select
                value={normalizeSelectValue(namespaceSlug) ?? EMPTY_NAMESPACE_VALUE}
                onValueChange={(value) => {
                  setNamespaceSlug(value === EMPTY_NAMESPACE_VALUE ? '' : value)
                }}
              >
                <SelectTrigger id="namespace">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_NAMESPACE_VALUE}>{t('publish.selectNamespace')}</SelectItem>
                  {namespaces?.map((ns) => (
                    <SelectItem key={ns.id} value={ns.slug}>
                      {ns.displayName} (@{ns.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="visibility" className="text-sm font-semibold font-heading">{t('publish.visibility')}</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger id="visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">{t('publish.visibilityOptions.public')}</SelectItem>
                <SelectItem value="NAMESPACE_ONLY">{namespaceOnlyLabel}</SelectItem>
                <SelectItem value="PRIVATE">{t('publish.visibilityOptions.private')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label htmlFor="displayName" className="text-sm font-semibold font-heading">{t('publish.displayName')}</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={isZh ? guide.namePlaceholderZh : guide.namePlaceholderEn}
            />
            <p className="text-xs text-muted-foreground">{t('publish.displayNameHint')}</p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="summary" className="text-sm font-semibold font-heading">{t('publish.summary')}</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder={t('publish.summaryPlaceholder')}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">{t('publish.summaryHint')}</p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="department" className="text-sm font-semibold font-heading">{t('publish.department')}</Label>
            <div className="relative">
              <Select
                value={normalizeSelectValue(department)}
                onValueChange={setDepartment}
              >
                <SelectTrigger id="department" className={department ? 'pr-16' : undefined}>
                  <SelectValue placeholder={t('publish.departmentPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {(departments ?? []).map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {department ? (
                <button
                  type="button"
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => setDepartment('')}
                  className="absolute right-9 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
                  aria-label={t('publish.clearDepartment')}
                  title={t('publish.clearDepartment')}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">{t('publish.departmentHint')}</p>
          </div>
        </section>

        <section className="space-y-6 border-t border-border/60 pt-8">
          {stepTitle(t('publish.stepTags'))}

          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t('publish.businessScope')}</Label>
            <div className="flex flex-wrap gap-2">
              {scopeOptions.map((scope) => {
                const active = businessScope === scope.slug
                const tone = getScopeTone(findScopeForLabelSlug(scope.slug) ?? scope.displayName)
                return (
                  <button
                    key={scope.slug}
                    type="button"
                    onClick={() => handleBusinessScopeChange(scope.slug)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      active ? tone.solid : `${tone.outline} hover:opacity-90`
                    }`}
                  >
                    {scope.displayName}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">{t('publish.businessScopeHint')}</p>
          </div>

          {availableSubTags.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">{t('publish.businessSubTags')}</Label>
              <div className="flex flex-wrap gap-2">
                {availableSubTags.map((tag) => {
                  const active = businessSubTags.includes(tag.slug)
                  return (
                    <button
                      key={tag.slug}
                      type="button"
                      onClick={() => toggleBusinessSubTag(tag.slug)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                        active ? activeScopeTone.subtagActive : activeScopeTone.subtag
                      }`}
                    >
                      {tag.displayName}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">{t('publish.businessSubTagsHint')}</p>
            </div>
          )}
        </section>

        <section className="space-y-6 border-t border-border/60 pt-8">
          {stepTitle(t('publish.stepUpload'))}

          <div className="space-y-3">
            <Label className="text-sm font-semibold font-heading">{t('publish.file')}</Label>
            <PublishPackageGuide guide={guide} isZh={isZh} />
            <UploadZone
              onFileSelect={handleFileSelect}
              disabled={publishMutation.isPending}
            />
            {selectedPackage && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/30 px-4 py-3">
                <div className="min-w-0 text-sm text-muted-foreground flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="truncate">
                    {selectedPackage.displayName} ({(selectedPackage.file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveSelectedFile}
                  disabled={publishMutation.isPending}
                >
                  {t('publish.removeSelectedFile')}
                </Button>
              </div>
            )}
          </div>
        </section>

        {missingRequirements.length > 0 && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            {t('publish.missingRequired', { fields: missingRequirements.join(isZh ? '、' : ', ') })}
          </p>
        )}

        <div className="flex justify-center pt-2">
          <Button
            className={`w-full max-w-sm px-8 py-3.5 rounded-2xl font-bold text-base shadow-md border-none ${
              canSubmit
                ? 'bg-[#6466F1] hover:bg-[#4F46E5] text-white'
                : 'bg-indigo-300 text-white opacity-100 disabled:opacity-100 cursor-not-allowed'
            }`}
            size="lg"
            onClick={handlePublish}
            disabled={!canSubmit}
          >
            {publishMutation.isPending ? t('publish.publishing') : t('publish.confirm')}
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={warningDialogOpen}
        onOpenChange={setWarningDialogOpen}
        title={t('publish.warningConfirmTitle')}
        description={(
          <div className="space-y-3 text-left">
            <p>{t('publish.warningConfirmDescription')}</p>
            {precheckWarnings.length > 0 && (
              <ul className="list-disc space-y-1 pl-5">
                {precheckWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        confirmText={t('publish.warningConfirmContinue')}
        cancelText={t('publish.warningConfirmCancel')}
        onConfirm={() => publishSkill(true)}
      />
    </div>
  )
}
