// SPDX-License-Identifier: GPL-3.0-or-later
// The help panel: slides in from the right with the topic a "?" asked for. It sits over the edge of the page
// without blocking it, so the page stays usable while it is open. Related topics open in the panel; the Help
// page has the topic with everything around it.

import { useEffect, useRef, useState } from 'react'
import { BookOpen, X } from 'lucide-react'
import { relatedTopics, topicHref } from '../help/guide'
import { closeHelp, HELP_PANEL_ID, openHelp, useHelpTopic } from '../help/help-store'
import { QmkName, TopicBody } from '../help/TopicBody'
import { HELP_TOPICS, type HelpTopicId } from '../help/topics'
import { cx, IconButton } from '../ui/controls'
import { useConnectedLayerNames } from '../ui/layer-names'

export function HelpPanel() {
  const topicId = useHelpTopic()
  const open = topicId !== null
  // Keep showing the last topic while the panel slides away.
  const [shownId, setShownId] = useState<HelpTopicId | null>(topicId)
  if (topicId && topicId !== shownId) setShownId(topicId)
  const topic = shownId ? HELP_TOPICS[shownId] : null
  const panel = useRef<HTMLElement>(null)
  const names = useConnectedLayerNames()
  // What had the focus when the panel opened (usually the "?"), to give it back when the panel closes.
  const opener = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) return
    const back = opener.current
    opener.current = null
    // Only when the focus was in the panel (or was lost with it): a "?" pressed again keeps its own focus.
    const now = document.activeElement
    if (back?.isConnected && (!now || now === document.body || panel.current?.contains(now))) back.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const now = document.activeElement
    if (now instanceof HTMLElement && now !== document.body && !panel.current?.contains(now)) opener.current = now
    // Screen readers and keyboard users land on the explanation; Tab reaches the close button from there. The panel
    // is visible at once when it opens (only its sliding is animated), so it can take the focus now.
    panel.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeHelp()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, topicId])

  const related = shownId ? relatedTopics(shownId) : []

  return (
    <aside
      ref={panel}
      id={HELP_PANEL_ID}
      tabIndex={-1}
      aria-label="Help"
      aria-hidden={!open}
      inert={!open}
      className={cx(
        'absolute inset-y-0 right-0 z-20 flex w-90 max-w-full flex-col border-l border-edge bg-card shadow-pop outline-none',
        'duration-(--motion) ease-out',
        // Opening, visibility changes at once (a hidden panel can't take the focus); closing, it waits for the slide.
        open ? 'visible translate-x-0 transition-[translate]' : 'invisible translate-x-full transition-[translate,visibility]',
      )}
    >
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-edge pr-3 pl-6">
        <span className="text-[13px] font-medium text-muted">Help</span>
        <IconButton label="Close help" onClick={closeHelp}>
          <X size={17} />
        </IconButton>
      </header>
      {topic && shownId && (
        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-5">
          <div>
            <h2 className="text-lg leading-snug font-semibold">{topic.title}</h2>
            <QmkName id={shownId} />
          </div>
          <TopicBody id={shownId} layerNames={names} />
          {related.length > 0 && (
            <div className="border-t border-edge pt-4">
              <h3 className="mb-2 text-xs font-medium text-muted">Related</h3>
              <ul className="flex flex-wrap gap-1.5">
                {related.map((id) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => openHelp(id)}
                      className="inline-flex h-7 cursor-pointer items-center rounded-pill border border-edge bg-raised px-3 text-[13px] font-medium hover:bg-raised-hover"
                    >
                      {HELP_TOPICS[id].title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <a
            href={topicHref(shownId)}
            onClick={closeHelp}
            className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-accent hover:underline"
          >
            <BookOpen size={14} aria-hidden />
            Open on the Help page
          </a>
        </div>
      )}
    </aside>
  )
}
