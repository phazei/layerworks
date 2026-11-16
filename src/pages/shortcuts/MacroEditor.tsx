// SPDX-License-Identifier: GPL-3.0-or-later
// One macro, edited as a draft: its name, the keys that run it, its steps, the space it takes, and "Save to
// keyboard". Nothing reaches the keyboard until it is saved, and saving needs the keyboard unlocked.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CircleCheck, CircleDot, Clock, Keyboard, Lock, Plus, Type } from 'lucide-react'
import {
  deviceStore,
  encodeMacro,
  keycodeName,
  macroUses,
  rawMacros,
  readMacros,
  replaceMacro,
  sameSteps,
  stepProblem,
  useDevice,
  type MacroSaveResult,
  type MacroStep,
  type Slot,
} from '../../device'
import { defaultMacroName, renameMacro, useConnectedLayerNames, useStoredMacroNames } from '../../shell/layer-names'
import { navigate } from '../../shell/router'
import { stage } from '../../shell/stage-store'
import { openUnlock } from '../../shell/unlock-dialog'
import { Button, cx, TextInput } from '../../ui/controls'
import { Card, Disclosure, HelpButton, Notice } from '../../ui/layout'
import { STEP_NAMES } from './describe'
import { draftOf, setDraft, useDrafts } from './drafts'
import { roomText } from './MacroList'
import { Recorder } from './Recorder'
import { StepRow } from './StepRow'

const UNLOCK_REASON = 'The keyboard only takes macro changes while it is unlocked.'

const SAVE_PROBLEMS: Partial<Record<MacroSaveResult, string>> = {
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
        if (text !== null) renameMacro(uid, index, text)
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

/** Where the macro is on the keyboard; a click shows that key on the Keys page. */
function Uses({ index }: { index: number }) {
  const kb = useDevice((s) => s.keyboard)
  const layer = useDevice((s) => s.layer)
  const layerNames = useConnectedLayerNames()
  if (!kb) return null
  const uses = macroUses(kb, index)
  const base = layer?.base ?? 0
  const open = (slot: Slot) => {
    stage.showLayer(slot.layer)
    stage.select(slot.kind === 'key' ? { kind: 'key', row: slot.row, col: slot.col } : { kind: 'knob', knob: slot.knob, direction: slot.direction })
    navigate('/keys')
  }
  const where = (slot: Slot) =>
    slot.kind === 'key'
      ? `the ${keycodeName(kb.keymap[`${base},${slot.row},${slot.col}`] ?? 0) || 'unlabelled'} key`
      : `the knob turned ${slot.direction === 0 ? 'left' : 'right'}`

  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="flex items-center gap-1.5 text-[13px] font-medium text-muted">
        <Keyboard size={14} aria-hidden />
        Runs when you press
      </h3>
      {uses.length === 0 ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[13px] text-muted">
            No key runs it yet. On the Keys page, click a key and pick “{defaultMacroName(index)}” under Macros.
          </span>
          <Button size="sm" onClick={() => navigate('/keys')}>
            Put it on a key…
          </Button>
        </div>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {uses.map((slot) => (
            <li key={`${slot.layer}:${slot.kind === 'key' ? `${slot.row},${slot.col}` : `k${slot.knob},${slot.direction}`}`}>
              <button
                type="button"
                onClick={() => open(slot)}
                className="cursor-pointer rounded-pill border border-edge bg-raised px-3 py-1 text-[13px] hover:border-accent hover:text-accent"
              >
                {layerNames[slot.layer] ?? `Layer ${slot.layer}`}: {where(slot)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
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
    const sample = new URLSearchParams(location.search).get('macro-draft')
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
  const [picking, setPicking] = useState<number | null>(null)
  const [result, setResult] = useState<MacroSaveResult | null>(null)
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
    ? `This macro takes ${bytes.length + 1} bytes. ${roomText(free)} for all macros together.`
    : `Too long by ${fit.overflow} bytes: all ${kb.macroCount} macros share ${kb.macroBytes} bytes. Shorten this one or another.`

  const save = async () => {
    if (!unlocked) {
      openUnlock(UNLOCK_REASON)
      return
    }
    setSaving(true)
    const outcome = await deviceStore.saveMacro(index, steps)
    setSaving(false)
    setResult(outcome)
    if (outcome === 'saved' || outcome === 'unchanged') setDraft(kb.uid, index, null)
  }

  return (
    <Card>
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <NameField key={`${kb.uid}:${index}`} uid={kb.uid} index={index} />
            <span className="font-mono text-[13px] text-muted">M{index}</span>
            <span className="ml-auto flex items-center gap-1.5 text-[13px]" role="status">
              {dirty ? (
                <>
                  <CircleDot size={14} aria-hidden className="text-warning" />
                  <span>Not saved yet</span>
                </>
              ) : (
                <>
                  <CircleCheck size={14} aria-hidden className="text-success" />
                  <span className="text-muted">{result === 'saved' ? 'Saved to the keyboard' : 'As on the keyboard'}</span>
                </>
              )}
            </span>
          </div>
          {(dirty || (result !== null && SAVE_PROBLEMS[result])) && (
            <SaveBar
              dirty={dirty}
              unlocked={unlocked}
              saving={saving}
              problems={problems}
              fits={fit.buffer !== null}
              space={space}
              result={result}
              onSave={() => void save()}
              onRevert={() => edit(saved)}
            />
          )}
          <Uses index={index} />
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

/** Save and Revert, with what stands in the way of saving. At the top, so they are in view however long the macro. */
function SaveBar({ dirty, unlocked, saving, problems, fits, space, result, onSave, onRevert }: {
  dirty: boolean
  unlocked: boolean
  saving: boolean
  problems: number
  fits: boolean
  space: string
  result: MacroSaveResult | null
  onSave: () => void
  onRevert: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          icon={unlocked ? undefined : <Lock size={14} aria-hidden />}
          disabled={!dirty || saving || problems > 0 || !fits}
          onClick={onSave}
        >
          {unlocked ? 'Save to keyboard' : 'Unlock and save…'}
        </Button>
        <Button variant="quiet" disabled={!dirty || saving} onClick={onRevert}>
          Revert
        </Button>
        <span className="text-[13px] text-muted">
          {problems > 0
            ? `${problems} step${problems === 1 ? '' : 's'} to fix before saving.`
            : dirty
              ? 'Undo, in the bar at the bottom, takes a saved macro back.'
              : ''}
        </span>
      </div>
      {!fits && <Notice tone="danger">{space}</Notice>}
      {result && SAVE_PROBLEMS[result] && <Notice tone="danger">{SAVE_PROBLEMS[result]}</Notice>}
      {!unlocked && dirty && (
        <Notice>
          <span className="flex items-start gap-2">
            <Lock size={14} aria-hidden className="mt-0.5 shrink-0" />
            <span>
              Saving needs the keyboard unlocked: it only takes macro changes then. Your changes stay here until you
              save or revert, even if you go to another page.
              <HelpButton topic="macro-unlock" />
            </span>
          </span>
        </Notice>
      )}
    </div>
  )
}
