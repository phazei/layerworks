// SPDX-License-Identifier: GPL-3.0-or-later
// What the editors of multi-tap keys, key chords, shortcut replacements and repeat rules share: the draft (kept
// until saved or reverted, like a macro's), the card with its title, the sentence that explains the idea and a
// one-click example, Save / Revert / Clear, and the fields for a key and for modifiers.

import { useState, type ReactNode } from 'react'
import { Lock, Sparkles } from 'lucide-react'
import {
  bootKeycode,
  deviceStore,
  emptyEntry,
  entriesMatch,
  entryIsEmpty,
  entryNeedsUnlock,
  entryProblem,
  keycodeTitle,
  MOD_KEYS,
  MOD_PAIRS,
  useDevice,
  type EntryKind,
  type EntryOf,
  type EntrySaveResult,
} from '../../device'
import type { HelpTopicId } from '../../help/topics'
import { openUnlock } from '../../shell/unlock-dialog'
import { Button, Checkbox } from '../../ui/controls'
import { Card, HelpButton, Notice } from '../../ui/layout'
import { KINDS } from './describe'
import { entryDraftOf, getEntryDraft, setEntryDraft, useDrafts } from './drafts'
import { KeyPicker } from './KeyPicker'
import { SaveBar, SaveState } from './SaveBar'
import { Caps } from './StepRow'

export interface EntryDraft<K extends EntryKind> {
  /** What the keyboard holds. */
  saved: EntryOf<K>
  /** What is shown: the draft, or what is saved. */
  entry: EntryOf<K>
  dirty: boolean
  edit: (next: EntryOf<K>) => void
}

/** The entry being edited, as a draft per keyboard and slot. null while the entries are being read. */
export function useEntryDraft<K extends EntryKind>(kind: K, index: number): EntryDraft<K> | null {
  const uid = useDevice((s) => s.keyboard?.uid)
  const entries = useDevice((s) => s.entries)
  const drafts = useDrafts()
  const saved = entries?.[kind][index] as EntryOf<K> | undefined
  if (!uid || !saved) return null
  const draft = entryDraftOf(drafts, uid, kind, index) as EntryOf<K> | undefined
  return {
    saved,
    // An empty slot is edited from the defaults (a tapping term of 200 ms, every layer …), not its zeros.
    entry: draft ?? (entryIsEmpty(kind, saved) ? emptyEntry(kind) : saved),
    dirty: draft !== undefined && !entriesMatch(kind, draft, saved),
    edit: (next) => setEntryDraft(uid, kind, index, entriesMatch(kind, next, saved) ? null : next),
  }
}

const SAVE_PROBLEMS: Partial<Record<EntrySaveResult, string>> = {
  locked: 'The keyboard is locked again, so nothing was saved. Unlock it, then save.',
  invalid: 'Something needs fixing first (said in red above).',
  failed: 'The keyboard didn’t take it. Check it is connected and try again.',
}

interface FrameProps<K extends EntryKind> {
  kind: K
  index: number
  draft: EntryDraft<K>
  /** One or two sentences: the idea, for someone who has never met it. */
  intro: ReactNode
  /** A ready-made example, applied with one click: "J and K together send Esc". */
  example: { label: string; entry: EntryOf<K> }
  /** Shown above the fields: where it is used, or what it needs. */
  usage?: ReactNode
  children: ReactNode
}

