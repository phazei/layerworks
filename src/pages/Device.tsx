// SPDX-License-Identifier: GPL-3.0-or-later
// Device: back up and restore, wireless and sleep timers, and everything known about the keyboard. Full height,
// no stage; two columns once there is room.

import { Microchip } from 'lucide-react'
import type { PageDef } from '../plugins/api'
import { Backup } from './device/Backup'
import { KeyboardInfo } from './device/KeyboardInfo'
import { Wireless } from './device/Wireless'

function DevicePage() {
  return (
    <div className="@container max-w-6xl">
      <div className="grid items-start gap-4 @4xl:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Backup />
          <Wireless />
        </div>
        <KeyboardInfo />
      </div>
    </div>
  )
}

export const devicePage: PageDef = {
  path: 'device',
  title: 'Device',
  icon: Microchip,
  help: 'backup',
  component: DevicePage,
}
