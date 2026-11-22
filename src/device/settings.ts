// SPDX-License-Identifier: GPL-3.0-or-later
// The QMK settings ("QMK Settings" in Vial) in plain words: for every setting id the firmware can report, what it
// is called, what it feels like, how to show it (a time, a switch, one bit of a set of switches) and where it
// belongs on the Typing feel page. Ids, sizes and bits are vial-qmk's (quantum/qmk_settings.c and .h); the texts
// are ours, from QMK's documentation (tap_hold, feature_auto_shift, one_shot_keys, mouse_keys, feature_grave_esc,
// features/combo, features/magic_keycodes).

/** The groups, in the order the page shows them. */
export const SETTING_GROUPS = ['tapHold', 'chords', 'autoShift', 'oneShot', 'mouse', 'magic', 'graveEsc'] as const
export type SettingGroupId = (typeof SETTING_GROUPS)[number]

export interface SettingGroup {
  id: SettingGroupId
  title: string
  /** QMK's name for the feature, shown small beside the title. */
  qmkName: string
  /** One sentence: what this group is for. */
  description: string
}

export const SETTING_GROUP_INFO: Record<SettingGroupId, SettingGroup> = {
  tapHold: {
    id: 'tapHold',
    title: 'Tap or hold',
    qmkName: 'Tap-Hold',
    description:
      'Keys that do one thing when tapped and another when held, such as A when tapped and Ctrl when held: how the keyboard tells the two apart.',
  },
  chords: {
    id: 'chords',
    title: 'Key chords',
    qmkName: 'Combos',
    description: 'How close together the keys of a key chord must go down to count as the chord.',
  },
  autoShift: {
    id: 'autoShift',
    title: 'Capitals by holding',
    qmkName: 'Auto Shift',
    description: 'Hold a key a moment longer to type its capital or symbol, without reaching for Shift.',
  },
  oneShot: {
    id: 'oneShot',
    title: 'One-tap modifiers',
    qmkName: 'One Shot Keys',
    description:
      'Keys you tap once instead of holding: a one-tap Shift applies to the next key only. These set how long it waits and how to lock it on.',
  },
  mouse: {
    id: 'mouse',
    title: 'Mouse keys',
    qmkName: 'Mouse Keys',
    description: 'Keys that move the pointer or scroll: how fast they go and how quickly they speed up.',
  },
  magic: {
    id: 'magic',
    title: 'Swapped and disabled keys',
    qmkName: 'Magic',
    description:
      'Swap or switch off keys (mostly modifiers) for the whole keyboard at once, on every layer, without changing each key.',
  },
  graveEsc: {
    id: 'graveEsc',
    title: 'Esc and ` key',
    qmkName: 'Grave Escape',
    description:
      'For the combined Esc / ` key, if you use one: it sends Esc, or ` while Shift or Win is held. These make it send Esc anyway.',
  },
}

/** What a number is counted in. */
export type SettingUnit = 'ms' | 'taps' | 'px' | 'times' | 'notches' | 'steps'

export interface SettingPreset {
  value: number
  label: string
}

export type SettingControl =
  /** A number on a slider. */
  | {
      kind: 'number'
      unit: SettingUnit
      min: number
      max: number
      step: number
      /** Quick choices shown under the slider. */
      presets?: SettingPreset[]
      /** What 0 means, when it means something special ("Off", "Never"). */
      zero?: string
    }
  /** The whole setting is on (1) or off (0). */
  | { kind: 'switch' }
  /** One bit of the setting; `inverted` when the bit means the opposite of the switch ("don't …"). */
  | { kind: 'flag'; bit: number; inverted?: boolean }

/** Every reported setting's value, decoded, by id. */
export type SettingValues = Readonly<Record<number, number>>

export interface SettingField {
  /** A stable name: for search, tests and the page's help topics. */
  key: string
  qsid: number
  /** The friendly name, shown first. */
  name: string
  /** QMK's name, shown small beside it and searchable. */
  qmkName: string
  /** One or two sentences: what it feels like, with an example where it helps. */
  hint: string
  group: SettingGroupId
  /** Shown under "More options". */
  advanced: boolean
  control: SettingControl
  /** A sentence about the value as it is now, worked out from all the settings (mouse speeds in pixels a second). */
  describe?: (value: number, values: SettingValues) => string | undefined
}

