// SPDX-License-Identifier: GPL-3.0-or-later
// Which help topic explains each group of typing settings, and the single settings that need more than their hint.

import type { SettingGroupId } from '../../device'
import type { HelpTopicId } from '../../help/topics'

export const GROUP_HELP: Record<SettingGroupId, HelpTopicId> = {
  tapHold: 'typing-tap-hold',
  chords: 'typing-chords',
  autoShift: 'typing-auto-shift',
  oneShot: 'typing-one-shot',
  mouse: 'typing-mouse-keys',
  magic: 'typing-magic',
  graveEsc: 'typing-grave-esc',
}

/**
 * By `SettingField.key`: settings explained by a topic other than their card's. Every other setting is explained by
 * its card's topic (GROUP_HELP), so each one has help (a test checks).
 */
export const FIELD_HELP: Partial<Record<string, HelpTopicId>> = {
  'tapping-term': 'typing-tap-hold',
  'permissive-hold': 'typing-hold-decision',
  'hold-on-other-key': 'typing-hold-decision',
  'chordal-hold': 'typing-hold-decision',
  'legacy-permissive-hold': 'typing-hold-decision',
  'retro-tapping': 'typing-tap-hold-more',
  'quick-tap-term': 'typing-tap-hold-more',
  'flow-tap': 'typing-tap-hold-more',
  'tapping-toggle': 'typing-tap-hold-more',
  'tap-hold-caps-delay': 'typing-tap-hold-more',
  'tap-code-delay': 'typing-tap-hold-more',
  'legacy-ignore-interrupt': 'typing-tap-hold-more',
  'legacy-force-hold': 'typing-tap-hold-more',
  'legacy-retro-tapping': 'typing-tap-hold-more',
}
