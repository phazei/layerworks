// SPDX-License-Identifier: GPL-3.0-or-later
// The keyboard stage: the layer stack beside a picture of the keyboard, shown above the pages that ask for it.
// Its state (layer, following, selection) lives in stage-store, so it stays put when moving between pages. Its
// height follows stage-size.ts: automatic up to half the space it shares with the page, or what the handle on its
// bottom edge was dragged to, remembered as a share of that space.

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useDevice, type KeyboardData } from '../device'
import { KeyboardPicture } from '../ui/KeyboardPicture'
import { usePref } from '../ui/prefs'
import { ResizeHandle } from '../ui/ResizeHandle'
import { useElementSize } from '../ui/useElementSize'
import { useConnectedLayerNames } from './layer-names'
import { LayerStack } from './LayerStack'
import { NO_LAYER, reportsLayer, usePressedKeys } from './pressed-keys'
import { CAP, legibleHeight, maxHeight, minHeight, naturalHeight, stageHeight, toFraction, type StageMeasures } from './stage-size'
import { shownLayer, stage, useStage } from './stage-store'

/** The stage's chosen share of the space, null for automatic. One for all keyboards: it is about the window. */
export const STAGE_SIZE_PREF = 'stage-size'

interface Props {
  keyboard: KeyboardData
  /** Keys and knob directions can be clicked to select them. */
  selectable: boolean
  /** The height the stage shares with the page below it; 0 while unknown (then it takes its own height). */
  space: number
}

type Measured = Omit<StageMeasures, 'space'>

const same = (a: Measured | null, b: Measured) =>
  a !== null &&
  a.stack === b.stack &&
  a.pictureWidth === b.pictureWidth &&
  a.narrow === b.narrow &&
  a.intrinsic.width === b.intrinsic.width &&
  a.intrinsic.height === b.intrinsic.height

export function Stage({ keyboard, selectable, space }: Props) {
  const live = useDevice((s) => s.layer)
  const state = useStage()
  const names = useConnectedLayerNames()
  // Compatibility: a keyboard that doesn't report its layer (pressed-keys.ts, reportsLayer) is taken to be on layer 0,
  // as the Test page does.
  const pressed = usePressedKeys(keyboard, reportsLayer(live) ? live : NO_LAYER)
  const shown = shownLayer(state, live, keyboard.layers)

  const [fraction, setFraction] = usePref<number | null>(STAGE_SIZE_PREF, null)
  const [dragged, setDragged] = useState<number | null>(null)
  const stackBox = useRef<HTMLDivElement>(null)
  const pictureBox = useRef<HTMLDivElement>(null)
  const [measured, setMeasured] = useState<Measured | null>(null)

  // What the height depends on, read after every render; none of it depends on the height itself.
  useLayoutEffect(() => {
    const stack = stackBox.current
    const picture = pictureBox.current
    const svg = picture?.querySelector('svg')
    if (!stack || !picture || !svg) return
    const next: Measured = {
      // Less the wrapper's room for focus rings (p-1, taken back by -m-1).
      stack: stack.scrollHeight - 8,
      pictureWidth: picture.clientWidth,
      intrinsic: { width: Number(svg.getAttribute('width')) || 0, height: Number(svg.getAttribute('height')) || 0 },
      // The container query decides; read what it decided.
      narrow: getComputedStyle(picture.parentElement ?? picture).flexDirection === 'column',
    }
    if (!same(measured, next)) setMeasured(next)
  })

  // Esc lets go of the selected key, unless it is meant for a text field.
  useEffect(() => {
    if (!selectable) return
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (event.key !== 'Escape' || target?.closest('input, textarea, select, [contenteditable]')) return
      if (stage.get().selection) stage.select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectable])

  // The stage's height comes from CSS: as tall as the picture wants at this width, or the chosen share of the
  // space, with min-height (room for the stack and a small picture) winning over max-height (half the space, or
  // what a legible picture needs where half is less).
  // Percentages resolve against the shared space, so the cap holds even before anything is measured.
  const root = useRef<HTMLDivElement>(null)
  const drawn = useElementSize(root).height
  const m: StageMeasures | null = measured && measured.intrinsic.width > 0 ? { ...measured, space } : null
  const style: CSSProperties | undefined = m
    ? {
        height: dragged ?? (fraction !== null ? `${fraction * 100}%` : naturalHeight(m)),
        minHeight: minHeight(m),
        maxHeight: `max(${CAP * 100}%, ${legibleHeight(m)}px)`,
      }
    : undefined
  // The height as drawn, for the handle (worked out where nothing is drawn, as in tests).
  const height = dragged ?? (drawn > 0 ? drawn : m ? stageHeight(m, fraction) : 0)

  return (
    <div ref={root} style={style} className="@container/stage flex shrink-0 flex-col px-6">
      <section aria-label="Keyboard and layers" data-tour="stage" className="@container flex min-h-0 flex-1 flex-col rounded-card bg-card px-4 py-3 shadow-card @3xl/stage:py-4">
        <div className="flex min-h-0 flex-1 flex-col gap-3 @3xl:flex-row @3xl:items-stretch @3xl:gap-6">
          {/* Beside the picture, the stack scrolls when the stage is made shorter than it; above it, it never has to. */}
          <div ref={stackBox} className="-m-1 shrink-0 p-1 @3xl:max-h-[calc(100%+0.5rem)] @3xl:self-center @3xl:overflow-y-auto">
            <LayerStack keyboard={keyboard} names={names} live={live} state={state} shown={shown} />
          </div>
          <div ref={pictureBox} className="min-h-0 min-w-0 flex-1">
            <KeyboardPicture
              keyboard={keyboard}
              layer={shown}
              pressed={pressed}
              selection={selectable ? state.selection : null}
              onSelect={selectable ? stage.select : undefined}
              fit={m !== null}
            />
          </div>
        </div>
      </section>
      {m ? (
        <ResizeHandle
          label="Height of the keyboard picture"
          value={height}
          min={minHeight(m)}
          max={maxHeight(m)}
          valueText={`${Math.round(toFraction(height, space) * 100)} % of the space${fraction === null && dragged === null ? ', automatic' : ''}`}
          onResize={(pixels, done) => {
            if (!done) return setDragged(pixels)
            setDragged(null)
            setFraction(toFraction(pixels, space))
          }}
          onReset={() => {
            setDragged(null)
            setFraction(null)
          }}
        />
      ) : (
        <div className="h-4 shrink-0" />
      )}
    </div>
  )
}