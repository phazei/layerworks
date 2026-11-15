// SPDX-License-Identifier: GPL-2.0-or-later
// Layerworks stand-in for Pipette's KeycodeGrid.tsx: the one function the keyboard widget imports from it,
// copied verbatim, so the widget does not pull in Pipette's key picker.

import { keycodeLabel } from '../../../shared/keycodes/keycodes'

export function getRemapDisplayLabel(qmkId: string, remapLabel?: (qmkId: string) => string): string | undefined {
  if (!remapLabel) return undefined
  const remapped = remapLabel(qmkId)
  if (remapped === qmkId) return undefined
  return keycodeLabel(remapped)
}
