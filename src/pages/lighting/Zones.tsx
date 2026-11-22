// SPDX-License-Identifier: GPL-3.0-or-later
// "Mixed zones" (Keychron mixed RGB): the keyboard split into zones, each playing its own effects. The zones are
// outlined on the picture; painting moves keys into the chosen zone. Each zone plays up to a handful of effects in
// turn (the firmware's limits come from the keyboard), each with its own colour and speed, using the same names and
// previews as the effect grid. Zone effects are numbered as the keyboard numbers its effects, not as VialRGB: the
// mapping is zoneEffectNumbers (src/device/keychron-rgb.ts).

import { useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  deviceStore,
  useDevice,
  zoneEffectChoices,
  zoneEffectNumbers,
  type ZoneEffect,
  type ZoneNumbers,
} from '../../device'
import { hsvCss, HUE_TRACK, colourName, percent, satTrack } from '../../ui/colour'
import { Button, IconButton, Segmented, Slider } from '../../ui/controls'
import { KeyboardPicture } from '../../ui/KeyboardPicture'
import { useLatestQueue } from '../../ui/latest'
import { Card } from '../../ui/layout'
import { PaintSurface } from '../../ui/PaintSurface'
import { Select } from '../../ui/Select'
import { EffectPreview } from './EffectPreview'
import { EFFECT_GROUPS, effectInfo, type EffectInfo, type EffectRename } from './effects'
import { useKeyLighting } from './key-lighting'
import { ZoneMark, zoneOutline, type ZoneOutline } from './zone-marks'


const EMPTY: ZoneEffect = { effect: 0, hue: 0, sat: 0, speed: 0, time: 0 }
const DEFAULT_TIME = 5000

type RegionsChange = { regions: number[]; undoKey: string }
const sendRegions = ({ regions, undoKey }: RegionsChange) => deviceStore.setZones(regions, undoKey)

export function Zones({ renames }: { renames: Readonly<Record<number, EffectRename>> }) {
  const { keyboard, rgb, leds, layer } = useKeyLighting()
  const effectIds = useDevice((s) => s.lighting?.effects)
  const numbers = useMemo(() => zoneEffectNumbers(effectIds ?? []), [effectIds])
  const [pending, push] = useLatestQueue<RegionsChange>(sendRegions)
  const [zone, setZone] = useState(0)
  const strokes = useRef(0)
  const strokeKey = useRef('')
  const working = useRef<number[]>([])

  const regions = pending.regions ?? rgb?.mixedRGBRegions ?? []
  if (!pending.regions) working.current = regions

  const outlines = useMemo(() => {
    const map = new Map<string, ZoneOutline>()
    for (const [pos, led] of leds) map.set(pos, zoneOutline(regions[led] ?? 0))
    return map
  }, [leds, regions])

  if (!keyboard || !rgb) return null
  const zoneCount = rgb.mixedRGBLayers
  const slots = rgb.mixedRGBEffectsPerLayer

  const onPaint = (pos: string, first: boolean) => {
    const led = leds.get(pos)
    if (led === undefined) return
    if (first) strokeKey.current = `zones:${++strokes.current}`
    const next = [...working.current]
    next[led] = zone
    working.current = next
    push({ regions: next, undoKey: strokeKey.current })
  }

  const keysIn = (z: number) => [...leds.values()].filter((led) => regions[led] === z).length

  return (
    <section aria-label="Mixed zones">
      <Card
        title="Mixed zones"
        help="lighting-zones"
        description="Split the keyboard into areas; each area plays its own effect. Pick a zone, then click or drag across keys to move them into it."
      >
        <div className="grid gap-5 @2xl:grid-cols-[minmax(0,1fr)_15rem] @4xl:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="flex min-w-0 flex-col gap-3">
            <PaintSurface label={`Keyboard: move keys into zone ${zone + 1}`} onPaint={onPaint}>
              <KeyboardPicture keyboard={keyboard} layer={layer} outlines={outlines} />
            </PaintSurface>
            <p className="text-[13px] text-muted">
              This keyboard has {zoneCount} zones. Each plays up to {slots} effects in turn, each for as long as you set, fading
              over one second from one to the next. Brightness is the same everywhere: the Brightness slider above.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] text-muted">Paint keys into</span>
            <Segmented
              label="Zone to paint"
              value={String(zone)}
              onChange={(v) => setZone(Number(v))}
              options={Array.from({ length: zoneCount }, (_, z) => ({
                value: String(z),
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <ZoneMark zone={z} size={13} />
                    Zone {z + 1}
                  </span>
                ),
              }))}
            />
          </div>
        </div>
        <div className="mt-5 grid gap-4 @3xl:grid-cols-2">
          {Array.from({ length: zoneCount }, (_, z) => (
            <ZoneEffects
              key={z}
              zone={z}
              keys={keysIn(z)}
              effects={rgb.mixedRGBEffects[z] ?? []}
              numbers={numbers}
              renames={renames}
            />
          ))}
        </div>
      </Card>
    </section>
  )
}

type EffectsChange = { effects: ZoneEffect[] }

