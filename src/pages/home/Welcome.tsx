// SPDX-License-Identifier: GPL-3.0-or-later
// Home with no keyboard: what Layerworks is for, around the connect prompt.

import type { ReactNode } from 'react'
import { HardDriveDownload, Keyboard, Palette } from 'lucide-react'
import { Connecting, ConnectPrompt } from '../../shell/ConnectPrompt'

function Point({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex flex-col items-center gap-2 text-center">
      <span className="flex size-9 items-center justify-center rounded-pill bg-raised text-muted">{icon}</span>
      <span className="font-medium">{title}</span>
      <span className="text-[13px] leading-snug text-muted">{children}</span>
    </li>
  )
}

export function Welcome({ connecting }: { connecting: boolean }) {
  if (connecting) return <Connecting />
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 py-6">
      <div className="flex w-full">
        <ConnectPrompt />
      </div>
      <ul aria-label="What you can do" className="grid w-full max-w-2xl grid-cols-3 gap-6">
        <Point icon={<Keyboard size={17} aria-hidden />} title="Change what keys do">
          Any key or knob turn can type, send a shortcut, run a macro or switch layers.
        </Point>
        <Point icon={<Palette size={17} aria-hidden />} title="Set the lighting">
          Pick an effect, its colour, speed and brightness.
        </Point>
        <Point icon={<HardDriveDownload size={17} aria-hidden />} title="Keep a backup">
          Save everything to a file and put it back any time.
        </Point>
      </ul>
    </div>
  )
}
