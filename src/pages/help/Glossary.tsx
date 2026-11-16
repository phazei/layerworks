// SPDX-License-Identifier: GPL-3.0-or-later
// The glossary: the words QMK, Vial and other apps use, each with what Layerworks calls it, a line on what it is,
// and the topic that explains it.

import type { Ref } from 'react'
import { CornerDownRight } from 'lucide-react'
import { GLOSSARY } from '../../help/glossary'
import { topicHref } from '../../help/guide'
import { Highlight } from '../../help/Highlight'
import { HELP_TOPICS } from '../../help/topics'

export function Glossary({ highlight, headingRef }: { highlight: readonly string[]; headingRef?: Ref<HTMLHeadingElement> }) {
  return (
    <article aria-labelledby="help-glossary" className="flex flex-col gap-4 rounded-card bg-card p-6 shadow-card">
      <div>
        <p className="mb-1 text-xs font-medium text-muted">Firmware and QMK words</p>
        <h2 ref={headingRef} id="help-glossary" tabIndex={-1} className="text-xl leading-snug font-semibold tracking-tight outline-none">
          Glossary
        </h2>
        <p className="mt-1 max-w-2xl text-[13px] text-muted">
          Words from QMK, Vial, guides and other keyboard apps, with what Layerworks calls the same thing and where it
          is explained.
        </p>
      </div>
      <dl className="flex flex-col">
        {GLOSSARY.map((entry) => (
          <div key={entry.term} className="grid gap-x-6 gap-y-1 border-t border-edge py-3 @xl:grid-cols-[12rem_minmax(0,1fr)]">
            <dt>
              <span className="font-medium">
                <Highlight text={entry.term} words={highlight} />
              </span>
              {entry.aka && (
                <span className="block font-mono text-xs text-muted">
                  <Highlight text={entry.aka} words={highlight} />
                </span>
              )}
            </dt>
            <dd className="flex flex-col gap-1">
              <span className="leading-relaxed">
                {/* The link below names the topic; a friendly name the same as its title isn't said twice. */}
                {entry.friendly && entry.friendly !== HELP_TOPICS[entry.topic].title && (
                  <span className="font-medium">
                    <Highlight text={entry.friendly} words={highlight} />
                    {': '}
                  </span>
                )}
                <Highlight text={entry.meaning} words={highlight} />
              </span>
              <a href={topicHref(entry.topic)} className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-accent hover:underline">
                <CornerDownRight size={13} aria-hidden className="shrink-0" />
                {HELP_TOPICS[entry.topic].title}
              </a>
            </dd>
          </div>
        ))}
      </dl>
    </article>
  )
}
