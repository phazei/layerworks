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
export function lightingKind(lighting: unknown): LightingKind {
  const named = Array.isArray(lighting)
    ? lighting[0]
    : lighting !== null && typeof lighting === 'object'
      ? (lighting as Record<string, unknown>).extends
      : lighting
  if (named === undefined || named === null) return 'none'
  return typeof named === 'string' && (LIGHTING_KINDS as readonly string[]).includes(named) ? (named as LightingKind) : 'other'
}

/** The definition's `lighting` as written, for showing: a name as it is, anything else as short JSON. */
export function lightingAsWritten(lighting: unknown): string {
  if (lighting === undefined) return 'not given'
  if (typeof lighting === 'string') return lighting
  const text = JSON.stringify(lighting) ?? String(lighting)
  return text.length > 80 ? `${text.slice(0, 77)}…` : text
}
