// SPDX-License-Identifier: GPL-3.0-or-later
// Home: the keyboard at a glance, and shortcuts to the common jobs.

import { House } from 'lucide-react'
import type { PageDef } from '../plugins/api'
import { Placeholder } from './Placeholder'

function HomePage() {
  return (
    <Placeholder>
      <p>
        Your keyboard at a glance: how it is connected, its battery, which layer is on and its firmware version.
      </p>
      <p>Below that, shortcuts to the things people do most: change a key, pick a lighting effect, make a backup.</p>
    </Placeholder>
  )
}

export const homePage: PageDef = { path: 'home', title: 'Home', icon: House, stage: 'view', component: HomePage }
