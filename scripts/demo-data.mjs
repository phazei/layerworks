// SPDX-License-Identifier: GPL-3.0-or-later
// Rebuilds src/demo/k15-max.json, the keyboard behind the app's demo mode, from the Alice-Keyboard project:
// the firmware's Vial definition and the saved keymap backup.
//
//   node scripts/demo-data.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const project = resolve(root, '..')
const read = (path) => JSON.parse(readFileSync(join(project, path), 'utf8'))

const definition = read('keyboards/keychron/k15_max/ansi_encoder/rgb/keymaps/ripple/vial.json')
const backup = read('backups/keymap.json')

const layers = backup.keys
  .map((layer) => '    [\n' + layer.map((row) => '      ' + JSON.stringify(row)).join(',\n') + '\n    ]')
  .join(',\n')
const knob = JSON.stringify(backup.encoders.map((layer) => layer[0]))

writeFileSync(
  join(root, 'src/demo/k15-max.json'),
  `{\n  "definition": ${JSON.stringify(definition)},\n  "keymap": [\n${layers}\n  ],\n  "knob": ${knob}\n}\n`,
)
console.log(`wrote src/demo/k15-max.json (${backup.keys.length} layers)`)
