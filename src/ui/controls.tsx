// SPDX-License-Identifier: GPL-3.0-or-later
// The small controls every page is built from. All colours and radii come from tokens.css.

import { useId, type ButtonHTMLAttributes, type ComponentPropsWithRef, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { Check, LoaderCircle, Search } from 'lucide-react'

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

interface IconButtonProps extends ComponentPropsWithRef<'button'> {
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
  /** Shown beside the label but not part of it (a help button), so it stays out of the switch's name. */
  help?: ReactNode
}

export function Toggle({ checked, onChange, label, hint, disabled, help }: ToggleProps) {
  const id = useId()
  const hintId = useId()
  return (
    <div className={cx('flex items-start justify-between gap-4', disabled && 'opacity-50')}>
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <label htmlFor={id}>{label}</label>
          {help}
        </div>
        {hint && (
          <div id={hintId} className="text-[13px] text-muted">
            {hint}
          </div>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={hint ? hintId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-0.5 h-5.5 w-10 shrink-0 cursor-pointer rounded-pill transition-colors duration-(--motion) disabled:cursor-default',
          checked ? 'bg-accent' : 'bg-edge-strong',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 left-0.5 size-4.5 rounded-pill bg-knob shadow-knob transition-transform duration-(--motion)',
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
  /** A line under the slider: what it does here, or why it is disabled. */
  hint?: ReactNode
  /** Shown beside the label but not part of it (a help button), so it stays out of the slider's name. */
  help?: ReactNode
  /** The id of a line elsewhere that describes this slider too, e.g. one reason shared by two sliders. */
  describedBy?: string
}

export function Slider({ label, value, min = 0, max, step = 1, onChange, format, disabled, track, hint, help, describedBy }: SliderProps) {
  const id = useId()
  const hintId = useId()
  const filled = ((value - min) / (max - min)) * 100
  const description = [hint ? hintId : null, describedBy].filter(Boolean).join(' ') || undefined
  return (
    <div className="flex flex-col gap-1.5">
      <div className={cx('flex flex-col gap-1.5', disabled && 'opacity-50')}>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <label htmlFor={id} className="flex items-center gap-1.5">
              {label}
            </label>
            {help}
          </span>
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
          aria-describedby={description}
          onChange={(e) => onChange(Number(e.target.value))}
          className="lw-slider"
          style={{
            background: track ?? `linear-gradient(to right, var(--accent) ${filled}%, var(--edge-strong) ${filled}%)`,
          }}
        />
      </div>
      {hint && (
        <p id={hintId} className="text-[13px] text-muted">
          {hint}
        </p>
      )}
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
  // A radio group: Tab reaches the chosen option, the arrow keys move the choice.
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
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className="inline-flex rounded-pill bg-raised p-1">
      {options.map((option, i) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={option.value === value || (!anyChosen && i === 0) ? 0 : -1}
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

/** A one-line text field. Give it an `aria-label` when there is no visible label. */
export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="text"
      className={cx(
        'h-8 min-w-0 rounded-control border border-edge-strong bg-raised px-2.5 text-content placeholder:text-muted',
        'focus:border-accent focus:outline-none',
        className,
      )}
      {...rest}
    />
  )
}

/** Something is on its way. Decorative: say what is happening in text beside it. */
export function Spinner({ size = 15, className }: { size?: number; className?: string }) {
  return <LoaderCircle size={size} aria-hidden className={cx('shrink-0 animate-spin', className)} />
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

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  disabled?: boolean
}

export function Checkbox({ checked, onChange, label, disabled }: CheckboxProps) {
  return (
    <label className={cx('inline-flex items-center gap-2 select-none', disabled ? 'opacity-50' : 'cursor-pointer')}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cx(
          'flex size-4.5 shrink-0 items-center justify-center rounded-[calc(var(--radius-control)/2)] border transition-colors duration-(--motion-fast)',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
          checked ? 'border-accent bg-accent text-on-accent' : 'border-edge-strong bg-raised',
        )}
      >
        {checked && <Check size={13} strokeWidth={3} />}
      </span>
      {label}
    </label>
  )
}

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string
  onChange: (value: string) => void
}

/** A search box. Esc empties it. Give it an `aria-label`. */
export function SearchField({ value, onChange, className, ...rest }: SearchFieldProps) {
  return (
    <div className={cx('relative flex items-center', className)}>
      <Search size={14} aria-hidden className="pointer-events-none absolute left-2.5 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Escape') return
          if (value) onChange('')
          else e.currentTarget.blur()
        }}
        className={cx(
          'h-8 w-full min-w-0 rounded-pill border border-edge-strong bg-raised pr-3 pl-8 text-content placeholder:text-muted',
          'focus:border-accent focus:outline-none [&::-webkit-search-cancel-button]:hidden',
        )}
        {...rest}
      />
    </div>
  )
}

interface OptionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Shown as the current choice. */
  selected?: boolean
  /** A full-width row (the default), or a small pill. */
  shape?: 'row' | 'chip'
}

/** One of several choices, marked when it is the current one. */
export function OptionButton({ selected = false, shape = 'row', className, children, ...rest }: OptionButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(
        'cursor-pointer border text-left transition-colors duration-(--motion-fast) disabled:cursor-default disabled:opacity-45',
        shape === 'row'
          ? 'flex w-full items-center gap-3 rounded-control px-3 py-2'
          : 'inline-flex h-7 items-center gap-1.5 rounded-pill px-3 text-[13px] font-medium',
        selected ? 'border-accent bg-accent-soft text-accent' : 'border-edge bg-raised text-content hover:bg-raised-hover',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
