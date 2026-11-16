// SPDX-License-Identifier: GPL-3.0-or-later
// "A shortcut": tick the modifiers, pick the key, and use it. Nothing is written until the button is pressed, so
// trying combinations doesn't fill the undo history.

import { useState } from 'react'
import { canTakeModifiers, keycodeName, keycodeTitle, readShortcut, shortcutKeycode, type PaletteGroup } from '../../device'
import { Button } from '../../ui/controls'
import { KeyCap } from '../../ui/KeyTile'
import { KeyPalette } from './KeyPalette'
import { ModifierBoxes } from './Modifiers'
import { offers } from './TapHoldChoice'

interface Props {
  current: number
  /** The keys a shortcut can be built on. */
  groups: PaletteGroup[]
  onAssign: (code: number) => void
}

export function ShortcutChoice({ current, groups, onAssign }: Props) {
  const now = readShortcut(current)
  // As in Tap or hold: nothing ticked to start with, and the key starts as the one in the shortcut, or the plain key
  // it holds now.
  const [mods, setMods] = useState(now?.mods ?? 0)
  const [key, setKey] = useState<number | null>(() =>
    now && canTakeModifiers(now.key) ? now.key : offers(groups, current) ? current : null,
  )
  const code = key !== null && mods !== 0 ? shortcutKeycode(mods, key) : null

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-muted">Hold</span>
        <ModifierBoxes mods={mods} onChange={setMods} />
        <span className="text-muted">and press</span>
        {key !== null ? <KeyCap label={keycodeName(key)} /> : <span className="text-muted italic">a key from below</span>}
        <Button
          variant="primary"
          size="sm"
          className="ml-auto"
          disabled={code === null || code === current}
          onClick={() => code !== null && onAssign(code)}
        >
          {code === null ? (key === null ? 'Pick a key' : 'Tick a modifier') : code === current ? 'This is the shortcut now' : `Use ${keycodeTitle(code)}`}
        </Button>
      </div>
      <KeyPalette
        groups={groups}
        current={-1}
        picked={key}
        onPick={(picked) => setKey(picked.code)}
        hint="Pick the key the shortcut presses, then use it."
        label="Key for the shortcut"
      />
    </div>
  )
}
