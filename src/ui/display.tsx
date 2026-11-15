// SPDX-License-Identifier: GPL-3.0-or-later
// Pieces that show rather than change: facts at a glance, large shortcut tiles, links that leave the app.

import type { ReactNode } from 'react'
import { ChevronRight, ExternalLink as ExternalIcon } from 'lucide-react'

/** A row of facts, each a label over its value; two to a row where the space is narrow. */
export function Facts({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="@container">
      <dl
        aria-label={label}
        className="grid grid-cols-2 gap-x-6 gap-y-5 @3xl:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]"
      >
        {children}
      </dl>
    </div>
  )
}

interface FactProps {
  label: string
  icon?: ReactNode
  /** One short line under the value. */
  hint?: ReactNode
  /** A help button, shown beside the label. */
  help?: ReactNode
  children: ReactNode
}

export function Fact({ label, icon, hint, help, children }: FactProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="flex items-center gap-1.5 text-[13px] text-muted">
        {icon && <span className="flex w-4 justify-center">{icon}</span>}
        {label}
        {/* Without taking more height than the label, so facts with and without one line up. */}
        {help && <span className="-ml-1 flex h-4 items-center">{help}</span>}
      </dt>
      <dd className="flex h-6 items-center gap-1 text-[15px] font-medium">{children}</dd>
      {hint && <dd className="text-[13px] leading-snug text-muted">{hint}</dd>}
    </div>
  )
}

interface ActionTileProps {
  /** Where it goes, e.g. "#/keys". */
  href: string
  icon: ReactNode
  title: string
  description: string
}

/** A large, friendly link to a common job. */
export function ActionTile({ href, icon, title, description }: ActionTileProps) {
  return (
    <a
      href={href}
      className="group flex items-center gap-4 rounded-card border border-edge bg-card p-4 shadow-card transition-colors duration-(--motion-fast) hover:border-accent hover:bg-raised"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{title}</span>
        <span className="text-[13px] leading-snug text-muted">{description}</span>
      </span>
      <ChevronRight
        size={18}
        aria-hidden
        className="shrink-0 text-muted transition-transform duration-(--motion-fast) group-hover:translate-x-0.5 group-hover:text-accent"
      />
    </a>
  )
}

/** A link to another site, opened in a new tab. */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-accent hover:underline"
    >
      {children}
      {/* Inline, not flex, so the line can't break between the link and the punctuation after it. */}
      <ExternalIcon size={12} aria-hidden className="ml-1 inline-block align-[-1px]" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  )
}
