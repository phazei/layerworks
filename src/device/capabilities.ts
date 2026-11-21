// SPDX-License-Identifier: GPL-3.0-or-later
// What the connected keyboard can do. Pages and plugins ask this instead of reading protocol versions or
// feature bits themselves; a missing capability comes with the reason, to show beside the disabled control.

import type { DynamicEntryCounts } from '../vendor/pipette/shared/types/protocol'
import type { KeychronState } from '../vendor/pipette/shared/types/keychron'

export interface LightingInfo {
  /** The definition's lighting type: 'vialrgb', 'qmk_rgblight', ... or 'none'. */
  kind: string
  /** VialRGB effect numbers the firmware has. */
  effects: ReadonlySet<number>
  maxBrightness: number
}

/** What has been read from the keyboard so far. Parts still loading are null. */
export interface CapabilitySources {
  viaProtocol: number
  vialProtocol: number
  layers: number
  knobs: number
  counts: DynamicEntryCounts
  macroCount: number
  macroBytes: number
  qmkSettings: ReadonlySet<number> | null
  lighting: LightingInfo | null
  keychron: KeychronState | null
  /** Names of extension commands a plugin has detected. */
  commands?: ReadonlySet<string>
  /** Whether the keyboard is unlocked (Vial unlock); null or left out while not read yet. */
  unlocked?: boolean | null
}

export type Feature =
  | 'macros'
  | 'tapDance'
  | 'combos'
  | 'keyOverrides'
  | 'altRepeat'
  | 'capsWord'
  | 'layerLock'
  | 'knob'
  | 'qmkSettings'
  | 'lighting'
  | 'perKeyLighting'
  /** Keychron's mixed lighting: zones of keys, each playing its own effects. */
  | 'lightingZones'
  /** Keychron's lock lights (Caps Lock and the like): their colour and an on/off switch each. */
  | 'lockLights'
  | 'liveLayer'
  | 'battery'
  | 'wirelessTimers'
  | 'debounce'
  | 'nkro'
  | 'snapClick'
  /** Reading every key straight from the keyboard (the Test page). Needs unlocking. */
  | 'keyMatrix'

/** `needsUnlock`: unlocking the keyboard makes it available; offer to unlock beside the reason. */
export type Availability = { available: true } | { available: false; reason: string; needsUnlock?: boolean }

export interface Capabilities {
  readonly viaProtocol: number
  readonly vialProtocol: number
  /** null when the firmware has no Keychron commands. */
  readonly keychronProtocol: number | null
  readonly layers: number
  readonly knobs: number
  readonly macros: { readonly count: number; readonly bytes: number }
  readonly tapDances: number
  readonly combos: number
  readonly keyOverrides: number
  readonly altRepeatKeys: number
  /** Supported QMK setting IDs; null until they have been read. */
  readonly qmkSettings: ReadonlySet<number> | null
  readonly lighting: LightingInfo | null
  check(feature: Feature): Availability
  has(feature: Feature): boolean
  hasCommand(name: string): boolean
  hasQmkSetting(qsid: number): boolean
}

const FEATURE_FLAG_CAPS_WORD = 0x01
const FEATURE_FLAG_LAYER_LOCK = 0x02

const yes: Availability = { available: true }
const no = (reason: string): Availability => ({ available: false, reason })
const NOT_IN_FIRMWARE = 'This keyboard’s firmware doesn’t include it.'
const STILL_LOADING = 'Still reading this from the keyboard.'

