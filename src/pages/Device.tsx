// SPDX-License-Identifier: GPL-3.0-or-later
// Device: back up and restore, wireless and sleep timers, everything known about the keyboard, and under More options a
// reset to the firmware's keys and a restart for a firmware update. Full height, no stage; two columns once there is
// room.

import { Microchip } from 'lucide-react'
import type { PageDef } from '../plugins/api'
import { screenshotOption } from '../shell/session'
import { Backup } from './device/Backup'
import { KeyboardInfo } from './device/KeyboardInfo'
import { StartOver } from './device/StartOver'
import { Wireless } from './device/Wireless'

/**
 * `?device-more` opens More options, `?device-more=reset` or `=bootloader` that confirmation too: for screenshots,
 * so only on the demo keyboard (screenshotOption).
 */
const moreParam = () => screenshotOption('device-more')

function DevicePage() {
  return (
    <div className="@container max-w-6xl">
      <div className="grid items-start gap-4 @4xl:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div data-tour="backup">
            <Backup />
          </div>
          <Wireless />
          <StartOver forceOpen={moreParam() !== null} asking={moreParam()} />
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
