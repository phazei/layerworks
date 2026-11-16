// SPDX-License-Identifier: GPL-3.0-or-later
// Where a help topic's "read more" link goes, in words, so the link says what it opens.

/** "the QMK documentation", "the Vial manual", "Keychron’s guide", or the site's name for anything else. */
export function docsSite(url: string): string {
  let host: string
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'the documentation'
  }
  if (host === 'docs.qmk.fm') return 'the QMK documentation'
  if (host === 'get.vial.today') return 'the Vial manual'
  if (host === 'keychron.com' || host.endsWith('.keychron.com')) return 'Keychron’s guide'
  return host
}
