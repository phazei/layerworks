// SPDX-License-Identifier: GPL-3.0-or-later
// Home, the landing page: the keyboard at a glance, shortcuts to the common jobs, and what the keyboard can do.
// With no keyboard it welcomes the visitor around the connect prompt, so it works offline.

import { HardDriveDownload, House, Keyboard, Palette, ScanLine } from 'lucide-react'
import { useDevice } from '../device'
import type { PageDef } from '../plugins/api'
import { ActionTile } from '../ui/display'
import { Abilities } from './home/Abilities'
import { Status } from './home/Status'
import { Welcome } from './home/Welcome'

const ICON = 20

function Shortcuts() {
  return (
    <nav aria-label="Shortcuts" className="grid gap-3 sm:grid-cols-2">
      <ActionTile
        href="#/keys"
        icon={<Keyboard size={ICON} aria-hidden />}
        title="Change what a key does"
        description="Click a key on the picture and choose what it should do."
      />
      <ActionTile
        href="#/lighting"
        icon={<Palette size={ICON} aria-hidden />}
        title="Pick a lighting effect"
        description="Effects, colour, speed and brightness."
      />
      <ActionTile
        href="#/device"
        icon={<HardDriveDownload size={ICON} aria-hidden />}
        title="Back up the keyboard"
        description="Save its keys and settings to a file."
      />
      <ActionTile
        href="#/test"
        icon={<ScanLine size={ICON} aria-hidden />}
        title="Test the keys"
        description="Press each key and see that it works."
      />
    </nav>
  )
}

function HomePage() {
  const status = useDevice((s) => s.status)
  const keyboard = useDevice((s) => s.keyboard)
  if (status !== 'ready' || !keyboard) return <Welcome connecting={status === 'connecting'} />
  return (
    <div className="flex flex-col gap-4">
      <Status />
      <Shortcuts />
      <Abilities />
    </div>
  )
}

export const homePage: PageDef = {
  path: 'home',
  title: 'Home',
  icon: House,
  stage: 'view',
  // Shows its own welcome and the connect prompt while no keyboard is connected.
  offline: true,
  component: HomePage,
}