export function buildCapabilities(sources: CapabilitySources): Capabilities {
  const { counts, keychron, lighting, qmkSettings } = sources
  const commands = sources.commands ?? new Set<string>()

  const count = (n: number) => (n > 0 ? yes : no(NOT_IN_FIRMWARE))
  const flag = (bit: number) => (counts.featureFlags & bit ? yes : no(NOT_IN_FIRMWARE))
  const keychronOnly = (supported: (kc: KeychronState) => boolean): Availability => {
    if (!keychron) return no('Needs Keychron firmware.')
    return supported(keychron) ? yes : no(NOT_IN_FIRMWARE)
  }

  function check(feature: Feature): Availability {
    switch (feature) {
      case 'macros':
        return sources.macroCount > 0 && sources.macroBytes > 0 ? yes : no(NOT_IN_FIRMWARE)
      case 'tapDance':
        return count(counts.tapDance)
      case 'combos':
        return count(counts.combo)
      case 'keyOverrides':
        return count(counts.keyOverride)
      case 'altRepeat':
        return count(counts.altRepeatKey)
      case 'capsWord':
        return flag(FEATURE_FLAG_CAPS_WORD)
      case 'layerLock':
        return flag(FEATURE_FLAG_LAYER_LOCK)
      case 'knob':
        return sources.knobs > 0 ? yes : no('This keyboard has no knob.')
      case 'qmkSettings':
        if (!qmkSettings) return no(STILL_LOADING)
        return qmkSettings.size > 0 ? yes : no(NOT_IN_FIRMWARE)
      case 'lighting':
        if (!lighting) return no(STILL_LOADING)
        if (lighting.kind === 'none') return no('This keyboard has no lighting the app can control.')
        if (lighting.kind !== 'vialrgb') {
          return no('This keyboard’s lights work in an older way (not VialRGB) that the app can’t change yet.')
        }
        // The keyboard always lists Off (0); anything else is an effect to choose from.
        return lighting.effects.size > 1 ? yes : no('The keyboard’s firmware doesn’t offer any lighting effects.')
      case 'perKeyLighting':
        // The LED map is what puts a colour on a key; without it there is nothing to paint.
        return keychronOnly((kc) => kc.hasRgb && !!kc.rgb && kc.rgb.ledCount > 0 && kc.rgb.ledMatrix.size > 0)
      case 'lightingZones':
        return keychronOnly(
          (kc) => kc.hasRgb && !!kc.rgb && kc.rgb.ledCount > 0 && kc.rgb.ledMatrix.size > 0 && kc.rgb.mixedRGBLayers > 0,
        )
      case 'lockLights':
        // The keyboard says which lock lights it has (keychron_rgb.c, get_indicators_config).
        return keychronOnly((kc) => kc.hasRgb && ((kc.rgb?.osIndicatorConfig?.availableMask ?? 0) & 0x1f) !== 0)
      case 'liveLayer':
        return keychronOnly((kc) => kc.hasDefaultLayer)
      case 'battery':
      case 'wirelessTimers':
        return keychronOnly((kc) => kc.hasWireless)
      case 'debounce':
        return keychronOnly((kc) => kc.hasDebounce)
      case 'nkro':
        return keychronOnly((kc) => kc.hasNkro)
      case 'snapClick':
        return keychronOnly((kc) => kc.hasSnapClick)
      case 'keyMatrix':
        if (sources.unlocked == null) return no(STILL_LOADING)
        return sources.unlocked
          ? yes
          : { available: false, needsUnlock: true, reason: 'The keyboard only shares every key once it is unlocked.' }
    }
  }

  return {
    viaProtocol: sources.viaProtocol,
    vialProtocol: sources.vialProtocol,
    keychronProtocol: keychron ? keychron.protocolVersion : null,
    layers: sources.layers,
    knobs: sources.knobs,
    macros: { count: sources.macroCount, bytes: sources.macroBytes },
    tapDances: counts.tapDance,
    combos: counts.combo,
    keyOverrides: counts.keyOverride,
    altRepeatKeys: counts.altRepeatKey,
    qmkSettings,
    lighting,
    check,
    has: (feature) => check(feature).available,
    hasCommand: (name) => commands.has(name),
    hasQmkSetting: (qsid) => qmkSettings?.has(qsid) ?? false,
  }
}
