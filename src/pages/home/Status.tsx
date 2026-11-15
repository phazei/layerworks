// SPDX-License-Identifier: GPL-3.0-or-later
// The connected keyboard at a glance: how it is connected, battery, the layer that is on, firmware and lock.

import { BatteryFull, BatteryLow, BatteryMedium, Cable, Cpu, Layers, Lock, LockOpen, Radio } from 'lucide-react'
import { useDevice, type LoadPart } from '../../device'
import { useConnectedLayerNames } from '../../shell/layer-names'
import { Fact, Facts } from '../../ui/display'
import { Card, HelpButton } from '../../ui/layout'

const ICON = 15

/** What to say for a part that hasn't arrived: still being read, or couldn't be. */
function pending(part: LoadPart, loading: readonly LoadPart[], fallback: string): string {
  return loading.includes(part) ? 'Reading…' : fallback
}

export function Status() {
  const link = useDevice((s) => s.link)
  const keyboard = useDevice((s) => s.keyboard)
  const layer = useDevice((s) => s.layer)
  const unlock = useDevice((s) => s.unlock)
  const keychron = useDevice((s) => s.keychron)
  const loading = useDevice((s) => s.loading)
  const names = useConnectedLayerNames()

  const wireless = link?.kind === 'receiver'
  const battery = wireless && keychron?.hasWireless && keychron.batteryLevel > 0 ? keychron.batteryLevel : null
  const BatteryIcon = battery === null || battery > 60 ? BatteryFull : battery > 25 ? BatteryMedium : BatteryLow
  const layerName = (i: number) => names[i] ?? `Layer ${i}`

  return (
    <Card title={keyboard?.name ?? link?.productName} description="Everything you change is kept on the keyboard itself.">
      <Facts label="At a glance">
        <Fact
          label="Connection"
          icon={wireless ? <Radio size={ICON} aria-hidden /> : <Cable size={ICON} aria-hidden />}
          hint={wireless ? 'Through the Keychron Link receiver' : 'Plugged in with the cable'}
        >
          {wireless ? '2.4 GHz' : 'Cable'}
        </Fact>
        {battery !== null && (
          <Fact label="Battery" icon={<BatteryIcon size={ICON} aria-hidden />}>
            <span className="tabular-nums">{battery} %</span>
          </Fact>
        )}
        <Fact
          label="Layer in use"
          icon={<Layers size={ICON} aria-hidden />}
          hint={
            layer === null
              ? 'This keyboard doesn’t say which layer is on.'
              : layer.held > 0 && layer.held !== layer.base
                ? `Held on top of ${layerName(layer.base)}`
                : 'Changes here as you switch layers on the keyboard'
          }
        >
          {layer === null ? 'Not reported' : layerName(layer.active)}
          <HelpButton topic="layers" />
        </Fact>
        <Fact
          label="Firmware"
          icon={<Cpu size={ICON} aria-hidden />}
          hint={keyboard ? `Vial protocol ${keyboard.vialProtocol}, VIA ${keyboard.viaProtocol}` : undefined}
        >
          {keychron?.firmwareVersion || pending('keychron', loading, 'Not reported')}
        </Fact>
        <Fact
          label="Protection"
          icon={unlock?.unlocked ? <LockOpen size={ICON} aria-hidden /> : <Lock size={ICON} aria-hidden />}
          hint={
            unlock === null
              ? undefined
              : unlock.unlocked
                ? 'Everything can be changed until the keyboard restarts.'
                : 'Keys and lighting change freely; a few powerful changes ask first.'
          }
        >
          {unlock === null ? pending('unlock', loading, 'Unknown') : unlock.unlocked ? 'Unlocked' : 'Locked'}
          <HelpButton topic="unlock" />
        </Fact>
      </Facts>
    </Card>
  )
}
