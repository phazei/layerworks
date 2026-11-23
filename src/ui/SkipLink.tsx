// SPDX-License-Identifier: GPL-3.0-or-later
// The first Tab stop of the app: a link past what comes before the page (the sidebar), seen only while it has the focus.
// The app's routes live in the URL's hash, so the link moves the focus itself rather than following its href.

import type { MouseEvent } from 'react'

interface SkipLinkProps {
  /** The id of the element to move the focus to. It needs `tabIndex={-1}` unless it takes the focus anyway. */
  target: string
  children: string
}

export function SkipLink({ target, children }: SkipLinkProps) {
  const skip = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    document.getElementById(target)?.focus()
  }
  return (
    <a
      href={`#${target}`}
      onClick={skip}
      className="sr-only rounded-control bg-card px-4 py-2 font-medium text-accent shadow-pop focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
    >
      {children}
    </a>
  )
}
