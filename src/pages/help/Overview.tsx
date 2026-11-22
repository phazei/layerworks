// SPDX-License-Identifier: GPL-3.0-or-later
// The Help page with no topic open: where to start (the tour, or Getting started in order), and the groups of
// topics as tiles, each leading to its first topic; and where to report a problem.

import { BookA, BookOpen, Bug, ChevronRight, Route } from 'lucide-react'
import { GLOSSARY_HREF, GUIDE, topicHref } from '../../help/guide'
import { tour } from '../../help/tour'
import { ISSUES_URL } from '../../project'
import { Button } from '../../ui/controls'
import { ExternalLink } from '../../ui/display'
import { Card } from '../../ui/layout'

function Tile({ href, title, description, count }: { href: string; title: string; description: string; count?: number }) {
  return (
    <li>
      <a
        href={href}
        className="group flex h-full items-start gap-3 rounded-control border border-edge bg-raised p-3.5 transition-colors duration-(--motion-fast) hover:border-accent hover:bg-raised-hover"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-medium">
            {title}
            {count !== undefined && <span className="ml-2 text-xs font-normal text-muted">{count} topics</span>}
          </span>
          <span className="text-[13px] leading-snug text-muted">{description}</span>
        </span>
        <ChevronRight size={16} aria-hidden className="mt-0.5 shrink-0 text-muted group-hover:text-accent" />
      </a>
    </li>
  )
}

export function Overview() {
  return (
    <div className="flex flex-col gap-4">
      <Card title="New to Layerworks?" description="Everything the “?” buttons explain is here too, in the order the app is built.">
        <div className="flex flex-col gap-4">
          <p className="max-w-2xl leading-relaxed">
            The tour points at the parts of the screen one by one: the keyboard picture and its layers, changing a key,
            undo, help, and backups. Six short stops. Or read Getting started from the top: a few minutes, and nothing on
            the keyboard changes while you read.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icon={<Route size={16} aria-hidden />} onClick={() => tour.start(0)}>
              Take the tour
            </Button>
            <a
              href={topicHref(GUIDE[0].topics[0])}
              className="inline-flex h-9 items-center gap-2 rounded-pill border border-edge bg-raised px-4 font-medium hover:bg-raised-hover"
            >
              <BookOpen size={16} aria-hidden />
              Read Getting started
            </a>
          </div>
        </div>
      </Card>
      <Card title="Find your way" description="The topics follow the pages of the app. The search finds any word, QMK’s names included.">
        <ul className="grid gap-2.5 @xl:grid-cols-2">
          {GUIDE.map((group) => (
            <Tile key={group.id} href={topicHref(group.topics[0])} title={group.title} description={group.description} count={group.topics.length} />
          ))}
          <Tile
            href={GLOSSARY_HREF}
            title="Glossary"
            description="Tap dance, combo, KC_TRNS, EEPROM …: the words other apps and guides use, and what they are called here."
          />
        </ul>
        <p className="mt-3 flex items-center gap-1.5 text-[13px] text-muted">
          <BookA size={14} aria-hidden />
          Each topic links to the place in the app it is about, and most to the QMK, Vial or Keychron documentation for more depth.
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted">
          <Bug size={14} aria-hidden />
          <span>
            Something not working as described? <ExternalLink href={ISSUES_URL}>Report a problem</ExternalLink> on GitHub.
          </span>
        </p>
      </Card>
    </div>
  )
}
