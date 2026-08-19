import { useCallback, useRef, useState } from 'react'

function resolveCopyMountParent(): HTMLElement {
  if (typeof document === 'undefined') {
    throw new Error('document unavailable')
  }
  const active = document.activeElement
  if (active instanceof HTMLElement) {
    const dialog = active.closest<HTMLElement>('[role="dialog"], [data-radix-dialog-content]')
    if (dialog) {
      return dialog
    }
  }
  const openDialog = document.querySelector<HTMLElement>('[role="dialog"][data-state="open"], [data-radix-dialog-content][data-state="open"]')
  if (openDialog) {
    return openDialog
  }
  return document.body
}

function copyWithExecCommand(text: string, preferredTarget?: HTMLInputElement | HTMLTextAreaElement | null): boolean {
  if (preferredTarget) {
    preferredTarget.focus({ preventScroll: true })
    preferredTarget.select()
    preferredTarget.setSelectionRange(0, preferredTarget.value.length)
    return document.execCommand('copy')
  }

  const mountParent = resolveCopyMountParent()
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.setAttribute('aria-hidden', 'true')
  textarea.tabIndex = -1
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '0'
  textarea.style.width = '1px'
  textarea.style.height = '1px'
  textarea.style.padding = '0'
  textarea.style.margin = '0'
  textarea.style.border = 'none'
  textarea.style.outline = 'none'
  textarea.style.boxShadow = 'none'
  textarea.style.background = 'transparent'
  textarea.style.opacity = '0'
  textarea.style.zIndex = '2147483647'
  mountParent.appendChild(textarea)
  textarea.focus({ preventScroll: true })
  textarea.select()
  textarea.setSelectionRange(0, text.length)

  let success = false
  try {
    success = document.execCommand('copy')
  } finally {
    mountParent.removeChild(textarea)
  }
  return success
}

/**
 * Copy text to clipboard with fallback for insecure contexts (HTTP) and open dialogs.
 *
 * Radix/shadcn dialogs mark the rest of the document inert while open. A temporary
 * textarea mounted on `document.body` therefore fails to copy; prefer an in-dialog
 * input, otherwise mount the fallback inside the open dialog.
 */
export async function copyToClipboard(
  text: string,
  options?: { preferredTarget?: HTMLInputElement | HTMLTextAreaElement | null },
): Promise<void> {
  if (!text) {
    throw new Error('Nothing to copy')
  }

  if (typeof window !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Fall through — common on HTTP and when Permissions-Policy blocks clipboard-write.
    }
  }

  const success = copyWithExecCommand(text, options?.preferredTarget ?? null)
  if (!success) {
    throw new Error('Failed to copy text to clipboard')
  }
}

/**
 * React hook for clipboard copy with auto-reset "copied" state.
 *
 * @param timeout - ms before `copied` resets to false (default 2000)
 * @returns `[copied, copy]` — boolean status and an async copy function
 */
export function useCopyToClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const copy = useCallback(async (
    text: string,
    options?: { preferredTarget?: HTMLInputElement | HTMLTextAreaElement | null },
  ) => {
    await copyToClipboard(text, options)
    setCopied(true)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => setCopied(false), timeout)
  }, [timeout])

  return [copied, copy] as const
}
