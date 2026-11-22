// SPDX-License-Identifier: GPL-3.0-or-later
// Rebuilds src/demo/keyboards/*.json: other keyboards the demo can stand in for (`?demo-keyboard=<name>`), so the app
// can be seen on keyboards that differ from the K15 Max. Each file holds a Vial definition from vial-qmk (GPL-2.0-or-
// later data), the keyboard's USB identity, where its keys are, and what its firmware has (read from the keymap's
// config.h and rules.mk; what those don't say is set below, with the reason). Run it after vial-qmk is updated:
//
//   node scripts/demo-keyboards.mjs [path to vial-qmk]     (default: ../vial_qmk beside this repo)

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const vialQmk = resolve(process.argv[2] ?? join(root, '..', 'vial_qmk'))
const keyboards = join(vialQmk, 'keyboards')
const out = join(root, 'src', 'demo', 'keyboards')
if (!existsSync(keyboards)) {
  console.error(`No keyboards in ${keyboards}: pass the path to a vial-qmk checkout.`)
  process.exit(1)
}

/**
 * The keyboards, each picked for a difference from the K15 Max. `firmware` sets what config.h and rules.mk don't
 * say outright; everything else is read from them.
 */
const BOARDS = {
  corne: {
    path: 'crkbd',
    shows: 'a split keyboard with rotated thumb keys, underglow, and a definition whose lighting is an object',
  },
  gh80: {
    path: 'gh80_3000',
    shows: 'layout options (nine groups), no lighting, two layers',
  },
  splinter: {
    path: 'kiserdesigns/splinter',
    shows: 'no name in its definition (the browser has its USB name), six knobs, eight layout option groups',
  },
  cloud: {
    path: 'lazydesigners/cloud',
    shows: 'a knob its firmware lets no app change (built without an encoder map), underglow, layout options',
  },
  q2: {
    path: 'keychron/q2/ansi_encoder',
    shows: 'a Keychron board whose layers go Mac, Windows, Fn, Fn 2, Fn 3, with Keychron’s lighting',
  },
  q0: {
    path: 'keychron/q0/base',
    shows: 'a Keychron number pad: no Mac / Windows switch, no knob',
  },
  vipad: {
    path: 'vipad',
    shows: 'firmware that never locks (VIAL_INSECURE), eighteen layers, two knobs, an RGB matrix the definition writes as an object',
  },
  klein: {
    path: 'era/sirind/klein_hs',
    shows: 'a switch matrix too big for the switch-matrix read (10 rows of 16), rotated keys, a backlight',
  },
  macropad: {
    path: 'ymdk/ymd09',
    shows: 'a 3 × 3 macropad: no knob, no slots for multi-tap keys, chords, replacements or repeat rules, no typing settings',
  },
}

const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
/** JSON may carry whole-line // comments; a // inside a string (a URL) stays. */
const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8').replace(/^\s*\/\/.*$/gm, ''))
  } catch {
    return null
  }
}
const read = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : '')

/** The keyboard's folders from the keymap up to keyboards/, innermost first. */
function folders(path) {
  const list = []
  for (let d = join(keyboards, path); d.startsWith(keyboards) && d !== keyboards; d = dirname(d)) list.push(d)
  return list
}

/** A `#define NAME { a, b }` list as numbers, or null. */
function defineList(config, name) {
  const match = new RegExp(`#define\\s+${name}\\s*\\{([^}]*)\\}`).exec(config)
  return match ? match[1].split(',').map((n) => Number(n.trim())) : null
}

/** Whether a rules.mk line switches `name` off (`NAME = no`) or on (`= yes`); null when not said. */
function rule(rules, name) {
  const match = new RegExp(`^\\s*${name}\\s*\\+?=\\s*(yes|no)`, 'mi').exec(rules)
  return match ? match[1] === 'yes' : null
}

/** Where the keys are (row, col, once each; decals and knob turns left out) and the knobs' indices. */
function keysOf(definition) {
  const keys = new Map()
  const knobs = new Set()
  for (const row of definition.layouts?.keymap ?? []) {
    let decal = false
    for (const item of row) {
      if (typeof item === 'object') {
        if (item.d) decal = true
        continue
      }
      const labels = String(item).split('\n')
      const at = /^\s*(\d+)\s*,\s*(\d+)\s*$/.exec(labels[0])
      if (at && labels[9] === 'e') knobs.add(Number(at[1]))
      else if (at && !decal) keys.set(`${at[1]},${at[2]}`, [Number(at[1]), Number(at[2])])
      decal = false
    }
  }
  return { keys: [...keys.values()], knobs: [...knobs].sort((a, b) => a - b) }
}

