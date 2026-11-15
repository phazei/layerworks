// SPDX-License-Identifier: GPL-3.0-or-later
// Demo mode: a K15 Max that exists only in the page, for trying the app with no keyboard attached. It answers
// the same requests the real one does, and remembers changes until the page is reloaded.

import { FakeLink, fakeKeyboard, fakeKeyboardConfig, report } from '../device/fake-keyboard'
import type { HidLink } from '../device/link'
import data from './k15-max.json'

const FEATURE_DEFAULT_LAYER = 0x01
const WINDOWS_LAYER = 2

export interface DemoLink extends HidLink {
  /** Pretends a layer key is held (0 for none), the way the keyboard reports it. */
  holdLayer(layer: number): void
}

export function createDemoLink(): DemoLink {
  const config = fakeKeyboardConfig({
    name: `${data.definition.name} (demo)`,
    definition: data.definition,
    layers: data.keymap.length,
    rows: data.definition.matrix.rows,
    cols: data.definition.matrix.cols,
    keymap: structuredClone(data.keymap),
    knob: structuredClone(data.knob) as [number, number][],
    counts: { tapDance: 16, combo: 16, keyOverride: 16, altRepeatKey: 16, featureFlags: 0x03 },
    macroCount: 16,
    macros: new Array<number>(926).fill(0),
    keychron: { protocol: 2, features: FEATURE_DEFAULT_LAYER, firmware: 'demo' },
    layer: { base: WINDOWS_LAYER, held: 0 },
  })
  const link = new FakeLink('cable')
  link.responder = fakeKeyboard(config)
  return Object.assign(link, {
    holdLayer(layer: number) {
      config.layer.held = layer
      link.deliver(report(0xa3, config.layer.base, layer))
    },
  })
}
