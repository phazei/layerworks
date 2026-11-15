// SPDX-License-Identifier: GPL-3.0-or-later
// What the keyboard can do, in plain words for Home: one line per feature, friendly name first and the QMK
// name beside it, with the reason when it isn't available.

import type { Capabilities, Feature } from '../../device'

export interface FeatureLine {
  id: Feature | 'layers'
  name: string
  /** What QMK, Vial or Keychron call it. */
  qmkName?: string
  /** A number or short note, e.g. "16" or "5 effects". */
  detail?: string
  available: boolean
  /** Why it isn't available. */
  reason?: string
}

interface FeatureText {
  name: string
  qmkName?: string
  detail?: (caps: Capabilities) => string | undefined
}

const slots = (n: number) => (n > 0 ? String(n) : undefined)

/** In the order Home lists them: the everyday ones first. */
const FEATURES: [Feature, FeatureText][] = [
  ['knob', { name: 'A knob', qmkName: 'Encoder', detail: (c) => (c.knobs > 1 ? `${c.knobs} knobs` : undefined) }],
  [
    'lighting',
    {
      name: 'Lighting effects',
      qmkName: 'RGB Matrix',
      detail: (c) => (c.lighting && c.lighting.effects.size > 0 ? `${c.lighting.effects.size} effects` : undefined),
    },
  ],
  ['perKeyLighting', { name: 'A colour for each key', qmkName: 'Per-key RGB' }],
  ['macros', { name: 'Macros and text snippets', qmkName: 'Macros', detail: (c) => slots(c.macros.count) }],
  ['tapDance', { name: 'Multi-tap keys', qmkName: 'Tap Dance', detail: (c) => slots(c.tapDances) }],
  ['combos', { name: 'Key chords', qmkName: 'Combos', detail: (c) => slots(c.combos) }],
  ['keyOverrides', { name: 'Shortcut replacements', qmkName: 'Key Overrides', detail: (c) => slots(c.keyOverrides) }],
  ['altRepeat', { name: 'Repeat rules', qmkName: 'Alt Repeat Key', detail: (c) => slots(c.altRepeatKeys) }],
  ['capsWord', { name: 'Capitals for one word', qmkName: 'Caps Word' }],
  ['layerLock', { name: 'Lock a layer on', qmkName: 'Layer Lock' }],
  ['qmkSettings', { name: 'Typing feel settings', qmkName: 'QMK Settings' }],
  ['liveLayer', { name: 'Shows which layer is on' }],
  ['battery', { name: 'Wireless and battery' }],
  ['debounce', { name: 'Key bounce filter', qmkName: 'Debounce' }],
  ['nkro', { name: 'Any number of keys at once', qmkName: 'NKRO' }],
  ['snapClick', { name: 'Snap Click', qmkName: 'SOCD' }],
]

export function describeCapabilities(caps: Capabilities): FeatureLine[] {
  const layers: FeatureLine = { id: 'layers', name: 'Layers', detail: String(caps.layers), available: caps.layers > 0 }
  return [
    layers,
    ...FEATURES.map(([id, text]): FeatureLine => {
      const availability = caps.check(id)
      return availability.available
        ? { id, name: text.name, qmkName: text.qmkName, detail: text.detail?.(caps), available: true }
        : { id, name: text.name, qmkName: text.qmkName, available: false, reason: availability.reason }
    }),
  ]
}
