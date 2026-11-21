// SPDX-License-Identifier: GPL-3.0-or-later
// The palette of keys: a search box with a line saying what the key under the pointer does, and the groups of key
// tiles in a box that scrolls and fills the space there is. Macro and multi-tap tiles carry their names and what
// they do (shortcut-keys.ts), so the Shortcuts page's pickers get them too. Groups marked `more` wait under a
// closed "More keys" fold at the end, except while searching, which looks everywhere.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { PaletteGroup, PaletteKey } from '../../device'
import type { HelpTopicId } from '../../help/topics'
import { SearchField } from '../../ui/controls'
import { KeyTile } from '../../ui/KeyTile'
import { Disclosure, HelpButton } from '../../ui/layout'
import { PageLink } from '../../ui/PageLink'
import { nameShortcutGroups, useShortcutKeys } from './shortcut-keys'

/** The help topic behind the "?" beside a group's title. */
const GROUP_HELP: Partial<Record<string, HelpTopicId>> = {
  helpers: 'helper-keys',
  magic: 'magic-keys',
  international: 'international-keys',
  switches: 'switch-keys',
  restart: 'restart-keys',
}

const oneLine = (label: string) => label.replace(/\n/g, ' ')

/** What a tile is called in words: its description, or its label. */
export const keyName = (key: PaletteKey): string => key.description ?? oneLine(key.label)

/**
 * Whether a key matches the search. Every word must appear in its label, description or QMK names. A single
 * character only matches a label exactly, so "a" finds A rather than every key with an "a" in it.
 */
export function matchesSearch(key: PaletteKey, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  // On another computer layout a key has its layout legend and its US one (usLabel): either finds it.
  const labels = [key.label, key.usLabel ?? ''].flatMap((label) => label.toLowerCase().split('\n'))
  if ([...q].length === 1) return labels.includes(q)
  const text = [oneLine(key.label), oneLine(key.usLabel ?? ''), key.description ?? '', key.id, ...(key.aliases ?? [])].join(' ').toLowerCase()
  return q.split(/\s+/).every((word) => text.includes(word))
}

interface Props {
  groups: PaletteGroup[]
  /** What the key being edited does now; its tile is marked. */
  current: number
  /** A key picked but not applied yet (the shortcut's key). */
  picked?: number | null
  onPick: (key: PaletteKey) => void
  /** The line beside the search when the pointer is on no key. */
  hint: string
  /** Name for screen readers. */
  label: string
  /** Beside the search: e.g. the Keys page's "Press a key". */
  tools?: ReactNode
  /** A line under the search row, when there is something to say (what "Press a key" is waiting for). */
  note?: ReactNode
}

/** `?key-search=magic` in the URL: the palette opens with that search, for screenshots. */
const searchFromUrl = (): string => (typeof location === 'undefined' ? '' : (new URLSearchParams(location.search).get('key-search') ?? ''))

export function KeyPalette({ groups, current, picked, onPick, hint, label, tools, note }: Props) {
  const [query, setQuery] = useState(searchFromUrl)
  const [pointed, setPointed] = useState<PaletteKey | null>(null)
  const box = useRef<HTMLDivElement>(null)
  // Macros and multi-tap keys by their names and what they do, wherever the palette is used.
  const shortcutKey = useShortcutKeys()
  const named = useMemo(() => nameShortcutGroups(groups, shortcutKey), [groups, shortcutKey])
  const shown = useMemo(
    () =>
      named
        .map((group) => ({ ...group, keys: group.keys.filter((key) => matchesSearch(key, query)) }))
        .filter((group) => group.keys.length > 0),
    [named, query],
  )

  // Open with the current key in view.
  useEffect(() => {
    const tile = box.current?.querySelector<HTMLElement>('[aria-current="true"], [aria-pressed="true"]')
    if (box.current && tile) box.current.scrollTop = Math.max(0, tile.offsetTop - 36)
  }, [])

  const pointedHere = pointed && shown.some((group) => group.keys.includes(pointed)) ? pointed : null
  // A search looks everywhere; otherwise the rarely needed groups wait under "More keys".
  const searching = query.trim() !== ''
  const everyday = shown.filter((group) => !group.more)
  const rare = shown.filter((group) => group.more)
  const isMarked = (key: PaletteKey) => key.code === current || key.code === picked

  const section = (group: PaletteGroup) => (
    <section key={group.id} aria-label={group.title}>
      <div className="sticky top-0 z-10 bg-card pt-2.5 pb-1.5 text-xs">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-0.5 font-medium text-muted">
            {group.title}
            {GROUP_HELP[group.id] && (
              <span className="-my-1 flex">
                <HelpButton topic={GROUP_HELP[group.id]!} />
              </span>
            )}
          </h3>
          {group.link && <PageLink href={group.link.href}>{group.link.label}</PageLink>}
        </div>
        {group.note && <p className="mt-0.5 text-muted">{group.note}</p>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {group.keys.map((key) => (
          <KeyTile
            key={key.id}
            label={key.label}
            name={keyName(key)}
            empty={key.empty}
            current={key.code === current}
            picked={picked === undefined ? undefined : key.code === picked}
            onClick={() => onPick(key)}
            onMouseEnter={() => setPointed(key)}
            onFocus={() => setPointed(key)}
          />
        ))}
      </div>
    </section>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-3">
        <SearchField aria-label="Search keys" placeholder="Search keys" value={query} onChange={setQuery} className="w-52 min-w-36 shrink" />
        {tools}
        <p aria-hidden className="flex min-w-0 items-baseline gap-2 text-[13px] text-muted">
          {pointedHere ? (
            <>
              <span className="truncate text-content">{keyName(pointedHere)}</span>
              <span className="shrink-0 font-mono text-xs">{pointedHere.id}</span>
            </>
          ) : (
            <span className="truncate">{hint}</span>
          )}
        </p>
      </div>
      {note && (
        <p role="status" className="text-[13px] text-muted">
          {note}
        </p>
      )}
      <div
        ref={box}
        role="group"
        aria-label={label}
        onMouseLeave={() => setPointed(null)}
        // A zero basis, so the tiles never decide the height: the box takes what is left, at least min-h.
        className="relative min-h-36 shrink grow basis-0 overflow-y-auto rounded-control border border-edge px-3 pb-3"
      >
        {shown.length === 0 && (
          <p className="pt-3 text-[13px] text-muted">
            No key matches “{query.trim()}”. If you know its QMK name, type it under More options, Key code.
          </p>
        )}
        {(searching ? shown : everyday).map(section)}
        {!searching && rare.length > 0 && (
          // Rarely needed keys, folded away; open by itself when the key being edited is one of them.
          <Disclosure id="keys-palette-more" label="More keys" forceOpen={rare.some((group) => group.keys.some(isMarked))}>
            <div className="-mt-2.5">{rare.map(section)}</div>
            <p className="mt-3 flex items-center gap-0.5 text-[13px] text-muted">
              Keys for joysticks, MIDI, sound and other hardware most keyboards don’t have are left out.
              <HelpButton topic="left-out-keys" />
            </p>
          </Disclosure>
        )}
      </div>
    </div>
  )
}
