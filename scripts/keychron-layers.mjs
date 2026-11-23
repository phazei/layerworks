// SPDX-License-Identifier: GPL-3.0-or-later
// Rebuilds src/device/keychron-layers.ts: what each layer of a Keychron (and Lemokey) keyboard is for, read from the
// order of `enum layers` in the Vial keymaps of vial-qmk (../vial_qmk/keyboards/keychron/**/keymaps/vial/keymap.c).
// Run it after vial-qmk is updated:
//
//   node scripts/keychron-layers.mjs [path to vial-qmk]     (default: ../vial_qmk beside this repo)
//
// Two keys per keymap:
// - its Vial keyboard ID (VIAL_KEYBOARD_UID in the keymap's config.h), which names exactly that keymap and reads the
//   same on the cable and through a 2.4 GHz receiver;
// - its model, "vendor:product" (hex), from the keymap's vial.json, else the keyboard's keyboard.json / info.json,
//   for a keymap of the same model built elsewhere (its own ID), which most likely keeps the stock order.
// Layer identifiers become the app's words (MAC_BASE "Mac", WIN_FN "Windows Fn", _FN2 "Fn 2" …); one the keymap
// gives no meaning to (L3) becomes null, which the app shows as "Layer n". A model whose keymaps disagree is left out
// of the model table.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const vialQmk = resolve(process.argv[2] ?? join(root, '..', 'vial_qmk'))
const keyboards = join(vialQmk, 'keyboards')
const base = join(keyboards, 'keychron')
if (!existsSync(base)) {
  console.error(`No Keychron keyboards in ${base}: pass the path to a vial-qmk checkout.`)
  process.exit(1)
}

/** Every keymaps/vial folder under `dir`. */
function vialKeymaps(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const path = join(dir, entry.name)
    if (entry.name === 'vial' && dirname(path).endsWith('keymaps')) found.push(path)
    else vialKeymaps(path, found)
  }
  return found
}

const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
/** JSON may carry whole-line // comments; a // inside a string (a URL) stays. */
const jsonWithoutComments = (text) => text.replace(/^\s*\/\/.*$/gm, '')
const readJson = (path) => {
  try {
    return JSON.parse(jsonWithoutComments(readFileSync(path, 'utf8')))
  } catch {
    return null
  }
}

/** The identifiers of `enum layers { … }` in order, or null when the keymap has none. */
function layerIds(keymap) {
  const match = /enum\s+\w*layers?\w*\s*\{([^}]*)\}/.exec(withoutComments(keymap))
  if (!match) return null
  return match[1]
    .split(',')
    .map((part) => part.split('=')[0].trim())
    .filter(Boolean)
}

/** A layer identifier in the app's words, or null for one that says nothing (L3, LAYER_4 …). */
function layerName(id) {
  const name = id.replace(/^_+/, '').toUpperCase()
  const fn = (prefix, n) => `${prefix}Fn${n && n !== '1' ? ` ${n}` : ''}`
  let m
  if (name === 'MAC_BASE' || name === 'MAC') return 'Mac'
  if (name === 'WIN_BASE' || name === 'WIN') return 'Windows'
  if (name === 'BASE') return 'Base'
  if ((m = /^MAC_FN(\d*)$/.exec(name))) return fn('Mac ', m[1])
  if ((m = /^WIN_FN(\d*)$/.exec(name))) return fn('Windows ', m[1])
  if (name === 'FUNC') return 'Fn'
  if ((m = /^FN(\d*)$/.exec(name))) return fn('', m[1])
  return null
}

/** Names for the identifiers; a name given twice keeps its number ("Fn" then "Fn 1"). */
function layerNames(ids) {
  const seen = new Set()
  return ids.map((id) => {
    const name = layerName(id)
    if (name === null) return null
    if (!seen.has(name)) {
      seen.add(name)
      return name
    }
    const numbered = id.toUpperCase().match(/(\d+)$/)
    return numbered ? `${name} ${numbered[1]}` : null
  })
}

