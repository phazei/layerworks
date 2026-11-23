// SPDX-License-Identifier: GPL-3.0-or-later
// Keychron's key bounce filter: how long the keyboard waits to be sure a press is real, and how it waits.

import { useId } from 'react'
import {
  DEBOUNCE_TYPES,
  debounceMax,
  deviceStore,
  formatMs,
  useDevice,
  type Debounce as DebounceValue,
} from '../../device'
import { OptionButton, Slider } from '../../ui/controls'
import { Card, Disclosure } from '../../ui/layout'
import { useLatestQueue } from '../../ui/latest'
import { jumpTarget } from '../../ui/reveal'
import { groupAnchor } from './GroupCard'
import { SettingName } from './SettingRow'

/** Sends a change on top of what the keyboard has; a dragged slider sends only its newest value. */
function send(change: Partial<DebounceValue>): Promise<unknown> {
  const kc = deviceStore.getState().keychron
  if (!kc) return Promise.resolve()
  return deviceStore.setDebounce({ type: kc.debounceType, time: kc.debounceTime, ...change })
}

/** The words a search finds this card by. */
export const DEBOUNCE_SEARCH =
  'key bounce filter debounce chatter double types twice typing twice flicker wait real press'

const SLIDER_MAX = 100

export function Debounce() {
  const keychron = useDevice((s) => s.keychron)
  const [pending, change] = useLatestQueue<Partial<DebounceValue>>(send)
  const typesId = useId()
  if (!keychron?.hasDebounce) return null
  const type = pending.type ?? keychron.debounceType
  const time = pending.time ?? keychron.debounceTime
  const max = Math.min(Math.max(SLIDER_MAX, time), debounceMax(type))

  const choice = (t: (typeof DEBOUNCE_TYPES)[number]) => (
    <OptionButton key={t.type} selected={t.type === type} onClick={() => change({ type: t.type })} className="items-start">
      <span className="flex flex-col">
        <span className="font-medium">
          {t.name} <span className="text-[13px] font-normal text-muted">· {t.qmkName}</span>
        </span>
        <span className="text-[13px] text-muted">{t.hint}</span>
      </span>
    </OptionButton>
  )

  return (
    <div {...jumpTarget(groupAnchor('debounce'))}>
      <Card
        title={<SettingName name="Key bounce filter" qmkName="Debounce" />}
        description="How long the keyboard waits to be sure a key press is real, so one press never types twice."
        help="typing-debounce"
      >
        <div className="flex flex-col gap-5">
          <Slider
            label={<SettingName name="Wait" qmkName="Debounce time" />}
            value={time}
            min={Math.min(1, time)}
            max={max}
            format={formatMs}
            hint={
              time === 0
                ? 'The filter is off: every flicker counts.'
                : 'If a key sometimes types twice, make this longer. Shorter reacts a little sooner.'
            }
            onChange={(t) => change({ time: t })}
          />
          <div className="flex flex-col gap-2">
            <span id={typesId}>How it waits</span>
            <div role="group" aria-labelledby={typesId} className="flex flex-col gap-1.5">
              {DEBOUNCE_TYPES.filter((t) => t.everyday || t.type === type).map(choice)}
            </div>
          </div>
        </div>
        <Disclosure id={groupAnchor('debounce')}>
          <div className="flex flex-col gap-1.5">{DEBOUNCE_TYPES.filter((t) => !t.everyday && t.type !== type).map(choice)}</div>
        </Disclosure>
      </Card>
    </div>
  )
}