/** The USB identity WebHID would report: the definition's IDs, else keyboard.json / info.json's, and its name. */
function usbOf(definition, path) {
  let vendorId = Number(definition.vendorId) || 0
  let productId = Number(definition.productId) || 0
  let productName = ''
  for (const dir of folders(path)) {
    for (const file of ['keyboard.json', 'info.json']) {
      const json = readJson(join(dir, file))
      if (!json) continue
      vendorId ||= Number(json.usb?.vid) || 0
      productId ||= Number(json.usb?.pid) || 0
      productName ||= json.keyboard_name ?? ''
    }
  }
  return { vendorId, productId, productName: productName || definition.name || 'Keyboard' }
}

let commit = 'unknown'
try {
  commit = execSync('git rev-parse --short HEAD', { cwd: vialQmk }).toString().trim()
} catch {
  // Not a git checkout: the files still name the folders they come from.
}

mkdirSync(out, { recursive: true })
for (const [name, board] of Object.entries(BOARDS)) {
  const keymap = join(keyboards, board.path, 'keymaps', 'vial')
  const definition = readJson(join(keymap, 'vial.json'))
  if (!definition) throw new Error(`No vial.json in ${keymap}`)
  const config = withoutComments(folders(join(board.path, 'keymaps', 'vial')).map((d) => read(join(d, 'config.h'))).join('\n'))
  const rules = withoutComments(folders(join(board.path, 'keymaps', 'vial')).map((d) => read(join(d, 'rules.mk'))).join('\n'))
  const jsons = folders(board.path).flatMap((d) => ['keyboard.json', 'info.json'].map((f) => readJson(join(d, f)))).filter(Boolean)
  const features = Object.assign({}, ...jsons.map((j) => j.features ?? {}).reverse())
  const on = (name, feature) => rule(rules, name) ?? features[feature] ?? null

  const uid = defineList(config, 'VIAL_KEYBOARD_UID')
  const rows = defineList(config, 'VIAL_UNLOCK_COMBO_ROWS') ?? []
  const cols = defineList(config, 'VIAL_UNLOCK_COMBO_COLS') ?? []
  const layers = Number(
    /#define\s+DYNAMIC_KEYMAP_LAYER_COUNT\s+(\d+)/.exec(config)?.[1] ?? jsons.find((j) => j.dynamic_keymap?.layer_count)?.dynamic_keymap.layer_count ?? 4,
  )
  const { keys, knobs } = keysOf(definition)
  // vial.h sizes the entry tables by the EEPROM there is; 8 of each is typical. A feature switched off has none.
  const slots = (feature) => (rule(rules, feature) === false ? 0 : 8)
  const firmware = {
    vialProtocol: 6,
    uid,
    layers,
    unlockKeys: rows.map((row, i) => [row, cols[i]]),
    insecure: rule(rules, 'VIAL_INSECURE') === true || /#define\s+VIAL_INSECURE/.test(config),
    // Without ENCODER_MAP_ENABLE (off unless switched on), Vial's knob commands go unanswered.
    knobMap: knobs.length > 0 ? on('ENCODER_MAP_ENABLE', 'encoder_map') === true : true,
    entries: {
      tapDance: slots('TAP_DANCE_ENABLE'),
      combo: slots('COMBO_ENABLE'),
      keyOverride: slots('KEY_OVERRIDE_ENABLE'),
      altRepeatKey: slots('REPEAT_KEY_ENABLE'),
    },
    capsWord: on('CAPS_WORD_ENABLE', 'caps_word') !== false,
    layerLock: on('LAYER_LOCK_ENABLE', 'layer_lock') !== false,
    qmkSettings: rule(rules, 'QMK_SETTINGS') !== false,
    // VialRGB is what the app can light; the definition says whether the firmware has it.
    vialrgb: rule(rules, 'VIALRGB_ENABLE') === true,
    // Keychron's commands come with keychron_common.c (keyboards/keychron/common).
    keychron: board.path.startsWith('keychron/'),
  }
  const data = {
    shows: board.shows,
    source: `vial-qmk ${commit}, keyboards/${board.path}/keymaps/vial (GPL-2.0-or-later)`,
    usb: usbOf(definition, board.path),
    keys,
    knobs,
    firmware,
    definition,
  }
  writeFileSync(join(out, `${name}.json`), JSON.stringify(data) + '\n')
  console.log(`${name}: ${definition.name ?? '(no name)'}, ${keys.length} keys, ${knobs.length} knobs, ${layers} layers`)
}
