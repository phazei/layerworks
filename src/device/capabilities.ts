// SPDX-License-Identifier: GPL-3.0-or-later
// What the connected keyboard can do. Pages and plugins ask this instead of reading protocol versions or
// feature bits themselves; a missing capability comes with the reason, to show beside the disabled control.

import type { DynamicEntryCounts } from '../vendor/pipette/shared/types/protocol'
import type { KeychronState } from '../vendor/pipette/shared/types/keychron'
import { PER_KEY_EFFECT, ZONES_EFFECT } from './keychron-rgb'
import type { LightingKind } from './lighting-kind'

/** VialRGB's Off and Direct Control: listed by every VialRGB keyboard, never offered as effects. */
const NOT_EFFECTS: readonly number[] = [0, 1]

/** How many lighting effects there are to choose from: the ids listed, without Off, Direct Control and `hidden`. */
export function offeredEffectCount(effects: ReadonlySet<number>, hidden: readonly number[] = []): number {
  return [...effects].filter((id) => !NOT_EFFECTS.includes(id) && !hidden.includes(id)).length
}

export interface LightingInfo {
  /** The definition's lighting, as a known kind (lightingKind, ./lighting-kind.ts): 'vialrgb', 'qmk_rgblight' … 'none'. */
  kind: LightingKind
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
  /** The Keychron part is still being read (`keychron` is null meanwhile, as for firmware without it). */
  keychronPending?: boolean
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

/**
 * How N-key rollover (every key held reaching the computer, not just six) works here:
 * - 'setting': as QMK has it, Magic's switch (QMK setting 21, the NK_* keys), where the keyboard lists it;
 * - 'automatic': the keyboard does it by itself (Keychron's adaptive N-key rollover, `0xA7 0x12` bit 2): the
 *   firmware never reads Magic's bit, so the switch and the keys would change nothing, and the app leaves them out;
 * - 'pending': not known yet, the Keychron part is still being read (left out meanwhile, so they don't flicker).
 */
export type NkroMode = 'setting' | 'automatic' | 'pending'

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
  /**
   * The lighting effects the Lighting page offers: the listed ones without Off and Direct Control, and without
   * Keychron's Key by key and Mixed zones where the keyboard can't be painted. 0 without VialRGB lighting.
   */
  readonly effectCount: number
  readonly nkro: NkroMode
  check(feature: Feature): Availability
  has(feature: Feature): boolean
  hasCommand(name: string): boolean
  hasQmkSetting(qsid: number): boolean
}

/** Vial's QMK setting with Magic's switches, N-key rollover among them (qmk_settings.c, id 21). */
const MAGIC_SETTING = 21

const FEATURE_FLAG_CAPS_WORD = 0x01
const FEATURE_FLAG_LAYER_LOCK = 0x02

const yes: Availability = { available: true }
const no = (reason: string): Availability => ({ available: false, reason })
const NOT_IN_FIRMWARE = 'This keyboard’s firmware doesn’t include it.'
const STILL_LOADING = 'Still reading this from the keyboard.'

/** See NkroMode. The keyboard says so itself (keychron/common/nkro.c: bit 0 on, bit 1 switchable, bit 2 adaptive). */
export function nkroMode({ keychron, keychronPending }: CapabilitySources): NkroMode {
  if (!keychron) return keychronPending ? 'pending' : 'setting'
  return keychron.hasNkro && keychron.nkroAdaptive ? 'automatic' : 'setting'
}

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
        // Keychron's own report where the keyboard has one (adaptive or switchable); otherwise QMK's Magic switch,
        // where the keyboard lists that setting (21). Same split as nkroMode.
        if (keychron?.hasNkro) return yes
        if (sources.keychronPending) return no(STILL_LOADING)
        if (!qmkSettings) return no(STILL_LOADING)
        return qmkSettings.has(MAGIC_SETTING) ? yes : no(NOT_IN_FIRMWARE)
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
    effectCount:
      lighting?.kind === 'vialrgb'
        ? offeredEffectCount(lighting.effects, [
            ...(check('perKeyLighting').available ? [] : [PER_KEY_EFFECT]),
            ...(check('lightingZones').available ? [] : [ZONES_EFFECT]),
          ])
        : 0,
    nkro: nkroMode(sources),
    check,
    has: (feature) => check(feature).available,
    hasCommand: (name) => commands.has(name),
    hasQmkSetting: (qsid) => qmkSettings?.has(qsid) ?? false,
  }
}
