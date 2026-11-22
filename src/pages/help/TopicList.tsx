// SPDX-License-Identifier: GPL-3.0-or-later
// The Help page's list of topics: "Start here", then the guide's groups in reading order, then the glossary. The
// one open is marked.

import { useEffect, useRef, type ReactNode } from 'react'
import { BookA, Compass } from 'lucide-react'
import { GLOSSARY_HREF, GUIDE, topicHref } from '../../help/guide'
import { HELP_TOPICS } from '../../help/topics'
import { cx } from '../../ui/controls'
import type { HelpView } from './route'

function Item({ href, current, children }: { href: string; current: boolean; children: ReactNode }) {
  return (
    <li>
      <a
        href={href}
        aria-current={current ? 'page' : undefined}
        className={cx(
          'flex scroll-mt-10 scroll-mb-2 items-center gap-2 rounded-control px-2.5 py-1.5 text-[13px] leading-snug transition-colors duration-(--motion-fast)',
          current ? 'bg-accent-soft font-medium text-accent' : 'text-content hover:bg-raised',
        )}
      >
        {children}
      </a>
    </li>
  )
}

export function TopicList({ view }: { view: HelpView }) {
  const isTopic = (id: string) => view.kind === 'topic' && view.id === id
  // The open topic is brought into the list's view (clear of the sticky group title), not the page's: only the list's
  // own scrolling box moves. Narrow, where the list doesn't scroll by itself, nothing moves, and the page opens at
  // its top (scrollIntoView would scroll the page down to the list's marked item).
  const nav = useRef<HTMLElement>(null)
  const key = view.kind === 'topic' ? view.id : view.kind
  useEffect(() => {
    const item = nav.current?.querySelector<HTMLElement>('[aria-current="page"]')
    const box = nav.current?.parentElement
    if (!item || !box || box.scrollHeight <= box.clientHeight) return
    const top = item.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop
    const bottom = top + item.offsetHeight
    // The same room as the item's scroll-mt-10 (the sticky group title) and scroll-mb-2.
    if (top - 40 < box.scrollTop) box.scrollTop = top - 40
    else if (bottom + 8 > box.scrollTop + box.clientHeight) box.scrollTop = bottom + 8 - box.clientHeight
  }, [key])
  return (
    <nav ref={nav} aria-label="Help topics" className="flex flex-col gap-5">
      <ul>
        <Item href="#/help" current={view.kind === 'overview'}>
          <Compass size={15} aria-hidden className="shrink-0" />
          Start here
        </Item>
      </ul>
      {GUIDE.map((group) => (
        <div key={group.id}>
          {/* A filled band the width of the list, so a group's title can't be taken for one more topic; it stays at
              the top of the list while its topics scroll under it. */}
          <h3 className="sticky top-0 z-10 mb-1.5 rounded-control bg-band px-2.5 py-1.5 text-xs font-semibold text-content">
            {group.title}
          </h3>
          <ul className="flex flex-col gap-px pl-2">
            {group.topics.map((id) => (
              <Item key={id} href={topicHref(id)} current={isTopic(id)}>
                {HELP_TOPICS[id].title}
              </Item>
            ))}
            {group.id === 'words' && (
              <Item href={GLOSSARY_HREF} current={view.kind === 'glossary'}>
                <BookA size={15} aria-hidden className="shrink-0" />
                Glossary
              </Item>
            )}
          </ul>
        </div>
      ))}
    </nav>
  )
}
