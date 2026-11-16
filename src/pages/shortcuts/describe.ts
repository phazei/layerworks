// SPDX-License-Identifier: GPL-3.0-or-later
// Macros in words: a one-line summary for the list, and what each kind of step is called.

import { keycodeTitle, type MacroStep } from '../../device'

/** "0.05 s", "1.5 s" */
export const formatWait = (ms: number): string => `${Number((ms / 1000).toFixed(3))} s`

const quote = (text: string, max: number) => `“${text.length > max ? `${text.slice(0, max - 1)}…` : text}”`

/** One step in a few words, lower case: "types “hi”", "Ctrl + C", "holds Shift", "waits 0.3 s". */
export function stepWords(step: MacroStep): string {
  switch (step.kind) {
    case 'text':
      return `types ${quote(step.text, 28)}`
    case 'tap':
      return step.key ? keycodeTitle(step.key) : 'a key not picked yet'
    case 'down':
      return `holds ${step.key ? keycodeTitle(step.key) : 'a key'}`
    case 'up':
      return `lets go of ${step.key ? keycodeTitle(step.key) : 'a key'}`
    case 'wait':
      return `waits ${formatWait(step.ms)}`
  }
}

/** The whole macro in one line: "Types “hello@example.com”", "Ctrl + A, waits 0.05 s, Ctrl + C". */
export function summarize(steps: MacroStep[], maxSteps = 4): string {
  if (steps.length === 0) return 'Empty'
  const words = steps.slice(0, maxSteps).map(stepWords)
  const line = words.join(', ') + (steps.length > maxSteps ? ', …' : '')
  return line.charAt(0).toUpperCase() + line.slice(1)
}

/** What each kind of step is called where it is added and shown. */
export const STEP_NAMES: Record<MacroStep['kind'], string> = {
  text: 'Type text',
  tap: 'Tap a key',
  down: 'Hold a key down',
  up: 'Let a key go',
  wait: 'Wait',
}
