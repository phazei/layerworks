// SPDX-License-Identifier: GPL-3.0-or-later
// A drop-down choice, for when the options are too many or too long for buttons side by side. The browser's own
// list, styled like the other fields.

import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cx } from './controls'

interface SelectProps<T extends string | number> extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}

/** Give it an `aria-label` or a `<label htmlFor>`. */
export function Select<T extends string | number>({ value, options, onChange, className, ...rest }: SelectProps<T>) {
  return (
    <div className={cx('relative inline-flex min-w-0 items-center', className)}>
      <select
        value={String(value)}
        onChange={(e) => {
          const picked = options.find((option) => String(option.value) === e.target.value)
          if (picked) onChange(picked.value)
        }}
        className={cx(
          'h-8 w-full min-w-0 cursor-pointer appearance-none rounded-control border border-control-edge bg-raised pr-8 pl-2.5 text-content',
          'focus:border-accent focus:outline-none disabled:cursor-default disabled:opacity-50',
        )}
        {...rest}
      >
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={15} aria-hidden className="pointer-events-none absolute right-2.5 text-muted" />
    </div>
  )
}
