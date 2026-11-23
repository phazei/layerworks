// SPDX-License-Identifier: GPL-3.0-or-later
// Which keys are held, as far as the browser can tell. The browser sees the keys the PC receives (not Fn or
// layer keys), and only while this window has focus; it needs no unlock. Each key event is mapped back through
// the keymap to the positions that send it.

import { useEffect, useState } from 'react'
import { KC_SAME_AS_BELOW, keycodeId, parseKeycode, posKey, readShortcut, type KeyboardData, type LayerState } from '../device'

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
 * KeyboardEvent.code → QMK name for the media and browser keys, which aren't keyboard usages (they travel as
 * consumer controls) but reach the page as key events all the same. Older browsers name the volume keys without
 * "Audio".
 */
const MEDIA_KEYS: Record<string, string> = {
  AudioVolumeMute: 'KC_MUTE', AudioVolumeUp: 'KC_VOLU', AudioVolumeDown: 'KC_VOLD', VolumeMute: 'KC_MUTE',
  VolumeUp: 'KC_VOLU', VolumeDown: 'KC_VOLD', MediaTrackNext: 'KC_MNXT', MediaTrackPrevious: 'KC_MPRV',
  MediaStop: 'KC_MSTP', MediaPlayPause: 'KC_MPLY', MediaSelect: 'KC_MSEL', BrowserBack: 'KC_WBAK',
  BrowserForward: 'KC_WFWD', BrowserRefresh: 'KC_WREF', BrowserStop: 'KC_WSTP', BrowserSearch: 'KC_WSCH',
  BrowserHome: 'KC_WHOM', BrowserFavorites: 'KC_WFAV', LaunchMail: 'KC_MAIL', LaunchApp1: 'KC_MYCM',
  LaunchApp2: 'KC_CALC',
}

/** The QMK keycode a browser key event stands for: a basic key or a media key. Needs the keyboard loaded. */
export function keycodeOfEvent(code: string): number | undefined {
  const usage = usageOf(code)
  if (usage !== undefined) return usage
  const id = MEDIA_KEYS[code]
  return id ? (parseKeycode(id) ?? undefined) : undefined
}

export type WheelDirection = 'up' | 'down' | 'left' | 'right'

const WHEEL_KEYS: Record<string, WheelDirection> = { KC_WH_U: 'up', KC_WH_D: 'down', KC_WH_L: 'left', KC_WH_R: 'right' }

/**
 * How the page hears a keycode, if at all: as a key event (a basic or media key, alone or with modifiers, which
 * arrives as its key) or as the mouse wheel. null for everything else: layer keys, lighting, macros ...
 */
export function howHeard(code: number): { key: number } | { wheel: WheelDirection } | null {
  const wheel = WHEEL_KEYS[keycodeId(code)]
  if (wheel) return { wheel }
  const key = readShortcut(code)?.key ?? code
  const known = Object.values(HID_USAGE).includes(key) || Object.values(MEDIA_KEYS).includes(keycodeId(key))
  return known ? { key } : null
}

