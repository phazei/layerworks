// SPDX-License-Identifier: GPL-3.0-or-later
// A modal dialog with its own buttons, for a confirmation that goes through steps (unlocking the keyboard).
// Like ui/layout's Dialog, never for editing. While `dismissible` is false, Esc doesn't close it.

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cx } from './controls'

interface ModalProps {
  open: boolean
  title: ReactNode
  children: ReactNode
  /** The buttons, right-aligned under the content. */
  footer?: ReactNode
  /** Esc closes it (calls onDismiss). Turn off while something must not be walked away from. */
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}

export function Modal({ open, title, children, footer, dismissible = true, onDismiss, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        if (dismissible) onDismiss?.()
      }}
      className={cx(
        'm-auto w-[min(560px,92vw)] rounded-card outline-none border border-edge bg-card p-6 text-content shadow-pop backdrop:bg-backdrop',
        className,
      )}
    >
      {open && (
        <>
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          <div className="mt-2 text-muted">{children}</div>
          {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
        </>
      )}
    </dialog>
  )
}
