// SPDX-License-Identifier: GPL-3.0-or-later
// The inspector under the keyboard stage: what the selected key or knob direction does now, and the four ways of
// choosing something else (a key, a shortcut, a layer switch, tap or hold), with the rarer ones under "More
// options".

import { useMemo, useState } from 'react'
import {
  canTakeModifiers,
  deviceStore,
  KC_SAME_AS_BELOW,
  keycodeId,
  keyPalette,
  slotKeycode,
  type KeyboardData,
  type Slot,
} from '../../device'
import type { HelpTopicId } from '../../help/topics'
import { ChoiceGrid } from '../../ui/ChoiceGrid'
import { cx } from '../../ui/controls'
import { KeyCap } from '../../ui/KeyTile'
import { Card, Disclosure, HelpButton } from '../../ui/layout'
import { PageLink } from '../../ui/PageLink'
import { capLabel, choiceFor, describeKeycode, fallThrough, hasOwnOption, layerName, type Choice } from './describe'
import { KeyPalette } from './KeyPalette'
import { LayerChoice } from './LayerChoice'
import { MoreOptions } from './MoreOptions'
import { ShortcutChoice } from './ShortcutChoice'
import { useShortcutKeys, type ShortcutKey } from './shortcut-keys'
import { TapHoldChoice } from './TapHoldChoice'

const MORE_OPTIONS = 'keys-more'

const CHOICES: { value: Choice; label: string; help: HelpTopicId }[] = [
  { value: 'key', label: 'A key', help: 'key-palette' },
  { value: 'shortcut', label: 'A shortcut', help: 'shortcut-key' },
  { value: 'layer', label: 'Switch layer', help: 'layer-key' },
  { value: 'tapHold', label: 'Tap or hold', help: 'tap-hold' },
]

/** `?choice=tapHold` in the URL (or key, shortcut, layer): the inspector opens on that choice, for screenshots. */
function choiceFromUrl(): Choice | null {
  const asked = new URLSearchParams(location.search).get('choice')
  return CHOICES.find((c) => c.value === asked)?.value ?? null
}

/** "Now" for a macro or multi-tap key: its name, what it does, and where it is set up. */
function NowShortcut({ found, id }: { found: ShortcutKey; id: string }) {
  return (
    <span className="flex min-w-0 flex-col leading-tight">
      <span>
        <span className="font-medium">{found.name}</span>
        {found.summary && <span className="text-muted"> · {found.empty ? 'empty' : found.summary}</span>}
      </span>
      <span className="text-xs text-muted">
        <span className="font-mono">{id}</span> ·{' '}
        <PageLink href={found.href}>{found.empty ? 'Set it up on Shortcuts & macros' : 'Open on Shortcuts & macros'}</PageLink>
      </span>
    </span>
  )
}

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
  const [choice, setChoice] = useState<Choice>(() => choiceFromUrl() ?? opening.choice)
  const shortcutKey = useShortcutKeys()
  const found = shortcutKey(current)

  const assign = (code: number) => void deviceStore.assign(slot, code)
  // Vial stores a knob's counter-clockwise turn as direction 0 and the clockwise one as 1.
  const question =
    slot.kind === 'knob' ? `What should turning ${slot.direction === 1 ? 'right' : 'left'} do?` : 'What should this key do?'
  // A code no choice builds goes in the key-code field.
  const unusual = opening.more && !hasOwnOption(current)

  // Wide: the question, what it does now, the choice and More options on the left, the choice's body filling
  // the right. The card fits the space under the stage: the palette scrolls in its box, and the left column (with
  // More options open) or a tall choice scroll on their own rather than making the page taller. Narrow: one
  // column, More options last, and the page scrolls to reach it.
  return (
    <Card className="@container flex flex-1 flex-col @2xl/keys:absolute @2xl/keys:inset-0">
      <div
        className={cx(
          'grid flex-1 grid-cols-1 grid-rows-[auto_auto_1fr_auto] gap-x-6 @2xl:min-h-0',
          "[grid-template-areas:'head'_'choose'_'body'_'more']",
          // Two columns from 42rem, so in a small window the palette starts at the top of the card.
          "@2xl:grid-cols-[18rem_1fr] @2xl:grid-rows-[minmax(0,1fr)] @2xl:[grid-template-areas:'left_body']",
          '@3xl:grid-cols-[18.5rem_1fr]',
        )}
      >
        {/* Wide: one column that scrolls by itself. Narrow: not a box at all, so its parts take their own rows. */}
        <div className="contents @2xl:-m-1 @2xl:flex @2xl:min-h-0 @2xl:flex-col @2xl:overflow-y-auto @2xl:p-1 @2xl:[grid-area:left]">
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
              <KeyCap label={found ? found.label : capLabel(current, names)} />
              {found ? (
                <NowShortcut found={found} id={keycodeId(current)} />
              ) : (
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="font-medium">{describeKeycode(current, names)}</span>
                  <span className="font-mono text-xs break-all text-muted">{keycodeId(current)}</span>
                </span>
              )}
            </div>
          </header>

          <div className="mb-4 flex max-w-xl items-center gap-1 [grid-area:choose]">
            <ChoiceGrid label="What it should do" value={choice} options={CHOICES} onChange={setChoice} className="min-w-0 flex-1" />
            <HelpButton topic={CHOICES.find((c) => c.value === choice)!.help} />
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

        {/* -m-1 p-1: room for focus rings inside the scrolling columns. */}
        <div className="flex min-w-0 flex-col [grid-area:body] @2xl:-m-1 @2xl:min-h-0 @2xl:overflow-y-auto @2xl:p-1">
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
          {choice === 'tapHold' && (
            <TapHoldChoice current={current} names={names} ownLayer={slot.layer} groups={shortcutKeys} onAssign={assign} />
          )}
        </div>
      </div>
    </Card>
  )
}
