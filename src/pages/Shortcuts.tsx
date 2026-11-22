// SPDX-License-Identifier: GPL-3.0-or-later
// Shortcuts & macros: the list on the left (macros, then multi-tap keys, key chords, shortcut replacements and
// repeat rules, each in its own section, those not in use under "More options"), the one picked on the right, edited
// in place; narrow, the two take turns. "#/shortcuts/macro/1" opens Macro 1 (QMK's M1), "#/shortcuts/chord/1" Key
// chord 1 (shortcuts/route.ts). No keyboard picture: the editors need the room, and the keys a shortcut is on are
// listed (and linked) in them.

import { useEffect, useRef } from 'react'
import { ArrowLeft, Command } from 'lucide-react'
import { useDevice, type Capabilities } from '../device'
import type { PageDef } from '../plugins/api'
import { replacePath, usePath } from '../shell/router'
import { cx } from '../ui/controls'
import { Card } from '../ui/layout'
import { PageLink } from '../ui/PageLink'
import { ChordEditor } from './shortcuts/ChordEditor'
import { MacroEditor } from './shortcuts/MacroEditor'
import { OverrideEditor } from './shortcuts/OverrideEditor'
import { RepeatEditor } from './shortcuts/RepeatEditor'
import { useDrafts } from './shortcuts/drafts'
import { firstFree } from './shortcuts/first-free'
import { kindFromPath, macroHref, openedFromPath, shortcutHref, shortcutPath, type Opened } from './shortcuts/route'
import { ShortcutList } from './shortcuts/ShortcutList'
import { TapDanceEditor } from './shortcuts/TapDanceEditor'

/**
 * With no macros in the firmware (`macros` false) the card says so instead of offering Macro 1; with none of the
 * other kinds either (`others` false), it doesn't point at them.
 */
export function Nothing({ macros, others = true }: { macros: boolean; others?: boolean }) {
  if (!macros && !others) {
    return (
      <Card title="Shortcuts" description="What the keyboard can do beyond one key, one character.">
        <p className="text-[13px] text-muted">
          This keyboard’s firmware has no room for macros, multi-tap keys, key chords, shortcut replacements or repeat
          rules, so there is nothing to set up here. Its keys can still type, send shortcuts and switch layers: see the{' '}
          <PageLink href="#/keys">Keys page</PageLink>.
        </p>
      </Card>
    )
  }
  return (
    <Card title="Pick a shortcut" description="Choose one on the left to see what it does and change it.">
      <div className="flex flex-col gap-2 text-[13px] text-muted">
        {macros ? (
          <>
            <p>
              A macro types text or presses a series of keys when you press one key: a signature, a greeting, or a
              shortcut that takes three hands. Text is typed the way a US keyboard types it; on another layout, build
              symbols such as @ from “Tap a key” steps.
            </p>
            <p>
              Build it from steps or record it as you type, save it to the keyboard, then put it on a key from the Keys
              page. <a className="font-medium text-accent hover:underline" href={macroHref(1)}>Start with Macro 1</a>,
              which runs the key printed M1 on keyboards that have one.
            </p>
          </>
        ) : (
          <p>This keyboard’s firmware has no macros.</p>
        )}
        {others && (
          <p>
            {macros ? 'Below the macros, or under More options until you use them: ' : 'On the left, or under More options until you use them: '}
            keys that do different things when tapped or held, keys pressed together, shortcuts that send something
            else, and what the repeat key does, as far as this keyboard’s firmware has them.
          </p>
        )}
      </div>
    </Card>
  )
}

/**
 * Compatibility: firmware built without tap dance, combos, key overrides and alt repeat reports no slots for any of
 * them (vial_qmk quantum/vial.c, dynamic_vial_get_number_of_entries; e.g. keyboards/flehrad/bigswitch). True while
 * the counts aren't known yet.
 */
function hasEntrySlots(caps: Capabilities | null): boolean {
  return !caps || caps.tapDances + caps.combos + caps.keyOverrides + caps.altRepeatKeys > 0
}

