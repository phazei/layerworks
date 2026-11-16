// SPDX-License-Identifier: GPL-3.0-or-later
// Ctrl, Shift, Alt and Win as checkboxes over a 5-bit modifier mask, and the choice of left- or right-hand
// modifiers (one bit for all of them: QMK can't mix sides in one key).

import { MODIFIERS, RIGHT_HAND } from '../../device'
import { Checkbox, OptionButton } from '../../ui/controls'

/** The four checkboxes. The right-hand bit is kept as it is. */
export function ModifierBoxes({ mods, onChange }: { mods: number; onChange: (mods: number) => void }) {
  return (
    <>
      {MODIFIERS.map((mod) => (
        <Checkbox key={mod.bit} label={mod.name} checked={(mods & mod.bit) !== 0} onChange={(on) => onChange(on ? mods | mod.bit : mods & ~mod.bit)} />
      ))}
    </>
  )
}

/** Left-hand (the usual) or right-hand modifiers, with what difference it makes. */
export function HandChoice({ mods, onChange }: { mods: number; onChange: (mods: number) => void }) {
  const right = (mods & RIGHT_HAND) !== 0
  return (
    <div className="flex flex-col gap-1.5">
      <div role="group" aria-label="Left or right modifier" className="flex flex-wrap items-center gap-1.5">
        <OptionButton shape="chip" selected={!right} onClick={() => onChange(mods & ~RIGHT_HAND)}>
          Left-hand (usual)
        </OptionButton>
        <OptionButton shape="chip" selected={right} onClick={() => onChange(mods | RIGHT_HAND)}>
          Right-hand
        </OptionButton>
      </div>
      <p className="text-[13px] text-muted">
        Most programs don’t tell them apart. On many keyboard layouts the right Alt is AltGr, which types extra
        characters such as € or @.
      </p>
    </div>
  )
}
