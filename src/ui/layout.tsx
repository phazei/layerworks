// SPDX-License-Identifier: GPL-3.0-or-later
// The containers pages are made of: a card per group of settings, with advanced ones folded away.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronRight, CircleHelp } from 'lucide-react'
import { openHelp } from '../help/help-store'
import type { HelpTopicId } from '../help/topics'
import { Button, cx, IconButton } from './controls'
import { usePref } from './prefs'

/** A "?" that opens the help panel at one topic. */
export function HelpButton({ topic }: { topic: HelpTopicId }) {
  return (
    <IconButton label="Explain this" className="size-6" onClick={() => openHelp(topic)}>
      <CircleHelp size={15} />
    </IconButton>
  )
}

interface CardProps {
  title?: ReactNode
  /** One sentence under the title saying what this group is for. */
  description?: ReactNode
  help?: HelpTopicId
  /** Controls shown at the right of the title. */
  actions?: ReactNode
  className?: string
  children: ReactNode
}

export function Card({ title, description, help, actions, className, children }: CardProps) {
  return (
    <section className={cx('rounded-card bg-card p-5 shadow-card', className)}>
      {(title || actions) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-1 text-[15px] font-semibold">
              {title}
              {help && <HelpButton topic={help} />}
            </h2>
            {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}

interface DisclosureProps {
  /** Remembered under this name, so it reopens the way it was left. */
  id: string
  label?: string
  /**
   * Open now, whatever was remembered, without changing what is remembered: for when what the user is looking
   * at lives inside. Read when the disclosure appears; give it a new `key` to apply a new value.
   */
  forceOpen?: boolean
  children: ReactNode
}

/** "More options": advanced controls, one click away, never a separate mode. */
export function Disclosure({ id, label = 'More options', forceOpen = false, children }: DisclosureProps) {
  const [remembered, setRemembered] = usePref(`open:${id}`, false)
  const [forced, setForced] = useState(forceOpen)
  const open = forced || remembered
  const toggle = () => {
    // Closing one that was opened for the user is a choice too: it stays closed, and is remembered so.
    setForced(false)
    setRemembered(!open)
  }
  return (
    <div className="mt-4 border-t border-edge pt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className="flex cursor-pointer items-center gap-1 rounded-control text-[13px] font-medium text-muted hover:text-content"
      >
        <ChevronRight size={15} className={cx('transition-transform duration-(--motion)', open && 'rotate-90')} />
        {label}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  )
}

interface DialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  /** Use for actions that lose something. */
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** A confirmation. Editing never happens in a dialog. */
export function Dialog({ open, title, children, confirmLabel, danger, onConfirm, onCancel }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      className="m-auto w-[min(440px,90vw)] rounded-card border border-edge bg-card p-6 text-content shadow-pop backdrop:bg-black/50"
    >
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-2 text-muted">{children}</div>
      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}

/** A notice inside a page: why something is unavailable, or what to do next. */
export function Notice({ tone = 'neutral', children }: { tone?: 'neutral' | 'danger'; children: ReactNode }) {
  return (
    <div
      className={cx(
        'rounded-control px-3 py-2 text-[13px]',
        tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-raised text-muted',
      )}
    >
      {children}
    </div>
  )
}
