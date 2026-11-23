// SPDX-License-Identifier: GPL-3.0-or-later
// One macro, edited as a draft: its name, the keys that run it, its steps, the space it takes, and "Save to
// keyboard". Nothing reaches the keyboard until it is saved, and saving needs the keyboard unlocked.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Clock, Lock, Plus, Type } from 'lucide-react'
import {
  deviceStore,
  encodeMacro,
  macroKeycode,
  macrosHalted,
  rawMacros,
  readMacros,
  replaceMacro,
  sameSteps,
  stepProblem,
  useDevice,
  type MacroSaveResult,
  type MacroStep,
} from '../../device'
import { defaultMacroName, renameMacro, useStoredMacroNames } from '../../shell/layer-names'
import { screenshotOption } from '../../shell/session'
import { openUnlock } from '../../shell/unlock-dialog'
import { Button, cx, TextInput } from '../../ui/controls'
import { Card, Disclosure, HelpButton, Notice } from '../../ui/layout'
import { roomText, STEP_NAMES } from './describe'
import { draftOf, getDraft, renamedMacro, setDraft, useDrafts } from './drafts'
import { Recorder } from './Recorder'
import { SaveBar, SaveState } from './SaveBar'
import { StepRow } from './StepRow'
import { unsavedHint, Uses } from './Uses'

const UNLOCK_REASON = 'The keyboard only takes macro changes while it is unlocked.'

const SAVE_PROBLEMS: Partial<Record<MacroSaveResult, string>> = {
  locked: 'The keyboard is locked again, so nothing was saved. Unlock it, then save.',
  'too-big': 'It doesn’t fit in the space the macros share. Shorten it, or another macro.',
  invalid: 'Some steps need fixing first (marked in red).',
  failed: 'The keyboard didn’t take it. Check it is connected and try again.',
}

function NameField({ uid, index }: { uid: string; index: number }) {
  const names = useStoredMacroNames()
  const stored = names[index] ?? ''
  const [text, setText] = useState<string | null>(null)
  return (
    <TextInput
      aria-label="Macro name"
      value={text ?? stored}
      placeholder={defaultMacroName(index)}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text !== null) {
          renameMacro(uid, index, text)
          renamedMacro(uid, index)
        }
        setText(null)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setText(null)
          e.currentTarget.blur()
        }
      }}
      className="w-full max-w-72 text-[15px] font-semibold"
    />
  )
}

function AddButton({ icon, children, onClick }: { icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <Button size="sm" icon={icon} onClick={onClick}>
      {children}
    </Button>
  )
}

/**
 * `?macro-draft` in the URL: the macro opened first gets an unsaved change (a text step, and with
 * `?macro-draft=problem` one with a character a macro can't type), for screenshots of the unsaved state.
 */
function useSampleDraft(index: number): void {
  const kb = useDevice((s) => s.keyboard)
  const buffer = useDevice((s) => s.macros)
  const done = useRef(false)
  useEffect(() => {
    // Only on the demo keyboard (screenshotOption).
    const sample = screenshotOption('macro-draft')
    if (done.current || sample === null || !kb || !buffer) return
    done.current = true
    const saved = readMacros(buffer, kb.vialProtocol, kb.macroCount)[index] ?? []
    const text = sample === 'problem' ? ' Grüße!' : ' Thanks!'
    setDraft(kb.uid, index, [...saved, { kind: 'text', text }, { kind: 'tap', key: 0x28 }])
  }, [kb, buffer, index])
}

