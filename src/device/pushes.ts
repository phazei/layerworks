// SPDX-License-Identifier: GPL-3.0-or-later
// Reports the keyboard sends without being asked. Vial replies do not echo the request, so a push cannot be told
// from a reply by its first byte; each push is recognised by its exact shape instead.

import { REPORT_LEN } from './link'

export interface PushShape {
  readonly name: string
  /** Tests the report as received. Pushes are never XOR-encoded, even through the 2.4 GHz receiver. */
  matches(raw: Uint8Array): boolean
  /**
   * The request whose reply has this same shape, if there is one. On the cable, a matching report that arrives
   * while that request waits is taken as its reply. (Through the receiver the reply is encoded, so it never
   * matches.)
   */
  readonly replyTo?: number
}

const MAX_LAYERS = 32

/**
 * Keychron's layer report, sent on every layer change: [0xA3, default layer, highest held layer, 0 x 29].
 * The default layer follows the Mac/Windows switch; the held layer is 0 when none is held.
 */
export const LAYER_PUSH: PushShape = {
  name: 'layer',
  replyTo: 0xa3,
  matches(raw) {
    if (raw[0] !== 0xa3 || raw[1] >= MAX_LAYERS || raw[2] >= MAX_LAYERS) return false
    for (let i = 3; i < REPORT_LEN; i++) if (raw[i] !== 0) return false
    return true
  },
}

/**
 * Keychron's notice after its own factory reset (Fn + J + Z held): [0xA7, 0x11, 0 x 30]
 * (keychron/common/state_notify.c, factory_reset_nofity). Everything the keyboard holds has changed.
 */
export const FACTORY_RESET_PUSH: PushShape = {
  name: 'factory-reset',
  matches(raw) {
    if (raw[0] !== 0xa7 || raw[1] !== 0x11) return false
    for (let i = 2; i < REPORT_LEN; i++) if (raw[i] !== 0) return false
    return true
  },
}

export interface LayerState {
  /** The default layer, chosen by the Mac/Windows switch. */
  base: number
  /** The highest layer held on top of it; 0 when none. */
  held: number
  /** The layer the keys are acting on right now. */
  active: number
}

/** Reads a layer push, or the reply to an 0xA3 request, which has the same layout. */
export function parseLayerReport(report: Uint8Array): LayerState {
  const base = report[1]
  const held = report[2]
  return { base, held, active: Math.max(base, held) }
}
