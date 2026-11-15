// SPDX-License-Identifier: GPL-3.0-or-later
// The keyboard stage: the layer stack beside a picture of the keyboard, shown above the pages that ask for it.
// Its state (layer, following, selection) lives in stage-store, so it stays put when moving between pages.

import { useEffect } from 'react'
import { useDevice, type KeyboardData } from '../device'
import { KeyboardPicture } from '../ui/KeyboardPicture'
import { useConnectedLayerNames } from './layer-names'
import { LayerStack } from './LayerStack'
import { usePressedKeys } from './pressed-keys'
import { shownLayer, stage, useStage } from './stage-store'

interface Props {
  keyboard: KeyboardData
  /** Keys and knob directions can be clicked to select them. */
  selectable: boolean
}

export function Stage({ keyboard, selectable }: Props) {
  const live = useDevice((s) => s.layer)
  const state = useStage()
  const names = useConnectedLayerNames()
  const pressed = usePressedKeys(keyboard, live)
  const shown = shownLayer(state, live, keyboard.layers)

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

  return (
    <section aria-label="Keyboard and layers" className="@container shrink-0 rounded-card bg-card p-4 shadow-card">
      <div className="flex flex-col gap-4 @3xl:flex-row @3xl:items-center @3xl:gap-6">
        <LayerStack keyboard={keyboard} names={names} live={live} state={state} shown={shown} />
        {/* In a short window the picture gives up height (down to 10rem) so the page under it still shows. */}
        <div className="min-w-0 flex-1 [&_svg]:max-h-[max(10rem,calc(100vh-30rem))]">
          <KeyboardPicture
            keyboard={keyboard}
            layer={shown}
            pressed={pressed}
            selection={selectable ? state.selection : null}
            onSelect={selectable ? stage.select : undefined}
          />
        </div>
      </div>
    </section>
  )
}