export function MacroEditor({ index }: { index: number }) {
  const kb = useDevice((s) => s.keyboard)
  const buffer = useDevice((s) => s.macros)
  const unlocked = useDevice((s) => s.unlock?.unlocked === true)
  const drafts = useDrafts()
  // As the Keys page's palette names it.
  const macroName = useStoredMacroNames()[index]?.trim() || defaultMacroName(index)
  const [picking, setPicking] = useState<number | null>(null)
  const [result, setResult] = useState<MacroSaveResult | null>(null)
  // Why a save failed, as the store says it (a save that stopped part-way says what to do).
  const [failure, setFailure] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  useSampleDraft(index)
  if (!kb) return null
  if (!buffer) {
    return (
      <Card title={defaultMacroName(index)}>
        <p className="text-muted">Reading the macros from the keyboard…</p>
      </Card>
    )
  }

  const saved = readMacros(buffer, kb.vialProtocol, kb.macroCount)[index] ?? []
  const draft = draftOf(drafts, kb.uid, index)
  const steps = draft ?? saved
  const dirty = draft !== undefined && !sameSteps(draft, saved)

  const edit = (next: MacroStep[]) => {
    setResult(null)
    setDraft(kb.uid, index, sameSteps(next, saved) ? null : next)
  }
  const add = (step: MacroStep) => {
    if (step.kind !== 'text' && step.kind !== 'wait') setPicking(steps.length)
    edit([...steps, step])
  }
  const move = (at: number, by: -1 | 1) => {
    const next = [...steps]
    ;[next[at], next[at + by]] = [next[at + by], next[at]]
    setPicking(null)
    edit(next)
  }

  // Space: this macro as edited, against what the others take.
  const bytes = encodeMacro(steps, kb.vialProtocol)
  const fit = replaceMacro(buffer, kb.macroCount, kb.macroBytes, index, bytes)
  const othersUsed = rawMacros(buffer, kb.macroCount).reduce((sum, m, i) => (i === index ? sum : sum + m.length + 1), 0)
  const free = kb.macroBytes - othersUsed - bytes.length - 1
  const problems = steps.filter((s) => stepProblem(s, kb.vialProtocol) !== null).length
  const space = fit.buffer
    ? `This macro takes ${bytes.length + 1} byte${bytes.length === 0 ? '' : 's'}. ${roomText(free)} for all macros together.`
    : `Too long by ${fit.overflow} bytes: all ${kb.macroCount} macros share ${kb.macroBytes} bytes. Shorten this one or another.`

  const save = async () => {
    // Unlocking first; once it completes, the save goes ahead without a second press. Cancelled or not completed,
    // nothing is saved and the draft stays.
    if (!unlocked && !(await openUnlock(UNLOCK_REASON))) return
    const sent = steps
    setSaving(true)
    const outcome = await deviceStore.saveMacro(index, sent)
    setSaving(false)
    setResult(outcome)
    setFailure(outcome === 'failed' ? deviceStore.getState().writeError : null)
    // Edits made while it was on its way stay a draft.
    if (outcome === 'saved' || outcome === 'unchanged') {
      const now = getDraft(kb.uid, index)
      if (now === undefined || sameSteps(now, sent)) setDraft(kb.uid, index, null)
    }
  }

  return (
    <Card>
      {/* The name is a field here; this heading heads the editor's sections in a screen reader's outline. */}
      <h2 className="sr-only">{macroName}</h2>
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <NameField key={`${kb.uid}:${index}`} uid={kb.uid} index={index} />
            <span className="font-mono text-[13px] text-muted">M{index}</span>
            <SaveState dirty={dirty} justSaved={result === 'saved'} />
          </div>
          {(dirty || (result !== null && SAVE_PROBLEMS[result])) && (
            <SaveBar
              dirty={dirty}
              saving={saving}
              needsUnlock={!unlocked}
              blocked={problems > 0 || fit.buffer === null}
              hint={
                problems > 0
                  ? `${problems} step${problems === 1 ? '' : 's'} to fix before saving.`
                  : dirty
                    ? 'Undo, in the bar at the bottom, takes a saved macro back.'
                    : ''
              }
              onSave={() => void save()}
              onRevert={() => edit(saved)}
            >
              {!fit.buffer && <Notice tone="danger">{space}</Notice>}
              {result && SAVE_PROBLEMS[result] && (
                <Notice tone="danger">{(result === 'failed' && failure) || SAVE_PROBLEMS[result]}</Notice>
              )}
              {!unlocked && dirty && (
                <Notice>
                  <span className="flex items-start gap-2">
                    <Lock size={14} aria-hidden className="mt-0.5 shrink-0" />
                    <span>
                      Saving needs the keyboard unlocked: it only takes macro changes then. Your changes stay here until
                      you save or revert, even if you go to another page.
                      <HelpButton topic="macro-unlock" />
                    </span>
                  </span>
                </Notice>
              )}
            </SaveBar>
          )}
          {macrosHalted(buffer) && !dirty && result !== 'failed' && (
            <Notice tone="danger">
              <span className="flex flex-col items-start gap-2">
                <span>
                  A macro save stopped part-way, so the keyboard runs none of its macros until they are saved again in
                  full. Check this macro’s steps and save it.
                </span>
                <Button size="sm" disabled={saving} onClick={() => void save()}>
                  {unlocked ? 'Save macros again' : 'Unlock and save again…'}
                </Button>
              </span>
            </Notice>
          )}
          <Uses
            code={macroKeycode(index)}
            name={macroName}
            hint={unsavedHint(macroName, saved.length === 0, dirty)}
            howTo={`Or, on the Keys page, click a key and pick “${macroName}” under Macros.`}
          />
        </header>

        <section aria-label="Steps" className="flex flex-col gap-2">
          <h3 className="flex items-center gap-1 font-medium">
            Steps
            <HelpButton topic="macros" />
          </h3>
          {steps.length === 0 ? (
            <p className="text-[13px] text-muted">
              This macro is empty. Add what it should do, one step at a time, or record it as you type.
            </p>
          ) : (
            <ol className="flex flex-col gap-2">
              {steps.map((step, i) => (
                <StepRow
                  // A step's identity is its place; reordering moves the contents.
                  key={`${i}:${step.kind}`}
                  step={step}
                  index={i}
                  count={steps.length}
                  vialProtocol={kb.vialProtocol}
                  picking={picking === i}
                  onChange={(next) => edit(steps.map((s, j) => (j === i ? next : s)))}
                  onMove={(by) => move(i, by)}
                  onRemove={() => {
                    setPicking(null)
                    edit(steps.filter((_, j) => j !== i))
                  }}
                />
              ))}
            </ol>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <AddButton icon={<Type size={14} aria-hidden />} onClick={() => add({ kind: 'text', text: '' })}>
              {STEP_NAMES.text}
            </AddButton>
            <AddButton icon={<Plus size={14} aria-hidden />} onClick={() => add({ kind: 'tap', key: 0 })}>
              {STEP_NAMES.tap}
            </AddButton>
            <AddButton icon={<Clock size={14} aria-hidden />} onClick={() => add({ kind: 'wait', ms: 100 })}>
              {STEP_NAMES.wait}
            </AddButton>
          </div>
          <Disclosure id="macro-hold" label="More options">
            <div className="flex flex-col gap-2">
              <p className="flex items-start gap-1 text-[13px] text-muted">
                <span>
                  Hold a key down and let it go later, for keys that must stay held while others are pressed: Alt held
                  through several Tabs, or Shift held while clicking. Every key held should be let go again before the
                  macro ends.
                </span>
                <HelpButton topic="macro-hold" />
              </p>
              <div className="flex flex-wrap gap-2">
                <AddButton icon={<Plus size={14} aria-hidden />} onClick={() => add({ kind: 'down', key: 0 })}>
                  {STEP_NAMES.down}
                </AddButton>
                <AddButton icon={<Plus size={14} aria-hidden />} onClick={() => add({ kind: 'up', key: 0 })}>
                  {STEP_NAMES.up}
                </AddButton>
              </div>
            </div>
          </Disclosure>
        </section>

        <Recorder onRecorded={(recorded) => edit([...steps, ...recorded])} />

        <p className={cx('border-t border-edge pt-4 text-[13px]', fit.buffer ? 'text-muted' : 'text-danger')}>
          {space}
        </p>
      </div>
    </Card>
  )
}
