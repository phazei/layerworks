// SPDX-License-Identifier: GPL-3.0-or-later
// The app's own explanations: a sentence or two and an example each, in plain words, with a link to the QMK
// documentation for depth. The help panel and the Help page both show these.

export interface HelpTopic {
  title: string
  /** What QMK calls it, shown beside the title and searchable. */
  qmkName?: string
  body: string[]
  example?: string
  /** The matching page of the QMK documentation. */
  docs?: string
}

const QMK = 'https://docs.qmk.fm/'

const topics = {
  layers: {
    title: 'Layers',
    body: [
      'A layer is a complete set of key assignments. The keyboard has several, stacked on top of each other, and you move between them with layer keys, the way Shift gives every letter key a second meaning.',
      'Keychron keyboards use one pair of layers for Mac and another for Windows; the switch on the keyboard picks the pair. In each pair the first layer is what the keys normally do and the second is what they do while Fn is held.',
    ],
    example: 'On the Windows Fn layer, the F1 key can change screen brightness; on the Windows layer it is plain F1.',
    docs: QMK + 'feature_layers',
  },
  'live-layer': {
    title: 'Follow the keyboard',
    body: [
      'The keyboard tells the app which layer is active. With this on, the picture always shows that layer: hold Fn and you see the Fn layer.',
      'Turn it off, or click a layer, to look at or edit a layer without holding anything.',
    ],
  },
  'assign-key': {
    title: 'Changing what a key does',
    body: [
      'Click a key in the picture, then choose what it should do. The change is written to the keyboard straight away and stays there, on any computer, without this app running.',
      'Every change can be undone with the arrows in the bar at the bottom.',
    ],
    example: 'Click Caps Lock, then pick Esc: the Caps Lock key now sends Esc.',
  },
  'shortcut-key': {
    title: 'A shortcut on one key',
    qmkName: 'Modifier + key',
    body: ['One key that presses a key together with Ctrl, Shift, Alt or the Windows key.'],
    example: 'Tick Ctrl and pick C: the key sends Ctrl+C (copy) in one press.',
    docs: QMK + 'feature_advanced_keycodes',
  },
  'layer-key': {
    title: 'Layer keys',
    qmkName: 'MO, TG, TO, OSL, DF',
    body: [
      'A layer key switches to another layer. The usual kind works while held, like Fn. Others switch a layer on until pressed again, or just for the next key.',
      'The key that takes you to a layer should be empty ("same as the layer below") on that layer, or you can get stuck there.',
    ],
    example: '"While held → Fn2" on the right B key: holding B turns the keys around J into a number pad.',
    docs: QMK + 'feature_layers#switching-and-toggling-layers',
  },
  transparent: {
    title: 'Same as the layer below',
    qmkName: 'KC_TRNS, transparent',
    body: [
      'The key has no assignment of its own on this layer and does whatever it does on the layer underneath. Most keys on an Fn layer are like this, which is why letters still type while Fn is held.',
    ],
    docs: QMK + 'keycodes_basic#special-keys',
  },
  nothing: {
    title: 'Nothing',
    qmkName: 'KC_NO',
    body: ['The key does nothing at all on this layer, and does not fall through to the layer below.'],
  },
  knob: {
    title: 'The knob',
    qmkName: 'Encoder',
    body: [
      'Turning the knob one click left or right presses a key, and you can choose which for each direction and each layer. Pressing the knob is an ordinary key.',
    ],
    example: 'Turn right for Volume Up, left for Volume Down, press for Mute.',
    docs: QMK + 'features/encoders',
  },
  'raw-code': {
    title: 'Key code',
    qmkName: 'Keycode',
    body: [
      'Every assignment is stored as a number, which QMK writes as a name such as KC_A or MO(1). If you know the name or the number, you can type it here. It is the way to reach anything the lists don’t offer.',
    ],
    docs: QMK + 'keycodes',
  },
  'lighting-effect': {
    title: 'Lighting effects',
    qmkName: 'RGB Matrix',
    body: [
      'The effect is the pattern the lights play. Brightness, speed and colour apply to whichever effect is chosen; some effects ignore the colour and cycle through all of them.',
      'Changes show on the keyboard at once and are saved to it after a moment.',
    ],
    docs: QMK + 'features/rgb_matrix',
  },
  unlock: {
    title: 'Locked and unlocked',
    qmkName: 'Vial unlock',
    body: [
      'The keyboard keeps a few powerful changes locked, so a web page can’t make them behind your back: editing macros, watching every key for the key test, and restarting into firmware update mode.',
      'Everyday changes such as keys, layers and lighting work while it is locked. When something needs unlocking, the app says so and shows you how: you hold two keys on the keyboard for a few seconds.',
    ],
  },
  saving: {
    title: 'Where changes are kept',
    body: [
      'Everything you change is stored in the keyboard itself, not on this computer. The bar at the bottom says when the keyboard has it.',
      'Flashing new firmware can erase it, so make a backup first (Device page).',
    ],
  },
} satisfies Record<string, HelpTopic>

export type HelpTopicId = keyof typeof topics
export const HELP_TOPICS: Record<HelpTopicId, HelpTopic> = topics