/** The Vial keyboard ID as the app writes it (store: the eight bytes read as a little-endian number, in hex). */
function vialUid(config) {
  const match = /VIAL_KEYBOARD_UID\s*\{([^}]*)\}/.exec(withoutComments(config))
  if (!match) return null
  const bytes = match[1].split(',').map((b) => Number(b.trim()))
  if (bytes.length !== 8 || bytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255)) return null
  return '0x' + [...bytes].reverse().map((b) => b.toString(16).padStart(2, '0')).join('')
}

const hex4 = (n) => n.toString(16).padStart(4, '0')

/** "vendor:product" from the definition, else from keyboard.json / info.json in the keyboard's folders. */
function modelOf(definition, dir) {
  let vendor = Number(definition.vendorId)
  let product = Number(definition.productId)
  for (let d = dirname(dirname(dir)); d.startsWith(base) && !(vendor && product); d = dirname(d)) {
    for (const file of ['keyboard.json', 'info.json']) {
      const usb = readJson(join(d, file))?.usb
      if (!usb) continue
      if (!vendor && usb.vid) vendor = Number(usb.vid)
      if (!product && usb.pid) product = Number(usb.pid)
    }
  }
  return vendor > 0 && product > 0 ? `${hex4(vendor)}:${hex4(product)}` : null
}

const byUid = new Map()
const byModel = new Map()
let skipped = 0
for (const dir of vialKeymaps(base)) {
  const keymapPath = join(dir, 'keymap.c')
  const definition = readJson(join(dir, 'vial.json'))
  const ids = existsSync(keymapPath) ? layerIds(readFileSync(keymapPath, 'utf8')) : null
  if (!definition || !ids) {
    skipped++
    continue
  }
  const names = layerNames(ids)
  const where = relative(keyboards, dir).replace(/\\/g, '/').replace(/\/keymaps\/vial$/, '')
  const configPath = join(dir, 'config.h')
  const uid = existsSync(configPath) ? vialUid(readFileSync(configPath, 'utf8')) : null
  if (uid) byUid.set(uid, { names, where })
  const model = modelOf(definition, dir)
  if (model) {
    const entry = byModel.get(model) ?? { names, where: [], conflict: false }
    if (JSON.stringify(entry.names) !== JSON.stringify(names)) entry.conflict = true
    entry.where.push(where)
    byModel.set(model, entry)
  }
}

const models = [...byModel].filter(([, e]) => !e.conflict).sort(([a], [b]) => a.localeCompare(b))
const conflicts = [...byModel].filter(([, e]) => e.conflict)
const uids = [...byUid].sort(([, a], [, b]) => a.where.localeCompare(b.where))
const line = (key, names, where) => `  '${key}': ${JSON.stringify(names)}, // ${where}`

writeFileSync(
  join(root, 'src/device/keychron-layers.ts'),
  `// SPDX-License-Identifier: GPL-3.0-or-later
// GENERATED by scripts/keychron-layers.mjs; don't edit by hand, run the script again.
// Derived from the Vial keymaps of Keychron's keyboards in vial-qmk (GPL-2.0-or-later firmware): the order of each
// keymap's \`enum layers\`, in the app's words. null is a layer the keymap gives no meaning to.

/** By Vial keyboard ID (as the store writes it): exactly that keymap. */
export const KEYCHRON_LAYERS_BY_UID: Readonly<Record<string, readonly (string | null)[]>> = {
${uids.map(([uid, e]) => line(uid, e.names, e.where)).join('\n')}
}

/** By model, "vendor:product" in hex: every Vial keymap of that model in vial-qmk has this order. */
export const KEYCHRON_LAYERS_BY_MODEL: Readonly<Record<string, readonly (string | null)[]>> = {
${models.map(([model, e]) => line(model, e.names, e.where.join(', '))).join('\n')}
}
`,
)
console.log(
  `wrote src/device/keychron-layers.ts: ${uids.length} keymaps by Vial ID, ${models.length} models` +
    (conflicts.length ? `; ${conflicts.length} models left out, their keymaps disagree (${conflicts.map(([k]) => k).join(', ')})` : '') +
    (skipped ? `; ${skipped} keymaps without a definition or a layer list` : ''),
)
