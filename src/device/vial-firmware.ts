// SPDX-License-Identifier: GPL-3.0-or-later
// Whether the keyboard runs Vial firmware at all.

/** Said at connect when it doesn't. The connect prompt adds a link to Vial's site. */
export const NOT_VIAL =
  'This keyboard runs VIA firmware (or other firmware without Vial), not Vial. Layerworks needs Vial firmware: ' +
  'Vial’s site lists the keyboards it is made for and how to put it on them. Until then, VIA or the maker’s own app ' +
  'can change this keyboard.'

/** Where people who meet NOT_VIAL can find Vial firmware for their keyboard. */
export const VIAL_FIRMWARE_URL = 'https://get.vial.today/'

/**
 * Compatibility: keyboards with VIA firmware (Keychron's stock firmware among them) offer the same raw HID interface
 * as Vial, so the browser lists them, but don't know Vial's commands: VIA answers them "unknown command", 0xFF in the
 * first byte (vial-qmk quantum/via.c, raw_hid_receive_kb; Keychron's keyboards/keychron/common/keychron_raw_hid.c
 * does the same), and other firmware sends them back unchanged. A Vial keyboard answers "get keyboard ID" (0xFE
 * 0x00) with its protocol version, a small number, little-endian (quantum/vial.c, vial_get_keyboard_id). Decided
 * here, before anything else is read.
 */
export function answersVial(keyboardIdReply: ArrayLike<number>): boolean {
  const [low, b1, b2, b3] = [keyboardIdReply[0], keyboardIdReply[1], keyboardIdReply[2], keyboardIdReply[3]]
  return low < 0xfe && b1 === 0 && b2 === 0 && b3 === 0
}
