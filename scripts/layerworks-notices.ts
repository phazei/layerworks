// SPDX-License-Identifier: GPL-3.0-or-later
// What Layerworks' licences file says (written by scripts/notices.ts at build time, linked from Settings, About):
// the app's own copyright and licence, the vendored Pipette code and what it was ported from, and the texts the
// plugin can't find in a package. The GPL's full text goes beside it as LICENSE.txt.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { COPYRIGHT_LINE, LICENCES_FILE, LICENSE_FILE, SOURCE_URL, commitUrl } from '../src/project'
import { licenceNotices } from './notices'

// Vite rewrites import.meta.url in the config's own files to their real place.
const root = fileURLToPath(new URL('..', import.meta.url))
const text = (file: string) => readFileSync(join(root, file), 'utf8').trim()
const notice = (file: string) => text(join('scripts', 'notices', file))

const has = (ending: string) => (ids: readonly string[]) => ids.some((id) => id.replaceAll('\\', '/').includes(ending))

/** The comment a built file opens with (`/*! … *\/`), or '' when it has none. */
function openingComment(file: string): string {
  return /^\s*\/\*!?([\s\S]*?)\*\//.exec(readFileSync(file, 'utf8'))?.[0].trim() ?? ''
}

export function layerworksNotices(commit: string): Plugin {
  const vendor = JSON.parse(text('vendor.json')) as { source: { repo: string; branch: string; commit: string; version: string } }
  const tree = commitUrl(commit)

  const head = `Layerworks: licences
====================

Layerworks is a configurator for keyboards running Vial firmware.
${COPYRIGHT_LINE}

Layerworks is free software: you can redistribute it and/or modify it under the terms of the GNU General Public
License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any
later version. It is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the
implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. The licence's full text is in
${LICENSE_FILE}, beside this file.

Source code: ${SOURCE_URL}${tree ? `\nThis copy was built from commit ${commit}: ${tree}` : ''}

Layerworks is an independent project, not affiliated with or endorsed by Keychron, QMK, Vial or VIA.

Below are the parts of other projects built into this page, each with its licence. All are compatible with the
GNU GPL version 3.`

  return licenceNotices({
    fileName: LICENCES_FILE,
    head,
    copies: { [LICENSE_FILE]: text('LICENSE') + '\n' },
    sections: [
      {
        title: 'Pipette, and Vial GUI it is ported from',
        when: has('/src/vendor/pipette/'),
        body: `Part of Layerworks' code (the keyboard picture, the key names and tables, layout parsing, macro and .vil
encoding, and the commands that talk to the keyboard) is copied unchanged from Pipette by darakuneko,
https://github.com/darakuneko/pipette-desktop, in tymon3310's version with Keychron support:
${vendor.source.repo}, branch ${vendor.source.branch}, version ${vendor.source.version}, commit ${vendor.source.commit}.
The copied files are in src/vendor/pipette/ of Layerworks' source, with their licence headers.

Pipette as a whole is licensed under the GNU GPL version 3 or later. Most of its files carry
"GPL-2.0-or-later" headers and a few "GPL-3.0-or-later"; one is MIT-licensed (LZMA-JS, below). Layerworks
uses them under the GNU GPL version 3 (${LICENSE_FILE}).

Pipette is built on Vial GUI, https://github.com/vial-kb/vial-gui (GNU GPL version 2 or later): its keycode
tables, layout parser, protocol and Keychron code are ported from Vial GUI and from tymon3310's version of it.`,
      },
      {
        title: 'kle-serial',
        when: has('/src/vendor/pipette/shared/kle/'),
        body: `Pipette's layout parser (src/vendor/pipette/shared/kle/) is based on kle-serial by Ian Prest,
https://github.com/ijprest/kle-serial, by way of Vial GUI's kle_serial.py.

${notice('kle-serial.txt')}`,
      },
      {
        title: 'LZMA-JS',
        when: has('/src/vendor/pipette/web/lzma-browser.ts'),
        body: `src/vendor/pipette/web/lzma-browser.ts (SPDX-License-Identifier: MIT), which unpacks keyboard definitions, is
based on LZMA-JS by Nathan Rugg, https://github.com/LZMA-JS/LZMA-JS.

${notice('lzma-js.txt')}`,
      },
    ],
    // Tailwind's base styles (its "preflight") are written into the stylesheet, not imported as a module.
    alsoPackages: [{ name: 'tailwindcss', when: has('/src/styles.css') }],
    noLicenceFile: {
      'xz-decompress': (dir) => {
        const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { main: string; author?: string }
        return `The package ships no licence file. Its package.json names the MIT licence, with ${pkg.author ?? 'no author'}
as its author, and its built file opens with this notice:

${openingComment(join(dir, pkg.main))}

The MIT licence's terms, for xz-decompress and for xzwasm by Steve Sanderson (which publishes no licence file
either):

${notice('mit-terms.txt')}

walloc's licence:

${notice('walloc.txt')}

xz-embedded, by Lasse Collin and Igor Pavlov, is in the public domain: https://tukaani.org/xz/embedded.html`
      },
    },
  })
}
