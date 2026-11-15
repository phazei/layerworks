// SPDX-License-Identifier: GPL-3.0-or-later

import { useSyncExternalStore } from 'react'
import { decompressDefinition } from '../vendor/pipette/web/lzma'
import { createDeviceStore, type DeviceState } from './store'

/** The demo keyboard serves its definition as plain JSON; real keyboards compress theirs. */
const isJson = (bytes: number[]) => bytes[0] === 0x7b

/** The app's one device store. */
export const deviceStore = createDeviceStore({
  decompress: async (bytes) =>
    isJson(bytes) ? new TextDecoder().decode(Uint8Array.from(bytes)) : decompressDefinition(bytes),
})

/**
 * Reads from the device store and re-renders when the selected value changes. The selector must return the
 * same reference for the same state (pick a field; don't build a new object).
 */
export function useDevice<T>(select: (state: DeviceState) => T): T {
  return useSyncExternalStore(deviceStore.subscribe, () => select(deviceStore.getState()))
}
