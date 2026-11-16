// SPDX-License-Identifier: GPL-3.0-or-later
// Keychron's Snap Click: pairs of opposite keys, and which one counts while both are held. The pairs in use, each
// with its rule; ready-made pairs to add with one click, or any two keys pressed on the keyboard.

import { useCallback, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  deviceStore,
  isSnapClickKey,
  keycodeName,
  keycodeTitle,
  SNAP_CLICK_PRESETS,
  SNAP_CLICK_RULES,
  snapClickProblem,
  snapClickRule,
  useDevice,
  type SnapClickEntry,
} from '../../device'
import { usageOf } from '../../shell/pressed-keys'
import { Button, IconButton, OptionButton } from '../../ui/controls'
import { KeyCapture } from '../../ui/KeyCapture'
import { KeyCap } from '../../ui/KeyTile'
import { Card } from '../../ui/layout'
import { Select } from '../../ui/Select'
import { groupAnchor } from './GroupCard'
import { SettingName } from './SettingRow'

export const SNAP_CLICK_SEARCH = 'snap click socd gaming games opposite keys strafe left right a d w s directions'

const USUAL_RULE = 2

const pairName = (key1: number, key2: number) => `${keycodeTitle(key1)} and ${keycodeTitle(key2)}`

function ruleOptions(key1: number, key2: number) {
  return SNAP_CLICK_RULES.map((rule) => ({ value: rule.type, label: rule.name(keycodeTitle(key1), keycodeTitle(key2)) }))
}

function Pair({ index, entry }: { index: number; entry: SnapClickEntry }) {
  const name = pairName(entry.key1, entry.key2)
  return (
    <li className="flex flex-col gap-1.5 rounded-control border border-edge p-3">
      <div className="flex flex-wrap items-center gap-2">
        <KeyCap label={keycodeName(entry.key1)} />
        <span className="text-[13px] text-muted">and</span>
        <KeyCap label={keycodeName(entry.key2)} />
        <Select
          aria-label={`While ${name} are both held`}
          className="min-w-56 flex-1"
          value={entry.type}
          options={ruleOptions(entry.key1, entry.key2)}
          onChange={(type) => void deviceStore.setSnapClick(index, { ...entry, type })}
        />
        <IconButton label={`Remove the pair ${name}`} onClick={() => void deviceStore.setSnapClick(index, { type: 0, key1: 0, key2: 0 })}>
          <X size={16} />
        </IconButton>
      </div>
      <p className="text-[13px] text-muted">{snapClickRule(entry.type)?.hint}</p>
    </li>
  )
}

/** The key a browser key code stands for, if Snap Click can take it (a plain key). */
function takeKey(code: string, use: (key: number) => void): boolean {
  const key = usageOf(code)
  if (key === undefined || !isSnapClickKey(key)) return false
  use(key)
  return true
}

/** Two keys pressed on the keyboard, a rule, and Add. */
function OtherPair({ onAdd, onClose }: { onAdd: (entry: SnapClickEntry) => void; onClose: () => void }) {
  const [entry, setEntry] = useState<SnapClickEntry>({ type: USUAL_RULE, key1: 0, key2: 0 })
  const take1 = useCallback((code: string) => takeKey(code, (key) => setEntry((e) => ({ ...e, key1: key }))), [])
  const take2 = useCallback((code: string) => takeKey(code, (key) => setEntry((e) => ({ ...e, key2: key }))), [])
  const problem = snapClickProblem(entry)
  const cap = (key: number) => (key ? <KeyCap label={keycodeName(key)} /> : null)

  return (
    <div className="flex flex-col gap-3 rounded-control border border-edge p-3">
      <p className="text-[13px] text-muted">Click a box, then press the key on your keyboard.</p>
      <div className="flex flex-wrap items-center gap-2">
        <KeyCapture label="First key" current={cap(entry.key1)} onKey={take1} refusal="Only ordinary keys work here." />
        <span className="text-[13px] text-muted">and</span>
        <KeyCapture label="Second key" current={cap(entry.key2)} onKey={take2} refusal="Only ordinary keys work here." />
      </div>
      {entry.key1 > 0 && entry.key2 > 0 && (
        <Select
          aria-label="While both are held"
          value={entry.type}
          options={ruleOptions(entry.key1, entry.key2)}
          onChange={(type) => setEntry({ ...entry, type })}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="primary" disabled={problem !== null} onClick={() => onAdd(entry)}>
          Add this pair
        </Button>
        <Button size="sm" variant="quiet" onClick={onClose}>
          Cancel
        </Button>
        {problem && entry.key1 > 0 && entry.key2 > 0 && <span className="text-[13px] text-danger">{problem}</span>}
      </div>
    </div>
  )
}

export function SnapClick() {
  const keychron = useDevice((s) => s.keychron)
  const [choosing, setChoosing] = useState(false)
  if (!keychron?.hasSnapClick || keychron.snapClickCount === 0) return null
  const entries = keychron.snapClickEntries
  const used = entries.map((entry, index) => ({ entry, index })).filter(({ entry }) => entry.type !== 0)
  const free = entries.findIndex((entry) => entry.type === 0)
  const has = (a: number, b: number) => used.some(({ entry }) => (entry.key1 === a && entry.key2 === b) || (entry.key1 === b && entry.key2 === a))
  const add = (entry: SnapClickEntry) => {
    if (free < 0) return
    void deviceStore.setSnapClick(free, entry)
    setChoosing(false)
  }

  return (
    <div id={groupAnchor('snap-click')} className="scroll-mt-4">
      <Card
        title={<SettingName name="Snap Click" qmkName="SOCD" />}
        description="For games: when two opposite keys are held together, which one counts, so a change of direction is instant."
        help="typing-snap-click"
      >
        <div className="flex flex-col gap-4">
          {used.length > 0 ? (
            <ul aria-label="Snap Click pairs" className="flex flex-col gap-2">
              {used.map(({ entry, index }) => (
                <Pair key={index} index={index} entry={entry} />
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted">No pairs yet: opposite keys both count, as on any keyboard.</p>
          )}

          {free < 0 ? (
            <p className="text-[13px] text-muted">All {entries.length} pairs are in use. Remove one to add another.</p>
          ) : choosing ? (
            <OtherPair onAdd={add} onClose={() => setChoosing(false)} />
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-[13px] text-muted">
                Add a pair · {used.length} of {entries.length} in use
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SNAP_CLICK_PRESETS.filter((p) => !has(p.key1, p.key2)).map((p) => (
                  <OptionButton key={`${p.key1},${p.key2}`} shape="chip" onClick={() => add({ type: USUAL_RULE, ...p })}>
                    <Plus size={13} aria-hidden />
                    {pairName(p.key1, p.key2)}
                  </OptionButton>
                ))}
                <OptionButton shape="chip" onClick={() => setChoosing(true)}>
                  <Plus size={13} aria-hidden />
                  Other keys…
                </OptionButton>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
