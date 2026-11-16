// SPDX-License-Identifier: GPL-3.0-or-later
// One of a few choices, like Segmented, laid out as a grid so four readable labels fit a narrow column: two by two
// there, one row of four where the container (the nearest @container) is at least 32rem wide, back to two by two
// from 42rem (where that container gives the choice a column of its own).

import type { KeyboardEvent, ReactNode } from 'react'
import { cx } from './controls'

interface ChoiceGridProps<T extends string> {
  /** What is being chosen, for screen readers. */
  label: string
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (value: T) => void
  className?: string
}

export function ChoiceGrid<T extends string>({ label, value, options, onChange, className }: ChoiceGridProps<T>) {
  // A radio group, as Segmented: Tab reaches the chosen option, the arrow keys move the choice.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (!step) return
    event.preventDefault()
    const at = options.findIndex((option) => option.value === value)
    const next = (at + step + options.length) % options.length
    onChange(options[next].value)
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
  }
  const anyChosen = options.some((option) => option.value === value)
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cx('grid grid-cols-2 gap-1 rounded-card bg-raised p-1 @lg:grid-cols-4 @2xl:grid-cols-2', className)}
    >
      {options.map((option, i) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={option.value === value || (!anyChosen && i === 0) ? 0 : -1}
          onClick={() => onChange(option.value)}
          className={cx(
            'h-7 cursor-pointer rounded-control px-3 text-[13px] font-medium whitespace-nowrap transition-colors duration-(--motion-fast)',
            option.value === value ? 'bg-accent text-on-accent' : 'text-muted hover:bg-raised-hover hover:text-content',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
