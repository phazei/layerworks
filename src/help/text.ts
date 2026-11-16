// SPDX-License-Identifier: GPL-3.0-or-later
// Help texts name layers as {layer:N|Generic name}: with a keyboard connected that is its own name for layer N (the
// user's, or the default), with none the generic one, so the Help page reads right offline too.

const LAYER = /\{layer:(\d+)\|([^}]*)\}/g

/** The text with every layer placeholder filled in from `names` (the connected keyboard's; empty for none). */
export function fillLayers(text: string, names: readonly string[] = []): string {
  return text.replace(LAYER, (_, index: string, generic: string) => names[Number(index)] ?? generic)
}
