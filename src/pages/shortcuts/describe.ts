// SPDX-License-Identifier: GPL-3.0-or-later
// Macros in words: a one-line summary for the list, and what each kind of step is called.

import {
  chordKeys,
  keycodeShortName,
  modsText,
  REPEAT_OPTIONS,
  type AltRepeatKeyEntry,
  type AnyEntry,
  type ComboEntry,
  type EntryKind,
  type KeyOverrideEntry,
  type MacroStep,
  type TapDanceEntry,
} from '../../device'
import type { HelpTopicId } from '../../help/topics'

/** "0.05 s", "1.5 s" */
export const formatWait = (ms: number): string => `${Number((ms / 1000).toFixed(3))} s`

const quote = (text: string, max: number) => `“${text.length > max ? `${text.slice(0, max - 1)}…` : text}”`

/** One step in a few words, lower case: "types “hi”", "Ctrl + C", "holds Shift", "waits 0.3 s". */
export function stepWords(step: MacroStep): string {
  switch (step.kind) {
    case 'text':
      return `types ${quote(step.text, 28)}`
    case 'tap':
      return step.key ? keycodeShortName(step.key) : 'a key not picked yet'
    case 'down':
      return `holds ${step.key ? keycodeShortName(step.key) : 'a key'}`
    case 'up':
      return `lets go of ${step.key ? keycodeShortName(step.key) : 'a key'}`
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

// --- The other kinds ---------------------------------------------------------------------------------------------

export interface KindInfo {
  /** "Key chords" */
  name: string
  /** "Key chord" */
  one: string
  /** What QMK calls them: "Combos" */
  qmk: string
  /** What QMK calls one of them, beside the one being edited: "Combo" */
  qmkOne: string
  /** One sentence: what they are for. */
  what: string
  help: HelpTopicId
}

export const KINDS: Record<EntryKind, KindInfo> = {
  tapDance: {
    name: 'Multi-tap keys',
    one: 'Multi-tap key',
    qmk: 'Tap dance',
    qmkOne: 'Tap dance',
    what: 'One key, different things for a tap, a hold, a double tap.',
    help: 'tap-dance',
  },
  combo: {
    name: 'Key chords',
    one: 'Key chord',
    qmk: 'Combos',
    qmkOne: 'Combo',
    what: 'Press keys together to get something else.',
    help: 'combos',
  },
  keyOverride: {
    name: 'Shortcut replacements',
    one: 'Shortcut replacement',
    qmk: 'Key overrides',
    qmkOne: 'Key override',
    what: 'A key with modifiers held sends something else.',
    help: 'key-overrides',
  },
  altRepeatKey: {
    name: 'Repeat rules',
    one: 'Repeat rule',
    qmk: 'Alt repeat',
    qmkOne: 'Alt repeat',
    what: 'What the alternate repeat key sends after a given key.',
    help: 'alt-repeat',
  },
}

// Keys in a summary are named as the picture and the palette show them (device/keycodes.ts).
const title = (code: number) => (code ? keycodeShortName(code) : '…')

/** One entry in one line: "J + K together → Escape", "Shift + Backspace → Delete". */
export function summarizeEntry(kind: EntryKind, entry: AnyEntry): string {
  switch (kind) {
    case 'combo': {
      const e = entry as ComboEntry
      return `${chordKeys(e).map(title).join(' + ') || '…'} together → ${title(e.output)}`
    }
    case 'tapDance': {
      const e = entry as TapDanceEntry
      const parts = [
        e.onTap && `Tap: ${title(e.onTap)}`,
        e.onHold && `Hold: ${title(e.onHold)}`,
        e.onDoubleTap && `Double tap: ${title(e.onDoubleTap)}`,
        e.onTapHold && `Tap, then hold: ${title(e.onTapHold)}`,
      ].filter(Boolean)
      return parts.join(' · ') || 'Nothing yet'
    }
    case 'keyOverride': {
      const e = entry as KeyOverrideEntry
      const mods = modsText(e.triggerMods)
      return `${mods ? `${mods} + ` : ''}${title(e.triggerKey)} → ${title(e.replacementKey)}${e.enabled ? '' : ' (off)'}`
    }
    case 'altRepeatKey': {
      const e = entry as AltRepeatKeyEntry
      const both = e.options & REPEAT_OPTIONS.bidirectional ? ', and back' : ''
      return `After ${title(e.lastKey)} → ${title(e.altKey)}${both}${e.enabled ? '' : ' (off)'}`
    }
  }
}

/** "Room for about 820 more characters" */
export const roomText = (free: number): string =>
  free <= 0 ? 'No room left' : `Room for about ${free} more character${free === 1 ? '' : 's'}`