/** Bytes per setting, as qmk_settings.c stores and sends them. Settings 22-24 and 26 are single bits, sent as 0 or 1. */
export const SETTING_WIDTHS: Readonly<Record<number, number>> = {
  1: 1, 2: 2, 3: 1, 4: 2, 5: 1, 6: 2, 7: 2,
  // 8: the tap-hold bits of older vial-qmk (permissive hold, ignore mod-tap interrupt, force hold, retro tapping).
  8: 1,
  9: 2, 10: 2, 11: 2, 12: 2, 13: 2, 14: 2, 15: 2, 16: 2, 17: 2,
  18: 2, 19: 2, 20: 1, 21: 4, 22: 1, 23: 1, 24: 1, 25: 2, 26: 1, 27: 2,
}

export const settingWidth = (qsid: number): number | undefined => SETTING_WIDTHS[qsid]

/** A setting's value from the bytes the keyboard sent (little-endian; bytes past the width are leftovers). */
export function decodeSetting(bytes: readonly number[], width: number): number {
  let value = 0
  for (let i = width - 1; i >= 0; i--) value = value * 256 + (bytes[i] ?? 0)
  return value
}

/** The bytes to send for a value, little-endian, `width` of them. */
export function encodeSetting(value: number, width: number): number[] {
  const out: number[] = []
  let rest = Math.max(0, Math.floor(value))
  for (let i = 0; i < width; i++) {
    out.push(rest % 256)
    rest = Math.floor(rest / 256)
  }
  return out
}

/** The stored bytes with the value put in front, keeping the rest as read (the store keeps the keyboard's reply). */
export function withSettingValue(stored: readonly number[], value: number, width: number): number[] {
  const bytes = encodeSetting(value, width)
  const length = Math.max(stored.length, width)
  return Array.from({ length }, (_, i) => (i < width ? bytes[i] : stored[i]))
}

export const largestValue = (width: number): number => 256 ** width - 1

/** Whether a flag field is on, from its setting's value. */
export function flagOn(field: SettingField, value: number): boolean {
  if (field.control.kind === 'switch') return value !== 0
  if (field.control.kind !== 'flag') return false
  const set = Math.floor(value / 2 ** field.control.bit) % 2 === 1
  return field.control.inverted ? !set : set
}

/** The setting's value with a flag field switched on or off; the other bits stay. */
export function withFlag(field: SettingField, value: number, on: boolean): number {
  if (field.control.kind === 'switch') return on ? 1 : 0
  if (field.control.kind !== 'flag') return value
  const bit = 2 ** field.control.bit
  const set = field.control.inverted ? !on : on
  const now = Math.floor(value / bit) % 2 === 1
  return now === set ? value : set ? value + bit : value - bit
}

/** Every reported setting the app knows the size of, decoded. */
export function settingValues(settings: Readonly<Record<number, readonly number[]>> | null): SettingValues {
  const out: Record<number, number> = {}
  if (!settings) return out
  for (const [id, bytes] of Object.entries(settings)) {
    const width = settingWidth(Number(id))
    if (width !== undefined) out[Number(id)] = decodeSetting(bytes, width)
  }
  return out
}

/** "200 ms", "1.5 s". */
export function formatMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  const seconds = Math.round(ms / 100) / 10
  return `${seconds.toLocaleString('en')} s`
}

/** The value as shown beside its slider. */
export function formatSetting(field: SettingField, value: number): string {
  const control = field.control
  if (control.kind !== 'number') return String(value)
  if (value === 0 && control.zero) return control.zero
  switch (control.unit) {
    case 'ms':
      return formatMs(value)
    case 'taps':
      return value === 1 ? '1 tap' : `${value} taps`
    case 'px':
      return `${value} px`
    case 'times':
      return `${value} ×`
    case 'notches':
      return value === 1 ? '1 notch' : `${value} notches`
    case 'steps':
      return value === 1 ? '1 step' : `${value} steps`
  }
}

const QUICK = 'Quick'
const msPresets = (...list: [number, string][]): SettingPreset[] => list.map(([value, label]) => ({ value, label }))

/** Mouse-key interval: the time between moves (setting 10), with QMK's own default when not reported. */
const moveInterval = (values: SettingValues) => values[10] || 16
const wheelInterval = (values: SettingValues) => values[15] || 80
const perSecond = (perStep: number, intervalMs: number) => Math.round((perStep * 1000) / intervalMs)

