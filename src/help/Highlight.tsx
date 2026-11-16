// SPDX-License-Identifier: GPL-3.0-or-later
// Text with the words of a search marked, for search results and the topic they open.

import { Fragment } from 'react'
import { matchRanges } from './search'

export function Highlight({ text, words }: { text: string; words: readonly string[] }) {
  if (words.length === 0) return <>{text}</>
  const ranges = matchRanges(text, words)
  if (ranges.length === 0) return <>{text}</>
  const parts = []
  let at = 0
  for (const [start, end] of ranges) {
    if (start > at) parts.push(<Fragment key={`t${at}`}>{text.slice(at, start)}</Fragment>)
    parts.push(
      <mark key={`m${start}`} className="rounded-[3px] bg-accent-soft text-accent">
        {text.slice(start, end)}
      </mark>,
    )
    at = end
  }
  if (at < text.length) parts.push(<Fragment key={`t${at}`}>{text.slice(at)}</Fragment>)
  return <>{parts}</>
}
