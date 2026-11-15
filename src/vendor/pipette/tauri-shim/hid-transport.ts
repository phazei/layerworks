// SPDX-License-Identifier: GPL-3.0-or-later
// Layerworks stand-in, not a Pipette file. Pipette's ./transport.ts defaults to its Tauri backend through this
// module; here there is no default, and src/device/ injects the real transport with setTransport.

const missing = (): never => {
  throw new Error('No transport set')
}

export const sendReceive: (data: Uint8Array) => Promise<Uint8Array> = missing
export const send: (data: Uint8Array) => Promise<void> = missing
