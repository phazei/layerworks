// SPDX-License-Identifier: GPL-3.0-or-later
// The inspector's "More options": nothing, same as the layer below, a modifier for the next key only, and typing a
// key code, which says what the code means before it is used.

import { useState, type ReactNode } from 'react'
import {
  KC_NOTHING,
  KC_SAME_AS_BELOW,
  keycodeId,
  modifierWords,
  oneShotModKeycode,
  parseKeycode,
  readOneShotMod,
  RIGHT_HAND,
} from '../../device'
import { Button, Checkbox, OptionButton, TextInput } from '../../ui/controls'
import { HelpButton } from '../../ui/layout'
import type { HelpTopicId } from '../../help/topics'
import { describeKeycode } from './describe'
import { ModifierBoxes } from './Modifiers'

interface Props {
  current: number
  names: string[]
  /** The layer of the key being edited. */
  layer: number
  /** Put in the key-code field at first: the current code, when none of the choices can show it. */
  initialCode: string
  onAssign: (code: number) => void
}

function Special({ code, current, title, hint, help, onAssign }: { code: number; current: number; title: string; hint: ReactNode; help: HelpTopicId; onAssign: (code: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <OptionButton selected={code === current} onClick={() => onAssign(code)}>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{title}</span>
          <span className="block text-[13px] text-muted">{hint}</span>
        </span>
        <span className="shrink-0 font-mono text-xs text-muted">{keycodeId(code)}</span>
      </OptionButton>
      <HelpButton topic={help} />
    </div>
  )
}

function KeyCodeField({ current, names, initialCode, onAssign }: Omit<Props, 'layer'>) {
  const [text, setText] = useState(initialCode)
  const code = parseKeycode(text)
  const apply = () => code !== null && code !== current && onAssign(code)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="keys-code" className="flex items-center gap-0.5 font-medium">
          Key code
          <HelpButton topic="raw-code" />
        </label>
        <TextInput
          id="keys-code"
          value={text}
          spellCheck={false}
          autoComplete="off"
          placeholder="KC_ESC, LCTL(KC_C), 0x7E10"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          className="w-60 font-mono text-[13px]"
        />
        <Button size="sm" disabled={code === null || code === current} onClick={apply}>
          Use this code
        </Button>
      </div>
      <p aria-live="polite" className="text-[13px] text-muted">
        {!text.trim() ? (
          'Type a QMK name or a number; what it means shows here before you use it.'
        ) : code === null ? (
          <span className="text-danger">Not a key code this app knows.</span>
        ) : (
          <>
            Means <span className="font-medium text-content">{describeKeycode(code, names)}</span>{' '}
            <span className="font-mono text-xs">{keycodeId(code)}</span>
            {code === current && ', which is what it does now'}
          </>
        )}
      </p>
    </div>
  )
}

/** A modifier for the next key only (QMK's one-shot modifier): tick, then use. */
function OneShotModifier({ current, onAssign }: { current: number; onAssign: (code: number) => void }) {
  // Nothing ticked unless the key already holds one: a tick should mean the user chose it.
  const [mods, setMods] = useState(readOneShotMod(current)?.mods ?? 0)
  const code = oneShotModKeycode(mods)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-0.5 font-medium">
        Modifier for the next key only
        <HelpButton topic="one-shot-mod" />
      </div>
      <p className="text-[13px] text-muted">Tap it, then the next key you press comes with the modifier, without holding anything.</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <ModifierBoxes mods={mods} onChange={setMods} />
        <Checkbox label="Right-hand" checked={(mods & RIGHT_HAND) !== 0} onChange={(on) => setMods(on ? mods | RIGHT_HAND : mods & ~RIGHT_HAND)} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={code === null || code === current} onClick={() => code !== null && onAssign(code)}>
          {code === null ? 'Tick a modifier' : code === current ? 'This is what it does now' : `Use ${modifierWords(mods)} for the next key`}
        </Button>
        {code !== null && <span className="font-mono text-xs text-muted">{keycodeId(code)}</span>}
      </div>
    </div>
  )
}

export function MoreOptions({ current, names, layer, initialCode, onAssign }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(19rem,100%),1fr))] gap-2">
        <Special code={KC_NOTHING} current={current} title="Nothing" hint="Does nothing on this layer." help="nothing" onAssign={onAssign} />
        <Special
          code={KC_SAME_AS_BELOW}
          current={current}
          title="Same as the layer below"
          hint={layer === 0 ? 'This is the bottom layer, so it does nothing.' : 'Does what it does on the layer underneath.'}
          help="transparent"
          onAssign={onAssign}
        />
      </div>
      <OneShotModifier current={current} onAssign={onAssign} />
      <KeyCodeField current={current} names={names} initialCode={initialCode} onAssign={onAssign} />
    </div>
  )
}