/** A browser event that a keycode would cause, for the demo keyboard to pretend a knob turn: null if none. */
export function browserEventFor(code: number): KeyboardEvent | WheelEvent | null {
  const heard = howHeard(code)
  if (!heard) return null
  if ('wheel' in heard) {
    const step = heard.wheel === 'up' || heard.wheel === 'left' ? -100 : 100
    return new WheelEvent('wheel', heard.wheel === 'up' || heard.wheel === 'down' ? { deltaY: step } : { deltaX: step })
  }
  const id = keycodeId(heard.key)
  const name =
    Object.keys(HID_USAGE).find((name) => HID_USAGE[name] === heard.key) ??
    Object.keys(MEDIA_KEYS).find((name) => MEDIA_KEYS[name] === id && name.startsWith('Audio')) ??
    Object.keys(MEDIA_KEYS).find((name) => MEDIA_KEYS[name] === id)
  return name ? new KeyboardEvent('keydown', { code: name, key: name }) : null
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

/**
 * Compatibility: only Keychron's firmware reports its layer (the `0xA3` command and push, vial-qmk
 * keyboards/keychron/common/keychron_raw_hid.c); every other Vial keyboard answers "unknown command" (quantum/via.c,
 * raw_hid_receive_kb), and the store's `layer` is null. Whether there is a layer to follow is decided here.
 */
export const reportsLayer = (live: LayerState | null): live is LayerState => live !== null

/**
 * The layer to work keys out on for a keyboard that doesn't report its layer (see reportsLayer): layer 0, the one it
 * starts on. One object, so hooks given it don't start over on every render.
 */
export const NO_LAYER: LayerState = { base: 0, held: 0, active: 0 }

/**
 * "row,col" of the keys the browser currently sees held. Empty without a keyboard or a layer; pass NO_LAYER for a
 * keyboard that doesn't report its layer.
 */
export function usePressedKeys(keyboard: KeyboardData | null, layer: LayerState | null): Set<string> {
  const [pressed, setPressed] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    if (!keyboard || !layer) return
    const held = new Map<string, string[]>()
    const publish = () => setPressed(new Set([...held.values()].flat()))

    const down = (event: KeyboardEvent) => {
      const keycode = keycodeOfEvent(event.code)
      if (keycode === undefined || event.repeat || typingInField(event.target)) return
      held.set(event.code, positionsSending(keyboard, layer, keycode))
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

/** A knob direction as the keyboard picture names it: "knob,direction" (0 counter-clockwise, 1 clockwise). */
export const knobPos = (knob: number, direction: 0 | 1): string => `${knob},${direction}`

/** Every knob direction of the keyboard, by the knobs' own numbers (KeyboardData.knobIndices). */
export function knobDirections(keyboard: KeyboardData): string[] {
  return keyboard.knobIndices.flatMap((knob) => [knobPos(knob, 0), knobPos(knob, 1)])
}

/** What a knob direction ("knob,direction") sends with the layers as they are; nothing of its own falls to the base. */
export function knobKeycode(keyboard: KeyboardData, layer: LayerState, position: string): number {
  const code = keyboard.knobs[`${layer.active},${position}`] ?? 0
  return code === KC_SAME_AS_BELOW ? (keyboard.knobs[`${layer.base},${position}`] ?? 0) : code
}

/** How long a knob direction stays lit after a turn: a turn is a tap, too short to see otherwise. */
export const KNOB_FLASH_MS = 250

/**
 * Knob directions ("knob,direction") turned just now, as far as the browser can tell: what a direction sends on
 * the active layer arrived as a key event or a mouse wheel movement. Each stays in the set for KNOB_FLASH_MS.
 * Ordinary mouse scrolling counts too where the knob scrolls; the browser can't tell the two apart.
 */
export function useKnobTurns(keyboard: KeyboardData | null, layer: LayerState | null): ReadonlySet<string> {
  const [lit, setLit] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => {
    if (!keyboard || !layer || keyboard.knobCount === 0) return
    const timers = new Map<string, ReturnType<typeof setTimeout>>()
    const publish = () => setLit(new Set(timers.keys()))
    const light = (matches: (heard: NonNullable<ReturnType<typeof howHeard>>) => boolean) => {
      const turned = knobDirections(keyboard).filter((position) => {
        const heard = howHeard(knobKeycode(keyboard, layer, position))
        return heard !== null && matches(heard)
      })
      if (turned.length === 0) return
      for (const position of turned) {
        clearTimeout(timers.get(position))
        timers.set(
          position,
          setTimeout(() => {
            timers.delete(position)
            publish()
          }, KNOB_FLASH_MS),
        )
      }
      publish()
    }

    const down = (event: KeyboardEvent) => {
      const keycode = keycodeOfEvent(event.code)
      if (keycode === undefined || typingInField(event.target)) return
      light((heard) => 'key' in heard && heard.key === keycode)
    }
    const wheel = (event: WheelEvent) => {
      const vertical = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
      const delta = vertical ? event.deltaY : event.deltaX
      if (delta === 0) return
      const direction: WheelDirection = vertical ? (delta < 0 ? 'up' : 'down') : delta < 0 ? 'left' : 'right'
      light((heard) => 'wheel' in heard && heard.wheel === direction)
    }

    window.addEventListener('keydown', down)
    window.addEventListener('wheel', wheel, { passive: true })
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('wheel', wheel)
      for (const timer of timers.values()) clearTimeout(timer)
      setLit(new Set())
    }
  }, [keyboard, layer])

  return lit
}