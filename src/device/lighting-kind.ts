// SPDX-License-Identifier: GPL-3.0-or-later
// What kind of lighting a keyboard's definition says it has, as one of a few known names.

/** The lighting kinds VIA and Vial definitions name; 'other' for a name the app doesn't know. */
export const LIGHTING_KINDS = ['none', 'vialrgb', 'qmk_rgb_matrix', 'qmk_rgblight', 'qmk_backlight', 'qmk_backlight_rgblight', 'other'] as const
export type LightingKind = (typeof LIGHTING_KINDS)[number]

/**
 * Compatibility: a definition's `lighting` is usually a name ("vialrgb", "qmk_rgblight" …), but seven in vial-qmk
 * write it as an object (`{ "extends": "qmk_rgblight" }`: keyboards/crkbd, dztech/dz60rgb, vipad … keymaps/vial/
 * vial.json, VIA's custom-lighting form) and two as a list (`["qmk_rgblight"]`); 89 leave it out. The store reads the
 * kind through this, so the rest of the app only ever sees one of LIGHTING_KINDS: no lighting named is 'none', an
 * object or list counts as the name it holds, any other name is 'other'.
 */
export function lightingKind(lighting: unknown, firmwareVialRgb = false): LightingKind {
  // What the firmware says beats what the definition names (firmwareHasVialRgb).
  if (firmwareVialRgb) return 'vialrgb'
  const named = Array.isArray(lighting)
    ? lighting[0]
    : lighting !== null && typeof lighting === 'object'
      ? (lighting as Record<string, unknown>).extends
      : lighting
  if (named === undefined || named === null) return 'none'
  return typeof named === 'string' && (LIGHTING_KINDS as readonly string[]).includes(named) ? (named as LightingKind) : 'other'
}

/**
 * Compatibility: firmware with VialRGB says so in byte 12 of its keyboard ID reply (vial_qmk quantum/vial.c,
 * vial_get_keyboard_id: "so third-party apps don't have to query json"), and some definitions don't: keyboards/vipad
 * writes its lighting as `{ "extends": "qmk_rgb_matrix" }`, keyboards/rgbkb/mun2 as "none", both built with
 * VIALRGB_ENABLE. Where the firmware says so, the app reads and changes the lighting as VialRGB (`lightingKind`).
 * Older firmware leaves the byte 0, so the definition decides there.
 */
export function firmwareHasVialRgb(keyboardIdReply: ArrayLike<number>): boolean {
  return keyboardIdReply[12] === 1
}

/** The definition's `lighting` as written, for showing: a name as it is, anything else as short JSON. */
export function lightingAsWritten(lighting: unknown): string {
  if (lighting === undefined) return 'nothing'
  if (typeof lighting === 'string') return lighting
  const text = JSON.stringify(lighting) ?? String(lighting)
  return text.length > 80 ? `${text.slice(0, 77)}…` : text
}
