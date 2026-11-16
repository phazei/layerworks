// SPDX-License-Identifier: GPL-3.0-or-later
// What a search of the help found: each topic with its group and the piece of text where the words are, marked.
// Nothing found: suggestions to try instead.

import { SearchX } from 'lucide-react'
import { GLOSSARY_HREF, groupOf, topicHref } from '../../help/guide'
import { Highlight } from '../../help/Highlight'
import { SEARCH_SUGGESTIONS, type SearchHit } from '../../help/search'
import { HELP_TOPICS, type HelpTopicId } from '../../help/topics'
import { cx } from '../../ui/controls'

interface Props {
  query: string
  words: readonly string[]
  hits: SearchHit[]
  current: HelpTopicId | null
  onSuggest: (query: string) => void
}

export function SearchResults({ query, words, hits, current, onSuggest }: Props) {
  if (hits.length === 0) {
    return (
      <div className="flex flex-col gap-3 px-2.5 py-2 text-[13px]">
        <p role="status" className="flex items-start gap-2 text-content">
          <SearchX size={16} aria-hidden className="mt-0.5 shrink-0 text-muted" />
          Nothing in the help matches “{query.trim()}”.
        </p>
        <p className="text-muted">
          Try a plainer word for what you want to do, or the name another app uses for it:
        </p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Try instead">
          {SEARCH_SUGGESTIONS.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                onClick={() => onSuggest(suggestion)}
                className="inline-flex h-7 cursor-pointer items-center rounded-pill border border-edge bg-raised px-3 font-medium hover:bg-raised-hover"
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
        <p className="text-muted">
          Or look through the{' '}
          <a href={GLOSSARY_HREF} className="font-medium text-accent hover:underline">
            glossary
          </a>
          , which puts the words QMK and Vial use beside the app’s.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <p role="status" className="px-2.5 pb-1 text-xs font-medium text-muted">
        {hits.length === 1 ? 'One topic matches' : `${hits.length} topics match`}
      </p>
      <ul aria-label="Search results" className="flex flex-col gap-px">
        {hits.map((hit) => {
          const topic = HELP_TOPICS[hit.id]
          const selected = hit.id === current
          return (
            <li key={hit.id}>
              <a
                href={topicHref(hit.id)}
                aria-current={selected ? 'page' : undefined}
                className={cx(
                  'flex flex-col gap-0.5 rounded-control px-2.5 py-2 transition-colors duration-(--motion-fast)',
                  selected ? 'bg-accent-soft' : 'hover:bg-raised',
                )}
              >
                <span className={cx('text-[13px] leading-snug font-medium', selected && 'text-accent')}>
                  <Highlight text={topic.title} words={words} />
                </span>
                <span className="text-xs text-muted">
                  {groupOf(hit.id).title}
                  {topic.qmkName && (
                    <>
                      {' · '}
                      <Highlight text={topic.qmkName} words={words} />
                    </>
                  )}
                </span>
                <span className="line-clamp-3 text-xs leading-relaxed text-muted">
                  <Highlight text={hit.snippet} words={words} />
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
