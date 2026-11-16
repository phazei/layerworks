// SPDX-License-Identifier: GPL-3.0-or-later
// The Help page as a guide: the topics in groups that follow the app, each in reading order. Every topic belongs to
// exactly one group (a test checks). The glossary is its own view, listed after the last group.

import { HELP_TOPICS, type HelpTopicId } from './topics'

export type GuideGroupId = 'start' | 'keys' | 'shortcuts' | 'lighting' | 'typing' | 'testing' | 'device' | 'words'

export interface GuideGroup {
  id: GuideGroupId
  title: string
  /** One line on what the group covers. */
  description: string
  topics: HelpTopicId[]
}

export const GUIDE: GuideGroup[] = [
  {
    id: 'start',
    title: 'Getting started',
    description: 'What the app does, connecting, the picture and layers, your first change, and how to take it back.',
    topics: ['welcome', 'connecting', 'demo', 'layers', 'live-layer', 'assign-key', 'undo', 'saving', 'unlock'],
  },
  {
    id: 'keys',
    title: 'Keys and layers',
    description: 'Everything a key or a knob turn can do, from a plain letter to a key that is Esc when tapped and Ctrl when held.',
    topics: [
      'key-palette',
      'shortcut-key',
      'layer-key',
      'tap-hold',
      'mod-tap',
      'layer-tap',
      'one-shot-mod',
      'layer-mod',
      'transparent',
      'nothing',
      'knob',
      'raw-code',
      'layer-names',
      'caps-word',
      'layer-lock',
      'helper-keys',
      'magic-keys',
      'international-keys',
      'switch-keys',
      'restart-keys',
      'left-out-keys',
    ],
  },
  {
    id: 'shortcuts',
    title: 'Shortcuts and macros',
    description: 'Keys that type text, do something else on a double tap, or fire when pressed together.',
    topics: [
      'macros',
      'macro-record',
      'macro-wait',
      'macro-hold',
      'macro-unlock',
      'shortcut-drafts',
      'tap-dance',
      'tapping-term',
      'combos',
      'key-overrides',
      'override-modifiers',
      'override-options',
      'alt-repeat',
      'repeat-options',
    ],
  },
  {
    id: 'lighting',
    title: 'Lighting',
    description: 'Effects, brightness, speed and colour, a colour for each key, and zones.',
    topics: [
      'lighting-effect',
      'lighting-on',
      'lighting-brightness',
      'lighting-speed',
      'lighting-colour',
      'key-colours',
      'key-style',
      'lighting-zones',
    ],
  },
  {
    id: 'typing',
    title: 'Typing feel',
    description: 'How long counts as a hold, chord timing, capitals by holding, mouse keys, swapped keys and more.',
    topics: [
      'typing-feel',
      'typing-tap-hold',
      'typing-hold-decision',
      'typing-chords',
      'typing-auto-shift',
      'typing-one-shot',
      'typing-mouse-keys',
      'typing-magic',
      'typing-debounce',
      'typing-snap-click',
      'typing-grave-esc',
      'typing-reset',
    ],
  },
  {
    id: 'testing',
    title: 'Testing',
    description: 'Checking that every key and the knob work.',
    topics: ['test-keys', 'test-knob'],
  },
  {
    id: 'device',
    title: 'Backing up and the keyboard',
    description: 'Backups, restoring, Vial files, the sleep timers, and what the keyboard says about itself.',
    topics: ['backup', 'restore', 'vial-file', 'keyboard-info', 'keyboard-features', 'lights-off-timer', 'sleep-timer'],
  },
  {
    id: 'words',
    title: 'Firmware and QMK words',
    description: 'What the firmware is, and the names other apps and guides use for the same things.',
    topics: ['firmware', 'qmk-names'],
  },
]

/**
 * Topics no control in the app opens: they are read on the Help page (or reached from another topic). Every other
 * topic is behind a "?" somewhere, which a test checks.
 */
export const GUIDE_ONLY: ReadonlySet<HelpTopicId> = new Set<HelpTopicId>(['caps-word', 'layer-lock', 'qmk-names'])

/** Every topic in reading order: the groups one after another. */
export const READING_ORDER: HelpTopicId[] = GUIDE.flatMap((group) => group.topics)

const GROUP_OF = new Map<HelpTopicId, GuideGroup>(GUIDE.flatMap((group) => group.topics.map((id) => [id, group] as const)))

export function groupOf(id: HelpTopicId): GuideGroup {
  return GROUP_OF.get(id) ?? GUIDE[0]
}

/** The topics before and after one in reading order. */
export function neighbours(id: HelpTopicId): { previous: HelpTopicId | null; next: HelpTopicId | null } {
  const at = READING_ORDER.indexOf(id)
  return {
    previous: at > 0 ? READING_ORDER[at - 1] : null,
    next: at >= 0 && at < READING_ORDER.length - 1 ? READING_ORDER[at + 1] : null,
  }
}

/** A topic's related topics that exist, without itself. */
export function relatedTopics(id: HelpTopicId): HelpTopicId[] {
  return (HELP_TOPICS[id].related ?? []).filter((other): other is HelpTopicId => other !== id && Object.hasOwn(HELP_TOPICS, other))
}

/** The Help page's address for a topic. */
export const topicHref = (id: HelpTopicId): string => `#/help/${id}`
export const GLOSSARY_HREF = '#/help/glossary'