export function EntryFrame<K extends EntryKind>({ kind, index, draft, intro, example, usage, children }: FrameProps<K>) {
  const uid = useDevice((s) => s.keyboard?.uid ?? '')
  const unlocked = useDevice((s) => s.unlock?.unlocked === true)
  const [result, setResult] = useState<EntrySaveResult | null>(null)
  const [saving, setSaving] = useState(false)
  const info = KINDS[kind]
  const { entry, saved, dirty } = draft
  const problem = entryProblem(kind, entry)
  const needsUnlock = !unlocked && entryNeedsUnlock(kind, entry, bootKeycode())
  const edit = (next: EntryOf<K>) => {
    setResult(null)
    draft.edit(next)
  }

  const save = async () => {
    if (needsUnlock) {
      openUnlock('It holds the key that restarts the keyboard for a firmware update, which the keyboard only takes while unlocked.')
      return
    }
    const sent = entry
    setSaving(true)
    const outcome = await deviceStore.saveEntry(kind, index, sent)
    setSaving(false)
    setResult(outcome)
    // Edits made while it was on its way stay a draft.
    if (outcome === 'saved' || outcome === 'unchanged') {
      const now = getEntryDraft(uid, kind, index)
      if (now === undefined || entriesMatch(kind, now as EntryOf<K>, sent)) setEntryDraft(uid, kind, index, null)
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-0.5 text-[15px] font-semibold">
              {info.one} {index + 1}
              <HelpButton topic={info.help} />
            </h2>
            <span className="text-[13px] text-muted">{info.qmk}</span>
            <SaveState
              dirty={dirty}
              justSaved={result === 'saved'}
              savedText={entryIsEmpty(kind, saved) ? 'Empty on the keyboard' : 'As on the keyboard'}
            />
          </div>
          {(dirty || (result !== null && SAVE_PROBLEMS[result])) && (
            <SaveBar
              dirty={dirty}
              saving={saving}
              needsUnlock={needsUnlock}
              blocked={problem !== null}
              hint={problem ?? (dirty ? 'Undo, in the bar at the bottom, takes a saved change back.' : '')}
              onSave={() => void save()}
              onRevert={() => edit(saved)}
            >
              {result && SAVE_PROBLEMS[result] && <Notice tone="danger">{SAVE_PROBLEMS[result]}</Notice>}
              {needsUnlock && dirty && (
                <Notice>
                  <span className="flex items-start gap-2">
                    <Lock size={14} aria-hidden className="mt-0.5 shrink-0" />
                    <span>
                      It holds the firmware-update key (QK_BOOT), which the keyboard only takes while unlocked. Your
                      changes stay here until you save or revert.
                      <HelpButton topic="unlock" />
                    </span>
                  </span>
                </Notice>
              )}
            </SaveBar>
          )}
        </header>

        <div className="flex flex-col gap-2 text-[13px] text-muted">
          <div>{intro}</div>
          <div>
            <Button size="sm" icon={<Sparkles size={13} aria-hidden />} onClick={() => edit(example.entry)}>
              Try: {example.label}
            </Button>
          </div>
        </div>

        {usage}

        <div className="flex flex-col gap-4">{children}</div>

        {!entryIsEmpty(kind, entry) && (
          <div className="border-t border-edge pt-4">
            <Button size="sm" variant="quiet" onClick={() => edit(emptyEntry(kind))}>
              Clear this {info.one.toLowerCase()}
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

interface KeyFieldProps {
  label: string
  value: number
  onChange: (code: number) => void
  /** Offer Ctrl, Shift, Alt and Win in the picker (a shortcut as the key). */
  shortcuts?: boolean
  /** Can be left empty ("Nothing"). */
  optional?: boolean
  /** Palette groups left out (see KeyPicker). */
  exclude?: string[]
  help?: HelpTopicId
}

/** One key: its keycaps and name, "Change…" for the palette, and for an optional one "Nothing". */
export function KeyField({ label, value, onChange, shortcuts = false, optional = false, exclude, help }: KeyFieldProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex min-w-36 items-center gap-0.5 text-[13px] font-medium text-muted">
          {label}
          {help && <HelpButton topic={help} />}
        </span>
        {value ? <Caps code={value} /> : null}
        <span className={value ? '' : 'text-muted italic'}>{value ? keycodeTitle(value) : optional ? 'Nothing' : 'No key picked yet'}</span>
        <Button size="sm" aria-label={`${value ? 'Change' : 'Pick'} ${label.toLowerCase()}`} aria-expanded={open} onClick={() => setOpen(!open)}>
          {value ? 'Change…' : 'Pick…'}
        </Button>
        {optional && value !== 0 && (
          <Button size="sm" variant="quiet" aria-label={`No ${label.toLowerCase()}`} onClick={() => onChange(0)}>
            Remove
          </Button>
        )}
      </div>
      {open && (
        <KeyPicker
          current={value}
          shortcuts={shortcuts}
          exclude={exclude}
          onPick={(code) => {
            onChange(code)
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

interface ModsFieldProps {
  label: string
  value: number
  onChange: (mask: number) => void
  /** Each side on its own (left and right), rather than Ctrl meaning either. */
  sided?: boolean
}

/** Modifiers as checkboxes: Ctrl, Shift, Alt, Win (either side), or all eight one by one. */
export function ModsField({ label, value, onChange, sided = false }: ModsFieldProps) {
  return (
    <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <legend className="sr-only">{label}</legend>
      <span aria-hidden className="min-w-36 text-[13px] font-medium text-muted">
        {label}
      </span>
      {sided
        ? MOD_KEYS.map((mod) => (
            <Checkbox
              key={mod.bit}
              label={mod.name}
              checked={(value & mod.bit) !== 0}
              onChange={(on) => onChange(on ? value | mod.bit : value & ~mod.bit)}
            />
          ))
        : MOD_PAIRS.map((pair) => (
            <Checkbox
              key={pair.bits}
              label={pair.name}
              checked={(value & pair.bits) !== 0}
              onChange={(on) => onChange(on ? value | pair.bits : value & ~pair.bits)}
            />
          ))}
    </fieldset>
  )
}
