// SPDX-License-Identifier: GPL-3.0-or-later
// Device: back up and restore, firmware information, wireless and sleep timers.

import { Microchip } from 'lucide-react'
import type { PageDef } from '../plugins/api'
import { Placeholder } from './Placeholder'

function DevicePage() {
  return (
    <Placeholder>
      <p>
        Back up everything on the keyboard to one file and put it back later, see which firmware it runs, and set
        how soon it goes to sleep when wireless.
      </p>
    </Placeholder>
  )
}

export const devicePage: PageDef = { path: 'device', title: 'Device', icon: Microchip, component: DevicePage }
