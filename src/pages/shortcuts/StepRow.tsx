// SPDX-License-Identifier: GPL-3.0-or-later
// One step of a macro, edited in place: its text, its key or its wait, with buttons to move it and remove it.

import { useState } from 'react'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { keycodeName, keycodeTitle, MAX_WAIT_MS, MODIFIERS, readShortcut, stepProblem, type MacroStep } from '../../device'
import { Button, IconButton, OptionButton, TextInput } from '../../ui/controls'
import { KeyCap } from '../../ui/KeyTile'
import { HelpButton } from '../../ui/layout'
import { formatWait, STEP_NAMES } from './describe'
import { KeyPicker } from './KeyPicker'

const WAIT_CHOICES = [50, 100, 300, 500, 1000]

interface Props {
  step: MacroStep
  /** 0-based position, for labels. */
  index: number
  count: number
  vialProtocol: number
  /** Open the key picker straight away (a new key step). */
  picking?: boolean
  onChange: (step: MacroStep) => void
  onMove: (by: -1 | 1) => void
  onRemove: () => void
}

function WaitEditor({ ms, label, onChange }: { ms: number; label: string; onChange: (ms: number) => void }) {
  // The field keeps what is typed ("0." on the way to "0.5"); the step gets it once it is a number.
  const [text, setText] = useState(String(ms / 1000))
  const shown = text === '' || Math.round(Number(text) * 1000) === ms ? text : String(ms / 1000)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <TextInput
        type="number"
        min={0}
        max={MAX_WAIT_MS / 1000}
        step={0.05}
        aria-label={label}
        value={shown}
        onChange={(e) => {
          setText(e.target.value)
          const seconds = Number(e.target.value)
          if (e.target.value !== '' && Number.isFinite(seconds)) onChange(Math.round(seconds * 1000))
        }}
        className="w-24"
      />
      <span className="text-muted">seconds</span>
      <span className="flex flex-wrap gap-1">
        {WAIT_CHOICES.map((choice) => (
          <OptionButton key={choice} shape="chip" selected={ms === choice} onClick={() => onChange(choice)}>
            {formatWait(choice)}
          </OptionButton>
        ))}
      </span>
    </div>
  )
}

/** A key as keycaps: a shortcut's modifiers first, then its key. */
function Caps({ code }: { code: number }) {
  const shortcut = readShortcut(code)
  if (!shortcut) return <KeyCap label={keycodeName(code)} />
  return (
    <span className="flex items-center gap-1">
      {MODIFIERS.filter((m) => shortcut.mods & m.bit).map((m) => (
        <KeyCap key={m.bit} label={m.name} />
      ))}
      <KeyCap label={keycodeName(shortcut.key)} />
    </span>
  )
}

export function StepRow({ step, index, count, vialProtocol, picking = false, onChange, onMove, onRemove }: Props) {
  const [open, setOpen] = useState(picking)
  const problem = stepProblem(step, vialProtocol)
  const n = index + 1

  return (
    <li className="flex gap-3 rounded-control border border-edge p-3" aria-label={`Step ${n}: ${STEP_NAMES[step.kind]}`}>
      <span aria-hidden className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-pill bg-raised text-xs font-medium text-muted tabular-nums">
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex h-6 items-center gap-0.5 text-[13px] font-medium text-muted">
          {STEP_NAMES[step.kind]}
          {step.kind === 'wait' && <HelpButton topic="macro-wait" />}
          {(step.kind === 'down' || step.kind === 'up') && <HelpButton topic="macro-hold" />}
        </span>
        {step.kind === 'text' && (
          <TextInput
            aria-label={`Text to type, step ${n}`}
            value={step.text}
            placeholder="Text to type"
            onChange={(e) => onChange({ kind: 'text', text: e.target.value })}
            className="w-full"
          />
        )}
        {step.kind === 'wait' && (
          <WaitEditor ms={step.ms} label={`Seconds to wait, step ${n}`} onChange={(ms) => onChange({ kind: 'wait', ms })} />
        )}
        {(step.kind === 'tap' || step.kind === 'down' || step.kind === 'up') && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {step.key ? <Caps code={step.key} /> : null}
              <span className={step.key ? '' : 'text-muted italic'}>{step.key ? keycodeTitle(step.key) : 'No key picked yet'}</span>
              <Button size="sm" onClick={() => setOpen(!open)} aria-expanded={open}>
                {step.key ? 'Change key…' : 'Pick a key…'}
              </Button>
            </div>
            {open && (
              <KeyPicker
                current={step.key}
                shortcuts={step.kind === 'tap'}
                onPick={(key) => {
                  onChange({ ...step, key })
                  setOpen(false)
                }}
                onClose={() => setOpen(false)}
              />
            )}
          </>
        )}
        {problem && <p className="text-[13px] text-danger">{problem}</p>}
      </div>
      <div className="flex shrink-0 items-start">
        <IconButton label={`Move step ${n} up`} disabled={index === 0} onClick={() => onMove(-1)}>
          <ArrowUp size={15} />
        </IconButton>
        <IconButton label={`Move step ${n} down`} disabled={index === count - 1} onClick={() => onMove(1)}>
          <ArrowDown size={15} />
        </IconButton>
        <IconButton label={`Remove step ${n}`} onClick={onRemove}>
          <Trash2 size={15} />
        </IconButton>
      </div>
    </li>
  )
}
