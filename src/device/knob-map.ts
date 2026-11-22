// SPDX-License-Identifier: GPL-3.0-or-later
// Whether the firmware lets apps read and change the knobs its definition draws.

/** Vial's "get encoder" command (0xFE 0x03), as its first two bytes. */
const GET_ENCODER = 0xfe03

/**
 * Compatibility: Vial's knob commands exist only in firmware built with ENCODER_MAP_ENABLE (vial_qmk quantum/vial.c,
 * vial_get_encoder / vial_set_encoder under `#ifdef ENCODER_MAP_ENABLE`). Without it the firmware sends the request
 * back unchanged, so "get encoder (layer, knob)" reads as counter-clockwise 0xFE03 and clockwise `layer << 8 | knob`
 * (e.g. lazydesigners/cloud, 1upkeyboards/pi60, planck/rev7, whose definitions draw knobs). True when every knob
 * reads that way on every layer: then the knobs are the firmware's own and the app neither shows nor writes them.
 * `knobs` is the probe's "layer,knob,direction" → keycode.
 */
export function firmwareKeepsKnobs(knobs: Readonly<Record<string, number>>, layers: number, indices: Iterable<number>): boolean {
  const list = [...indices]
  if (list.length === 0) return false
  return list.every((knob) =>
    Array.from({ length: layers }, (_, layer) => layer).every(
      (layer) => knobs[`${layer},${knob},0`] === GET_ENCODER && knobs[`${layer},${knob},1`] === ((layer << 8) | knob),
    ),
  )
}
