// SPDX-License-Identifier: GPL-3.0-or-later
// Reading the keyboard's switch matrix: which physical keys are down, Fn and layer keys included. The firmware
// only answers while unlocked (locked, it sends the request back with every key up). Each read is a snapshot, so
// a quick tap can fall between two; the Test page adds the browser's own key events for that.

import { posKey } from '../vendor/pipette/shared/kle/pos-key'
import { visibleLayoutKeys } from './layout-options'
import type { LinkKind } from './link'
import type { KeyboardData } from './store'
import { TransportError, type Transport } from './transport'

const GET_KEYBOARD_VALUE = 0x02
const SWITCH_MATRIX_STATE = 0x03

export const matrixRequest = () => [GET_KEYBOARD_VALUE, SWITCH_MATRIX_STATE]

/**
 * Pause after each reply before the next read. Spec section 8: 20 ms on the cable (about 45 reads a second);
 * slower through the receiver, where every read is a radio round trip and keeps the keyboard awake.
 */
export const MATRIX_POLL_MS: Record<LinkKind, number> = { cable: 20, receiver: 60 }

/**
 * Compatibility: VIA's switch-matrix read fills its one 32-byte reply only where `(cols / 8 + 1) * rows <= 28`
 * (integer division; vial-qmk quantum/via.c, id_switch_matrix_state); a bigger matrix gets its request back with
 * nothing in it (e.g. era/sirind/klein_hs 10 × 16, bpiphany/frosty_flake 18 × 8, converter/adb_usb 16 × 8). There the
 * app never reads the matrix: the Test page and "Press a key" go by what the browser sees, and say why.
 */
export function matrixReadable(rows: number, cols: number): boolean {
  return (Math.floor(cols / 8) + 1) * rows <= 28
}

/** Said where reading every key would be offered, on a keyboard whose matrix is too big for it. */
export const MATRIX_TOO_BIG =
  'This keyboard has more switches than its firmware can report to an app in one go, so only keys the computer receives can be seen here: not Fn or layer keys.'

/** "row,col" of every key down in a switch-matrix reply: one big-endian bit field per row, after two bytes. */
export function parseMatrix(reply: Uint8Array, rows: number, cols: number): Set<string> {
  const bytesPerRow = Math.ceil(cols / 8)
  const down = new Set<string>()
  for (let row = 0; row < rows; row++) {
    let bits = 0
    for (let i = 0; i < bytesPerRow; i++) bits = bits * 256 + (reply[2 + row * bytesPerRow + i] ?? 0)
    for (let col = 0; col < cols; col++) if (Math.floor(bits / 2 ** col) % 2 === 1) down.add(posKey(row, col))
  }
  return down
}

/**
 * "row,col" of every physical key in the picture (not the knob's turns), each once: the keys of the chosen layout only
 * (./layout-options.ts), so a key that only an unchosen alternative has isn't counted.
 */
export function matrixKeys(keyboard: KeyboardData): string[] {
  const keys = visibleLayoutKeys(keyboard)
  return [...new Set(keys.filter((key) => key.encoderIdx < 0).map((key) => posKey(key.row, key.col)))]
}

export interface MatrixPoller {
  stop(): void
}

/**
 * Reads the matrix again and again through the queue, one read at a time, until stopped. Every read waits its
 * turn, so a held queue (unlock) simply pauses it. `onKeys` gets each new set of keys down, only when it changes.
 */
export function pollMatrix(
  transport: Transport,
  size: { rows: number; cols: number },
  onKeys: (down: ReadonlySet<string>) => void,
): MatrixPoller {
  const pause = MATRIX_POLL_MS[transport.link.kind]
  let running = true
  let last = ''

  void (async () => {
    while (running) {
      try {
        const reply = await transport.request(matrixRequest(), { attempts: 1 })
        if (!running) break
        const down = parseMatrix(reply, size.rows, size.cols)
        const key = [...down].sort().join(';')
        if (key !== last) {
          last = key
          onKeys(down)
        }
      } catch (error) {
        if (!(error instanceof TransportError) || error.reason === 'disconnected') break
      }
      await new Promise((resolve) => setTimeout(resolve, pause))
    }
  })()

  return {
    stop() {
      running = false
    },
  }
}
