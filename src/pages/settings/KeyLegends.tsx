// SPDX-License-Identifier: GPL-3.0-or-later
// Settings, "Key names": whether the keys are named the way the computer's keyboard layout types them, with what
// was found. Without a browser that can tell, it says so and offers nothing to switch.

import { Toggle } from '../../ui/controls'
import { Card } from '../../ui/layout'
import { usePref } from '../../ui/prefs'
import { LEGENDS_PREF, layoutExample, setLayoutLegendsOn, useKeyboardLayout } from '../../shell/keyboard-layout'

export function KeyLegends() {
  const layout = useKeyboardLayout()
  const [on] = usePref(LEGENDS_PREF, true)
  const example = layoutExample(layout.map)

  let found: string
  if (!layout.supported) {
    found =
      'This browser can’t tell which keyboard layout the computer uses, so keys are named as on a US keyboard. Chrome and Edge can.'
  } else if (!layout.map) {
    found = 'Reading the computer’s layout…'
  } else if (!example) {
    found = 'The computer uses a US layout (or one that types the same), so the names are the usual ones.'
  } else {
    found = `The computer’s layout differs from US: the key a US keyboard has as ${example.us} types ${example.here} here.`
  }

  return (
    <Card title="Key names" help="key-legends" description="Which characters the keys are named by.">
      {layout.supported ? (
        <Toggle
          checked={on}
          onChange={setLayoutLegendsOn}
          label="Name keys by what my computer’s layout types"
          hint={found}
        />
      ) : (
        <p className="text-[13px] text-muted">{found}</p>
      )}
    </Card>
  )
}
