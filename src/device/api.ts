// SPDX-License-Identifier: GPL-3.0-or-later
// The device layer's public surface. Pages, plugins and the shell import from here (or from ./index, which adds
// the app's store), never from src/vendor directly.

export { REPORT_LEN } from './link'
export type { HidLink, LinkKind } from './link'
export { LAYER_PUSH, parseLayerReport } from './pushes'
export type { LayerState, PushShape } from './pushes'
export { TransportError } from './transport'
export type { RequestOptions, Transport, TransportStats } from './transport'
export type { Availability, Capabilities, Feature, LightingInfo } from './capabilities'
export { LOAD_PARTS, slotKeycode } from './store'
export type {
  DeviceState,
  DeviceStore,
  Entries,
  KeyboardData,
  Lighting,
  LightingChange,
  LinkInfo,
  LoadPart,
  Slot,
  UnlockResult,
} from './store'
export { UNLOCK_STEPS } from './unlock'
export type { UnlockProgress } from './unlock'
export type { UnlockStatus } from '../vendor/pipette/shared/types/protocol'
export { matrixKeys } from './matrix'
export * from './keycodes'

export { posKey } from '../vendor/pipette/shared/kle/pos-key'
export type { KleKey, KeyboardLayout } from '../vendor/pipette/shared/kle/types'
export { VIALRGB_EFFECTS } from '../vendor/pipette/shared/constants/lighting'