interface ZoneProps {
  zone: number
  keys: number
  effects: ZoneEffect[]
  numbers: ZoneNumbers
  renames: Readonly<Record<number, EffectRename>>
}

/** One zone's effect list: the slots in use, in the order they play, and a way to add one. */
function ZoneEffects({ zone, keys, effects, numbers, renames }: ZoneProps) {
  const [pending, push] = useLatestQueue<EffectsChange>(({ effects: next }) => deviceStore.setZoneEffects(zone, next))
  const list = pending.effects ?? effects
  const used = list.filter((e) => e.effect !== 0)
  const choices = useMemo(() => {
    const infos = zoneEffectChoices(numbers).map((id) => effectInfo(id, renames))
    // In the grid's groups and order.
    return EFFECT_GROUPS.flatMap((g) => infos.filter((i) => i.group === g.id))
  }, [numbers, renames])

  /** Writes the slots in use first, empty ones after, as many as the keyboard has. */
  const save = (next: ZoneEffect[]) => push({ effects: [...next, ...Array.from({ length: list.length - next.length }, () => ({ ...EMPTY }))] })
  const update = (i: number, patch: Partial<ZoneEffect>) => save(used.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  const first = choices[0]

  return (
    <section aria-label={`Zone ${zone + 1}`} className="rounded-card border border-edge p-4">
      <h3 className="mb-3 flex items-center gap-2 font-medium">
        <ZoneMark zone={zone} />
        Zone {zone + 1}
        <span className="text-[13px] font-normal text-muted">
          · {keys} {keys === 1 ? 'key' : 'keys'}
        </span>
      </h3>
      {used.length === 0 && <p className="mb-3 text-[13px] text-muted">No effect: these keys stay dark.</p>}
      <div className="flex flex-col gap-4">
        {used.map((slot, i) => {
          const vialId = numbers.fromZone.get(slot.effect)
          const info = vialId !== undefined ? effectInfo(vialId, renames) : null
          return (
            <ZoneSlot
              key={i}
              index={i}
              slot={slot}
              info={info}
              choices={choices}
              numbers={numbers}
              several={used.length > 1}
              onChange={(patch) => update(i, patch)}
              onRemove={() => save(used.filter((_, j) => j !== i))}
            />
          )
        })}
      </div>
      {used.length < list.length && first && (
        <Button
          size="sm"
          className="mt-3"
          icon={<Plus size={14} aria-hidden />}
          onClick={() =>
            save([...used, { effect: numbers.toZone.get(first.id) ?? 1, hue: 0, sat: 255, speed: 128, time: DEFAULT_TIME }])
          }
        >
          {used.length === 0 ? 'Add an effect' : 'Add an effect to play next'}
        </Button>
      )}
    </section>
  )
}

interface SlotProps {
  index: number
  slot: ZoneEffect
  info: EffectInfo | null
  choices: EffectInfo[]
  numbers: ZoneNumbers
  /** More than one effect: they take turns, so each has a time. */
  several: boolean
  onChange: (patch: Partial<ZoneEffect>) => void
  onRemove: () => void
}

function ZoneSlot({ index, slot, info, choices, numbers, several, onChange, onRemove }: SlotProps) {
  const options = choices.map((c) => ({ value: numbers.toZone.get(c.id) ?? 0, label: c.name }))
  if (!info) options.unshift({ value: slot.effect, label: `Effect ${slot.effect}` })
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        {info && <EffectPreview effect={info} hue={slot.hue} sat={slot.sat} speed={slot.speed} />}
        <Select
          aria-label={`Effect ${index + 1}`}
          className="min-w-0 flex-1"
          value={slot.effect}
          options={options}
          onChange={(effect) => onChange({ effect })}
        />
        <IconButton label={`Remove effect ${index + 1}`} onClick={onRemove}>
          <X size={15} />
        </IconButton>
      </div>
      {info?.hue === true && (
        <Slider
          label={
            <>
              <span aria-hidden className="size-3.5 rounded-pill border border-edge-strong" style={{ backgroundColor: hsvCss(slot.hue, slot.sat) }} />
              Colour
            </>
          }
          value={slot.hue}
          max={255}
          format={() => colourName(slot.hue, slot.sat)}
          track={HUE_TRACK}
          onChange={(hue) => onChange({ hue })}
        />
      )}
      {info?.sat === true && (
        <Slider label="Vividness" value={slot.sat} max={255} format={(v) => percent(v, 255)} track={satTrack(slot.hue)} onChange={(sat) => onChange({ sat })} />
      )}
      {info?.speed === true && (
        <Slider label="Speed" value={slot.speed} max={255} format={(v) => percent(v, 255)} onChange={(speed) => onChange({ speed })} />
      )}
      {several && (
        <Slider
          label="Plays for"
          value={Math.round(slot.time / 1000)}
          min={2}
          max={60}
          format={(v) => `${v} s`}
          onChange={(s) => onChange({ time: s * 1000 })}
        />
      )}
      {info && info.hue !== true && <p className="text-[13px] text-muted">{info.hue}</p>}
    </div>
  )
}
