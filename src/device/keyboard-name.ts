// SPDX-License-Identifier: GPL-3.0-or-later
// What the app calls the connected keyboard.

import type { HidLink } from './link'

/** Said when neither the definition nor the browser gives a name. */
export const FALLBACK_KEYBOARD_NAME = 'Keyboard'

/**
 * Compatibility: 130 of vial-qmk's 857 Vial definitions have no `name` (keyboards/<board>/keymaps/vial/vial.json,
 * e.g. kiserdesigns/splinter, planck/rev7). The keyboard is then called by the product name the browser reports
 * (the firmware's USB descriptor, PRODUCT / keyboard_name), else "Keyboard"; never the vendored probe's "Unknown".
 * Through a 2.4 GHz receiver the browser names the receiver, not the keyboard, so that name isn't used there.
 */
export function keyboardName(definitionName: unknown, link: Pick<HidLink, 'kind' | 'productName'>): string {
  const named = typeof definitionName === 'string' ? definitionName.trim() : ''
  if (named) return named
  const product = link.kind === 'cable' ? link.productName.trim() : ''
  return product || FALLBACK_KEYBOARD_NAME
}
