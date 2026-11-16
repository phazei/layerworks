// SPDX-License-Identifier: GPL-3.0-or-later
// A help topic's own text, as the help panel and the Help page both show it: QMK's name, the paragraphs, the
// example, and the link to the documentation, named by site.

import { ExternalLink } from 'lucide-react'
import { docsSite } from './docs-site'
import { Highlight } from './Highlight'
import { fillLayers } from './text'
import { HELP_TOPICS, type HelpTopicId } from './topics'

interface Props {
  id: HelpTopicId
  /** The connected keyboard's layer names; empty for the generic ones. */
  layerNames?: readonly string[]
  /** Search words to mark in the text. */
  highlight?: readonly string[]
}

export function TopicBody({ id, layerNames = [], highlight = [] }: Props) {
  const topic = HELP_TOPICS[id]
  const text = (value: string) => <Highlight text={fillLayers(value, layerNames)} words={highlight} />
  return (
    <>
      {topic.body.map((paragraph, i) => (
        <p key={i} className="leading-relaxed">
          {text(paragraph)}
        </p>
      ))}
      {topic.example && (
        <div className="rounded-control bg-raised p-3.5">
          <div className="mb-1 text-xs font-medium text-muted">Example</div>
          <p className="leading-relaxed">{text(topic.example)}</p>
        </div>
      )}
      {topic.docs && (
        <a
          href={topic.docs}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-accent hover:underline"
        >
          Read more in {docsSite(topic.docs)}
          <ExternalLink size={13} aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      )}
    </>
  )
}

/** "In QMK: Combos", under a topic's title. */
export function QmkName({ id, highlight = [] }: { id: HelpTopicId; highlight?: readonly string[] }) {
  const name = HELP_TOPICS[id].qmkName
  if (!name) return null
  return (
    <p className="mt-1 text-[13px] text-muted">
      In QMK: <span className="rounded-control bg-raised px-1.5 py-0.5 font-mono text-xs"><Highlight text={name} words={highlight} /></span>
    </p>
  )
}
