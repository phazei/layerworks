// SPDX-License-Identifier: GPL-3.0-or-later
// The device layer's public surface. Pages and plugins import from here, never from src/vendor directly.

export { REPORT_LEN } from './link'
export type { HidLink, LinkKind } from './link'
export { LAYER_PUSH, parseLayerReport } from './pushes'
export type { LayerState, PushShape } from './pushes'
export { TransportError } from './transport'
export type { RequestOptions, Transport, TransportStats } from './transport'
export type { Availability, Capabilities, Feature, LightingInfo } from './capabilities'
export { LOAD_PARTS } from './store'
export type { DeviceState, DeviceStore, Entries, KeyboardData, Lighting, LinkInfo, LoadPart } from './store'
export { deviceStore, useDevice } from './useDevice'
export { chooseDevice, grantedDevices, isWebHidSupported, openLink } from './webhid'

export { serialize as keycodeId } from '../vendor/pipette/shared/keycodes/keycodes'
export { posKey } from '../vendor/pipette/shared/kle/pos-key'
export type { KleKey, KeyboardLayout } from '../vendor/pipette/shared/kle/types'
