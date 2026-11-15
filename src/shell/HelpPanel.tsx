// SPDX-License-Identifier: GPL-3.0-or-later
// The help panel: slides in from the right with the topic a "?" asked for. It sits over the edge of the page
// without blocking it, so the page stays usable while it is open.

import { useEffect, useRef, useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { closeHelp, useHelpTopic } from '../help/help-store'
import { HELP_TOPICS, type HelpTopicId } from '../help/topics'
import { cx, IconButton } from '../ui/controls'

export function HelpPanel() {
  const topicId = useHelpTopic()
  const open = topicId !== null
  // Keep showing the last topic while the panel slides away.
  const [shownId, setShownId] = useState<HelpTopicId | null>(topicId)
  if (topicId && topicId !== shownId) setShownId(topicId)
  const topic = shownId ? HELP_TOPICS[shownId] : null
  const panel = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    // Screen readers and keyboard users land on the explanation; Tab reaches the close button from there.
    panel.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeHelp()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, topicId])

  return (
    <aside
      ref={panel}
      tabIndex={-1}
      aria-label="Help"
      aria-hidden={!open}
      inert={!open}
      className={cx(
        'absolute inset-y-0 right-0 z-20 flex w-90 max-w-full flex-col border-l border-edge bg-card shadow-pop outline-none',
        'transition-[translate,visibility] duration-(--motion) ease-out',
        open ? 'translate-x-0' : 'invisible translate-x-full',
      )}
    >
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-edge pr-3 pl-6">
        <span className="text-[13px] font-medium text-muted">Help</span>
        <IconButton label="Close help" onClick={closeHelp}>
          <X size={17} />
        </IconButton>
      </header>
      {topic && (
        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-5">
          <div>
            <h2 className="text-lg leading-snug font-semibold">{topic.title}</h2>
            {topic.qmkName && (
              <p className="mt-1 text-[13px] text-muted">
                In QMK: <span className="rounded-control bg-raised px-1.5 py-0.5 font-mono text-xs">{topic.qmkName}</span>
              </p>
            )}
          </div>
          {topic.body.map((paragraph, i) => (
            <p key={i} className="leading-relaxed">
              {paragraph}
            </p>
          ))}
          {topic.example && (
            <div className="rounded-control bg-raised p-3.5">
              <div className="mb-1 text-xs font-medium text-muted">Example</div>
              <p className="leading-relaxed">{topic.example}</p>
            </div>
          )}
          {topic.docs && (
            <a
              href={topic.docs}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-accent hover:underline"
            >
              Read more in the QMK documentation
              <ExternalLink size={13} aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </div>
      )}
    </aside>
  )
}
