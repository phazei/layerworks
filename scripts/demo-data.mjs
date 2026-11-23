// SPDX-License-Identifier: GPL-3.0-or-later
// Rebuilds src/demo/k15-max.json, the keyboard behind the app's demo mode, from a Vial definition (vial.json) and a
// keymap backup: JSON with `keys` (layers of rows of numeric keycodes) and `encoders` (layers of knobs, each a pair
// [counter-clockwise, clockwise] of numeric keycodes; the first knob is used).
//
//   node scripts/demo-data.mjs <vial.json> <keymap.json>

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const [definitionPath, backupPath] = process.argv.slice(2)
if (!definitionPath || !backupPath) {
  console.error('usage: node scripts/demo-data.mjs <vial.json> <keymap.json>')
  console.error('  <vial.json>    the keyboard\'s Vial definition')
  console.error('  <keymap.json>  a keymap backup: {"keys": [layer][row][col], "encoders": [layer][knob][ccw, cw]}')
  process.exit(1)
}
const read = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'))

const definition = read(definitionPath)
const backup = read(backupPath)

const layers = backup.keys
  .map((layer) => '    [\n' + layer.map((row) => '      ' + JSON.stringify(row)).join(',\n') + '\n    ]')
  .join(',\n')
const knob = JSON.stringify(backup.encoders.map((layer) => layer[0]))

writeFileSync(
  join(root, 'src/demo/k15-max.json'),
  `{\n  "definition": ${JSON.stringify(definition)},\n  "keymap": [\n${layers}\n  ],\n  "knob": ${knob}\n}\n`,
)
console.log(`wrote src/demo/k15-max.json (${backup.keys.length} layers)`)
