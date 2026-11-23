// SPDX-License-Identifier: GPL-3.0-or-later
// The knobs a definition draws: which firmware numbers they have, what people call them, and whether the firmware
// lets apps read and change them.

/**
 * Compatibility: a definition numbers each knob (its "n,0" / "n,1" keys with the "e" mark), and that number is what
 * Vial's knob commands carry (vial_qmk quantum/vial.c, vial_get_encoder / vial_set_encoder: msg[3] is the encoder
 * index, checked against NUM_ENCODERS in quantum/nvm/eeprom/nvm_dynamic_keymap.c). Most definitions number them 0, 1,
 * 2 …, but not all: mechlovin/adelais/rgb_led/rev3 draws its only knob as 3, argo_works/ishi/80/mk0_avr_extra as 8
 * (their keymaps' encoder_map has one knob, so the number is the definition's mistake, and the firmware answers Nothing
 * and ignores writes for it, in Vial too). Vial sends the definition's number as it is (Pipette's probe,
 * src/vendor/pipette/shared/hid/probe-sequence.ts), and so does the app: the knobs are the definition's numbers, in
 * order, whatever they are, so a knob left out of a numbering (0 and 2) is still reached. People see them by position
 * (`knobName`).
 */
export function knobIndices(encoderIdx: Iterable<number>): number[] {
  return [...new Set(encoderIdx)].sort((a, b) => a - b)
}

/**
 * How many places a file's knob list has: one per number from 0 to the highest, numbers no knob has left at
 * Nothing. Vial's own files (.vil, `encoder_layout`) are laid out so, and so are backups (./backup.ts).
 */
export const knobSlots = (indices: readonly number[]): number => (indices.length ? Math.max(...indices) + 1 : 0)

/** What people call a knob: "Knob" where there is one, else "Knob 2" by its place in order, not its number. */
export function knobName(indices: readonly number[], knob: number): string {
  if (indices.length <= 1) return 'Knob'
  const at = indices.indexOf(knob)
  return `Knob ${(at >= 0 ? at : knob) + 1}`
}

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
