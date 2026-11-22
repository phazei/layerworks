// SPDX-License-Identifier: GPL-3.0-or-later
// A multi-tap key (tap dance): one key, different things for a tap, a hold, a double tap and a tap then hold. It
// works once it is on a key (TD(n)).

import { DEFAULT_TAPPING_TERM, entryIsEmpty, MAX_TAPPING_TERM, tapDanceKeycode, tapDanceTitle, type TapDanceEntry } from '../../device'
import { OptionButton, TextInput } from '../../ui/controls'
import { Disclosure, HelpButton } from '../../ui/layout'
import { EntryFrame, KeyField, useEntryDraft } from './EntryEditor'
import { unsavedHint, Uses } from './Uses'

const EXAMPLE: TapDanceEntry = { onTap: 0x29, onHold: 0, onDoubleTap: 0x39, onTapHold: 0, tappingTerm: DEFAULT_TAPPING_TERM }
const TERM_CHOICES = [150, 200, 250, 300]

function TermField({ value, onChange }: { value: number; onChange: (ms: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex min-w-36 items-center gap-0.5 text-[13px] font-medium text-muted">
        How long counts as a hold
        <HelpButton topic="tapping-term" />
      </span>
      <TextInput
        type="number"
        min={1}
        max={MAX_TAPPING_TERM}
        step={10}
        aria-label="How long counts as a hold, in milliseconds"
        value={value}
        onChange={(e) => onChange(Math.round(Number(e.target.value)))}
        className="w-24"
      />
      <span className="text-muted">ms</span>
      <span className="flex flex-wrap gap-1">
        {TERM_CHOICES.map((ms) => (
          <OptionButton key={ms} shape="chip" selected={value === ms} onClick={() => onChange(ms)}>
            {ms} ms
          </OptionButton>
        ))}
      </span>
    </div>
  )
}

export function TapDanceEditor({ index }: { index: number }) {
  const draft = useEntryDraft('tapDance', index)
  if (!draft) return null
  const { entry, edit } = draft
  const set = (patch: Partial<TapDanceEntry>) => edit({ ...entry, ...patch })

  return (
    <EntryFrame
      kind="tapDance"
      index={index}
      draft={draft}
      intro={
        <p>
          One key that does different things depending on how you press it. Leave any of them as “Nothing” if you
          don’t need it. It works once it is on a key.
        </p>
      }
      example={{ label: 'tap for Esc, tap twice for Caps Lock', entry: EXAMPLE }}
      usage={
        <Uses
          code={tapDanceKeycode(index)}
          name={tapDanceTitle(index)}
          hint={unsavedHint(tapDanceTitle(index), entryIsEmpty('tapDance', draft.saved), draft.dirty)}
          howTo={`Or, on the Keys page, click a key and pick “Multi-tap ${index}” (TD(${index})) under Multi-tap keys.`}
        />
      }
    >
      <KeyField label="Tap" optional shortcuts use="multiTap" value={entry.onTap} onChange={(onTap) => set({ onTap })} />
      <KeyField label="Hold" optional shortcuts use="multiTap" value={entry.onHold} onChange={(onHold) => set({ onHold })} />
      <KeyField label="Tap twice" optional shortcuts use="multiTap" value={entry.onDoubleTap} onChange={(onDoubleTap) => set({ onDoubleTap })} />
      <Disclosure id="tap-dance-more" label="More options">
        <div className="flex flex-col gap-4">
          <KeyField
            label="Tap, then hold"
            optional
            shortcuts
            use="multiTap"
            value={entry.onTapHold}
            onChange={(onTapHold) => set({ onTapHold })}
          />
          <TermField value={entry.tappingTerm} onChange={(tappingTerm) => set({ tappingTerm })} />
        </div>
      </Disclosure>
    </EntryFrame>
  )
}
