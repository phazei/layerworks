// SPDX-License-Identifier: GPL-3.0-or-later
// Keeps src/vendor/pipette in step with the Pipette reference clone. See VENDOR.md.
//
//   node scripts/vendor.mjs check            vendored files are identical to the recorded commit
//   node scripts/vendor.mjs changed <ref>    vendored files that differ between the recorded commit and <ref>
//   node scripts/vendor.mjs copy [ref]       copy the files from <ref> (default: recorded commit), record it
//
// Reads from the clone's git objects, never its working tree, and only writes inside this repo.

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = join(root, 'vendor.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const clone = resolve(root, manifest.clone)
const skip = new Set(manifest.patched)

// Fixtures the vendored tests read by relative path live outside sourceRoot; "extra" maps them.
const extra = new Map(manifest.extra.map((e) => [e.to, e.from]))
const entries = [...manifest.files, ...extra.keys()]
const sourcePath = (file) => extra.get(file) ?? `${manifest.sourceRoot}/${file}`
const localPath = (file) => (extra.has(file) ? join(root, file) : join(root, manifest.dest, file))

function git(...args) {
  return execFileSync('git', ['-C', clone, ...args], { maxBuffer: 64 * 1024 * 1024 })
}

function upstream(ref, file) {
  return git('show', `${ref}:${sourcePath(file)}`)
}

const lf = (buf) => buf.toString('utf8').replace(/\r\n/g, '\n')

const [command, ref] = process.argv.slice(2)

if (command === 'check') {
  const bad = []
  for (const file of entries) {
    const local = localPath(file)
    if (!existsSync(local)) bad.push(`missing   ${file}`)
    else if (skip.has(file)) continue
    else if (lf(readFileSync(local)) !== lf(upstream(manifest.source.commit, file))) bad.push(`modified  ${file}`)
  }
  for (const file of manifest.standIns) {
    if (!existsSync(join(root, manifest.dest, file))) bad.push(`missing   ${file} (stand-in)`)
  }
  console.log(bad.join('\n') || `${entries.length} vendored files match ${manifest.source.commit}`)
  process.exit(bad.length ? 1 : 0)
} else if (command === 'changed' && ref) {
  process.stdout.write(git('diff', '--stat', manifest.source.commit, ref, '--', ...entries.map(sourcePath)))
} else if (command === 'copy') {
  const from = ref ?? manifest.source.commit
  for (const file of entries) {
    if (skip.has(file)) {
      console.log(`skipped   ${file} (patched: re-apply by hand, see VENDOR.md)`)
      continue
    }
    const local = localPath(file)
    mkdirSync(dirname(local), { recursive: true })
    writeFileSync(local, lf(upstream(from, file)))
  }
  manifest.source.commit = git('rev-parse', '--short=8', from).toString().trim()
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`copied ${entries.length - skip.size} files from ${manifest.source.commit}`)
} else {
  console.log('usage: node scripts/vendor.mjs check | changed <ref> | copy [ref]')
  process.exit(1)
}