function Editor({ opened }: { opened: Opened }) {
  switch (opened.kind) {
    case 'macro':
      return <MacroEditor index={opened.index} />
    case 'combo':
      return <ChordEditor index={opened.index} />
    case 'keyOverride':
      return <OverrideEditor index={opened.index} />
    case 'tapDance':
      return <TapDanceEditor index={opened.index} />
    case 'altRepeatKey':
      return <RepeatEditor index={opened.index} />
  }
}

function ShortcutsPage() {
  const path = usePath()
  const caps = useDevice((s) => s.capabilities)
  const macroCount = useDevice((s) => s.keyboard?.macroCount ?? 0)
  const uid = useDevice((s) => s.keyboard?.uid ?? '')
  const opened = openedFromPath(path)
  const count = !opened
    ? 0
    : {
        macro: macroCount,
        tapDance: caps?.tapDances ?? 0,
        combo: caps?.combos ?? 0,
        keyOverride: caps?.keyOverrides ?? 0,
        altRepeatKey: caps?.altRepeatKeys ?? 0,
      }[opened.kind]
  const selected = opened && opened.index < count ? opened : null

  // "#/shortcuts/multi-tap": the first free slot of that kind, in place of the address (Back skips it); with none
  // free, that kind's section, shown.
  const kind = kindFromPath(path)
  const kb = useDevice((s) => s.keyboard)
  const macros = useDevice((s) => s.macros)
  const entries = useDevice((s) => s.entries)
  const drafts = useDrafts()
  const free = kind && kb ? firstFree(kind, kb, macros, entries, drafts) : undefined
  useEffect(() => {
    if (kind && free !== undefined && free !== null) replacePath(shortcutPath(kind, free))
  }, [kind, free])

  // Narrow (one column), the list and the open shortcut take turns, as on the Help page: picking one shows its
  // editor in the list's place, with "All shortcuts" above it to go back (so does the browser's Back). The focus
  // follows: into the editor when it replaces the list, back onto the shortcut's row when the list returns.
  const listBox = useRef<HTMLDivElement>(null)
  const editorBox = useRef<HTMLDivElement>(null)
  const lastOpened = useRef<{ href: string; stacked: boolean } | null>(null)
  const selectedKey = selected ? `${selected.kind}:${selected.index}` : ''
  useEffect(() => {
    const list = listBox.current
    const now = document.activeElement
    const lost = !now || now === document.body || (list?.contains(now) ?? false)
    if (selected) {
      const stacked = list !== null && getComputedStyle(list).display === 'none'
      lastOpened.current = { href: shortcutHref(selected.kind, selected.index), stacked }
      if (stacked && lost) editorBox.current?.focus()
      return
    }
    const last = lastOpened.current
    lastOpened.current = null
    if (last?.stacked && (lost || editorBox.current === null)) list?.querySelector<HTMLElement>(`a[href="${last.href}"]`)?.focus()
    // Only when what is open changes.
  }, [selectedKey])

  const nothingAtAll = macroCount === 0 && !hasEntrySlots(caps)

  return (
    <div className="@container">
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 @2xl:grid-cols-[17rem_minmax(0,1fr)] @5xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div ref={listBox} className={cx('min-w-0', selected && 'hidden @2xl:block')}>
          <ShortcutList selected={selected} focus={kind && free === null ? kind : null} />
        </div>
        {/* Keyed by keyboard too: what an editor holds (a save's outcome, an open picker) belongs to one keyboard. */}
        {selected === null ? (
          // Narrow, the list is enough: this card points "on the left", and the list is all there is.
          <div className={cx('min-w-0', !nothingAtAll && 'hidden @2xl:block')}>
            <Nothing macros={macroCount > 0} others={hasEntrySlots(caps)} />
          </div>
        ) : (
          <div ref={editorBox} tabIndex={-1} aria-label="The shortcut being changed" role="region" className="min-w-0 outline-none">
            <a href="#/shortcuts" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline @2xl:hidden">
              <ArrowLeft size={14} aria-hidden />
              All shortcuts
            </a>
            <Editor key={`${uid}:${selected.kind}:${selected.index}`} opened={selected} />
          </div>
        )}
      </div>
    </div>
  )
}
export const shortcutsPage: PageDef = {
  path: 'shortcuts',
  title: 'Shortcuts & macros',
  icon: Command,
  help: 'macros',
  component: ShortcutsPage,
}
