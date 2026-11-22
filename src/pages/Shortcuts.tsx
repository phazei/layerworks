// SPDX-License-Identifier: GPL-3.0-or-later
// Shortcuts & macros: the list on the left (macros, then multi-tap keys, key chords, shortcut replacements and
// repeat rules, each in its own section, those not in use under "More options"), the one picked on the right, edited
// in place. "#/shortcuts/macro/1" opens Macro 1 (QMK's M1), "#/shortcuts/chord/1" Key chord 1 (shortcuts/route.ts). No
// keyboard picture: the editors need the room, and the keys a shortcut is on are listed (and linked) in them.

import { useEffect } from 'react'
import { Command } from 'lucide-react'
import { useDevice } from '../device'
import type { PageDef } from '../plugins/api'
import { replacePath, usePath } from '../shell/router'
import { Card } from '../ui/layout'
import { ChordEditor } from './shortcuts/ChordEditor'
import { MacroEditor } from './shortcuts/MacroEditor'
import { OverrideEditor } from './shortcuts/OverrideEditor'
import { RepeatEditor } from './shortcuts/RepeatEditor'
import { useDrafts } from './shortcuts/drafts'
import { firstFree } from './shortcuts/first-free'
import { kindFromPath, macroHref, openedFromPath, shortcutPath, type Opened } from './shortcuts/route'
import { ShortcutList } from './shortcuts/ShortcutList'
import { TapDanceEditor } from './shortcuts/TapDanceEditor'

function Nothing() {
  return (
    <Card title="Pick a shortcut" description="Choose one on the left to see what it does and change it.">
      <div className="flex flex-col gap-2 text-[13px] text-muted">
        <p>
          A macro types text or presses a series of keys when you press one key: your e-mail address, a signature, or
          a shortcut that takes three hands.
        </p>
        <p>
          Build it from steps or record it as you type, save it to the keyboard, then put it on a key from the Keys
          page. <a className="font-medium text-accent hover:underline" href={macroHref(1)}>Start with Macro 1</a>, which
          the key printed M1 runs on Keychron keyboards.
        </p>
        <p>
          Below the macros, or under More options until you use them: keys that do different things when tapped or
          held, keys pressed together, shortcuts that send something else, and what the repeat key does.
        </p>
      </div>
    </Card>
  )
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

  return (
    <div className="@container">
      <div className="grid items-start gap-4 @2xl:grid-cols-[17rem_minmax(0,1fr)] @5xl:grid-cols-[22rem_minmax(0,1fr)]">
        <ShortcutList selected={selected} focus={kind && free === null ? kind : null} />
        {/* Keyed by keyboard too: what an editor holds (a save's outcome, an open picker) belongs to one keyboard. */}
        {selected === null ? <Nothing /> : <Editor key={`${uid}:${selected.kind}:${selected.index}`} opened={selected} />}
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
