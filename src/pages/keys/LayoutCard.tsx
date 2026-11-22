// SPDX-License-Identifier: GPL-3.0-or-later
// "Layout": which of the definition's alternative keys this keyboard has (split Backspace or not, ISO Enter, a
// bottom row …), in the definition's own words. A change goes to the keyboard at once and is one undo step; the
// picture and every count follow (device/layout-options.ts).

import { deviceStore, layoutChoices, layoutOptionList, type KeyboardData } from '../../device'
import { Toggle } from '../../ui/controls'
import { Card } from '../../ui/layout'
import { Select } from '../../ui/Select'

export function LayoutCard({ keyboard }: { keyboard: KeyboardData }) {
  const options = layoutOptionList(keyboard.definition.layouts?.labels)
  if (options.length === 0) return null
  const chosen = layoutChoices(keyboard)
  const set = (group: number, choice: number) => void deviceStore.setLayoutChoice(group, choice)

  return (
    <Card
      title="Layout"
      help="layout-options"
      description="Where this keyboard’s maker offers a choice of keys, which ones yours has. Pick what is on your keyboard: the picture, the key test and the keys you can change follow."
    >
      <ul aria-label="Layout options" className="grid gap-x-8 gap-y-3 @3xl:grid-cols-2">
        {options.map((option) => {
          const choice = chosen.get(option.group) ?? 0
          return (
            <li key={option.group} className="min-w-0">
              {option.switch ? (
                <Toggle checked={choice === 1} onChange={(on) => set(option.group, on ? 1 : 0)} label={option.title} />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <span>{option.title}</span>
                  <Select
                    aria-label={option.title}
                    value={choice}
                    options={option.choices.map((name, value) => ({ value, label: name }))}
                    onChange={(value) => set(option.group, value)}
                    className="w-48 max-w-full"
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
