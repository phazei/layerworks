// SPDX-License-Identifier: GPL-3.0-or-later
// Shortcuts & macros: the list on the left (macros, and under "More options" the other kinds of shortcut, each in
// its own section), the one picked on the right, edited in place. "#/shortcuts/macro/1" opens Macro 1. No
// keyboard picture: the editor needs the room, and the keys a macro is on are listed (and linked) in it.

import { Command } from 'lucide-react'
import { useDevice } from '../device'
import type { PageDef } from '../plugins/api'
import { usePath } from '../shell/router'
import { Card } from '../ui/layout'
import { MacroEditor } from './shortcuts/MacroEditor'
import { MacroList } from './shortcuts/MacroList'
import { macroFromPath, macroHref } from './shortcuts/route'

function Nothing() {
  return (
    <Card title="Pick a macro" description="Choose one on the left to see its steps and change them.">
      <div className="flex flex-col gap-2 text-[13px] text-muted">
        <p>
          A macro types text or presses a series of keys when you press one key: your e-mail address, a signature, or
          a shortcut that takes three hands.
        </p>
        <p>
          Build it from steps or record it as you type, save it to the keyboard, then put it on a key from the Keys
          page. <a className="font-medium text-accent hover:underline" href={macroHref(0)}>Start with Macro 1</a>.
        </p>
      </div>
    </Card>
  )
}

function ShortcutsPage() {
  const path = usePath()
  const count = useDevice((s) => s.keyboard?.macroCount ?? 0)
  const picked = macroFromPath(path)
  const selected = picked !== null && picked < count ? picked : null

  return (
    <div className="@container">
      <div className="grid items-start gap-4 @2xl:grid-cols-[17rem_minmax(0,1fr)] @5xl:grid-cols-[20rem_minmax(0,1fr)]">
        <MacroList selected={selected} />
        {selected === null ? <Nothing /> : <MacroEditor key={selected} index={selected} />}
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
