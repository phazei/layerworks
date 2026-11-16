// SPDX-License-Identifier: GPL-3.0-or-later
// How many taps keep a layer on with a "hold, or tap it 5 times" key (QMK's TT): the keyboard's Tapping Toggle
// setting where it reports one (Vial's QMK settings, id 20, changed on the Typing feel page), otherwise fixed in the
// firmware at QMK's default.

import { decodeSetting, DEFAULT_TAPPING_TOGGLE, settingWidth, useDevice } from '../../device'

/** Vial's QMK setting id for the tapping toggle (qmk_settings.c, QS_tapping_toggle). */
export const TAPPING_TOGGLE_QSID = 20

export interface TappingToggle {
  taps: number
  /** The keyboard reports it as a setting, so it can be changed on the Typing feel page. */
  setting: boolean
}

export function tappingToggleOf(settings: Readonly<Record<number, readonly number[]>> | null): TappingToggle {
  const bytes = settings?.[TAPPING_TOGGLE_QSID]
  const width = settingWidth(TAPPING_TOGGLE_QSID) ?? 1
  if (!bytes) return { taps: DEFAULT_TAPPING_TOGGLE, setting: false }
  // The Typing feel page offers 1 - 10; a 0 from elsewhere is shown as QMK's default rather than "0 times".
  const taps = decodeSetting(bytes, width)
  return { taps: taps > 0 ? taps : DEFAULT_TAPPING_TOGGLE, setting: true }
}

export function useTappingToggle(): TappingToggle {
  return tappingToggleOf(useDevice((s) => s.settings))
}
