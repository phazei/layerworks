// SPDX-License-Identifier: GPL-3.0-or-later
// A key drawn like a keycap, in the keyboard picture's colours: the tiles of a key palette, and a key shown on its
// own (what a key does now).

import type { ButtonHTMLAttributes } from 'react'
import { cx } from './controls'

const CAP =
  'inline-flex shrink-0 flex-col items-center justify-center rounded-control border border-b-2 border-(--key-border) ' +
  'bg-(--key-bg) px-1 text-center leading-tight whitespace-pre-line text-(--key-label)'

/** A keycap that shows a label and does nothing. */
export function KeyCap({ label, className }: { label: string; className?: string }) {
  return (
    <span aria-hidden className={cx(CAP, 'h-10 min-w-11 text-[11px] font-medium', className)}>
      {label || ' '}
    </span>
  )
}

interface KeyTileProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** The text on the cap; may have line breaks. */
  label: string
  /** What the key does, in words, for screen readers. */
  name: string
  /** This is what the key being edited does now. */
  current?: boolean
  /** Picked in a choice that isn't applied yet. */
  picked?: boolean
}

/** A key in a palette. */
export function KeyTile({ label, name, current, picked, className, ...rest }: KeyTileProps) {
  return (
    <button
      type="button"
      aria-label={name}
      aria-current={current || undefined}
      aria-pressed={picked === undefined ? undefined : picked}
      className={cx(
        CAP,
        'h-12 w-14 cursor-pointer overflow-hidden text-[11px] transition-colors duration-(--motion-fast)',
        picked
          ? 'border-accent bg-accent text-on-accent'
          : current
            ? 'border-accent bg-accent-soft font-semibold text-accent'
            : 'hover:border-accent hover:bg-(--key-bg-hover)',
        className,
      )}
      {...rest}
    >
      {label || ' '}
    </button>
  )
}
