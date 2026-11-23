// SPDX-License-Identifier: GPL-3.0-or-later
// Rewrites the contents list of every document in docs/ and the map in docs/README.md from their headings
// (between the <!-- contents:start --> and <!-- contents:end --> markers). scripts/__tests__/docs-index.test.ts
// fails while they are out of date.
//
//   pnpm docs:index

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expectedIndexes } from './docs-index-lib.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let changed = 0
for (const [file, text] of expectedIndexes(root)) {
  if (readFileSync(file, 'utf8') === text) continue
  writeFileSync(file, text)
  changed++
  console.log(`updated ${relative(root, file)}`)
}
if (!changed) console.log('the indexes were up to date')
