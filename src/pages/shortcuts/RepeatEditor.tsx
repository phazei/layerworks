// SPDX-License-Identifier: GPL-3.0-or-later
// A repeat rule (alt repeat): what the alternate repeat key sends after a given key. Needs that key on the
// keyboard (QK_ALT_REPEAT_KEY).

import { altRepeatKeycode, REPEAT_OPTIONS, type AltRepeatKeyEntry } from '../../device'
import { Checkbox, Toggle } from '../../ui/controls'
import { Disclosure, HelpButton } from '../../ui/layout'
import { EntryFrame, KeyField, ModsField, useEntryDraft } from './EntryEditor'
import { Uses } from './Uses'

const EXAMPLE: AltRepeatKeyEntry = { lastKey: 0x011d, altKey: 0x011c, allowedMods: 0, options: 0, enabled: true }

const OPTION_LABELS: { bit: number; label: string }[] = [
  { bit: REPEAT_OPTIONS.bidirectional, label: 'Both ways: after the second key, send the first' },
  { bit: REPEAT_OPTIONS.ignoreModHandedness, label: 'Left and right modifiers count the same' },
  { bit: REPEAT_OPTIONS.defaultToThisAltKey, label: 'Fallback for every other key: send this after any key no rule covers' },
]

export function RepeatEditor({ index }: { index: number }) {
  const draft = useEntryDraft('altRepeatKey', index)
  if (!draft) return null
  const { entry, edit } = draft
  const set = (patch: Partial<AltRepeatKeyEntry>) => edit({ ...entry, ...patch })

  return (
    <EntryFrame
      kind="altRepeatKey"
      index={index}
      draft={draft}
      intro={
        <p>
          The alternate repeat key does the “opposite” of the key you pressed last. A rule says what it sends after a
          given key; it works as soon as it is saved, as long as the alternate repeat key is on the keyboard (on the
          Keys page: Alt Repeat, under Repeat keys).
        </p>
      }
      example={{ label: 'after Ctrl + Z, send Ctrl + Y', entry: EXAMPLE }}
      usage={<Uses code={altRepeatKeycode()} howTo="On the Keys page, click a key and pick Alt Repeat under Repeat keys." />}
    >
      <KeyField label="After" shortcuts value={entry.lastKey} onChange={(lastKey) => set({ lastKey })} />
      <KeyField label="The repeat key sends" shortcuts exclude={['tapDance', 'repeat']} value={entry.altKey} onChange={(altKey) => set({ altKey })} />
      <Toggle checked={entry.enabled} onChange={(enabled) => set({ enabled })} label="On" hint="Turned off, it stays saved but does nothing." />
      <Disclosure id="repeat-more" label="More options">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-0.5 text-[13px] font-semibold">
              Options
              <HelpButton topic="repeat-options" />
            </span>
            <ModsField sided label="Still applies with" value={entry.allowedMods} onChange={(allowedMods) => set({ allowedMods })} />
          </div>
          {OPTION_LABELS.map(({ bit, label }) => (
            <Checkbox
              key={bit}
              label={label}
              checked={(entry.options & bit) !== 0}
              onChange={(on) => set({ options: on ? entry.options | bit : entry.options & ~bit })}
            />
          ))}
        </div>
      </Disclosure>
    </EntryFrame>
  )
}
