// SPDX-License-Identifier: GPL-3.0-or-later
// When a typing setting does nothing because of another one, and finding settings by words.

import { fieldsOf, fieldSearchText, flagOn, type SettingField, type SettingValues } from '../../device'

const field = (qsid: number, key: string) => fieldsOf(qsid).find((f) => f.key === key)

/** Whether the switch `key` of setting `qsid` is on; true when the keyboard doesn't report it (no reason to grey out). */
function isOn(values: SettingValues, qsid: number, key: string): boolean {
  const f = field(qsid, key)
  return f === undefined || values[qsid] === undefined || flagOn(f, values[qsid])
}

/** Why a setting has no effect as things are, to show under it with the control greyed out; null when it has. */
export function inactiveReason(f: SettingField, values: SettingValues): string | null {
  if (f.group === 'autoShift' && f.key !== 'auto-shift' && !isOn(values, 3, 'auto-shift')) {
    return 'Turn on “Hold for capitals” first.'
  }
  if (f.key === 'auto-shift-no-auto-repeat' && !isOn(values, 3, 'auto-shift-repeat')) {
    return 'Only with “Held keys repeat” on.'
  }
  return null
}

/** Whether every word of the search is somewhere in the text. An empty search matches everything. */
export function matches(query: string, text: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const haystack = text.toLowerCase()
  return words.every((word) => haystack.includes(word))
}

export const fieldMatches = (query: string, f: SettingField): boolean => matches(query, fieldSearchText(f))
