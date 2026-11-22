// SPDX-License-Identifier: GPL-3.0-or-later
// "Key by key" (Keychron per-key RGB): the keyboard drawn with each key in its colour, and painting on it. Pick a
// colour, then click or drag across keys; or colour a whole group, every key, or start from a ready scheme. Each
// stroke shows on the keyboard as it is painted (latest colours first, see src/ui/latest.ts) and is one undo step;
// the store saves the colours on the keyboard after a pause.

import { useMemo, useRef, useState } from 'react'
import { Pipette, Paintbrush } from 'lucide-react'
import { deviceStore, PER_KEY_STYLE_COUNT, type Hsv } from '../../device'
import { ColourChooser, type HueSat } from '../../ui/ColourChooser'
import { colourName, hsvCss, isLightColour } from '../../ui/colour'
import { OptionButton, Segmented } from '../../ui/controls'
import { KeyboardPicture } from '../../ui/KeyboardPicture'
import { useLatestQueue } from '../../ui/latest'
import { Card, HelpButton } from '../../ui/layout'
import { PaintSurface } from '../../ui/PaintSurface'
import { usePref } from '../../ui/prefs'
import { Select } from '../../ui/Select'
import { keyGroups, STARTING_POINTS } from './key-groups'
import { useKeyLighting } from './key-lighting'

/** Keychron's per-key styles (keychron_rgb_type.h), in its numbering, in plain words. */
export const KEY_STYLES: readonly { value: number; name: string; qmkName: string }[] = [
  { value: 0, name: 'Steady', qmkName: 'Solid' },
  { value: 1, name: 'Breathing', qmkName: 'Breathing' },
  { value: 2, name: 'Light up when pressed', qmkName: 'Reactive Simple' },
  { value: 3, name: 'Glow around pressed keys', qmkName: 'Reactive Multi Wide' },
  { value: 4, name: 'Splash from the key pressed', qmkName: 'Reactive Splash' },
]

const FULL = 255
const DEFAULT_COLOUR: HueSat = { hue: 170, sat: 255 }
const NO_RECENT: HueSat[] = []
const RECENT_MAX = 8

type Change = { colours: Hsv[]; undoKey: string }
const send = ({ colours, undoKey }: Change) => deviceStore.setKeyColours(colours, undoKey)

