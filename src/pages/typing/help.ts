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

/** By `SettingField.key`. */
export const FIELD_HELP: Partial<Record<string, HelpTopicId>> = {
  'tapping-term': 'typing-tap-hold',
  'permissive-hold': 'typing-hold-decision',
  'hold-on-other-key': 'typing-hold-decision',
  'chordal-hold': 'typing-hold-decision',
}
