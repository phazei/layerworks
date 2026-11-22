// SPDX-License-Identifier: GPL-3.0-or-later
// Facts about Layerworks itself, kept in one place: who holds the copyright, where the source is and where to
// report a problem. Read by the About box and by the build (vite.config.ts puts them in the licences file), so this
// file imports nothing.

/** Who holds the copyright, as the About box and the licences file name them. */
export const COPYRIGHT_HOLDER = 'phazei'
export const COPYRIGHT_YEARS = '2026'
export const COPYRIGHT_LINE = `Copyright © ${COPYRIGHT_YEARS} ${COPYRIGHT_HOLDER}`

export const SOURCE_URL = 'https://github.com/phazei/layerworks'
/** Where people who find a bug are asked to report it. */
export const ISSUES_URL = `${SOURCE_URL}/issues`

/** Files the build puts beside the page (relative, so they work under any path the page is served from). */
export const LICENCES_FILE = 'licences.txt'
export const LICENSE_FILE = 'LICENSE.txt'

/** The page for one commit's files, or null when the commit isn't a known full hash. */
export function commitUrl(commit: string): string | null {
  return /^[0-9a-f]{40}$/.test(commit) ? `${SOURCE_URL}/tree/${commit}` : null
}
