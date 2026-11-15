// SPDX-License-Identifier: GPL-3.0-or-later
// Typing feel: how keys respond, above all when a key counts as held rather than tapped.

import { Gauge } from 'lucide-react'
import type { PageDef } from '../plugins/api'
import { Placeholder } from './Placeholder'

function TypingPage() {
  return (
    <Placeholder>
      <p>
        How the keys respond: one setting for how long a key must be held before it counts as held rather than
        tapped, with a box to try it in. The finer timing settings sit under “More options”.
      </p>
    </Placeholder>
  )
}

export const typingPage: PageDef = { path: 'typing', title: 'Typing feel', icon: Gauge, component: TypingPage }
