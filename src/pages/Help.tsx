// SPDX-License-Identifier: GPL-3.0-or-later
// Help: every explanation the "?" buttons open, as a guide. A list at the left, grouped the way the app is and in
// reading order, with a search across titles, QMK names, texts, examples and the glossary; the topic picked at the
// right, with where it is in the app and what to read next. Each topic has its own address (#/help/<topic>). Narrow,
// the list and the topic take turns. Works without a keyboard; with one, layer names in the texts are its own.

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CircleQuestionMark } from 'lucide-react'
import { searchHelp, queryWords } from '../help/search'
import type { PageDef } from '../plugins/api'
import { useConnectedLayerNames } from '../shell/layer-names'
import { usePath } from '../shell/router'
import { cx, SearchField } from '../ui/controls'
import { Card } from '../ui/layout'
import { Glossary } from './help/Glossary'
import { Overview } from './help/Overview'
import { readHelpPath, viewKey } from './help/route'
import { SearchResults } from './help/SearchResults'
import { TopicArticle } from './help/TopicArticle'
import { TopicList } from './help/TopicList'

function HelpPage() {
  const path = usePath()
  const { view, query: asked } = readHelpPath(path)
  const [query, setQuery] = useState(asked)
  // A search in the address (a link, a screenshot) replaces the one typed.
  const [lastAsked, setLastAsked] = useState(asked)
  if (asked !== lastAsked) {
    setLastAsked(asked)
    if (asked) setQuery(asked)
  }
  const names = useConnectedLayerNames()
  const words = useMemo(() => queryWords(query), [query])
  const hits = useMemo(() => searchHelp(query, names), [query, names])
  const searching = words.length > 0
  const reading = view.kind !== 'overview'

  // A new topic starts at its top, with the focus on its title (not on the first visit: the page title has it).
  const detail = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const key = viewKey(view)
  const first = useRef(true)
  useEffect(() => {
    detail.current?.scrollTo?.({ top: 0 })
    if (first.current) {
      first.current = false
      return
    }
    heading.current?.focus({ preventScroll: true })
  }, [key])

  return (
    // Wide, the two columns fill exactly the space below the title and scroll on their own; narrow, the page scrolls.
    <div className="@container/help relative flex min-h-80 flex-1 flex-col">
      <div className="flex flex-col gap-4 @2xl/help:absolute @2xl/help:inset-0 @2xl/help:flex-row">
        <section
          aria-label="Find a topic"
          className={cx(
            'flex min-h-0 flex-col rounded-card bg-card shadow-card @2xl/help:w-72 @2xl/help:shrink-0',
            reading && 'hidden @2xl/help:flex',
          )}
        >
          <div className="p-4 pb-3">
            <SearchField
              value={query}
              onChange={setQuery}
              aria-label="Search the help"
              placeholder="Search: “hold”, “combo”, “MO”…"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            {searching ? (
              <SearchResults query={query} words={words} hits={hits} current={view.kind === 'topic' ? view.id : null} onSuggest={setQuery} />
            ) : (
              <TopicList view={view} />
            )}
          </div>
        </section>

        <div ref={detail} className="@container order-first min-w-0 flex-1 @2xl/help:order-last @2xl/help:overflow-y-auto">
          {reading && (
            <a href="#/help" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline @2xl/help:hidden">
              <ArrowLeft size={14} aria-hidden />
              All topics
            </a>
          )}
          {view.kind === 'topic' ? (
            <TopicArticle id={view.id} layerNames={names} highlight={words} headingRef={heading} />
          ) : view.kind === 'glossary' ? (
            <Glossary highlight={words} headingRef={heading} />
          ) : view.kind === 'missing' ? (
            <Card title="There is no such topic">
              <p className="text-muted">
                It may have been renamed. Pick one from the list, or search for what you were looking for.
              </p>
            </Card>
          ) : (
            <Overview />
          )}
        </div>
      </div>
    </div>
  )
}

export const helpPage: PageDef = {
  path: 'help',
  title: 'Help',
  icon: CircleQuestionMark,
  group: 'app',
  offline: true,
  component: HelpPage,
}
