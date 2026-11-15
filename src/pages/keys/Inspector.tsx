// SPDX-License-Identifier: GPL-3.0-or-later
// The inspector under the keyboard stage: what the selected key or knob direction does now, and the three ways of
// choosing something else (a key, a shortcut, a layer switch), with the rarer ones under "More options".

import { useMemo, useState } from 'react'
import {
  canTakeModifiers,
  deviceStore,
  KC_NOTHING,
  KC_SAME_AS_BELOW,
  keycodeId,
  keycodeName,
  keyPalette,
  slotKeycode,
  type KeyboardData,
  type Slot,
} from '../../device'
import type { HelpTopicId } from '../../help/topics'
import { cx, Segmented } from '../../ui/controls'
import { KeyCap } from '../../ui/KeyTile'
import { Card, Disclosure, HelpButton } from '../../ui/layout'
import { choiceFor, describeKeycode, fallThrough, layerName, type Choice } from './describe'
import { KeyPalette } from './KeyPalette'
import { LayerChoice } from './LayerChoice'
import { MoreOptions } from './MoreOptions'
import { ShortcutChoice } from './ShortcutChoice'

const MORE_OPTIONS = 'keys-more'

const CHOICES: { value: Choice; label: string; help: HelpTopicId }[] = [
  { value: 'key', label: 'A key', help: 'key-palette' },
  { value: 'shortcut', label: 'A shortcut', help: 'shortcut-key' },
  { value: 'layer', label: 'Switch layer', help: 'layer-key' },
]

interface Props {
  keyboard: KeyboardData
  slot: Slot
  names: string[]
  /** The keyboard's base layer (from the Mac/Windows switch), for working out what falls through. */
  base: number
}

/** Where the slot is, and whether it has its own assignment or falls through to a layer below. */
function Whereabouts({ keyboard, slot, names, base }: Props) {
  const on = `${slot.kind === 'knob' ? 'The knob, on' : 'On'} ${layerName(names, slot.layer)}`
  if (slotKeycode(keyboard, slot) !== KC_SAME_AS_BELOW) {
    if (slot.layer === 0) return <>{on}, the bottom layer.</>
    if (slot.layer === base) return <>{on}, the base layer the keyboard is on.</>
    return <>{on}, where it has its own assignment.</>
  }
  if (slot.layer === 0) return <>{on}. There is no layer below the bottom one, so it does nothing.</>
  const below = fallThrough(keyboard, slot, base)
  if (!below) return <>{on}. The layers it falls through to have nothing on it either, so it does nothing.</>
  return (
    <>
      {on}, where it has nothing of its own. It normally does what it does on {layerName(names, below.layer)}:{' '}
      <span className="font-medium text-content">{describeKeycode(below.code, names)}</span>{' '}
      <span className="font-mono text-xs">{keycodeId(below.code)}</span>
    </>
  )
}

export function Inspector({ keyboard, slot, names, base }: Props) {
  const current = slotKeycode(keyboard, slot)
  // The tables behind the palette describe the connected keyboard; rebuild them when it changes.
  const palette = useMemo(() => keyPalette(), [keyboard.uid])
  const paletteCodes = useMemo(() => new Set(palette.flatMap((group) => group.keys.map((key) => key.code))), [palette])
  const shortcutKeys = useMemo(
    () =>
      palette
        .map((group) => ({ ...group, keys: group.keys.filter((key) => canTakeModifiers(key.code)) }))
        .filter((group) => group.id !== 'modifiers' && group.keys.length > 0),
    [palette],
  )

  // Opens on the choice that holds what the key does now. "More options" opens for this key when that is where
  // it is, without changing whether it stays open for the next one.
  const [opening] = useState(() => choiceFor(current, paletteCodes))
  const [choice, setChoice] = useState<Choice>(opening.choice)

  const assign = (code: number) => void deviceStore.assign(slot, code)
  // Vial stores a knob's counter-clockwise turn as direction 0 and the clockwise one as 1.
  const question =
    slot.kind === 'knob' ? `What should turning ${slot.direction === 1 ? 'right' : 'left'} do?` : 'What should this key do?'
  const unusual = opening.more && current !== KC_NOTHING && current !== KC_SAME_AS_BELOW

  // Wide: the question, what it does now, the choice and More options on the left, the choice's body filling
  // the right. Narrow: one column, More options last.
  return (
    <Card className="@container flex flex-1 flex-col">
      <div
        className={cx(
          'grid flex-1 grid-cols-1 grid-rows-[auto_auto_1fr_auto] gap-x-6',
          "[grid-template-areas:'head'_'choose'_'body'_'more']",
          // Two columns from 42rem, so in a small window the palette starts at the top of the card.
          "@2xl:grid-cols-[18rem_1fr] @2xl:grid-rows-[auto_auto_1fr] @2xl:[grid-template-areas:'head_body'_'choose_body'_'more_body']",
          '@3xl:grid-cols-[18.5rem_1fr]',
        )}
      >
        <header className="mb-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3 [grid-area:head]">
          <div className="min-w-0 flex-1 basis-64">
            <h2 className="text-[15px] font-semibold">
              {question}
              {slot.kind === 'knob' && (
                <span className="ml-1 inline-flex align-middle">
                  <HelpButton topic="knob" />
                </span>
              )}
            </h2>
            <p className="mt-0.5 text-[13px] text-muted">
              <Whereabouts keyboard={keyboard} slot={slot} names={names} base={base} />
            </p>
          </div>
          <div aria-label="What it does now" role="group" className="flex min-w-0 items-center gap-2.5">
            <span className="text-[13px] text-muted">Now</span>
            <KeyCap label={keycodeName(current)} />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="font-medium">{describeKeycode(current, names)}</span>
              <span className="font-mono text-xs break-all text-muted">{keycodeId(current)}</span>
            </span>
          </div>
        </header>

        <div className="mb-4 flex items-center gap-1 whitespace-nowrap [grid-area:choose]">
          <Segmented label="What it should do" value={choice} options={CHOICES} onChange={setChoice} />
          <HelpButton topic={CHOICES.find((c) => c.value === choice)!.help} />
        </div>

        <div className="flex min-w-0 flex-col [grid-area:body]">
          {choice === 'key' && (
            <KeyPalette
              groups={palette}
              current={current}
              onPick={(key) => assign(key.code)}
              hint="Point at a key to see what it does; click it to use it."
              label="Keys"
            />
          )}
          {choice === 'shortcut' && <ShortcutChoice current={current} groups={shortcutKeys} onAssign={assign} />}
          {choice === 'layer' && <LayerChoice current={current} names={names} ownLayer={slot.layer} onAssign={assign} />}
        </div>

        <div className="[grid-area:more] @2xl:[&>div]:mt-0">
          <Disclosure id={MORE_OPTIONS} forceOpen={opening.more}>
            <MoreOptions
              current={current}
              names={names}
              layer={slot.layer}
              initialCode={unusual ? keycodeId(current) : ''}
              onAssign={assign}
            />
          </Disclosure>
        </div>
      </div>
    </Card>
  )
}
