// SPDX-License-Identifier: GPL-3.0-or-later
// A link in running text to another place in the app ("#/typing"), styled like ExternalLink but staying in the tab.

import type { ReactNode } from 'react'
import { cx } from './controls'

export function PageLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} className={cx('font-medium text-accent hover:underline', className)}>
      {children}
    </a>
  )
}
