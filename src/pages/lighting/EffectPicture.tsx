// SPDX-License-Identifier: GPL-3.0-or-later
// The keyboard drawn under the effect grid with a still hint of the lighting (picture.ts): keys in the chosen colour,
// a rainbow laid out the way the effect runs, or dark keys with the lights off. It takes the place where Key by key
// and Mixed zones draw their editors, in the same frame, so switching effects doesn't move the page around.

import { useMemo } from 'react'
import { posKey, useDevice, visibleLayoutKeys } from '../../device'
import { KeyboardPicture } from '../../ui/KeyboardPicture'
import { Card } from '../../ui/layout'
import type { EffectInfo } from './effects'
import { pictureFills, pictureLayout, type KeyPlace, type PictureLayout } from './picture'

interface Props {
  effect: EffectInfo
  on: boolean
  hue: number
  sat: number
  val: number
}

/** What the picture shows, in words, beside it. */
function caption(layout: PictureLayout, effect: EffectInfo): string {
  switch (layout.kind) {
    case 'off':
      return 'The lights are off.'
    case 'tint':
      // Only One colour lights every key alike; the others light some keys, or at some moments.
      return effect.preview === 'solid'
        ? 'Every key in your colour, at the brightness set above.'
        : 'Your colour, at the brightness set above. On the keyboard the effect decides which keys light, and when.'
    case 'cycle':
      return 'On the keyboard all keys share one colour, which changes round the rainbow; the picture shows the colours it passes through.'
    case 'rainbow': {
      const way = {
        across: 'from left to right',
        down: 'from the top row to the bottom',
        rings: 'in rings round the middle',
        'rings-two': 'in rings round the middle of each half',
        around: 'round the middle',
        'around-two': 'round the middle of each half',
      }[layout.direction]
      return `The rainbow runs ${way}.`
    }
    case 'fixed':
      return effect.preview === 'heat' ? 'Keys start blue and warm up towards red the more they are typed.' : 'The effect picks this colour itself.'
    case 'scattered':
      return 'Keys light up in colours of their own.'
  }
}

export function EffectPicture({ effect, on, hue, sat, val }: Props) {
  const keyboard = useDevice((s) => s.keyboard)
  const baseLayer = useDevice((s) => s.layer?.base ?? 0)
  const layer = Math.min(baseLayer, (keyboard?.layers ?? 1) - 1)

  // Each key's centre, in key units, from the layout the picture is drawn from: the chosen layout's keys only.
  const places = useMemo<KeyPlace[]>(() => {
    const keys = keyboard ? visibleLayoutKeys(keyboard) : []
    return keys
      .filter((k) => k.encoderIdx < 0 && !k.decal && !k.ghost)
      .map((k) => ({ pos: posKey(k.row, k.col), x: k.x + k.width / 2, y: k.y + k.height / 2 }))
  }, [keyboard])

  const layout = pictureLayout(effect, on)
  // Some 90 keys: cheap enough to work out on every render, so it follows the sliders as they move.
  const fills = pictureFills(places, layout, { hue, sat, val })

  if (!keyboard) return null
  const words = caption(layout, effect)

  return (
    <section aria-label="Keyboard picture">
      <Card title="On the keys" description="A still picture of how the keys light up. On the keyboard the effect moves.">
        <div className="grid gap-5 @2xl:grid-cols-[minmax(0,1fr)_15rem] @4xl:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="min-w-0">
            <KeyboardPicture keyboard={keyboard} layer={layer} fills={fills} />
          </div>
          <div className="flex flex-col gap-2 text-[13px] text-muted">
            {on && (
              <p>
                <span className="font-medium text-content">{effect.name}</span>
                {words && <>: {lowerFirst(words)}</>}
              </p>
            )}
            {!on && <p>{words}</p>}
          </div>
        </div>
      </Card>
    </section>
  )
}

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)