const flag = (bit: number, inverted = false): SettingControl => ({ kind: 'flag', bit, ...(inverted ? { inverted } : {}) })
const SWITCH: SettingControl = { kind: 'switch' }

/** Every setting the app knows, in the order the page shows them within each group. */
export const SETTING_FIELDS: readonly SettingField[] = [
  // ---- Tap or hold ----
  {
    key: 'tapping-term',
    qsid: 7,
    name: 'How long counts as a hold',
    qmkName: 'Tapping term',
    hint: 'Keep a tap-or-hold key down longer than this and it acts as held; let go sooner and it is a tap. Shorter makes holds come sooner, longer makes accidental holds rarer.',
    group: 'tapHold',
    advanced: false,
    control: {
      kind: 'number',
      unit: 'ms',
      min: 100,
      max: 500,
      step: 5,
      presets: msPresets([150, QUICK], [200, 'Usual'], [250, 'Relaxed'], [300, 'Slow']),
    },
  },
  {
    key: 'permissive-hold',
    qsid: 22,
    name: 'Hold when another key is tapped inside it',
    qmkName: 'Permissive Hold',
    hint: 'Hold a tap-or-hold key, tap another key and let it go, all quickly: that counts as a hold, even before the time is up. Good for quick shortcuts like Ctrl + C with a Ctrl on a letter key.',
    group: 'tapHold',
    advanced: true,
    control: SWITCH,
  },
  {
    key: 'hold-on-other-key',
    qsid: 23,
    name: 'Hold as soon as another key goes down',
    qmkName: 'Hold On Other Key Press',
    hint: 'Pressing any other key while a tap-or-hold key is down makes it a hold at once. The quickest for shortcuts, but in fast typing a letter can turn into a modifier.',
    group: 'tapHold',
    advanced: true,
    control: SWITCH,
  },
  {
    key: 'chordal-hold',
    qsid: 26,
    name: 'Holds only with a key on the other hand',
    qmkName: 'Chordal Hold',
    hint: 'A tap-or-hold key only turns into a hold early when the next key is on the other half of the keyboard; with a key on the same half it stays a tap. Stops fast rolls on one hand from firing modifiers. The firmware knows each key’s half from the keyboard’s layout; keys in the middle, like a space bar, count as either.',
    group: 'tapHold',
    advanced: true,
    control: SWITCH,
  },
  {
    key: 'retro-tapping',
    qsid: 24,
    name: 'Tap anyway when held alone',
    qmkName: 'Retro Tapping',
    hint: 'Hold a tap-or-hold key past the time, then let go without pressing anything else: it still sends its tap. Without this, such a press sends nothing.',
    group: 'tapHold',
    advanced: true,
    control: SWITCH,
  },
  {
    key: 'quick-tap-term',
    qsid: 25,
    name: 'Tap, then hold to repeat',
    qmkName: 'Quick Tap Term',
    hint: 'Tap a tap-or-hold key and press it again within this time: holding it now repeats its tap key (a held Space keeps typing spaces) instead of acting as held. 0 turns this off. It works up to “How long counts as a hold”; longer makes no difference.',
    group: 'tapHold',
    advanced: true,
    control: { kind: 'number', unit: 'ms', min: 0, max: 500, step: 5, zero: 'Off' },
  },
  {
    key: 'flow-tap',
    qsid: 27,
    name: 'Taps only while typing fast',
    qmkName: 'Flow Tap',
    hint: 'A tap-or-hold letter pressed within this time after another letter, Space or . , ; / is always a tap, so quick typing never fires a modifier. 0 turns this off.',
    group: 'tapHold',
    advanced: true,
    control: { kind: 'number', unit: 'ms', min: 0, max: 500, step: 5, zero: 'Off' },
  },
  {
    key: 'tapping-toggle',
    qsid: 20,
    name: 'Taps to lock a layer on',
    qmkName: 'Tapping Toggle',
    hint: 'For “hold for a layer, tap to lock it” keys (TT): tapping one this many times locks its layer on; the same again unlocks it.',
    group: 'tapHold',
    advanced: true,
    control: { kind: 'number', unit: 'taps', min: 1, max: 10, step: 1 },
  },
  {
    key: 'tap-hold-caps-delay',
    qsid: 19,
    name: 'Caps Lock press length',
    qmkName: 'Tap Hold Caps Delay',
    hint: 'How long Caps Lock stays down when a tap-or-hold key taps it. macOS ignores very short Caps Lock presses.',
    group: 'tapHold',
    advanced: true,
    control: { kind: 'number', unit: 'ms', min: 0, max: 500, step: 10 },
  },
  {
    key: 'tap-code-delay',
    qsid: 18,
    name: 'Length of taps the keyboard sends',
    qmkName: 'Tap Code Delay',
    hint: 'When the keyboard taps a key by itself (the tap of a tap-or-hold key, a multi-tap key, a macro’s Tap a key step), how long it holds it down. Raise it if a program misses those taps. Knob turns and a macro’s typed text use a fixed length built into the firmware.',
    group: 'tapHold',
    advanced: true,
    control: { kind: 'number', unit: 'ms', min: 0, max: 100, step: 1 },
  },
  {
    key: 'legacy-permissive-hold',
    qsid: 8,
    name: 'Hold when another key is tapped inside it',
    qmkName: 'Permissive Hold (older firmware)',
    hint: 'Hold a tap-or-hold key, tap another key and let it go, all quickly: that counts as a hold, even before the time is up.',
    group: 'tapHold',
    advanced: true,
    control: flag(0),
  },
  {
    key: 'legacy-ignore-interrupt',
    qsid: 8,
    name: 'Ignore other keys while deciding',
    qmkName: 'Ignore Mod Tap Interrupt (older firmware)',
    hint: 'Another key pressed while a tap-or-hold key is down doesn’t make it a hold; only the time decides.',
    group: 'tapHold',
    advanced: true,
    control: flag(1),
  },
  {
    key: 'legacy-force-hold',
    qsid: 8,
    name: 'No repeat after a quick tap',
    qmkName: 'Tapping Force Hold (older firmware)',
    hint: 'Tapping a tap-or-hold key and holding it straight after acts as held, rather than repeating its tap key.',
    group: 'tapHold',
    advanced: true,
    control: flag(2),
  },
  {
    key: 'legacy-retro-tapping',
    qsid: 8,
    name: 'Tap anyway when held alone',
    qmkName: 'Retro Tapping (older firmware)',
    hint: 'Hold a tap-or-hold key past the time, then let go without pressing anything else: it still sends its tap.',
    group: 'tapHold',
    advanced: true,
    control: flag(3),
  },

  // ---- Key chords ----
  {
    key: 'combo-term',
    qsid: 2,
    name: 'Time to press them all',
    qmkName: 'Combo term',
    hint: 'Press every key of a chord within this time and the chord happens; slower, and they type as usual. Too long, and fast typing sets chords off by accident.',
    group: 'chords',
    advanced: false,
    control: {
      kind: 'number',
      unit: 'ms',
      min: 10,
      max: 200,
      step: 5,
      presets: msPresets([30, 'Tight'], [50, 'Usual'], [80, 'Relaxed']),
    },
  },

  // ---- Capitals by holding ----
  {
    key: 'auto-shift',
    qsid: 3,
    name: 'Hold for capitals',
    qmkName: 'Auto Shift',
    hint: 'Hold a letter a moment longer and it comes out as a capital: a quick a gives a, a longer one A. Numbers and symbols the same: 1 or !.',
    group: 'autoShift',
    advanced: false,
    control: flag(0),
  },
  {
    key: 'auto-shift-timeout',
    qsid: 4,
    name: 'How long to hold',
    qmkName: 'Auto Shift timeout',
    hint: 'Held at least this long, a key types its shifted version.',
    group: 'autoShift',
    advanced: false,
    control: {
      kind: 'number',
      unit: 'ms',
      min: 100,
      max: 400,
      step: 5,
      presets: msPresets([150, QUICK], [175, 'Usual'], [225, 'Relaxed']),
    },
  },
  {
    key: 'auto-shift-letters',
    qsid: 3,
    name: 'Letters',
    qmkName: 'NO_AUTO_SHIFT_ALPHA',
    hint: 'A held letter types its capital.',
    group: 'autoShift',
    advanced: true,
    control: flag(4, true),
  },
  {
    key: 'auto-shift-numbers',
    qsid: 3,
    name: 'Numbers',
    qmkName: 'NO_AUTO_SHIFT_NUMERIC',
    hint: 'A held number types the symbol above it: 1 gives !.',
    group: 'autoShift',
    advanced: true,
    control: flag(3, true),
  },
  {
    key: 'auto-shift-symbols',
    qsid: 3,
    name: 'Symbols',
    qmkName: 'NO_AUTO_SHIFT_SPECIAL',
    hint: 'Held - = [ ] ; and the other symbol keys type what is above them: _ + { } :.',
    group: 'autoShift',
    advanced: true,
    control: flag(2, true),
  },
  {
    key: 'auto-shift-modifiers',
    qsid: 3,
    name: 'Also with Ctrl, Alt or Win held',
    qmkName: 'AUTO_SHIFT_MODIFIERS',
    hint: 'A long press still adds Shift while another modifier is held: Ctrl and a held A give Ctrl + Shift + A. Off, a key pressed while Ctrl, Alt, Win or Right Shift is held is never shifted by holding.',
    group: 'autoShift',
    advanced: true,
    control: flag(1),
  },
  {
    key: 'auto-shift-repeat',
    qsid: 3,
    name: 'Held keys repeat',
    qmkName: 'AUTO_SHIFT_REPEAT',
    hint: 'Keep holding past the time and the shifted key repeats, as a held key normally does; tap and then hold to repeat the unshifted one. Off, a long press types one character.',
    group: 'autoShift',
    advanced: true,
    control: flag(5),
  },
  {
    key: 'auto-shift-no-auto-repeat',
    qsid: 3,
    name: 'Repeat only after a tap',
    qmkName: 'AUTO_SHIFT_NO_AUTO_REPEAT',
    hint: 'With repeating on: a long press types one shifted character; to repeat, tap the key and then hold it.',
    group: 'autoShift',
    advanced: true,
    control: flag(6),
  },

  // ---- One-tap modifiers ----
  {
    key: 'one-shot-timeout',
    qsid: 6,
    name: 'Forget it after',
    qmkName: 'One shot timeout',
    hint: 'A one-tap modifier waits this long for the next key, then lets go by itself.',
    group: 'oneShot',
    advanced: false,
    control: {
      kind: 'number',
      unit: 'ms',
      min: 0,
      max: 10000,
      step: 250,
      zero: 'Never',
      presets: msPresets([2000, '2 s'], [5000, '5 s'], [0, 'Never']),
    },
  },
  {
    key: 'one-shot-tap-toggle',
    qsid: 5,
    name: 'Taps to lock it on',
    qmkName: 'One shot tap toggle',
    hint: 'Tap a one-tap modifier this many times in a row and it stays on, like Caps Lock for Shift, until you tap it again. 0 or 1 turns locking off.',
    group: 'oneShot',
    advanced: false,
    control: { kind: 'number', unit: 'taps', min: 0, max: 10, step: 1, zero: 'Off' },
  },

  // ---- Mouse keys ----
  {
    key: 'mouse-max-speed',
    qsid: 12,
    name: 'Top speed',
    qmkName: 'Mouse key max speed',
    hint: 'At full speed each move goes this many times the first step.',
    group: 'mouse',
    advanced: false,
    control: { kind: 'number', unit: 'times', min: 1, max: 100, step: 1 },
    describe: (value, values) =>
      `About ${perSecond((values[11] || 1) * value, moveInterval(values)).toLocaleString('en')} pixels a second at top speed.`,
  },
  {
    key: 'mouse-time-to-max',
    qsid: 13,
    name: 'Time to reach top speed',
    qmkName: 'Mouse key time to max',
    hint: 'How many moves it takes to speed up from a crawl to top speed. 0 starts at top speed.',
    group: 'mouse',
    advanced: false,
    control: { kind: 'number', unit: 'steps', min: 0, max: 255, step: 1 },
    describe: (value, values) =>
      value === 0 ? undefined : `About ${formatMs(value * moveInterval(values))} of holding.`,
  },
  {
    key: 'mouse-wheel-max-speed',
    qsid: 16,
    name: 'Top scroll speed',
    qmkName: 'Mouse wheel max speed',
    hint: 'How many wheel notches one scroll step turns at full speed.',
    group: 'mouse',
    advanced: false,
    control: { kind: 'number', unit: 'notches', min: 1, max: 50, step: 1 },
    describe: (value, values) => `About ${perSecond(value, wheelInterval(values))} notches a second at top speed.`,
  },
  {
    key: 'mouse-delay',
    qsid: 9,
    name: 'Wait before moving on',
    qmkName: 'Mouse key delay',
    hint: 'A press moves the pointer one step; held this long, it starts moving on its own. Longer makes small nudges easier.',
    group: 'mouse',
    advanced: true,
    control: { kind: 'number', unit: 'ms', min: 0, max: 1000, step: 10 },
  },
  {
    key: 'mouse-interval',
    qsid: 10,
    name: 'Time between moves',
    qmkName: 'Mouse key interval',
    hint: 'How often the pointer moves while a key is held. Shorter is smoother and faster.',
    group: 'mouse',
    advanced: true,
    control: { kind: 'number', unit: 'ms', min: 8, max: 100, step: 1 },
  },
  {
    key: 'mouse-move-delta',
    qsid: 11,
    name: 'First step',
    qmkName: 'Mouse key move delta',
    hint: 'How far the pointer moves on a single press, and on each move before it speeds up. Top speed is this times the top speed setting.',
    group: 'mouse',
    advanced: true,
    control: { kind: 'number', unit: 'px', min: 1, max: 32, step: 1 },
  },
  {
    key: 'mouse-wheel-delay',
    qsid: 14,
    name: 'Wait before scrolling on',
    qmkName: 'Mouse wheel delay',
    hint: 'A press scrolls one step; held this long, it keeps scrolling.',
    group: 'mouse',
    advanced: true,
    control: { kind: 'number', unit: 'ms', min: 0, max: 1000, step: 10 },
  },
  {
    key: 'mouse-wheel-interval',
    qsid: 15,
    name: 'Time between scroll steps',
    qmkName: 'Mouse wheel interval',
    hint: 'How often it scrolls while a key is held. Shorter scrolls faster.',
    group: 'mouse',
    advanced: true,
    control: { kind: 'number', unit: 'ms', min: 10, max: 255, step: 5 },
  },
  {
    key: 'mouse-wheel-time-to-max',
    qsid: 17,
    name: 'Time to reach top scroll speed',
    qmkName: 'Mouse wheel time to max',
    hint: 'How many scroll steps it takes to reach top scroll speed. 0 starts at top speed.',
    group: 'mouse',
    advanced: true,
    control: { kind: 'number', unit: 'steps', min: 0, max: 255, step: 1 },
    describe: (value, values) =>
      value === 0 ? undefined : `About ${formatMs(value * wheelInterval(values))} of holding.`,
  },

  // ---- Swapped and disabled keys ----
  {
    key: 'caps-as-ctrl',
    qsid: 21,
    name: 'Caps Lock works as Ctrl',
    qmkName: 'Caps Lock to Control',
    hint: 'The Caps Lock key becomes another Ctrl, closer to the home row. There is no Caps Lock then, unless a key elsewhere has it.',
    group: 'magic',
    advanced: false,
    control: flag(1),
  },
  {
    key: 'swap-caps-ctrl',
    qsid: 21,
    name: 'Swap Caps Lock and left Ctrl',
    qmkName: 'Swap Control and Caps Lock',
    hint: 'Each does the other’s job: Ctrl where Caps Lock is, and Caps Lock bottom left.',
    group: 'magic',
    advanced: false,
    control: flag(0),
  },
  {
    key: 'no-gui',
    qsid: 21,
    name: 'Windows keys do nothing',
    qmkName: 'No GUI',
    hint: 'Both Windows (or Cmd) keys stop working, so a stray press can’t throw you out of a game.',
    group: 'magic',
    advanced: false,
    control: flag(4),
  },
  {
    key: 'swap-lalt-lgui',
    qsid: 21,
    name: 'Swap left Alt and left Win',
    qmkName: 'Swap Left Alt and GUI',
    hint: 'For a Windows layout on a Mac, or the other way round: Cmd and Option trade places on the left.',
    group: 'magic',
    advanced: false,
    control: flag(2),
  },
  {
    key: 'swap-ralt-rgui',
    qsid: 21,
    name: 'Swap right Alt and right Win',
    qmkName: 'Swap Right Alt and GUI',
    hint: 'The same on the right side of the keyboard.',
    group: 'magic',
    advanced: true,
    control: flag(3),
  },
  {
    key: 'swap-lctl-lgui',
    qsid: 21,
    name: 'Swap left Ctrl and left Win',
    qmkName: 'Swap Left Control and GUI',
    hint: 'For Mac habits on Windows: the Win key becomes Ctrl, so copy and paste are where Cmd is on a Mac-style keyboard.',
    group: 'magic',
    advanced: true,
    control: flag(8),
  },
  {
    key: 'swap-rctl-rgui',
    qsid: 21,
    name: 'Swap right Ctrl and right Win',
    qmkName: 'Swap Right Control and GUI',
    hint: 'The same on the right side of the keyboard.',
    group: 'magic',
    advanced: true,
    control: flag(9),
  },
  {
    key: 'swap-grave-esc',
    qsid: 21,
    name: 'Swap ` and Esc',
    qmkName: 'Swap Grave and Escape',
    hint: 'The ` key sends Esc and the Esc key sends `.',
    group: 'magic',
    advanced: true,
    control: flag(5),
  },
  {
    key: 'swap-backslash-backspace',
    qsid: 21,
    name: 'Swap \\ and Backspace',
    qmkName: 'Swap Backslash and Backspace',
    hint: 'The \\ key deletes and Backspace types \\, for layouts where \\ sits closer to the hand.',
    group: 'magic',
    advanced: true,
    control: flag(6),
  },
  {
    key: 'nkro',
    qsid: 21,
    name: 'Any number of keys at once',
    qmkName: 'N-key rollover (NKRO)',
    hint: 'The keyboard tells the computer about every key held, not just six at a time. A few BIOS screens and old computers don’t understand this; turn it off if keys stop working there.',
    group: 'magic',
    advanced: true,
    control: flag(7),
  },

  // ---- Esc and ` key ----
  {
    key: 'grave-esc-ctrl',
    qsid: 1,
    name: 'Esc while Ctrl is held',
    qmkName: 'GRAVE_ESC_CTRL_OVERRIDE',
    hint: 'So Ctrl + Shift + Esc opens the Task Manager on Windows.',
    group: 'graveEsc',
    advanced: false,
    control: flag(1),
  },
  {
    key: 'grave-esc-alt',
    qsid: 1,
    name: 'Esc while Alt is held',
    qmkName: 'GRAVE_ESC_ALT_OVERRIDE',
    hint: 'Shortcuts with Alt and Shift or Win send Esc rather than `.',
    group: 'graveEsc',
    advanced: false,
    control: flag(0),
  },
  {
    key: 'grave-esc-gui',
    qsid: 1,
    name: 'Esc while Win is held',
    qmkName: 'GRAVE_ESC_GUI_OVERRIDE',
    hint: 'Win + the key sends Win + Esc. On a Mac, Cmd + ` (switching windows) then needs another key.',
    group: 'graveEsc',
    advanced: false,
    control: flag(2),
  },
  {
    key: 'grave-esc-shift',
    qsid: 1,
    name: 'Esc while Shift is held',
    qmkName: 'GRAVE_ESC_SHIFT_OVERRIDE',
    hint: 'Shift + the key sends Shift + Esc; ~ then needs another key.',
    group: 'graveEsc',
    advanced: false,
    control: flag(3),
  },
]

/** The fields of one setting id. */
export const fieldsOf = (qsid: number): SettingField[] => SETTING_FIELDS.filter((f) => f.qsid === qsid)

/** Whether the app knows what a setting id is. */
export const isKnownSetting = (qsid: number): boolean => SETTING_FIELDS.some((f) => f.qsid === qsid)

/** A number field's range, widened to take in the value the keyboard holds, so the slider can show it. */
export function fieldRange(field: SettingField, value: number): { min: number; max: number } {
  if (field.control.kind !== 'number') return { min: 0, max: 1 }
  return { min: Math.min(field.control.min, value), max: Math.max(field.control.max, value) }
}

/** Lowercase text a search looks through: friendly name, QMK name, the hint and the group. */
export function fieldSearchText(field: SettingField): string {
  const group = SETTING_GROUP_INFO[field.group]
  return [field.name, field.qmkName, field.hint, group.title, group.qmkName].join(' ').toLowerCase()
}
