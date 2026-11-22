// SPDX-License-Identifier: GPL-3.0-or-later
// How the Device page's texts name the knob.

import { useDevice } from '../../device'

/**
 * "the knob", "the knobs", or nothing, for how many knobs the keyboard has. Compatibility: the K15 Max has one knob;
 * other Vial keyboards have none or several (the definition's encoders, read through Vial's knob commands only with
 * ENCODER_MAP_ENABLE: vial-qmk quantum/vial.c, vial_get_encoder / vial_set_encoder). Texts must not promise a knob
 * that isn't there.
 */
export function theKnobs(knobCount: number): string | null {
  if (knobCount <= 0) return null
  return knobCount === 1 ? 'the knob' : 'the knobs'
}

/** "the keys and the knob", "the keys and the knobs", or "the keys". */
export function keysAndKnobs(knobCount: number): string {
  const knobs = theKnobs(knobCount)
  return knobs ? `the keys and ${knobs}` : 'the keys'
}

/** keysAndKnobs for the connected keyboard, as text in a sentence. */
export function KeysAndKnobs() {
  const knobCount = useDevice((s) => s.keyboard?.knobCount ?? 0)
  return <>{keysAndKnobs(knobCount)}</>
}
