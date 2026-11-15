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

export const openHelp = (topic: HelpTopicId) => set(topic)
export const closeHelp = () => set(null)

export function useHelpTopic(): HelpTopicId | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
}
