// SPDX-License-Identifier: GPL-3.0-or-later
// Which help topic the side panel is showing, if any.

import { useSyncExternalStore } from 'react'
import type { HelpTopicId } from './topics'

let current: HelpTopicId | null = null
const listeners = new Set<() => void>()

function set(topic: HelpTopicId | null): void {
  current = topic
  for (const listener of [...listeners]) listener()
}

/** The help panel's element id, for the "?" buttons' aria-controls. */
export const HELP_PANEL_ID = 'help-panel'

export const openHelp = (topic: HelpTopicId) => set(topic)
export const closeHelp = () => set(null)
/** A "?" pressed: opens its topic, or closes the panel when it already shows that topic. */
export const toggleHelp = (topic: HelpTopicId) => set(current === topic ? null : topic)
export const helpTopic = (): HelpTopicId | null => current

export function useHelpTopic(): HelpTopicId | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
}
