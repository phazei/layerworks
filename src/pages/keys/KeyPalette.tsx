// SPDX-License-Identifier: GPL-3.0-or-later
// The palette of keys: a search box with a line saying what the key under the pointer does, and the groups of key
// tiles in a box that scrolls and fills the space there is. Macro and multi-tap tiles carry their names and what
// they do (shortcut-keys.ts), so the Shortcuts page's pickers get them too.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { PaletteGroup, PaletteKey } from '../../device'
import { SearchField } from '../../ui/controls'
import { KeyTile } from '../../ui/KeyTile'
import { PageLink } from '../../ui/PageLink'
import { nameShortcutGroups, useShortcutKeys } from './shortcut-keys'

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
  if ([...q].length === 1) return key.label.toLowerCase().split('\n').includes(q)
  const text = [oneLine(key.label), key.description ?? '', key.id, ...(key.aliases ?? [])].join(' ').toLowerCase()
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
}

export function KeyPalette({ groups, current, picked, onPick, hint, label }: Props) {
  const [query, setQuery] = useState('')
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
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-3">
        <SearchField aria-label="Search keys" placeholder="Search keys" value={query} onChange={setQuery} className="w-52 shrink-0" />
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
        {shown.map((group) => (
          <section key={group.id} aria-label={group.title}>
            <div className="sticky top-0 z-10 flex items-baseline justify-between gap-3 bg-card pt-2.5 pb-1.5 text-xs">
              <h3 className="font-medium text-muted">{group.title}</h3>
              {group.link && <PageLink href={group.link.href}>{group.link.label}</PageLink>}
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
        ))}
      </div>
    </div>
  )
}
