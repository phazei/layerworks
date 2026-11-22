// SPDX-License-Identifier: GPL-3.0-or-later
// Picking the key a shortcut sends or waits for: the Keys page's palette, with Ctrl, Shift, Alt and Win to tick for a
// shortcut. Which keys it offers is the firmware's to say (device/sendable.ts, `use`): what the keyboard will run in
// that place, and nothing else.

import { useMemo, useState } from 'react'
import { canTakeModifiers, groupsFor, paletteFeatures, readShortcut, shortcutKeycode, useDevice, type KeyUse } from '../../device'
import { useLegendRevision } from '../../device/layout'
import { Button } from '../../ui/controls'
import { KeyPalette } from '../keys/KeyPalette'
import { ModifierBoxes } from '../keys/Modifiers'

interface Props {
  current: number
  /** Where the key goes: decides the keys offered. */
  use: KeyUse
  /** Offer the modifiers (taps); holding and letting go take one plain key. */
  shortcuts: boolean
  onPick: (key: number) => void
  onClose: () => void
}

export function KeyPicker({ current, use, shortcuts, onPick, onClose }: Props) {
  const keyboard = useDevice((s) => s.keyboard)
  const settings = useDevice((s) => s.settings)
  const nkroMode = useDevice((s) => s.capabilities?.nkro ?? 'pending')
  const features = paletteFeatures(keyboard, settings, nkroMode)
  // Built once the keyboard's tables are in.
  const { combos, keyOverrides, autoShift, nkro } = features
  // The names follow the computer's layout (device/layout.ts).
  const legends = useLegendRevision()
  const groups = useMemo(
    () => (keyboard ? groupsFor(use, { combos, keyOverrides, autoShift, nkro }) : []),
    [keyboard, use, combos, keyOverrides, autoShift, nkro, legends],
  )
  const now = readShortcut(current)
  const [mods, setMods] = useState(shortcuts ? (now?.mods ?? 0) : 0)
  const base = now ? now.key : current

  return (
    <div className="flex flex-col gap-3 rounded-control border border-edge p-3">
      {shortcuts && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[13px] text-muted">Hold while tapping</span>
          <ModifierBoxes mods={mods} onChange={setMods} />
        </div>
      )}
      <div className="flex h-72 flex-col">
        <KeyPalette
          groups={groups}
          current={base}
          onPick={(key) => onPick(mods && canTakeModifiers(key.code) ? shortcutKeycode(mods, key.code) : key.code)}
          hint={mods ? 'Pick the key to tap with the ticked keys held.' : 'Pick the key.'}
          label="Key for this step"
        />
      </div>
      <div>
        <Button size="sm" variant="quiet" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}
