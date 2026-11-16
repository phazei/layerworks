// SPDX-License-Identifier: GPL-3.0-or-later
// The connected keyboard at the top of the sidebar: its name, how it is connected, battery and lock state.

import type { ReactNode } from 'react'
import { BatteryFull, BatteryLow, BatteryMedium, Cable, Keyboard, Lock, LockOpen, Radio, Unplug } from 'lucide-react'
import { deviceStore, useDevice } from '../device'
import { Badge, Button, Spinner } from '../ui/controls'
import { HelpButton } from '../ui/layout'
import { demoKeyboard, disconnect } from './session'
import { openUnlock } from './unlock-dialog'

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-6 items-center gap-2 text-[13px] text-muted">
      <span className="flex w-4 justify-center">{icon}</span>
      {children}
    </div>
  )
}

function Battery({ level }: { level: number }) {
  const Icon = level > 60 ? BatteryFull : level > 25 ? BatteryMedium : BatteryLow
  return (
    <Fact icon={<Icon size={15} aria-hidden />}>
      <span>
        Battery <span className="tabular-nums">{level} %</span>
      </span>
    </Fact>
  )
}

export function DeviceCard() {
  const status = useDevice((s) => s.status)
  const link = useDevice((s) => s.link)
  const keyboard = useDevice((s) => s.keyboard)
  const keychron = useDevice((s) => s.keychron)
  const unlock = useDevice((s) => s.unlock)
  const unlocking = useDevice((s) => s.unlocking)

  if (status === 'connecting') {
    return (
      <div className="rounded-card bg-raised p-3.5">
        <div className="flex items-center gap-2 text-[13px] text-muted">
          <Spinner />
          Reading the keyboard…
        </div>
      </div>
    )
  }

  if (status !== 'ready' || !link) {
    return (
      <div className="flex items-center gap-2.5 rounded-card bg-raised p-3.5 text-[13px] text-muted">
        <Keyboard size={16} aria-hidden className="shrink-0" />
        No keyboard connected
      </div>
    )
  }

  const wireless = link.kind === 'receiver'
  const battery = wireless && keychron?.hasWireless && keychron.batteryLevel > 0 ? keychron.batteryLevel : null

  return (
    <section aria-label="Connected keyboard" className="flex flex-col gap-3 rounded-card bg-raised p-3.5">
      <div>
        <div className="leading-snug font-semibold">{keyboard?.name ?? link.productName}</div>
        {demoKeyboard() && (
          <div className="mt-1.5 flex items-center gap-0.5">
            <Badge tone="accent">Demo keyboard</Badge>
            <HelpButton topic="demo" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Fact icon={wireless ? <Radio size={15} aria-hidden /> : <Cable size={15} aria-hidden />}>
          {wireless ? '2.4 GHz receiver' : 'Cable'}
        </Fact>
        {battery !== null && <Battery level={battery} />}
        {unlock && (
          <Fact icon={unlock.unlocked ? <LockOpen size={15} aria-hidden /> : <Lock size={15} aria-hidden />}>
            <span className="flex flex-1 items-center gap-0.5">
              {unlocking ? 'Unlocking…' : unlock.unlocked ? 'Unlocked' : 'Locked'}
              <HelpButton topic="unlock" />
              {!unlocking && (
                <Button
                  size="sm"
                  variant="quiet"
                  className="ml-auto -mr-1 h-6 px-2"
                  onClick={() => (unlock.unlocked ? void deviceStore.lock() : openUnlock())}
                >
                  {unlock.unlocked ? 'Lock' : 'Unlock…'}
                </Button>
              )}
            </span>
          </Fact>
        )}
      </div>
      <Button size="sm" variant="quiet" icon={<Unplug size={14} aria-hidden />} onClick={() => void disconnect()} className="self-start -ml-1">
        Disconnect
      </Button>
    </section>
  )
}
