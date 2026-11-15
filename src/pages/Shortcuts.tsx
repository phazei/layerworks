// SPDX-License-Identifier: GPL-3.0-or-later
// Shortcuts & macros: text snippets, macros, and keys that do more than one thing.

import { Command } from 'lucide-react'
import type { PageDef } from '../plugins/api'
import { Placeholder } from './Placeholder'

function ShortcutsPage() {
  return (
    <Placeholder>
      <p>
        Text snippets and macros that type or press a series of keys for you, recorded or built step by step. Each
        one can then go on any key from the Keys page.
      </p>
      <p>Under “More options”: keys that do different things when tapped twice, and keys pressed together.</p>
    </Placeholder>
  )
}

export const shortcutsPage: PageDef = {
  path: 'shortcuts',
  title: 'Shortcuts & macros',
  icon: Command,
  stage: 'view',
  component: ShortcutsPage,
}
