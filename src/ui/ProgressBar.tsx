// SPDX-License-Identifier: GPL-3.0-or-later
// How far something has got, as a filled bar.

import { cx } from './controls'

interface ProgressBarProps {
  /** What is progressing, for screen readers. */
  label: string
  value: number
  max: number
  /** Read out instead of the number, e.g. "38 of 50 steps". */
  valueText?: string
  className?: string
}

export function ProgressBar({ label, value, max, valueText, className }: ProgressBarProps) {
  const filled = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      className={cx('h-2.5 w-full overflow-hidden rounded-pill bg-raised', className)}
    >
      <div className="h-full rounded-pill bg-accent" style={{ width: `${filled}%` }} />
    </div>
  )
}
