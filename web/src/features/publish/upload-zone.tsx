import { useCallback, useRef, useState, type ChangeEvent, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import {
  extractDroppedFolderName,
  PackSkillFolderError,
  resolvePublishPackage,
  type PublishPackageSelection,
} from './pack-skill-folder'

interface UploadZoneProps {
  onFileSelect: (selection: PublishPackageSelection) => void
  disabled?: boolean
  /** MIME/extension map for react-dropzone; omit to accept zip files and folders. */
  accept?: Record<string, string[]>
  formatHintKey?: string
  allowFolder?: boolean
}

/**
 * Provides the publish page dropzone for uploading one package at a time.
 * ZIP files are used as-is; dropped or picked folders are packed to a zip in the browser.
 * The dashed area is drag-only; file/folder selection uses dedicated buttons.
 */
export function UploadZone({
  onFileSelect,
  disabled,
  accept,
  formatHintKey = 'upload.formatHint',
  allowFolder = true,
}: UploadZoneProps) {
  const { t } = useTranslation()
  const zipInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const assignFolderInput = (node: HTMLInputElement | null) => {
    folderInputRef.current = node
    if (!node) {
      return
    }
    node.setAttribute('webkitdirectory', '')
    node.setAttribute('directory', '')
    node.multiple = true
  }
  const [packing, setPacking] = useState(false)
  const busy = Boolean(disabled || packing)

  const handleFiles = useCallback(
    async (files: File[], preferredName?: string) => {
      if (files.length === 0) {
        return
      }
      setPacking(true)
      try {
        const selection = await resolvePublishPackage(files, preferredName)
        onFileSelect(selection)
      } catch (error) {
        if (error instanceof PackSkillFolderError) {
          toast.error(t(error.key, error.params))
        } else {
          toast.error(t('upload.packFailed'))
        }
      } finally {
        setPacking(false)
      }
    },
    [onFileSelect, t],
  )

  const onDrop = useCallback(
    (acceptedFiles: File[], _rejections: unknown, event: unknown) => {
      void handleFiles(acceptedFiles, extractDroppedFolderName(event))
    },
    [handleFiles],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: allowFolder,
    maxFiles: allowFolder ? undefined : 1,
    disabled: busy,
    noClick: true,
    useFsAccessApi: false,
  })

  const openZipPicker = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    zipInputRef.current?.click()
  }

  const openFolderPicker = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    folderInputRef.current?.click()
  }

  const onZipInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files ? Array.from(event.target.files) : []
    event.target.value = ''
    void handleFiles(selected)
  }

  const onFolderInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files ? Array.from(event.target.files) : []
    event.target.value = ''
    void handleFiles(selected)
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'upload-zone rounded-2xl border border-slate-200 bg-white p-10 text-center cursor-default transition-all duration-300 hover:border-slate-300',
        isDragActive && 'border-[#6466F1] bg-indigo-50/50 scale-[1.01]',
        busy && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input {...getInputProps()} />
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        className="hidden"
        data-testid="upload-zip-input"
        onClick={(event) => event.stopPropagation()}
        onChange={onZipInputChange}
      />
      {allowFolder ? (
        <input
          ref={assignFolderInput}
          type="file"
          className="hidden"
          data-testid="upload-folder-input"
          onClick={(event) => event.stopPropagation()}
          onChange={onFolderInputChange}
        />
      ) : null}
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-secondary/60 flex items-center justify-center">
          <svg
            className={cn(
              'w-7 h-7 upload-zone-icon transition-colors',
              isDragActive && 'text-primary'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        {packing ? (
          <p className="text-sm text-primary font-medium">{t('upload.packing')}</p>
        ) : isDragActive ? (
          <p className="text-sm text-primary font-medium">{t('upload.dropHint')}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground">{t('upload.dragHint')}</p>
            <p className="text-xs text-muted-foreground">{t(formatHintKey)}</p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="upload-select-zip"
                onClick={openZipPicker}
                disabled={busy}
              >
                {t('upload.selectZip')}
              </Button>
              {allowFolder ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid="upload-select-folder"
                  onClick={openFolderPicker}
                  disabled={busy}
                >
                  {t('upload.selectFolder')}
                </Button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
