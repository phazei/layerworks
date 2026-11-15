// SPDX-License-Identifier: GPL-3.0-or-later
// The small controls every page is built from. All colours and radii come from tokens.css.

import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react'

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'bg-raised text-content hover:bg-raised-hover border border-edge',
  quiet: 'text-muted hover:bg-raised hover:text-content',
  danger: 'bg-danger-soft text-danger hover:brightness-110 border border-danger/30',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'md' | 'sm'
  icon?: ReactNode
}

export function Button({ variant = 'secondary', size = 'md', icon, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-pill font-medium transition-colors duration-(--motion-fast)',
        'disabled:cursor-default disabled:opacity-45',
        size === 'md' ? 'h-9 px-4' : 'h-7 px-3 text-[13px]',
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** What the button does, for screen readers and as its hover text. */
  label: string
}

export function IconButton({ label, className, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cx(
        'inline-flex size-8 cursor-pointer items-center justify-center rounded-pill text-muted transition-colors duration-(--motion-fast)',
        'hover:bg-raised hover:text-content disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  hint?: ReactNode
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, hint, disabled }: ToggleProps) {
  const id = useId()
  return (
    <div className={cx('flex items-start justify-between gap-4', disabled && 'opacity-50')}>
      <label htmlFor={id} className="min-w-0">
        <div>{label}</div>
        {hint && <div className="text-[13px] text-muted">{hint}</div>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-0.5 h-5.5 w-10 shrink-0 cursor-pointer rounded-pill transition-colors duration-(--motion) disabled:cursor-default',
          checked ? 'bg-accent' : 'bg-edge-strong',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 left-0.5 size-4.5 rounded-pill bg-white shadow transition-transform duration-(--motion)',
            checked && 'translate-x-4.5',
          )}
        />
      </button>
    </div>
  )
}

interface SliderProps {
  label: ReactNode
  value: number
  min?: number
  max: number
  step?: number
  onChange: (value: number) => void
  /** Text shown for the value, e.g. "60 %". */
  format?: (value: number) => string
  disabled?: boolean
  /** CSS background for the track, e.g. a hue gradient. */
  track?: string
}

export function Slider({ label, value, min = 0, max, step = 1, onChange, format, disabled, track }: SliderProps) {
  const id = useId()
  const filled = ((value - min) / (max - min)) * 100
  return (
    <div className={cx('flex flex-col gap-1.5', disabled && 'opacity-50')}>
      <div className="flex justify-between">
        <label htmlFor={id}>{label}</label>
        <span className="text-muted tabular-nums">{format ? format(value) : value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="lw-slider"
        style={{
          background: track ?? `linear-gradient(to right, var(--accent) ${filled}%, var(--edge-strong) ${filled}%)`,
        }}
      />
    </div>
  )
}

interface SegmentedProps<T extends string> {
  /** What is being chosen, for screen readers. */
  label: string
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (value: T) => void
}

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-pill bg-raised p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cx(
            'h-7 cursor-pointer rounded-pill px-3.5 text-[13px] font-medium transition-colors duration-(--motion-fast)',
            option.value === value ? 'bg-accent text-on-accent' : 'text-muted hover:text-content',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'accent' | 'success' | 'warning'; children: ReactNode }) {
  const tones = {
    neutral: 'bg-raised text-muted',
    accent: 'bg-accent-soft text-accent',
    success: 'bg-raised text-success',
    warning: 'bg-raised text-warning',
  }
  return <span className={cx('inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>
}
