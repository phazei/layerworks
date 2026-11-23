// SPDX-License-Identifier: GPL-3.0-or-later
// Ctrl + Z undoes, Ctrl + Y and Ctrl + Shift + Z redo (Cmd on a Mac), exactly as the status line's Undo and Redo
// buttons do. Stays out of the way of everything else that wants those keys: a field's own undo, an open dialog,
// a page that is listening to keys (Test, "Press a key", macro recording).

import { useEffect } from 'react'
import { deviceStore } from '../device'

/** Whether the computer is a Mac, where Cmd takes Ctrl's place in shortcuts. */
export const onMac = (): boolean => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)

/** The shortcuts as the buttons say them: "Ctrl + Z", or "Cmd + Z" on a Mac. */
export function undoShortcuts(mac = onMac()): { undo: string; redo: string } {
  const mod = mac ? 'Cmd' : 'Ctrl'
  return { undo: `${mod} + Z`, redo: mac ? `${mod} + Shift + Z` : `${mod} + Y` }
}

/** Input types where Ctrl + Z belongs to the browser's own undo of typed text. */
const NOT_TEXT = new Set(['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'color', 'file', 'image'])

/** Whether the element takes typing, so the browser's own undo must keep working there. */
export function takesTyping(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  if (target.closest('textarea, select, [contenteditable]:not([contenteditable="false"])')) return true
  return target instanceof HTMLInputElement && !NOT_TEXT.has(target.type)
}

/** Pages listening to keys hold the shortcuts off while they do; each `hold` returns its own release. */
let holds = 0
export function holdUndoKeys(): () => void {
  holds += 1
  let released = false
  return () => {
    if (released) return
    released = true
    holds -= 1
  }
}

/** What a key press asks for, before asking whether it may: undo, redo, or nothing. */
export function undoKeyAction(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>, mac = onMac()): 'undo' | 'redo' | null {
  const mod = mac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey
  if (!mod || event.altKey) return null
  const key = event.key.toLowerCase()
  if (key === 'z') return event.shiftKey ? 'redo' : 'undo'
  if (key === 'y' && !event.shiftKey) return 'redo'
  return null
}

/** Whether something modal is open: the unlock dialog, a confirmation, the tour. */
const dialogOpen = () => document.querySelector('dialog[open], [role="dialog"]') !== null

/** Listens for the shortcuts while mounted (the status line, which is there whenever a keyboard is). */
export function useUndoKeys(): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const action = undoKeyAction(event)
      if (!action || event.defaultPrevented || event.repeat) return
      if (holds > 0 || takesTyping(event.target) || dialogOpen()) return
      const state = deviceStore.getState()
      if (action === 'undo' ? !state.canUndo : !state.canRedo) return
      event.preventDefault()
      void (action === 'undo' ? deviceStore.undo() : deviceStore.redo())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
