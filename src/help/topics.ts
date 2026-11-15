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
  'key-palette': {
    title: 'Picking a key',
    qmkName: 'Basic keycodes',
    body: [
      'The keys are grouped the way you would look for them: letters, numbers, editing, media, mouse, lighting and the keys only this keyboard has. Point at one to see what it does; click it and the selected key does that from then on.',
      'The search looks at the names on the keys, what they do and their QMK names, so "volume", "esc" and "KC_MUTE" all work.',
    ],
    example: 'Search "play" and click Media Play: the key now plays and pauses music.',
    docs: QMK + 'keycodes_basic',
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
  'lighting-on': {
    title: 'Lights on and off',
    qmkName: 'RGB_TOG, effect 0',
    body: [
      'Turns the key lights off without forgetting the effect: turning them on again brings back the one you had, with its brightness, speed and colour.',
      'Picking an effect while the lights are off turns them on.',
    ],
    example: 'Lights off for a film, on again afterwards: the same effect comes back.',
    docs: QMK + 'features/rgb_matrix#keycodes',
  },
  'lighting-brightness': {
    title: 'Brightness',
    qmkName: 'Value (HSV)',
    body: [
      'How bright the lights are, from off to as bright as the keyboard allows. Dimmer lights also make the battery last longer on wireless.',
    ],
    example: 'Around 30 % is easy on the eyes in a dark room.',
    docs: QMK + 'features/rgb_matrix#keycodes',
  },
  'lighting-speed': {
    title: 'Speed',
    qmkName: 'Speed',
    body: [
      'How fast a moving effect moves: how quickly a rainbow scrolls, or how quickly a key fades after you press it.',
      'A few effects use it for something else, and say so under the slider. Effects that stand still ignore it.',
    ],
    example: 'Slow down "Breathing" for a calm, barely moving glow.',
    docs: QMK + 'features/rgb_matrix#keycodes',
  },
  'lighting-colour': {
    title: 'Colour',
    qmkName: 'Hue and saturation (HSV)',
    body: [
      'Colour picks where on the rainbow the lights sit. Vividness goes from white or pastel at the left to the deepest colour at the right.',
      'Effects that make their own colours, such as the rainbow ones, ignore the colour, and some still use vividness: low vividness gives a pastel rainbow.',
    ],
    example: 'Colour on blue with vividness halfway gives a soft sky blue.',
    docs: QMK + 'features/rgb_matrix#keycodes',
  },
  unlock: {
    title: 'Locked and unlocked',
    qmkName: 'Vial unlock',
    body: [
      'The keyboard keeps a few powerful changes locked, so a web page can’t make them behind your back: editing macros, watching every key for the key test, and restarting into firmware update mode.',
      'Everyday changes such as keys, layers and lighting work while it is locked. When something needs unlocking, the app says so and shows you how: you hold two keys on the keyboard for a few seconds.',
      'While it unlocks, the keyboard doesn’t type and the unlock can’t be cancelled; letting go of the keys only starts the count again. Unplugging the keyboard, or moving its connection switch, ends it. Once unlocked, it stays so until it restarts or changes connection mode, or until you lock it again from the device card.',
    ],
    example: 'On the K15 Max: click Unlock… in the device card, then hold Esc and Enter until the bar is full.',
  },
  'test-keys': {
    title: 'Testing keys',
    qmkName: 'Matrix tester',
    body: [
      'Press every key once: each lights up while it is down and stays marked afterwards, so a key that never lights is one that doesn’t work.',
      'While the keyboard is locked, the app sees keys the way any web page does, through the browser: only the keys that type something, and only while this window is in front. Fn and other layer keys, and the knob, send nothing the browser can see. Unlocked, the app reads every switch straight from the keyboard, Fn included.',
    ],
    example: 'Unlock, then hold Fn: its key lights up although your computer never hears about it.',
    docs: QMK + 'faq_debug',
  },
  saving: {
    title: 'Where changes are kept',
    body: [
      'Everything you change is stored in the keyboard itself, not on this computer. The bar at the bottom says when the keyboard has it.',
      'Flashing new firmware can erase it, so make a backup first (Device page).',
    ],
  },
  backup: {
    title: 'Backing up',
    body: [
      'A backup is one file with everything the keyboard holds: every key on every layer, the knob, macros, multi-tap keys and the other extras, typing settings, lighting and the wireless timers. Your layer names, which live in this browser, go in it too.',
      'Saving a backup only reads from the keyboard; nothing on it changes. Keep the file somewhere safe and make a new one after big changes.',
    ],
    example: 'Back up before flashing new firmware; afterwards, restore the file to get your layout back.',
    docs: QMK + 'newbs_flashing',
  },
  restore: {
    title: 'Restoring a backup',
    body: [
      'Restoring makes the keyboard match a backup file. The app first lists what is different and only writes that; everything else stays as it is.',
      'A file from a different keyboard is refused. Macros, and the key that restarts the keyboard for a firmware update, can only be written while the keyboard is unlocked; the app says so first, and leaves them out if it stays locked.',
      'The keys and knob can be put back afterwards with Undo; macros, settings and lighting can’t, so back up first if you might want them again.',
    ],
    example: 'Restore last week’s backup to undo an afternoon of experiments in one go.',
  },
  'vial-file': {
    title: 'Vial files',
    qmkName: '.vil',
    body: [
      'Vial, the app this firmware was made for, saves layouts in its own kind of file. Layerworks can save one for Vial to load, and restore from one Vial saved.',
      'A Vial file holds the keys, knob, macros, the extras and typing settings, but not lighting, wireless timers or layer names. For a complete backup, use the Layerworks file.',
    ],
    example: 'Save a Vial file to share your layout with someone who uses Vial.',
    docs: 'https://get.vial.today/manual/',
  },
  'lights-off-timer': {
    title: 'Lights off after',
    qmkName: 'Wireless backlight timeout',
    body: [
      'On Bluetooth or 2.4 GHz, the key lights turn off after this long without a key press, to save the battery. The first key you press turns them on again. On the cable they stay on.',
      'It must be at least 5 seconds and shorter than the sleep time. The keyboard keeps it until you change it.',
    ],
    example: '30 seconds makes a charge last noticeably longer than the default 10 minutes.',
  },
  'sleep-timer': {
    title: 'Sleep after',
    qmkName: 'Wireless idle timeout',
    body: [
      'On Bluetooth or 2.4 GHz, the keyboard goes to sleep after this long without a key press. Pressing a key wakes it; the first press may be lost while it reconnects.',
      'It must be at least a minute. Changing either timer while connected wirelessly makes the mouse pointer twitch once: the keyboard does that on purpose, to show the computer it is awake.',
    ],
    example: 'The default is 2 hours; 30 minutes saves battery if you often leave the keyboard on.',
  },
  firmware: {
    title: 'Firmware',
    qmkName: 'QMK, Vial',
    body: [
      'The firmware is the program inside the keyboard. This one is QMK with Vial added, which lets apps like this one change keys and settings without building new firmware.',
      'The version numbers under Technical details say which commands the keyboard understands; they matter when asking for help or comparing with other apps.',
    ],
    docs: QMK + 'newbs',
  },
} satisfies Record<string, HelpTopic>

export type HelpTopicId = keyof typeof topics
export const HELP_TOPICS: Record<HelpTopicId, HelpTopic> = topics
