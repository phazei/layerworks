// SPDX-License-Identifier: GPL-3.0-or-later
// The words a user meets in other apps, guides and forums, each with what Layerworks calls it and the topic that
// explains it. Shown as the Help page's glossary and searched with the topics.

import type { HelpTopicId } from './topics'

export interface GlossaryEntry {
  /** The word as others use it. */
  term: string
  /** Other spellings and QMK names for the same thing, searchable. */
  aka?: string
  /** What Layerworks calls it, where it has its own name. */
  friendly?: string
  /** One short line on what it is. */
  meaning: string
  topic: HelpTopicId
}

/** In alphabetical order of the term. */
export const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'Alt repeat key',
    aka: 'QK_AREP, QK_ALT_REPEAT_KEY',
    friendly: 'Repeat rule',
    meaning: 'A key that sends the “opposite” of the last key: Ctrl + Y after Ctrl + Z.',
    topic: 'alt-repeat',
  },
  {
    term: 'Auto Shift',
    friendly: 'Capitals by holding',
    meaning: 'Hold a key a little longer to get its shifted version.',
    topic: 'typing-auto-shift',
  },
  {
    term: 'Backup',
    aka: 'Back up, .layerworks.json, export',
    meaning: 'One file with everything the keyboard holds, to put back later.',
    topic: 'backup',
  },
  {
    term: 'Bootloader',
    aka: 'QK_BOOT, DFU, flash mode',
    friendly: 'Firmware update mode',
    meaning: 'The mode the keyboard restarts into to take new firmware.',
    topic: 'firmware',
  },
  {
    term: 'Caps Word',
    aka: 'CW_TOGG',
    friendly: 'Capitals for one word',
    meaning: 'Capitals until the end of the word, without holding Shift.',
    topic: 'caps-word',
  },
  {
    term: 'Combo',
    aka: 'Combos, combo term',
    friendly: 'Key chord',
    meaning: 'Two to four keys pressed together send something else.',
    topic: 'combos',
  },
  {
    term: 'Debounce',
    aka: 'Chatter',
    friendly: 'Key bounce filter',
    meaning: 'How long the keyboard waits for a switch to settle, so one press never types twice.',
    topic: 'typing-debounce',
  },
  {
    term: 'EEPROM',
    friendly: 'The keyboard’s memory',
    meaning: 'Where the keyboard keeps your changes when it is unplugged.',
    topic: 'saving',
  },
  {
    term: 'Encoder',
    aka: 'Rotary encoder',
    friendly: 'The knob',
    meaning: 'The knob: each click of a turn presses a key.',
    topic: 'knob',
  },
  {
    term: 'Firmware',
    meaning: 'The program inside the keyboard. Keychron keyboards run QMK.',
    topic: 'firmware',
  },
  {
    term: 'Fn',
    aka: 'MO(1), MO(3)',
    friendly: 'The Fn layer',
    meaning: 'The key that holds the Fn layer on while it is down: a layer key.',
    topic: 'layers',
  },
  {
    term: 'Grave Escape',
    aka: 'QK_GESC, GRAVE_ESC',
    friendly: 'The combined Esc and ` key',
    meaning: 'One key for Esc, and ` with Shift or Win held.',
    topic: 'typing-grave-esc',
  },
  {
    term: 'ISO and JIS keys',
    aka: 'KC_NUHS, KC_NUBS, Non-US, KC_INT1, KC_LANG1, Kana, Henkan',
    friendly: 'International keys',
    meaning: 'The extra keys of ISO, Japanese and Korean keyboards.',
    topic: 'international-keys',
  },
  {
    term: 'Joystick',
    aka: 'JS_0, joystick buttons, game controller',
    meaning: 'Game controller buttons a keyboard can send. Few firmwares include them; the palette leaves them out.',
    topic: 'left-out-keys',
  },
  {
    term: 'Key override',
    aka: 'Key overrides, ko_make_basic',
    friendly: 'Shortcut replacement',
    meaning: 'A key pressed with certain modifiers sends something else: Shift + Backspace → Delete.',
    topic: 'key-overrides',
  },
  {
    term: 'Keycode',
    aka: 'KC_A, KC_*',
    friendly: 'Key code',
    meaning: 'The number (or QMK name) stored for what a key does.',
    topic: 'raw-code',
  },
  {
    term: 'KC_NO',
    aka: 'XXXXXXX',
    friendly: 'Nothing',
    meaning: 'The key does nothing on this layer.',
    topic: 'nothing',
  },
  {
    term: 'KC_TRNS',
    aka: '_______, transparent, KC_TRANSPARENT',
    friendly: 'Same as the layer below',
    meaning: 'The key does what it does on the layer underneath.',
    topic: 'transparent',
  },
  {
    term: 'Keychron Launcher',
    aka: 'Launcher',
    meaning: 'Keychron’s own web app. It speaks VIA, and doesn’t work with Vial firmware.',
    topic: 'firmware',
  },
  {
    term: 'Layer',
    aka: 'Layers',
    meaning: 'A complete set of key assignments; Fn switches to another one.',
    topic: 'layers',
  },
  {
    term: 'Layer Lock',
    aka: 'QK_LLCK, QK_LAYER_LOCK',
    friendly: 'Lock a layer on',
    meaning: 'Keeps a held layer on after you let go.',
    topic: 'layer-lock',
  },
  {
    term: 'Layer-tap',
    aka: 'LT(layer, kc), LT',
    friendly: 'Tap for a key, hold for a layer',
    meaning: 'A plain key when tapped, a layer while held.',
    topic: 'layer-tap',
  },
  {
    term: 'Macro',
    aka: 'M0, Macros, dynamic macro',
    friendly: 'Macro',
    meaning: 'One key that types text or presses several keys in turn.',
    topic: 'macros',
  },
  {
    term: 'Magic keycodes',
    aka: 'Magic, MAGIC_SWAP, CL_SWAP, GU_TOGG, AG_SWAP',
    friendly: 'Swapped and disabled keys',
    meaning: 'Swap Caps Lock and Ctrl, Alt and Win, or switch the Windows keys off.',
    topic: 'typing-magic',
  },
  {
    term: 'Matrix',
    aka: 'Key matrix, matrix tester',
    friendly: 'The keyboard’s switches',
    meaning: 'The grid of wires the keys sit on. Reading it shows every key, Fn included.',
    topic: 'test-keys',
  },
  {
    term: 'MIDI',
    aka: 'MI_C, music keys, sequencer',
    meaning: 'Keys that play notes in music software. Few firmwares include them; the palette leaves them out.',
    topic: 'left-out-keys',
  },
  {
    term: 'MO, TG, TO, TT, DF',
    aka: 'MO(1), momentary, toggle layer, OSL',
    friendly: 'Layer keys',
    meaning: 'Keys that switch layers: while held, on and off, for the next key, and so on.',
    topic: 'layer-key',
  },
  {
    term: 'Mod-tap',
    aka: 'MT(mod, kc), LCTL_T, home row mods',
    friendly: 'Tap for a key, hold for a modifier',
    meaning: 'A plain key when tapped, Ctrl, Shift, Alt or Win while held.',
    topic: 'mod-tap',
  },
  {
    term: 'N-key rollover',
    aka: 'NKRO, 6KRO',
    friendly: 'Any number of keys at once',
    meaning: 'The computer sees every key held, not just six.',
    topic: 'typing-magic',
  },
  {
    term: 'One-shot modifier',
    aka: 'OSM(mod), sticky keys, one shot keys',
    friendly: 'Modifier for the next key only',
    meaning: 'Tap Shift, then a key: the key comes with Shift.',
    topic: 'one-shot-mod',
  },
  {
    term: 'Programmable button',
    aka: 'PB_1, QK_PROGRAMMABLE_BUTTON',
    meaning: 'Extra buttons programs can listen for. Few firmwares include them; F13 – F24 do the same job everywhere.',
    topic: 'left-out-keys',
  },
  {
    term: 'QMK',
    aka: 'Quantum Mechanical Keyboard',
    friendly: 'The firmware',
    meaning: 'The free firmware most enthusiast keyboards run, Keychron’s included.',
    topic: 'firmware',
  },
  {
    term: 'QMK Settings',
    aka: 'qsid',
    friendly: 'Typing feel',
    meaning: 'The firmware’s timings and switches, changed without new firmware.',
    topic: 'typing-feel',
  },
  {
    term: 'RGB Matrix',
    aka: 'RGB, backlight, per-key RGB',
    friendly: 'Lighting effects',
    meaning: 'The key lights and the effects they play.',
    topic: 'lighting-effect',
  },
  {
    term: 'SOCD',
    aka: 'Snap tap, rappy snappy',
    friendly: 'Snap Click',
    meaning: 'Which of two opposite keys counts when both are held, for games.',
    topic: 'typing-snap-click',
  },
  {
    term: 'Space Cadet',
    aka: 'SC_LSPO, KC_LSPO, SC_RSPC, SC_SENT, space cadet shift',
    friendly: 'Shift when held, bracket when tapped',
    meaning: 'Shift (or Ctrl, or Alt) while held, ( or ) when tapped.',
    topic: 'helper-keys',
  },
  {
    term: 'Tap dance',
    aka: 'TD(0), tapdance',
    friendly: 'Multi-tap key',
    meaning: 'One key that does different things on a tap, a hold or a double tap.',
    topic: 'tap-dance',
  },
  {
    term: 'Tapping term',
    aka: 'TAPPING_TERM',
    friendly: 'How long counts as a hold',
    meaning: 'The time that tells a tap from a hold.',
    topic: 'typing-tap-hold',
  },
  {
    term: 'Unlock',
    aka: 'Vial unlock, unlock keys',
    friendly: 'Unlock',
    meaning: 'Holding two keys so the keyboard allows its few protected changes.',
    topic: 'unlock',
  },
  {
    term: 'VIA',
    meaning: 'An older way for apps to change QMK keyboards. Vial firmware understands it too.',
    topic: 'firmware',
  },
  {
    term: 'Vial',
    aka: '.vil',
    meaning: 'The addition to QMK that lets this app change the keyboard while it runs; also an app of its own.',
    topic: 'firmware',
  },
]
