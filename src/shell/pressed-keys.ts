// SPDX-License-Identifier: GPL-3.0-or-later
// Which keys are held, as far as the browser can tell. The browser sees the keys the PC receives (not Fn or
// layer keys), and only while this window has focus; it needs no unlock. Each key event is mapped back through
// the keymap to the positions that send it.

import { useEffect, useState } from 'react'
import { KC_SAME_AS_BELOW, posKey, type KeyboardData, type LayerState } from '../device'

/** KeyboardEvent.code → USB HID usage, which is also the QMK basic keycode. */
const HID_USAGE: Record<string, number> = {
  Enter: 0x28, Escape: 0x29, Backspace: 0x2a, Tab: 0x2b, Space: 0x2c, Minus: 0x2d, Equal: 0x2e, BracketLeft: 0x2f,
  BracketRight: 0x30, Backslash: 0x31, Semicolon: 0x33, Quote: 0x34, Backquote: 0x35, Comma: 0x36, Period: 0x37,
  Slash: 0x38, CapsLock: 0x39, PrintScreen: 0x46, ScrollLock: 0x47, Pause: 0x48, Insert: 0x49, Home: 0x4a,
  PageUp: 0x4b, Delete: 0x4c, End: 0x4d, PageDown: 0x4e, ArrowRight: 0x4f, ArrowLeft: 0x50, ArrowDown: 0x51,
  ArrowUp: 0x52, NumLock: 0x53, NumpadDivide: 0x54, NumpadMultiply: 0x55, NumpadSubtract: 0x56, NumpadAdd: 0x57,
  NumpadEnter: 0x58, NumpadDecimal: 0x63, ContextMenu: 0x65, ControlLeft: 0xe0, ShiftLeft: 0xe1, AltLeft: 0xe2,
  MetaLeft: 0xe3, ControlRight: 0xe4, ShiftRight: 0xe5, AltRight: 0xe6, MetaRight: 0xe7,
}
for (let i = 0; i < 26; i++) HID_USAGE[`Key${String.fromCharCode(65 + i)}`] = 0x04 + i
for (let i = 1; i <= 9; i++) HID_USAGE[`Digit${i}`] = 0x1d + i
HID_USAGE.Digit0 = 0x27
for (let i = 1; i <= 12; i++) HID_USAGE[`F${i}`] = 0x39 + i
for (let i = 1; i <= 9; i++) HID_USAGE[`Numpad${i}`] = 0x58 + i
HID_USAGE.Numpad0 = 0x62

export function usageOf(code: string): number | undefined {
  return HID_USAGE[code]
}

/**
 * Every position that sends `keycode` with the keyboard's layers as they are: a key with no assignment of its
 * own on the held layer falls through to the base layer.
 */
export function positionsSending(keyboard: KeyboardData, layer: LayerState, keycode: number): string[] {
  const positions: string[] = []
  for (let row = 0; row < keyboard.rows; row++) {
    for (let col = 0; col < keyboard.cols; col++) {
      let code = keyboard.keymap[`${layer.active},${row},${col}`] ?? 0
      if (code === KC_SAME_AS_BELOW) code = keyboard.keymap[`${layer.base},${row},${col}`] ?? 0
      if (code === keycode) positions.push(posKey(row, col))
    }
  }
  return positions
}

const typingInField = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

/** "row,col" of the keys the browser currently sees held. Empty when the keyboard doesn't report its layer. */
export function usePressedKeys(keyboard: KeyboardData | null, layer: LayerState | null): Set<string> {
  const [pressed, setPressed] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    if (!keyboard || !layer) return
    const held = new Map<string, string[]>()
    const publish = () => setPressed(new Set([...held.values()].flat()))

    const down = (event: KeyboardEvent) => {
      const usage = usageOf(event.code)
      if (usage === undefined || event.repeat || typingInField(event.target)) return
      held.set(event.code, positionsSending(keyboard, layer, usage))
      publish()
    }
    const up = (event: KeyboardEvent) => {
      if (held.delete(event.code)) publish()
    }
    const clear = () => {
      if (held.size === 0) return
      held.clear()
      publish()
    }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      clear()
    }
  }, [keyboard, layer])

  return pressed
}
