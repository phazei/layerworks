// SPDX-License-Identifier: GPL-3.0-or-later
// The lock lights (Keychron's indicator settings): the light on Caps Lock, and on Num Lock and the others where the
// keyboard has them, while that lock is on. One colour serves them all; each can be switched off. Worded for the
// lights the keyboard reports (keychron_rgb.c, get_indicators_config). Changes show at once, are saved on the keyboard
// after a pause and can be undone (deviceStore.setLockLights).

import { deviceStore, LOCK_LIGHT_MIN_VAL, LOCK_LIGHTS, useDevice, type LockLights as LockLightValues } from '../../device'
import { colourName, hsvCss, HUE_TRACK, percent, satTrack } from '../../ui/colour'
import { Slider, Toggle } from '../../ui/controls'
import { useLatestQueue } from '../../ui/latest'
import { Card, Disclosure } from '../../ui/layout'

const send = (change: Partial<LockLightValues>) => deviceStore.setLockLights(change)

/** "Caps Lock", "Num Lock and Caps Lock", "Num Lock, Caps Lock and Scroll Lock" */
function listNames(names: string[]): string {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

export function LockLights() {
  const config = useDevice((s) => s.keychron?.rgb?.osIndicatorConfig ?? null)
  const [pending, change] = useLatestQueue<Partial<LockLightValues>>(send)
  if (!config) return null
  const now = { ...config, ...pending }
  const lights = LOCK_LIGHTS.filter((l) => config.availableMask & l.bit)
  if (lights.length === 0) return null
  const one = lights.length === 1
  const names = listNames(lights.map((l) => l.name))
  const swatch = (
    <span aria-hidden className="size-3.5 rounded-pill border border-edge-strong" style={{ backgroundColor: hsvCss(now.hue, now.sat) }} />
  )

  return (
    <Card
      title={one ? `${lights[0].name} light` : 'Lock lights'}
      help="lock-lights"
      description={
        one
          ? `The light on ${names} while ${names} is on.`
          : `The lights on ${names} while each is on. They share one colour.`
      }
    >
      <div className="flex flex-col gap-4">
        {lights.map((light) => (
          <Toggle
            key={light.bit}
            checked={(now.disableMask & light.bit) === 0}
            onChange={(on) => change({ disableMask: on ? now.disableMask & ~light.bit : now.disableMask | light.bit })}
            label={`Light up while ${light.name} is on`}
            hint={(now.disableMask & light.bit) !== 0 ? 'Off: the key shows the lighting effect like the others.' : undefined}
          />
        ))}
        <Slider
          label={<>{swatch}Colour</>}
          value={now.hue}
          max={255}
          format={() => colourName(now.hue, now.sat)}
          track={HUE_TRACK}
          onChange={(hue) => change({ hue })}
        />
        <Slider
          label="Vividness"
          value={now.sat}
          max={255}
          format={(v) => percent(v, 255)}
          track={satTrack(now.hue)}
          hint={now.sat < 40 ? 'At low vividness the light is white, whatever the colour.' : undefined}
          onChange={(sat) => change({ sat })}
        />
      </div>
      <Disclosure id="lighting-lock-lights">
        <Slider
          label="Brightness"
          value={now.val}
          min={LOCK_LIGHT_MIN_VAL}
          max={255}
          format={(v) => percent(v, 255)}
          hint="The keyboard keeps it at half or more. Some firmware lights the key at full brightness whatever this says."
          onChange={(val) => change({ val })}
        />
      </Disclosure>
    </Card>
  )
}
