// SPDX-License-Identifier: GPL-3.0-or-later
// Runs the device layer against the real keyboard: `pnpm hardware`. Set LINK=receiver in the environment to go
// through the 2.4 GHz receiver instead of the cable.
// It only reads. Close any other app holding the keyboard first.

import { afterAll, expect, it } from 'vitest'
import { createDeviceStore, type DeviceStore } from '../src/device/store'
import type { LinkKind } from '../src/device/link'
import { decompressDefinition } from '../src/vendor/pipette/web/lzma'
import { openNodeHidLink } from './node-hid-link'

const kind: LinkKind = process.env.LINK === 'receiver' ? 'receiver' : 'cable'
const store: DeviceStore = createDeviceStore({ decompress: (bytes) => decompressDefinition(bytes) })

function loaded(): Promise<void> {
  return new Promise((resolve) => {
    const done = () => store.getState().status !== 'ready' || store.getState().loading.length === 0
    if (done()) return resolve()
    const off = store.subscribe(() => {
      if (!done()) return
      off()
      resolve()
    })
  })
}

afterAll(() => store.disconnect())

it(`loads the keyboard over the ${kind}`, async () => {
  const link = await openNodeHidLink(kind)
  expect(link, `no Keychron ${kind} found`).not.toBeNull()

  const started = performance.now()
  await store.connect(link!)
  const pictureMs = Math.round(performance.now() - started)
  expect(store.getState().error).toBeNull()
  await loaded()
  const allMs = Math.round(performance.now() - started)

  const state = store.getState()
  const caps = state.capabilities!
  const summary = {
    name: state.keyboard?.name,
    link: state.link,
    'picture ready (ms)': pictureMs,
    'everything loaded (ms)': allMs,
    protocols: `VIA ${caps.viaProtocol}, Vial ${caps.vialProtocol}, Keychron ${caps.keychronProtocol}`,
    layers: caps.layers,
    keys: state.keyboard?.layout?.keys.length,
    knobs: caps.knobs,
    macros: caps.macros,
    entries: [caps.tapDances, caps.combos, caps.keyOverrides, caps.altRepeatKeys],
    settings: caps.qmkSettings?.size,
    lighting: state.lighting && { kind: state.lighting.kind, effects: state.lighting.effects.size, mode: state.lighting.mode },
    firmware: state.keychron?.firmwareVersion,
    battery: state.keychron?.batteryLevel,
    layer: state.layer,
    unlocked: state.unlock?.unlocked,
    failed: state.failed,
    transport: { ...store.transport!.stats },
  }
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n')

  expect(state.status).toBe('ready')
  expect(state.failed).toEqual([])
  expect(state.keyboard?.layout?.keys.length).toBeGreaterThan(0)
  expect(store.transport!.stats.failures).toBe(0)
})