export function KeyColours() {
  const { keyboard, rgb, leds, layer } = useKeyLighting()
  const [pending, push] = useLatestQueue<Change>(send)
  const [colour, setColour] = usePref<HueSat>('key-colour', DEFAULT_COLOUR)
  const [recent, setRecent] = usePref<HueSat[]>('key-colours-recent', NO_RECENT)
  const [tool, setTool] = useState<'paint' | 'pick'>('paint')
  const strokes = useRef(0)
  const strokeKey = useRef('')
  const working = useRef<Hsv[]>([])

  // What the keyboard shows, or is about to: the colours still on their way, else the store's.
  const colours = pending.colours ?? rgb?.perKeyColors ?? []
  if (!pending.colours) working.current = colours

  const groups = useMemo(() => (keyboard ? keyGroups(keyboard, layer, leds) : []), [keyboard, layer, leds])

  const fills = useMemo(() => {
    const map = new Map<string, { colour: string; light: boolean }>()
    for (const [pos, led] of leds) {
      const c = colours[led]
      if (c) map.set(pos, { colour: hsvCss(c[0], c[1]), light: isLightColour(c[0], c[1]) })
    }
    return map
  }, [leds, colours])

  if (!keyboard || !rgb) return null

  const remember = (c: HueSat) => setRecent([c, ...recent.filter((r) => r.hue !== c.hue || r.sat !== c.sat)].slice(0, RECENT_MAX))

  /** A new stroke: its own undo step. */
  const nextStroke = () => `key-colours:${++strokes.current}`

  const apply = (next: Hsv[], undoKey: string) => {
    working.current = next
    push({ colours: next, undoKey })
  }

  const paintKeys = (keys: string[], undoKey = nextStroke()) => {
    const next = working.current.map((c) => [...c] as Hsv)
    for (const pos of keys) {
      const led = leds.get(pos)
      if (led !== undefined) next[led] = [colour.hue, colour.sat, FULL]
    }
    apply(next, undoKey)
  }

  const onPaint = (pos: string, first: boolean) => {
    const led = leds.get(pos)
    if (led === undefined) return
    if (tool === 'pick') {
      const [hue, sat] = working.current[led] ?? [0, 0]
      setColour({ hue, sat })
      setTool('paint')
      return
    }
    if (first) {
      strokeKey.current = nextStroke()
      remember(colour)
    }
    paintKeys([pos], strokeKey.current)
  }

  const fillWith = (keys: string[]) => {
    remember(colour)
    paintKeys(keys)
  }

  return (
    <section aria-label="Key colours">
      <Card
        title="Key colours"
        help="key-colours"
        description="Pick a colour, then click a key or drag across several. The keyboard shows it as you paint."
      >
        <div className="grid gap-5 @2xl:grid-cols-[minmax(0,1fr)_15rem] @4xl:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="flex min-w-0 flex-col gap-3">
            <PaintSurface label="Keyboard: paint keys" onPaint={onPaint}>
              <KeyboardPicture keyboard={keyboard} layer={layer} fills={fills} />
            </PaintSurface>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[13px] text-muted">Colour at once</span>
                <OptionButton shape="chip" onClick={() => fillWith([...leds.keys()])}>
                  Paint all keys
                </OptionButton>
                {groups.map((g) => (
                  <OptionButton key={g.id} shape="chip" onClick={() => fillWith(g.keys)}>
                    {g.name}
                  </OptionButton>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[13px] text-muted">Start from</span>
                {STARTING_POINTS.map((s) => (
                  <OptionButton
                    key={s.id}
                    shape="chip"
                    onClick={() => apply(s.colours(keyboard, layer, leds, rgb.ledCount), nextStroke())}
                  >
                    <span aria-hidden className="flex">
                      {s.sample.map((c, i) => (
                        <span key={i} className="-ml-0.5 size-3 rounded-pill first:ml-0" style={{ backgroundColor: hsvCss(c[0], c[1]) }} />
                      ))}
                    </span>
                    {s.name}
                  </OptionButton>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Segmented
              label="Tool"
              value={tool}
              onChange={setTool}
              options={[
                { value: 'paint', label: <span className="inline-flex items-center gap-1.5"><Paintbrush size={14} aria-hidden />Paint</span> },
                { value: 'pick', label: <span className="inline-flex items-center gap-1.5"><Pipette size={14} aria-hidden />Pick up a colour</span> },
              ]}
            />
            {tool === 'pick' && <p className="-mt-2 text-[13px] text-muted">Click a key to take its colour.</p>}
            <ColourChooser
              value={colour}
              onChange={setColour}
              recent={recent}
              help={<HelpButton topic="key-colours" />}
              note="Brightness is the same for every key: the Brightness slider above."
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="key-style" className="flex items-center gap-1">
                How the colours light up <HelpButton topic="key-style" />
              </label>
              <Select
                id="key-style"
                value={rgb.perKeyRGBType < PER_KEY_STYLE_COUNT ? rgb.perKeyRGBType : 0}
                options={KEY_STYLES.map((s) => ({ value: s.value, label: s.name }))}
                onChange={(style) => void deviceStore.setKeyStyle(style)}
              />
              <p className="text-[13px] text-muted">
                {rgb.perKeyRGBType === 0
                  ? 'The speed slider above has no effect while the colours stay steady.'
                  : 'The speed slider above sets how fast.'}
              </p>
            </div>
            <p className="text-[13px] text-muted">
              Now painting with <span className="font-medium text-content">{colourName(colour.hue, colour.sat).toLowerCase()}</span>. Undo, in
              the bar at the bottom, takes back one stroke at a time.
            </p>
          </div>
        </div>
      </Card>
    </section>
  )
}
