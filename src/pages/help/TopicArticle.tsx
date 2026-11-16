// SPDX-License-Identifier: GPL-3.0-or-later
// One topic on the Help page: the text the "?" shows, then where it is in the app, related topics, and the topics
// before and after it in reading order.

import type { Ref } from 'react'
import { ArrowLeft, ArrowRight, CornerDownRight } from 'lucide-react'
import { groupOf, neighbours, relatedTopics, topicHref } from '../../help/guide'
import { Highlight } from '../../help/Highlight'
import { QmkName, TopicBody } from '../../help/TopicBody'
import { HELP_TOPICS, type HelpTopicId } from '../../help/topics'

interface Props {
  id: HelpTopicId
  layerNames: readonly string[]
  highlight: readonly string[]
  /** The title, for moving focus to it. */
  headingRef?: Ref<HTMLHeadingElement>
}

export function TopicArticle({ id, layerNames, highlight, headingRef }: Props) {
  const topic = HELP_TOPICS[id]
  const related = relatedTopics(id)
  const { previous, next } = neighbours(id)
  return (
    <article aria-labelledby={`help-${id}`} className="flex flex-col gap-4 rounded-card bg-card p-6 shadow-card">
      <div>
        <p className="mb-1 text-xs font-medium text-muted">{groupOf(id).title}</p>
        <h2 ref={headingRef} id={`help-${id}`} tabIndex={-1} className="text-xl leading-snug font-semibold tracking-tight outline-none">
          <Highlight text={topic.title} words={highlight} />
        </h2>
        <QmkName id={id} highlight={highlight} />
      </div>
      <div className="flex max-w-2xl flex-col gap-4">
        <TopicBody id={id} layerNames={layerNames} highlight={highlight} />
      </div>

      {topic.where && topic.where.length > 0 && (
        <section aria-label="Where this is in the app" className="border-t border-edge pt-4">
          <h3 className="mb-2 text-[13px] font-medium text-muted">Where this is in the app</h3>
          <ul className="flex flex-col gap-1.5">
            {topic.where.map((place) => (
              <li key={place.href + place.label}>
                <a href={place.href} className="inline-flex items-center gap-2 font-medium text-accent hover:underline">
                  <CornerDownRight size={14} aria-hidden className="shrink-0" />
                  {place.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section aria-label="Related topics" className="border-t border-edge pt-4">
          <h3 className="mb-2 text-[13px] font-medium text-muted">Related</h3>
          <ul className="flex flex-wrap gap-1.5">
            {related.map((other) => (
              <li key={other}>
                <a
                  href={topicHref(other)}
                  className="inline-flex h-7 items-center rounded-pill border border-edge bg-raised px-3 text-[13px] font-medium hover:bg-raised-hover"
                >
                  {HELP_TOPICS[other].title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label="Reading order" className="flex flex-wrap justify-between gap-3 border-t border-edge pt-4 text-[13px]">
        {previous ? (
          <a href={topicHref(previous)} className="group flex min-w-0 items-center gap-2 text-muted hover:text-content">
            <ArrowLeft size={15} aria-hidden className="shrink-0" />
            <span className="min-w-0">
              <span className="block text-xs">Previous</span>
              <span className="font-medium text-content group-hover:underline">{HELP_TOPICS[previous].title}</span>
            </span>
          </a>
        ) : (
          <span />
        )}
        {next && (
          <a href={topicHref(next)} className="group ml-auto flex min-w-0 items-center gap-2 text-right text-muted hover:text-content">
            <span className="min-w-0">
              <span className="block text-xs">Next</span>
              <span className="font-medium text-content group-hover:underline">{HELP_TOPICS[next].title}</span>
            </span>
            <ArrowRight size={15} aria-hidden className="shrink-0" />
          </a>
        )}
      </nav>
    </article>
  )
}
