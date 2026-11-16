// SPDX-License-Identifier: GPL-3.0-or-later
// Picking a lighting colour: a row of ready colours, the ones used lately, and colour and vividness sliders for
// anything else. Colours are QMK hue and saturation (0 – 255); brightness is the keyboard's, set elsewhere.

import type { ReactNode } from 'react'
import { colourName, hsvCss, HUE_TRACK, percent, satTrack } from './colour'
import { cx, Slider } from './controls'

export interface HueSat {
  hue: number
  sat: number
}

/** Ready colours: the rainbow, white and a warm white. */
export const PRESET_COLOURS: readonly (HueSat & { name: string })[] = [
  { name: 'Red', hue: 0, sat: 255 },
  { name: 'Orange', hue: 18, sat: 255 },
  { name: 'Yellow', hue: 40, sat: 255 },
  { name: 'Green', hue: 85, sat: 255 },
  { name: 'Turquoise', hue: 128, sat: 255 },
  { name: 'Blue', hue: 170, sat: 255 },
  { name: 'Purple', hue: 191, sat: 255 },
  { name: 'Pink', hue: 225, sat: 200 },
  { name: 'White', hue: 0, sat: 0 },
  { name: 'Warm white', hue: 22, sat: 110 },
]

const same = (a: HueSat, b: HueSat) => a.hue === b.hue && a.sat === b.sat

function Swatch({ colour, name, chosen, onPick }: { colour: HueSat; name: string; chosen: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-label={name}
      aria-pressed={chosen}
      onClick={onPick}
      className={cx(
        'size-7 shrink-0 cursor-pointer rounded-pill border border-edge-strong transition-transform duration-(--motion-fast) hover:scale-110',
        chosen && 'ring-2 ring-accent ring-offset-2 ring-offset-card',
      )}
      style={{ backgroundColor: hsvCss(colour.hue, colour.sat) }}
    />
  )
}

interface Props {
  value: HueSat
  onChange: (value: HueSat) => void
  /** Colours used lately, newest first. */
  recent?: readonly HueSat[]
  /** Under the sliders, e.g. where brightness is set. */
  note?: ReactNode
  help?: ReactNode
}

export function ColourChooser({ value, onChange, recent = [], note, help }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Ready colours" className="flex flex-wrap gap-1.5">
        {PRESET_COLOURS.map((c) => (
          <Swatch key={c.name} colour={c} name={c.name} chosen={same(c, value)} onPick={() => onChange({ hue: c.hue, sat: c.sat })} />
        ))}
      </div>
      {recent.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted">Used lately</span>
          <div role="group" aria-label="Colours used lately" className="flex flex-wrap gap-1.5">
            {recent.map((c, i) => (
              <Swatch
                key={`${c.hue},${c.sat},${i}`}
                colour={c}
                name={`${colourName(c.hue, c.sat)} (used lately)`}
                chosen={same(c, value)}
                onPick={() => onChange({ hue: c.hue, sat: c.sat })}
              />
            ))}
          </div>
        </div>
      )}
      <Slider
        label={
          <>
            <span aria-hidden className="size-3.5 rounded-pill border border-edge-strong" style={{ backgroundColor: hsvCss(value.hue, value.sat) }} />
            Colour
          </>
        }
        help={help}
        value={value.hue}
        max={255}
        format={() => colourName(value.hue, value.sat)}
        track={HUE_TRACK}
        onChange={(hue) => onChange({ ...value, hue })}
      />
      <Slider
        label="Vividness"
        value={value.sat}
        max={255}
        format={(v) => percent(v, 255)}
        track={satTrack(value.hue)}
        onChange={(sat) => onChange({ ...value, sat })}
        hint={note}
      />
    </div>
  )
}
