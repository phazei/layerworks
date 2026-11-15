// SPDX-License-Identifier: GPL-3.0-or-later
// "A shortcut": tick the modifiers, pick the key, and use it. Nothing is written until the button is pressed, so
// trying combinations doesn't fill the undo history.

import { useState } from 'react'
import { canTakeModifiers, keycodeName, keycodeTitle, MODIFIERS, readShortcut, shortcutKeycode, type PaletteGroup } from '../../device'
import { Button, Checkbox } from '../../ui/controls'
import { KeyCap } from '../../ui/KeyTile'
import { KeyPalette } from './KeyPalette'

interface Props {
  current: number
  /** The keys a shortcut can be built on. */
  groups: PaletteGroup[]
  onAssign: (code: number) => void
}

export function ShortcutChoice({ current, groups, onAssign }: Props) {
  const now = readShortcut(current)
  const [mods, setMods] = useState(now?.mods || MODIFIERS[0].bit)
  const [key, setKey] = useState<number | null>(now && canTakeModifiers(now.key) ? now.key : null)
  const code = key !== null && mods !== 0 ? shortcutKeycode(mods, key) : null

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-muted">Hold</span>
        {MODIFIERS.map((mod) => (
          <Checkbox
            key={mod.bit}
            label={mod.name}
            checked={(mods & mod.bit) !== 0}
            onChange={(on) => setMods(on ? mods | mod.bit : mods & ~mod.bit)}
          />
        ))}
        <span className="text-muted">and press</span>
        {key !== null ? <KeyCap label={keycodeName(key)} /> : <span className="text-muted italic">a key from below</span>}
        <Button
          variant="primary"
          size="sm"
          className="ml-auto"
          disabled={code === null || code === current}
          onClick={() => code !== null && onAssign(code)}
        >
          {code === null ? (mods === 0 ? 'Tick a modifier' : 'Pick a key') : code === current ? 'This is the shortcut now' : `Use ${keycodeTitle(code)}`}
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
