// SPDX-License-Identifier: GPL-3.0-or-later
// Picking the key a step presses: the Keys page's palette, with Ctrl, Shift, Alt and Win to tick for a shortcut.

import { useMemo, useState } from 'react'
import { canTakeModifiers, keyPalette, MODIFIERS, readShortcut, shortcutKeycode, useDevice } from '../../device'
import { Button, Checkbox } from '../../ui/controls'
import { KeyPalette } from '../keys/KeyPalette'

interface Props {
  current: number
  /** Offer the modifiers (taps); holding and letting go take one plain key. */
  shortcuts: boolean
  onPick: (key: number) => void
  onClose: () => void
}

export function KeyPicker({ current, shortcuts, onPick, onClose }: Props) {
  const keyboard = useDevice((s) => s.keyboard)
  // Built once the keyboard's tables are in; macros can't run other macros' keys usefully, so those are left out.
  const groups = useMemo(() => (keyboard ? keyPalette().filter((g) => g.id !== 'macros') : []), [keyboard])
  const now = readShortcut(current)
  const [mods, setMods] = useState(shortcuts ? (now?.mods ?? 0) : 0)
  const base = now ? now.key : current

  return (
    <div className="flex flex-col gap-3 rounded-control border border-edge p-3">
      {shortcuts && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[13px] text-muted">Hold while tapping</span>
          {MODIFIERS.map((mod) => (
            <Checkbox
              key={mod.bit}
              label={mod.name}
              checked={(mods & mod.bit) !== 0}
              onChange={(on) => setMods(on ? mods | mod.bit : mods & ~mod.bit)}
            />
          ))}
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
