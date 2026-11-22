// SPDX-License-Identifier: GPL-3.0-or-later
// The app's own explanations: a sentence or two and an example each, in plain words, with a link to the QMK
// documentation for depth. The help panel and the Help page both show these; guide.ts puts them in reading order.
//
// A layer named in a text is written {layer:N|Generic name}: the connected keyboard's name for layer N, or the
// generic name with no keyboard (text.ts).

export interface HelpPlace {
  /** Where, in words: "Keys page", "Typing feel, Tap or hold". */
  label: string
  /** The app's address: "#/keys", "#/shortcuts/chord/1", "#/typing/tapHold". */
  href: string
}

export interface HelpTopic {
  title: string
  /** What QMK calls it, shown beside the title and searchable. */
  qmkName?: string
  body: string[]
  example?: string
  /** The matching page of the QMK documentation (or Vial's, or Keychron's). */
  docs?: string
  /** Where this is in the app. */
  where?: HelpPlace[]
  /** Topics worth reading next (ids of this table; a test checks them). */
  related?: string[]
}

const QMK = 'https://docs.qmk.fm/'

const topics = {
  // ---- Getting started ----

  welcome: {
    title: 'What Layerworks does',
    body: [
      'Layerworks changes what your keyboard does: what each key types, what a knob turns, the lighting, and how the keyboard reacts to your typing. The changes go into the keyboard itself, not into this computer, so they work on any computer you plug it into, without this app running.',
      'It runs in Chrome or Edge, on the cable, or through the 2.4 GHz receiver of a Keychron wireless keyboard. Nothing to install, and the computer’s own keyboard settings are left alone.',
      'Start on the Keys page: click a key in the picture and choose what it should do. Key changes can be undone with Undo, and a backup on the Device page keeps a copy of the whole keyboard.',
    ],
    example: 'Make Caps Lock a second Esc, try it, and take it back with Undo if you miss Caps Lock. A minute’s work.',
    where: [
      { label: 'Home', href: '#/' },
      { label: 'Keys page', href: '#/keys' },
    ],
    related: ['connecting', 'assign-key', 'undo', 'saving'],
  },
  connecting: {
    title: 'Connecting the keyboard',
    body: [
      'Plug the keyboard in with its cable, or plug its Keychron Link receiver into the computer and set the keyboard’s switch to 2.4 GHz. Click Connect a keyboard… and pick it in the list the browser shows: the keyboard by its name, or “Keychron Link” for the receiver. Bluetooth can’t be used for this.',
      'Only one program can talk to the keyboard at a time. Close Vial, Keychron Launcher and other keyboard apps first, browser tabs included. A second Layerworks tab says the keyboard is open elsewhere and offers “Use it here”, which makes the other tab let go of it.',
      'It needs Chrome or Edge on a computer; other browsers can’t talk to keyboards. Once you have allowed it, this browser offers the keyboard straight away next time, as “Connect to” and its name. Through the receiver the keyboard’s card at the top left shows the battery too; on the cable the keyboard doesn’t report it. Disconnect, in that card, lets go of the keyboard so another app can use it.',
      'Layerworks works with keyboards running Vial firmware. Keyboards with VIA firmware, Keychron’s own included, appear in the list too, but the app says so when they connect: they need Vial firmware first (Vial’s site lists the keyboards it is made for), and until then VIA or the maker’s app can change them.',
    ],
    example: 'The keyboard isn’t in the list, or won’t connect? Close the other keyboard apps and tabs, unplug it, plug it in again and try once more.',
    where: [{ label: 'Home, when no keyboard is connected', href: '#/' }],
    related: ['demo', 'welcome'],
  },
  demo: {
    title: 'The demo keyboard',
    body: [
      '“Try the demo keyboard” connects a pretend Keychron K15 Max that lives inside this page. It behaves like a real one: change its keys, lighting, macros and settings, unlock it, test it.',
      'Nothing reaches a real keyboard, and the demo forgets everything when the page is reloaded. The keyboard you are typing on stands in for its keys, so holding Esc and Enter unlocks it.',
    ],
    example: 'Try a tap-or-hold key on the demo before putting one on your own keyboard.',
    where: [{ label: 'Home, when no keyboard is connected', href: '#/' }],
    related: ['connecting', 'unlock'],
  },
  layers: {
    title: 'Layers',
    body: [
      'A layer is a complete set of key assignments. The keyboard has several, stacked on top of each other, and you move between them with layer keys, the way Shift gives every letter key a second meaning.',
      'Most Keychron keyboards use one pair of layers for Mac and another for Windows; the switch on the keyboard picks the pair. In each pair the first layer is what the keys normally do and the second is what they do while Fn is held. Other keyboards number their layers from 0, the one they start on.',
      'The list beside the keyboard picture shows the layers: click one to see its keys. The green dot marks the one that is on right now.',
    ],
    example: 'On the {layer:3|Windows Fn} layer, the F1 key can change screen brightness; on the {layer:2|Windows} layer it is plain F1.',
    docs: QMK + 'feature_layers',
    where: [{ label: 'Keys page, the list beside the picture', href: '#/keys' }],
    related: ['live-layer', 'layer-key', 'transparent', 'layer-names'],
  },
  'live-layer': {
    title: 'Follow the keyboard',
    body: [
      'The keyboard tells the app which layer is active. With this on, the picture always shows that layer: hold Fn and you see the Fn layer. Only keyboards that report their layer offer it (Keychron’s do); on others the picture stays on the layer you pick.',
      'Turn it off, or click a layer, to look at or edit a layer without holding anything.',
    ],
    example: 'Hold Fn on the keyboard and watch the picture change to the Fn layer; let go and it changes back.',
    where: [{ label: 'Keys page, above the list of layers', href: '#/keys' }],
    related: ['layers'],
  },
  'assign-key': {
    title: 'Changing what a key does',
    body: [
      'Click a key in the picture, then choose what it should do. The change is written to the keyboard straight away and stays there, on any computer, without this app running.',
      'To change what a key does while Fn is held, pick that layer in the list beside the picture first. Every key change can be undone with Undo in the bar at the bottom, and Esc lets go of the selected key.',
      'A key that runs a macro or a multi-tap key says so under Now, with a link to change what it does on Shortcuts & macros.',
    ],
    example: 'Click Caps Lock, then pick Esc: the Caps Lock key now sends Esc.',
    where: [{ label: 'Keys page', href: '#/keys' }],
    related: ['key-palette', 'shortcut-key', 'layer-key', 'tap-hold', 'undo'],
  },
  undo: {
    title: 'Undo and redo',
    body: [
      'Undo, in the bar at the bottom, takes back the last change; Redo puts it back. It goes back one change at a time, across every page: keys and the knob, saved macros and shortcuts, typing settings, the key bounce filter and Snap Click, key colours and how they light up, zones and their effects, and the Caps Lock light. It remembers the last 100 changes.',
      'Some changes can’t be undone: the lighting effect, brightness, speed and colour, the wireless timers, the macros, settings and lighting of a restored backup (its keys and knob can), resetting all typing settings, and Reset to defaults, which also empties Undo. The app asks before each of the last three. Undoing a macro, or a shortcut that holds the firmware-update key, needs the keyboard unlocked. A backup made first gets you back from anything.',
      'Undo remembers this visit only; it starts empty when the page is reloaded or the keyboard reconnects. The changes themselves stay on the keyboard.',
    ],
    example: 'Put Esc on Caps Lock, type with it for a minute, then Undo if you miss Caps Lock.',
    where: [{ label: 'The bar at the bottom of every page, once a keyboard is connected', href: '#/keys' }],
    related: ['saving', 'backup'],
  },
  saving: {
    title: 'Where changes are kept',
    qmkName: 'EEPROM',
    body: [
      'Everything you change is stored in the keyboard’s own memory, not on this computer, and stays there when it is unplugged. The bar at the bottom says “Saved on the keyboard” once it has it. While the app is still reading something from the keyboard, the bar says so; if a change didn’t reach the keyboard, it says that instead, in red.',
      'A few things the keyboard has no room for live in this browser instead: the names you give layers and macros, and the app’s own settings. Backup files hold the names too.',
      'Putting new firmware on the keyboard can erase what it holds, so make a backup first (Device page).',
    ],
    example: 'Change a key here, then plug the keyboard into another computer: the key is still changed there.',
    where: [{ label: 'The bar at the bottom of every page, once a keyboard is connected', href: '#/keys' }],
    related: ['undo', 'backup', 'shortcut-drafts'],
  },
  unlock: {
    title: 'Locked and unlocked',
    qmkName: 'Vial unlock',
    body: [
      'The keyboard keeps a few powerful changes locked, so a web page can’t make them behind your back: editing macros, putting the firmware-update key on a key, reading every switch (for the key test and “Press a key”), and restarting into firmware update mode.',
      'Everyday changes such as keys, layers and lighting work while it is locked. When something needs unlocking, the app says so and shows you how: you hold the keys the keyboard names, two on most keyboards, for a few seconds.',
      'While it unlocks, the keyboard doesn’t type and the unlock can’t be cancelled; letting go of the keys only starts the count again. Unplugging the keyboard, or moving its connection switch, ends it. Once unlocked, it stays so until it restarts or changes connection mode, or until you lock it again with Lock in the keyboard’s card at the top left.',
      'Some keyboards’ firmware is built never to lock (Vial’s “insecure” build). The keyboard’s card then says “Never locks”: everything can be changed at any time, and there is nothing to unlock.',
      'If the keyboard stops answering while it counts (asleep, switched off, out of range), or it takes too long, the dialog offers “Stop waiting”. That only stops the app: the keyboard may still be counting, not typing, until you unplug it and plug it back in or move its connection switch away and back.',
    ],
    example: 'Click Unlock… in the keyboard’s card at the top left, then hold the keys the dialog marks on the picture until the bar is full: on a Keychron K15 Max, for instance, Esc and Enter.',
    where: [
      { label: 'The keyboard’s card, top left, above the pages', href: '#/' },
      { label: 'Home, Protection', href: '#/' },
    ],
    related: ['macro-unlock', 'test-keys'],
  },
  'app-settings': {
    title: 'The app’s own settings and the tour',
    body: [
      'The Settings page is about Layerworks itself, not the keyboard: the theme, dark or light (or like the computer’s), the names of your layers, and whether keys are named by your computer’s keyboard layout. It works without a keyboard connected, and what it keeps stays in this browser.',
      'The tour from the first visit points at the main parts of the screen in six short stops. Take it again any time with “Take the tour”, on the Settings page or on the Help page.',
    ],
    example: 'Prefer a light window during the day? Settings, Appearance, Light; “Like the system” follows the computer’s dark mode.',
    where: [
      { label: 'Settings', href: '#/settings' },
      { label: 'Help, Start here', href: '#/help' },
    ],
    related: ['welcome', 'layer-names', 'key-legends'],
  },

  // ---- Keys and layers ----

  'key-palette': {
    title: 'Picking a key',
    qmkName: 'Basic keycodes',
    body: [
      'The keys are grouped the way you would look for them: letters, numbers and symbols, editing, function keys, media, number pad (numpad), mouse, lighting, the keys only this keyboard has, macros and multi-tap keys, then typing helpers, swapped keys and international keys. Rarely needed ones wait under More keys at the end. Point at one to see what it does; click it and the selected key does that from then on.',
      'The search looks at the names on the keys, what they do and their QMK names, so "volume", "esc" and "KC_MUTE" all work.',
    ],
    example: 'Search "play" and click Media Play: the key now plays and pauses music.',
    docs: QMK + 'keycodes_basic',
    where: [{ label: 'Keys page, “A key”', href: '#/keys' }],
    related: ['assign-key', 'raw-code'],
  },
  'press-key': {
    title: 'Press a key to pick it',
    body: [
      'Beside the search on the Keys page: click “Press a key”, then press a key on the keyboard, and the selected key (or knob turn) does what that one does. One step, which Undo takes back. Esc, or a click elsewhere, stops waiting.',
      'While the keyboard is locked, only keys the computer receives count, so Fn, layer keys, macro keys and most media keys can’t be picked this way. Unlocked, the app reads the keyboard’s own switches while it waits and sees every key: it takes what that key does now, on the layer the keyboard is on, tap-or-hold and layer keys included.',
      'The key you press still does its usual job on the computer: a macro key types its macro, Mute mutes.',
    ],
    example: 'Select Caps Lock, click “Press a key” and press Backspace: Caps Lock is a second Backspace. (Esc can’t be picked this way, as it stops waiting; it is in the list under Editing and navigation.)',
    where: [{ label: 'Keys page, “A key”', href: '#/keys' }],
    related: ['key-palette', 'unlock'],
  },
  'shortcut-key': {
    title: 'A shortcut on one key',
    qmkName: 'Modifier + key',
    body: [
      'One key that presses a key together with Ctrl, Shift, Alt or the Windows key.',
      'Tick the modifiers, pick the key, then use the button that names the result. Nothing is written before that, so trying costs nothing.',
    ],
    example: 'Tick Ctrl and pick C: the key sends Ctrl+C (copy) in one press; Ctrl and V on another key pastes.',
    docs: QMK + 'feature_advanced_keycodes',
    where: [{ label: 'Keys page, “A shortcut”', href: '#/keys' }],
    related: ['macros', 'tap-hold'],
  },
  'layer-key': {
    title: 'Layer keys',
    qmkName: 'MO, TT, TG, TO, OSL, DF',
    body: [
      'A layer key switches to another layer. The usual kind works while held, like Fn. Others switch a layer on until pressed again, or just for the next key.',
      '“Hold for a layer, or tap it 5 times to keep it on” (TT) works while held too, but that many quick taps leave the layer on until you do it again. The number is the keyboard’s Tapping toggle: a typing setting where the keyboard reports it (Typing feel page), otherwise fixed in its firmware (5).',
      'The key that takes you to a layer should be empty ("same as the layer below") on that layer, or you can get stuck there.',
      'The base layer (QMK’s default layer, DF) is the one the keyboard rests on. Some keyboards, Keychron’s among them, have a Mac / Windows switch that picks the base layer again every time the keyboard starts, so “Make … the base layer” lasts only until then.',
    ],
    example: '“While held, use {layer:3|Windows Fn}” on Caps Lock: hold Caps Lock and the keys do what they do while Fn is held.',
    docs: QMK + 'feature_layers#switching-and-toggling-layers',
    where: [{ label: 'Keys page, “Switch layer”', href: '#/keys' }],
    related: ['layers', 'layer-tap', 'layer-mod', 'layer-lock', 'transparent'],
  },
  'tap-hold': {
    title: 'Tap or hold',
    qmkName: 'Mod-tap and layer-tap',
    body: [
      'One key that does one thing when you tap it and another while you hold it down: a modifier such as Ctrl, or a layer. Tapped, it sends a plain key.',
      'The keyboard waits to see which it is, so a tap is sent when you let go rather than when you press. How long counts as a hold is a typing setting (Typing feel page).',
      'Only plain keys can be the tap: letters, numbers, editing keys, F-keys. For a media key or a shortcut on a tap, use a multi-tap key (Shortcuts & macros).',
    ],
    example: 'Caps Lock as “Tap: Escape · Hold: Ctrl”: Esc where it is easy to reach, and Ctrl under your little finger.',
    docs: QMK + 'mod_tap',
    where: [
      { label: 'Keys page, “Tap or hold”', href: '#/keys' },
      { label: 'Typing feel, Tap or hold', href: '#/typing/tapHold' },
    ],
    related: ['mod-tap', 'layer-tap', 'typing-tap-hold', 'tap-dance'],
  },
  'mod-tap': {
    title: 'Tap for a key, hold for a modifier',
    qmkName: 'Mod-tap, MT(mod, kc), LCTL_T(kc) …',
    body: [
      'Tapped, the key sends a plain key; held, it is Ctrl, Shift, Alt or the Windows key (or several at once) for as long as you hold it.',
      'Left-hand or right-hand modifier: most programs don’t mind. On many keyboard layouts the right Alt is AltGr, which types extra characters.',
    ],
    example: 'Tap: Escape · Hold: Ctrl on Caps Lock. Or Tap: Space · Hold: Shift on the space bar.',
    docs: QMK + 'mod_tap',
    where: [{ label: 'Keys page, “Tap or hold”', href: '#/keys' }],
    related: ['tap-hold', 'layer-tap', 'typing-hold-decision'],
  },
  'layer-tap': {
    title: 'Tap for a key, hold for a layer',
    qmkName: 'Layer-tap, LT(layer, kc)',
    body: [
      'Tapped, the key sends a plain key; held, another layer is on for as long as you hold it, like Fn.',
      'It can reach the first 16 layers (0 to 15), and only plain keys can be the tap.',
    ],
    example: 'Tap: Space · Hold: {layer:3|Windows Fn} on the space bar: your thumb types spaces and, held, does the job of Fn.',
    docs: QMK + 'feature_layers#switching-and-toggling-layers',
    where: [{ label: 'Keys page, “Tap or hold”', href: '#/keys' }],
    related: ['tap-hold', 'mod-tap', 'layer-key'],
  },
  'one-shot-mod': {
    title: 'One-tap modifier',
    qmkName: 'One-shot modifier, OSM(mod)',
    body: [
      'A modifier for the next key only. Tap it and let go: the next key you press comes with that modifier, as if you had held it. Handy for capitals without holding Shift, or Ctrl shortcuts with one hand.',
      'Held down, it works like the ordinary modifier. How long it waits for the next key, and how many taps lock it on, are typing settings (Typing feel, One-tap modifiers).',
    ],
    example: 'A one-tap Shift: tap it, then tap A, and you get a capital A.',
    docs: QMK + 'one_shot_keys',
    where: [{ label: 'Keys page, More options, One-tap modifier', href: '#/keys' }],
    related: ['typing-one-shot', 'caps-word'],
  },
  'layer-mod': {
    title: 'A layer with modifiers held',
    qmkName: 'LM(layer, mod)',
    body: [
      'While held, another layer is on and the modifiers you ticked are held too, so every key on that layer comes with them.',
      'It can reach the first 16 layers (0 to 15).',
    ],
    example: 'While held, use {layer:3|Windows Fn} with Ctrl: arrow keys on that layer then jump a word at a time.',
    docs: QMK + 'feature_layers#switching-and-toggling-layers',
    where: [{ label: 'Keys page, “Switch layer”, With modifiers held too', href: '#/keys' }],
    related: ['layer-key'],
  },
  knob: {
    title: 'The knob',
    qmkName: 'Encoder',
    body: [
      'Turning the knob one click left or right presses a key, and you can choose which for each direction and each layer. Pressing the knob is an ordinary key.',
      'In the picture the knob has two halves: click the left one for a turn to the left, the right one for a turn to the right.',
      'Some keyboards’ firmware is built without letting apps change the knob (QMK’s encoder map). There the picture marks the knob “Fixed”: it keeps doing what the firmware was built with, and only new firmware can change it.',
    ],
    example: 'Turn right for Volume Up, left for Volume Down, press for Mute.',
    docs: QMK + 'features/encoders',
    where: [{ label: 'Keys page, the knob in the picture', href: '#/keys' }],
    related: ['test-knob', 'layers'],
  },
  transparent: {
    title: 'Same as the layer below',
    qmkName: 'KC_TRNS, transparent',
    body: [
      'The key has no assignment of its own on this layer and does whatever it does on the layer underneath. Most keys on an Fn layer are like this, which is why letters still type while Fn is held.',
      'The Keys page says, for a key on a higher layer, whether it has its own assignment or falls through, and to what.',
    ],
    example: 'On the Fn layer only F1 to F12 have their own jobs; the rest are “same as the layer below” and type as usual.',
    docs: QMK + 'keycodes_basic#special-keys',
    where: [{ label: 'Keys page, More options', href: '#/keys' }],
    related: ['nothing', 'layers', 'layer-key'],
  },
  nothing: {
    title: 'Nothing',
    qmkName: 'KC_NO',
    body: [
      'The key does nothing at all on this layer, and does not fall through to the layer below.',
      'Use it for a key you keep hitting by accident. On a higher layer, “Same as the layer below” is usually what you want instead.',
    ],
    example: 'Caps Lock set to Nothing: no more TYPING IN CAPITALS by accident.',
    docs: QMK + 'keycodes_basic#special-keys',
    where: [{ label: 'Keys page, More options', href: '#/keys' }],
    related: ['transparent'],
  },
  'raw-code': {
    title: 'Key code',
    qmkName: 'Keycode',
    body: [
      'Every assignment is stored as a number, which QMK writes as a name such as KC_A or MO(1). If you know the name or the number, you can type it here. It is the way to reach anything the lists don’t offer.',
      'The app says what a code means before you use it, so a typing mistake shows before it reaches the keyboard.',
    ],
    example: 'A guide online says to use KC_MUTE: type it, check that the app reads it as Mute, then use it.',
    docs: QMK + 'keycodes',
    where: [{ label: 'Keys page, More options', href: '#/keys' }],
    related: ['key-palette', 'qmk-names'],
  },
  'layer-names': {
    title: 'Layer names',
    body: [
      'The names in the list of layers are only for you: Mac, Windows Fn, or whatever helps you remember what a layer is for. Rename one with a double click in the list (or its pencil), or on the Settings page; up to 24 characters, and an empty name brings the default back.',
      'The default is what the keyboard’s keymap says a layer is for, where the app knows it (Keychron’s Vial keymaps: Mac, Windows, Fn …), and “Layer 0”, “Layer 1” … everywhere else.',
      'The keyboard has nowhere to keep names, so they live in this browser, for this keyboard, and travel in backup files.',
    ],
    example: 'Call {layer:4|Layer 4} “Numbers” once it holds a number pad.',
    where: [
      { label: 'Settings, Layer names', href: '#/settings' },
      { label: 'Keys page, the list of layers', href: '#/keys' },
    ],
    related: ['layers', 'backup'],
  },
  'layout-options': {
    title: 'Layout',
    qmkName: 'Layout options',
    body: [
      'Many keyboards come in more than one arrangement of keys from the same circuit board: a split or a whole Backspace, an ANSI or ISO Enter, a choice of bottom rows. The keyboard can’t tell which keycaps and switches you fitted, so it keeps a note of it, and the app draws, tests and counts only those keys.',
      'Pick what is on your keyboard in the Layout card on the Keys page, in the words its maker’s description uses. The change goes to the keyboard at once (nothing about how the keys work changes, only which ones are shown) and Undo takes it back. A key you had selected that the new layout doesn’t have is let go of.',
      'The choice is kept in backups; restoring one puts it back.',
    ],
    example: 'Your board has a split Backspace: switch “Split Backspace” on, and the picture shows two keys where it showed one, each with its own assignment.',
    docs: 'https://www.caniusevia.com/docs/layouts',
    where: [{ label: 'Keys page, Layout (with no key selected)', href: '#/keys' }],
    related: ['assign-key', 'backup'],
  },
  'key-legends': {
    title: 'Key names and your keyboard layout',
    body: [
      'A keyboard doesn’t send letters: it sends which key was pressed, and the computer’s keyboard layout decides the character. The same key types Y on a US layout and Z on a German one. Layerworks names keys by what your computer’s layout types, so the picture and the lists match the keys in front of you. The QMK name beside them (KC_Y) stays as it is: it means a position, whatever the layout.',
      'Chrome and Edge tell which character each key types without Shift, but not with Shift or AltGr. So on a layout other than US a key shows only its unshifted character, and the symbols QMK stores as Shift + a key read “Shift + 1” rather than a symbol, since which symbol that gives depends on the layout. The search still finds a key by its US name too.',
      'Text in a macro is typed as on a US layout whatever the computer uses: the keyboard presses the keys where a US keyboard has those characters.',
      'It works for any layout the browser can read, German (QWERTZ), French (AZERTY), Nordic, UK and the rest. The switch under Settings, Key names, goes back to US names.',
    ],
    example: 'On a German layout the key right of T reads Z, the key right of L reads Ö, and Ctrl + the key a US keyboard calls Z reads “Ctrl + Y”.',
    where: [{ label: 'Settings, Key names', href: '#/settings' }],
    related: ['key-palette', 'macros'],
  },
  'caps-word': {
    title: 'Capitals for one word',
    qmkName: 'Caps Word, CW_TOGG',
    body: [
      'A key that turns on capitals until the end of the word: type a name in capitals without holding Shift or touching Caps Lock. A space or most punctuation ends it, as do 5 seconds without typing; letters, numbers, Backspace, Delete and _ keep it going, and - types _ (handy for CONSTANT_NAMES).',
      'Put it on a key from the Keys page (search “Caps Word”). Home lists whether your keyboard has it.',
    ],
    example: 'Tap it and type nasa: you get NASA, and the next word is small again.',
    docs: QMK + 'features/caps_word',
    where: [{ label: 'Keys page, “A key”', href: '#/keys' }],
    related: ['one-shot-mod', 'typing-auto-shift'],
  },
  'layer-lock': {
    title: 'Lock a layer on',
    qmkName: 'Layer Lock, QK_LLCK',
    body: [
      'Press it while a layer is held and that layer stays on after you let go, until you press it again. Handy for a number pad or mouse layer you use for a while.',
      'Put it on a key of the layer you want to lock, from the Keys page (search “Layer Lock”). Home lists whether your keyboard has it.',
    ],
    example: 'Hold the layer key, tap Layer Lock, let go: the layer stays on until you tap Layer Lock again.',
    docs: QMK + 'features/layer_lock',
    where: [{ label: 'Keys page, “A key”', href: '#/keys' }],
    related: ['layer-key'],
  },
  'helper-keys': {
    title: 'Typing helpers',
    qmkName: 'Caps Word, Grave Escape, Space Cadet, Layer Lock',
    body: [
      'Keys that make everyday typing a little easier. Capitals for one word types a word in capitals without holding Shift. The Esc and ` key is Esc, or ` while Shift or Win is held, for keyboards without a ` key. Layer Lock keeps a held layer on.',
      'The Space Cadet keys are a Shift (or Ctrl, or Alt) when held and a bracket when tapped: tap left Shift for (, right Shift for ). The last one taps Enter instead.',
      'They work on most Vial keyboards; Capitals for one word and Layer Lock only show when the keyboard says it has them.',
    ],
    example: 'Put “Left Shift when held, ( when tapped” on the left Shift key: Shift works as before, and a quick tap types (.',
    docs: QMK + 'features/space_cadet',
    where: [{ label: 'Keys page, “A key”, Typing helpers', href: '#/keys' }],
    related: ['caps-word', 'layer-lock', 'typing-grave-esc'],
  },
  'magic-keys': {
    title: 'Keys that swap or switch off keys',
    qmkName: 'Magic keycodes, CL_SWAP, GU_TOGG, NK_TOGG …',
    body: [
      'A press changes one of the keyboard’s switches for swapped and disabled keys: swap Caps Lock and Ctrl, swap Esc and Caps Lock, swap Alt and Win for a Mac, switch the Windows keys off for a game, or let the computer see any number of keys at once (N-key rollover; keyboards that do that by themselves, adaptive N-key rollover, which Keychron’s firmware uses, say so, and there the app doesn’t offer those keys). The keyboard remembers the switch until it is changed again.',
      'Most of the same switches are on the Typing feel page, under Swapped and disabled keys; swapping Esc and Caps Lock is only here, as keys. A key for them is handy for switching often without opening the app. “Toggle” keys flip the switch each press; the others set it one way.',
    ],
    example: 'Put “Windows keys off, or on again” on a key of an Fn layer: one press before a game, one after.',
    docs: QMK + 'keycodes_magic',
    where: [
      { label: 'Keys page, “A key”, Swapped and disabled keys', href: '#/keys' },
      { label: 'Typing feel, Swapped and disabled keys', href: '#/typing/magic' },
    ],
    related: ['typing-magic', 'key-palette'],
  },
  'international-keys': {
    title: 'International keys',
    qmkName: 'ISO, JIS, KC_NUHS, KC_NUBS, KC_INT1 – 5, KC_LANG1 – 5',
    body: [
      'Keys that only some keyboards have: the two extra keys of ISO keyboards (beside Enter, and beside left Shift), the Japanese keys and the language keys of Korean and Japanese keyboards.',
      'What one types depends on the computer’s keyboard layout, not on the keyboard: the key beside left Shift types \\ in the UK and < in Germany.',
    ],
    example: 'A German keyboard layout on an ANSI (US-style) keyboard has no < key: put “Key beside left Shift on ISO keyboards” on an Fn layer.',
    docs: QMK + 'keycodes_basic',
    where: [{ label: 'Keys page, “A key”, International keys', href: '#/keys' }],
    related: ['key-palette'],
  },
  'switch-keys': {
    title: 'Keys that switch features on and off',
    qmkName: 'AS_TOGG, CM_TOGG, KO_TOGG, OS_TOGG',
    body: [
      'Keys that turn a whole feature off for a while, and on again: Capitals by holding, key chords, shortcut replacements and one-tap modifiers.',
      'Key chords and shortcut replacements are on again after the keyboard restarts, and Capitals by holding goes back to its Typing feel switch; the one-tap switch is kept. The Capitals by holding keys only work while that Typing feel switch is on.',
    ],
    example: 'Key chords getting in the way in a game? A key that turns them off for the session, and on again.',
    docs: QMK + 'features/combo#keycodes',
    where: [{ label: 'Keys page, “A key”, More keys', href: '#/keys' }],
    related: ['combos', 'key-overrides', 'typing-auto-shift', 'typing-one-shot'],
  },
  'restart-keys': {
    title: 'Restart and firmware update keys',
    qmkName: 'QK_BOOT, QK_REBOOT',
    body: [
      'Restart restarts the keyboard, as if it were unplugged and plugged in again. Firmware update puts it into firmware update mode (QMK’s bootloader): it stops typing until new firmware is put on it or it is unplugged.',
      'The firmware update key only goes on a key while the keyboard is unlocked; the app asks to unlock first.',
    ],
    example: 'Put Firmware update on an Fn layer, so updating the firmware never means holding a key while plugging in.',
    docs: QMK + 'quantum_keycodes#qmk-keycodes',
    where: [{ label: 'Keys page, “A key”, More keys', href: '#/keys' }],
    related: ['firmware', 'unlock'],
  },
  'left-out-keys': {
    title: 'Keys the app leaves out',
    qmkName: 'Joystick, programmable buttons, MIDI, audio, haptic, steno, dynamic macros, swap hands, Unicode, leader key, autocorrect',
    body: [
      'QMK has keys for hardware and features most keyboards’ firmware doesn’t include: joystick and programmable buttons, MIDI and music, sound, vibration, stenography, keys that record macros on the keyboard (QMK’s dynamic macros), swapping the halves of split keyboards, Unicode characters (emoji, accented letters). Pressed on a keyboard without the feature, they do nothing, and the app can’t tell which a firmware has, so the Keys page leaves them out.',
      'Lighting keys follow what the keyboard says it has: backlight keys on a keyboard with a single-colour backlight, the underglow keys and their effects on one with an underglow strip, the RGB lighting keys on one with per-key RGB, and none on a keyboard without lighting.',
      'The leader key (a key that starts a sequence of letters standing for a command) and the Autocorrect switch aren’t offered either; whether a firmware has them depends on how it was built.',
      'If your firmware has one, type its QMK name under More options, Key code (PB_1, JS_0, MI_C …). A key that already holds one shows what kind of key it is.',
    ],
    example: 'Want extra buttons for a streaming app? F13 – F24, under Function keys, work everywhere without anything in the firmware.',
    docs: QMK + 'keycodes',
    where: [{ label: 'Keys page, More options, Key code', href: '#/keys' }],
    related: ['raw-code', 'key-palette'],
  },

  // ---- Shortcuts & macros ----

  macros: {
    title: 'Macros',
    qmkName: 'Macros, M0, M1 …',
    body: [
      'A macro does several things when you press one key: types a piece of text, taps a shortcut, waits a moment, and so on, one step after another. It lives in the keyboard, so it works on any computer.',
      'Build one from steps, or record it as you type. Save it to the keyboard, then put it on a key: “Put it on a key…” in the macro opens the Keys page, and the next key you click there runs it (pick the layer in the list first; Esc or Cancel stops without changing anything, and Undo takes the key back). Or pick it on the Keys page under Macros. They carry the firmware’s own numbers: Macro 1 is QMK’s M1, which Keychron keyboards put on the key printed M1; Macro 0 comes last.',
      'Text is typed as on a US keyboard layout. On another layout some characters come out differently (on a German one, @ gives " and y and z swap), so type those with Tap a key steps, pressing the keys your layout uses for them.',
      'All the macros share one small space in the keyboard (Device page, About this keyboard, says how much): each typed character takes one byte, each key or wait a few.',
      'Saving rewrites that shared space, so the app first marks it as being written: if the keyboard goes away part-way, it runs no macro at all rather than a mix of old and new ones. The macro’s page then says so; save it again (or restore a backup) and they all work again.',
    ],
    example: 'A macro that types your e-mail address, on a key of an Fn layer.',
    docs: 'https://get.vial.today/manual/macros.html',
    where: [{ label: 'Shortcuts & macros, Macros', href: '#/shortcuts/macro' }],
    related: ['macro-record', 'macro-unlock', 'shortcut-drafts', 'tap-dance'],
  },
  'macro-record': {
    title: 'Recording a macro',
    body: [
      'While recording, what you type becomes steps: letters and symbols become text, shortcuts such as Ctrl + C become one key step, and keys held across others become hold and let-go steps. Tick “Keep the pauses as waits” to keep how long you waited between keys.',
      'Only keys that reach the browser can be recorded: not Fn or layer keys, and not shortcuts Windows or the browser keep for themselves. Text is typed as on a US keyboard layout.',
    ],
    example: 'Record, type “Kind regards,”, tap Enter, type your name, stop.',
    docs: 'https://get.vial.today/manual/macros.html',
    where: [{ label: 'Shortcuts & macros, in a macro', href: '#/shortcuts/macro' }],
    related: ['macros', 'macro-wait'],
  },
  'macro-wait': {
    title: 'Waiting',
    qmkName: 'SS_DELAY',
    body: [
      'A pause between steps, for a program that needs a moment: a window opening, a menu appearing. Up to about 65 seconds per wait.',
    ],
    example: 'Win + R, wait 0.3 s for the Run box, then type “notepad” and tap Enter.',
    docs: QMK + 'feature_macros#tap-down-and-up',
    where: [{ label: 'Shortcuts & macros, in a macro', href: '#/shortcuts/macro' }],
    related: ['macros', 'macro-hold'],
  },
  'macro-hold': {
    title: 'Holding a key down and letting it go',
    qmkName: 'SS_DOWN, SS_UP',
    body: [
      '“Tap a key” presses and releases a key in one go, with Ctrl, Shift, Alt or Win if ticked. For a key that must stay down while other steps happen, use “Hold a key down”, then “Let a key go” later.',
      'Let every held key go before the macro ends, or the computer thinks it is still held until you press it yourself.',
      '“Tap a key” can be nearly any key the Keys page offers, the less common ones (Caps Word, swapped keys) included; only macros, multi-tap keys and repeat keys are left out. Holding and letting go offer the keys that mean something while held.',
    ],
    example: 'Hold Alt, tap Tab, tap Tab, let Alt go: switches to the window two back.',
    docs: QMK + 'feature_macros#tap-down-and-up',
    where: [{ label: 'Shortcuts & macros, in a macro, More options', href: '#/shortcuts/macro' }],
    related: ['macros', 'macro-wait'],
  },
  'macro-unlock': {
    title: 'Why saving a macro needs unlocking',
    qmkName: 'Vial unlock',
    body: [
      'A macro can type anything, including commands, so the keyboard only takes macro changes while it is unlocked: a web page can’t plant one behind your back.',
      'You can edit a macro while the keyboard is locked; the changes wait in the app. “Unlock to save…” opens the unlock, and the macro is saved by itself as soon as the keyboard is unlocked. Undoing a saved macro needs the keyboard unlocked too.',
    ],
    example: 'Click “Unlock to save…” and hold the keys the dialog names (Esc and Enter on a Keychron K15 Max) until the bar is full: the macro goes to the keyboard straight after.',
    where: [{ label: 'Shortcuts & macros, in a macro', href: '#/shortcuts/macro' }],
    related: ['unlock', 'macros'],
  },
  'shortcut-drafts': {
    title: 'Saving shortcuts and macros',
    body: [
      'Keys change the moment you pick one (a shortcut or a tap-or-hold key when you press the button that names it). Macros and the other shortcuts are edited first and written to the keyboard when you click Save to keyboard, so half-finished steps never reach it. Until then the editor says “Not saved yet”, and Revert puts back what the keyboard has.',
      'Unsaved changes are kept while you visit other pages, and the bar at the bottom says which are waiting. The browser asks before the tab is closed with any left.',
      'The list on the left shows each kind with how many of its slots are used, and Add opens the next free one. Kinds in use are listed first; the others wait under More options.',
      '“Try: …” in an editor fills in a working example to start from. Each editor lists the keys that run it under “Runs when you press”: click one to see that key on the Keys page. To get rid of one (delete or empty it), use “Clear this …” at the bottom of its editor (for a macro, remove its steps), then Save to keyboard.',
    ],
    example: 'Change a macro’s text, look something up on the Keys page, come back: the change is still there, waiting for Save to keyboard.',
    where: [{ label: 'Shortcuts & macros', href: '#/shortcuts' }],
    related: ['macros', 'undo', 'saving'],
  },
  'tap-dance': {
    title: 'Multi-tap keys',
    qmkName: 'Tap dance, TD(0), TD(1) …',
    body: [
      'One key that does different things depending on how you press it: a tap, a hold, two quick taps, or a tap followed by a hold. Leave any of them empty if you don’t need it.',
      'It only works once it is on a key: “Put it on a key…” in its editor opens the Keys page, and the next key you click there gets it (or, on the Keys page, click a key and pick it under Multi-tap keys).',
      'Each of them can be any key the Keys page offers apart from multi-tap and repeat keys, the less common ones (Caps Word, swapped keys, restart) included.',
    ],
    example: 'Tap for Esc, tap twice for Caps Lock: Caps Lock is still there but hard to hit by accident.',
    docs: QMK + 'features/tap_dance',
    where: [{ label: 'Shortcuts & macros, Multi-tap keys', href: '#/shortcuts/multi-tap' }],
    related: ['tapping-term', 'tap-hold', 'macros'],
  },
  'tapping-term': {
    title: 'A multi-tap key’s hold time',
    qmkName: 'Tapping term (per tap dance)',
    body: [
      'How long the key must stay down to count as held rather than tapped, and how quickly a second tap must follow to count as a double tap. Each multi-tap key has its own, separate from “How long counts as a hold” on Typing feel, which is for tap-or-hold keys; 200 ms suits most people.',
      'Shorter makes taps quicker but holds easier to trigger by accident; longer the other way round.',
    ],
    example: 'If a double tap often comes out as two single taps, raise it to 250 ms.',
    docs: QMK + 'tap_hold#tapping-term',
    where: [{ label: 'Shortcuts & macros, in a multi-tap key', href: '#/shortcuts/multi-tap' }],
    related: ['tap-dance', 'typing-tap-hold'],
  },
  combos: {
    title: 'Key chords',
    qmkName: 'Combos',
    body: [
      'Press two to four keys at the same moment and the keyboard sends something else instead of them. Pressed one after the other, they type as usual.',
      'A chord works on its own once saved, on every layer. The keys are named by what they send (J, K), not by where they are, so a chord follows a key you move. How close together the presses must be is a typing setting (Typing feel page).',
      'What it sends can be any key the Keys page offers apart from multi-tap and repeat keys, the less common ones too: a chord is a good place for Caps Word or a key that switches the Windows keys off.',
    ],
    example: 'J and K together for Esc: no need to reach for the corner.',
    docs: QMK + 'features/combo',
    where: [{ label: 'Shortcuts & macros, Key chords', href: '#/shortcuts/chord' }],
    related: ['typing-chords', 'key-overrides'],
  },
  'key-overrides': {
    title: 'Shortcut replacements',
    qmkName: 'Key overrides',
    body: [
      'When a key is pressed with certain modifiers held, the keyboard sends something else instead. The modifiers can be kept or taken away from what is sent.',
      'It works on its own once saved, on the layers you pick.',
      'It replaces and sends ordinary keys only (letters, numbers, editing, F-keys, media, mouse …), with modifiers if you like; the keyboard can’t send layer keys, macros or lighting keys this way, so the list doesn’t offer them.',
    ],
    example: 'Shift + Backspace sends Delete, with Shift taken away so it isn’t Shift + Delete.',
    docs: QMK + 'features/key_overrides',
    where: [{ label: 'Shortcuts & macros, Shortcut replacements', href: '#/shortcuts/replacement' }],
    related: ['override-modifiers', 'override-options', 'combos'],
  },
  'override-modifiers': {
    title: 'Modifiers in a shortcut replacement',
    qmkName: 'trigger_mods, negative_mod_mask, suppressed_mods',
    body: [
      'Hold: the modifiers that must be held. Ctrl means either Ctrl key; under More options, left and right can be told apart.',
      'Must not be held: if any of these is down, the replacement doesn’t happen. Let go of while sending: modifiers held for it that are let go while the replacement is sent, so Shift + Backspace gives Delete rather than Shift + Delete.',
    ],
    example: 'Shift + Esc → ~, but not with Ctrl held: tick Ctrl under “Must not be held”, so Ctrl + Shift + Esc still opens the Task Manager.',
    docs: QMK + 'features/key_overrides',
    where: [{ label: 'Shortcuts & macros, in a shortcut replacement, More options', href: '#/shortcuts/replacement' }],
    related: ['key-overrides', 'override-options'],
  },
  'override-options': {
    title: 'When a shortcut replacement starts and ends',
    qmkName: 'ko_option_*',
    body: [
      'By default it starts whichever comes last: the key pressed with the modifiers held, a modifier pressed while the key is held, or a modifier it must not see let go. Untick any of these to be stricter.',
      '“Any one of the modifiers” makes one of the trigger modifiers enough. The last two decide what happens to the original key afterwards; leave them alone unless something feels wrong.',
    ],
    example: 'Untick “Start when a modifier is pressed while the key is held” if holding Backspace and then pressing Shift shouldn’t turn it into Delete.',
    docs: QMK + 'features/key_overrides#reference-for-ko_option_t',
    where: [{ label: 'Shortcuts & macros, in a shortcut replacement, More options', href: '#/shortcuts/replacement' }],
    related: ['key-overrides', 'override-modifiers'],
  },
  'alt-repeat': {
    title: 'Repeat rules',
    qmkName: 'Alt repeat key, QK_AREP; Repeat key, QK_REP',
    body: [
      'The alternate repeat key does the “opposite” of the key you pressed last: after Page Up, Page Down; after ←, →. A rule says what it sends after a given key, such as Ctrl + Y after Ctrl + Z. Without a rule it has pairs of its own: the arrows, Home and End, Page Up and Down, Backspace and Delete, the volume and media keys, and a few letter pairs from the Vim editor (after J it sends K, after H, L).',
      'It needs the key itself on the keyboard: “Put it on a key…” in a repeat rule opens the Keys page, and the next key you click there gets it (or pick “Alt Repeat” under Repeat keys on the Keys page).',
      'The plain Repeat key, beside it under Repeat keys, sends the last key again, modifiers included: after Ctrl + Z it undoes once more. It needs no rules.',
    ],
    example: 'A rule “after Ctrl + Z, send Ctrl + Y”: undo with one hand, and the alternate repeat key redoes.',
    docs: QMK + 'features/repeat_key',
    where: [{ label: 'Shortcuts & macros, Repeat rules', href: '#/shortcuts/repeat' }],
    related: ['repeat-options'],
  },
  'repeat-options': {
    title: 'Repeat rule options',
    qmkName: 'Alt repeat options',
    body: [
      'Still applies with: the rule still applies when these modifiers are held with the last key (Shift + Ctrl + Z, for example). Both ways: after the second key, the repeat key sends the first one. Left and right modifiers count the same: a right Ctrl counts like a left one.',
      '“Fallback for every other key”: after any key that no rule covers, the alternate repeat key sends this rule’s key.',
    ],
    example: 'Home ↔ End with “Both ways”: after Home the repeat key sends End, and after End it sends Home.',
    docs: QMK + 'features/repeat_key',
    where: [{ label: 'Shortcuts & macros, in a repeat rule, More options', href: '#/shortcuts/repeat' }],
    related: ['alt-repeat'],
  },

  // ---- Lighting ----

  'lighting-effect': {
    title: 'Lighting effects',
    qmkName: 'RGB Matrix',
    body: [
      'The effect is the pattern the lights play. Each tile shows a small preview of how it moves, and under the effects, On the keys shows a still picture of how the keys light up; on the keyboard the effect moves. Brightness, speed and colour apply to whichever effect is chosen; some effects ignore the colour and cycle through all of them.',
      'Changes show on the keyboard at once and are saved to it after a moment. Lighting changes aren’t undoable: pick the old effect again to go back.',
    ],
    example: '“Breathing” in a soft blue for a calm glow; “Typing heat map” to see which keys you use most.',
    docs: QMK + 'features/rgb_matrix',
    where: [{ label: 'Lighting page', href: '#/lighting' }],
    related: ['lighting-colour', 'lighting-speed', 'key-colours', 'lighting-zones'],
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
    where: [{ label: 'Lighting page, at the top right', href: '#/lighting' }],
    related: ['lighting-effect', 'lights-off-timer'],
  },
  'lighting-brightness': {
    title: 'Brightness',
    qmkName: 'Value (HSV)',
    body: [
      'How bright the lights are, from off to as bright as the keyboard allows. Dimmer lights also make the battery last longer on wireless.',
    ],
    example: 'Around 30 % is easy on the eyes in a dark room.',
    docs: QMK + 'features/rgb_matrix#keycodes',
    where: [{ label: 'Lighting page', href: '#/lighting' }],
    related: ['lighting-colour', 'lights-off-timer'],
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
    where: [{ label: 'Lighting page', href: '#/lighting' }],
    related: ['lighting-effect'],
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
    where: [{ label: 'Lighting page', href: '#/lighting' }],
    related: ['lighting-brightness', 'key-colours'],
  },
  'key-colours': {
    title: 'Key colours',
    qmkName: 'Keychron per-key RGB',
    body: [
      'With the “Key by key” effect every key shows a colour of its own. Pick a colour, then click a key or drag across several; the keyboard changes as you paint and keeps the colours after a moment. Paint all keys, or a group such as the letters, in one click; Start from gives a ready-made scheme to change; Pick up a colour takes a key’s colour to paint with.',
      'Brightness is one setting for the whole keyboard (the Brightness slider), so a key’s colour is only its colour and vividness. Undo takes back one stroke at a time.',
    ],
    example: 'Paint the letters white, then W, A, S and D red, for games.',
    docs: 'https://www.keychron.com/blogs/news/how-to-set-per-key-rgb-on-launcher',
    where: [{ label: 'Lighting page, the “Key by key” effect', href: '#/lighting' }],
    related: ['key-style', 'lighting-zones', 'lighting-colour'],
  },
  'key-style': {
    title: 'How the key colours light up',
    qmkName: 'Per-key RGB type',
    body: [
      'Steady shows every colour all the time. Breathing fades them in and out together. The others light keys only while you type: the key you press, a glow around it, or a splash spreading from it, each in the colours you painted.',
      'The Speed slider sets how fast they breathe or fade.',
    ],
    example: '“Light up when pressed” on a dark desk: keys flash in their colour as you type.',
    docs: 'https://www.keychron.com/blogs/news/how-to-set-per-key-rgb-on-launcher',
    where: [{ label: 'Lighting page, the “Key by key” effect', href: '#/lighting' }],
    related: ['key-colours', 'lighting-speed'],
  },
  'lighting-zones': {
    title: 'Mixed zones',
    qmkName: 'Keychron mixed RGB, lighting zones',
    body: [
      'With the “Mixed zones” effect the keyboard is split into zones, and each zone plays its own effects. Every key belongs to one zone; paint keys to move them.',
      'A zone can play several effects in turn, each for as long as you set, fading from one to the next. Each effect has its own colour and speed; brightness is the keyboard’s.',
    ],
    example: 'W, A, S and D breathing red in one zone while the rest of the keyboard plays a rainbow wave.',
    docs: 'https://www.keychron.com/blogs/news/how-to-set-mix-rgb-on-launcher',
    where: [{ label: 'Lighting page, the “Mixed zones” effect', href: '#/lighting' }],
    related: ['key-colours', 'lighting-effect'],
  },
  'lock-lights': {
    title: 'Caps Lock light',
    qmkName: 'Keychron indicators (lock lights)',
    body: [
      'While Caps Lock is on, its key lights up in a colour of its own, over whatever the lighting effect is doing, so you can see it is on. Keyboards with Num Lock or Scroll Lock lights have a switch for each; they all share the one colour.',
      'Switched off, the key just shows the effect like the others. Its brightness is under More options on the card; the keyboard keeps it at half or more. How the light is drawn is up to the firmware: Keychron’s own lights the key steadily at the brightness set here; a custom keymap can do more with the colour (flash Caps Lock at full brightness, for example).',
    ],
    example: 'Red, so Caps Lock left on by accident is hard to miss; or switched off if the light distracts you.',
    docs: QMK + 'features/rgb_matrix#indicators',
    where: [{ label: 'Lighting page, Caps Lock light', href: '#/lighting' }],
    related: ['lighting-colour', 'key-colours'],
  },

  // ---- Typing feel ----

  'typing-feel': {
    title: 'Typing feel',
    qmkName: 'QMK Settings',
    body: [
      'How the keyboard reads your presses: how long a press counts as a hold, how close together keys must go down to count as a chord, how the mouse keys speed up, which modifier keys are swapped. Each change goes to the keyboard at once and stays there, on any computer.',
      'Most people only ever touch the first few. If something feels wrong, “Reset all typing settings” at the bottom puts every one back to how the firmware came.',
    ],
    example: 'If a key that is A when tapped and Ctrl when held keeps giving Ctrl by accident, make “How long counts as a hold” longer.',
    docs: 'https://get.vial.today/manual/qmk-settings.html',
    where: [{ label: 'Typing feel page', href: '#/typing' }],
    related: ['typing-tap-hold', 'typing-reset'],
  },
  'typing-tap-hold': {
    title: 'Tap or hold timing',
    qmkName: 'Tap-Hold, tapping term',
    body: [
      'A key can do one thing when tapped and another when held: A when tapped and Ctrl when held, or Space when tapped and a layer when held. The keyboard can’t know which you mean until you let go, or until enough time has passed.',
      '“How long counts as a hold” is that time. Under More options are ways to decide sooner when you press another key in the meantime; try one at a time, in the box on this card.',
      'Multi-tap keys each have their own time, set on Shortcuts & macros.',
    ],
    example: 'Ctrl when held on F (a “home-row mod”): at 200 ms, a quick “f” types f; F held while you press C gives Ctrl + C.',
    docs: QMK + 'tap_hold',
    where: [{ label: 'Typing feel, Tap or hold', href: '#/typing/tapHold' }],
    related: ['typing-hold-decision', 'typing-tap-hold-more', 'tap-hold', 'tapping-term'],
  },
  'typing-hold-decision': {
    title: 'Deciding sooner between tap and hold',
    qmkName: 'Permissive Hold, Hold On Other Key Press, Chordal Hold',
    body: [
      'Normally a tap-or-hold key only counts as held once its time is up. These options let another key press decide sooner.',
      'Hold when another key is tapped inside it: holding the key and tapping another (down and up) makes it a hold. Hold as soon as another key goes down: any other key pressed makes it a hold at once, quickest but easiest to trigger by accident. Holds only with a key on the other hand: on top of either, a key on the same half of the keyboard keeps it a tap, so rolling letters on one hand stays letters.',
    ],
    example: 'With “Hold when another key is tapped inside it”, holding F (Ctrl when held) and tapping C gives Ctrl + C even if you are quick.',
    docs: QMK + 'tap_hold#permissive-hold',
    where: [{ label: 'Typing feel, Tap or hold, More options', href: '#/typing/tapHold' }],
    related: ['typing-tap-hold', 'typing-tap-hold-more', 'mod-tap'],
  },
  'typing-tap-hold-more': {
    title: 'More tap-or-hold settings',
    qmkName: 'Retro Tapping, Quick Tap Term, Flow Tap, Tapping Toggle, Tap Hold Caps Delay, Tap Code Delay',
    body: [
      'Under More options on the Tap or hold card. Tap anyway when held alone (Retro Tapping): a tap-or-hold key held past its time and let go with nothing else pressed still sends its tap. Tap, then hold to repeat (Quick Tap Term): tap the key, then press and hold it again within this time, and it repeats its tap key instead of acting as held (it works up to “How long counts as a hold”; longer makes no difference). Taps only while typing fast (Flow Tap): a tap-or-hold letter pressed within this time after another letter, Space or punctuation is always a tap. For the last two, 0 turns them off.',
      'Taps to lock a layer on (Tapping Toggle) is how many taps keep a layer on with a “Hold for a layer, or tap it 5 times to keep it on” key. Caps Lock press length and Length of taps the keyboard sends only matter if a program, or macOS, misses taps the keyboard makes by itself.',
      'Keyboards with older firmware show a few of these as switches instead (marked “older firmware” in QMK’s names), with two more: Ignore other keys while deciding, where only the time decides, and No repeat after a quick tap, the opposite of Tap, then hold to repeat.',
    ],
    example: 'Space as Tap: Space · Hold: a layer, and holding Space types no spaces? Set “Tap, then hold to repeat” to 150 ms: tap, then hold, and spaces repeat.',
    docs: QMK + 'tap_hold',
    where: [{ label: 'Typing feel, Tap or hold, More options', href: '#/typing/tapHold' }],
    related: ['typing-tap-hold', 'typing-hold-decision', 'layer-key'],
  },
  'typing-chords': {
    title: 'Key chord timing',
    qmkName: 'Combo term',
    body: [
      'The keys of a key chord must all go down within this time. Pressed further apart, they type as usual.',
      'Short times suit fast typists, who would otherwise set chords off while typing; longer times are easier to hit on purpose. The chords themselves are on Shortcuts & macros.',
    ],
    example: 'With J + K → Esc and 50 ms, pressing J and K together gives Esc; typing “jk” normally types jk.',
    docs: QMK + 'features/combo#combo-term',
    where: [{ label: 'Typing feel, Key chords', href: '#/typing/chords' }],
    related: ['combos'],
  },
  'typing-auto-shift': {
    title: 'Capitals by holding',
    qmkName: 'Auto Shift',
    body: [
      'With this on, a key held a little longer than a normal tap types its shifted version: a capital letter, or the symbol above a number. A normal tap types as before.',
      'How long to hold sets how much longer than a tap that is. Under More options: which keys it works on (letters, numbers, symbols), whether it still works with Ctrl, Alt or Win held, and whether a held key repeats.',
    ],
    example: 'Tap 1 for 1, hold it for !; tap a for a, hold it for A.',
    docs: QMK + 'features/auto_shift',
    where: [{ label: 'Typing feel, Capitals by holding', href: '#/typing/autoShift' }],
    related: ['caps-word', 'one-shot-mod'],
  },
  'typing-one-shot': {
    title: 'One-tap modifiers',
    qmkName: 'One Shot Keys',
    body: [
      'A one-tap modifier is a modifier for the next key only: a Shift, Ctrl, Alt or Win key (or a layer key) that you tap instead of holding. It stays on for the next key you press, then lets go. Easier on the hands, and handy with one hand.',
      'They only work once such a key is on the keyboard: on the Keys page, under Switch layer for layers, or under More options, “One-tap modifier”, for modifiers. Forget it after is how long one waits for the next key. Tapping one 5 times in a row (Taps to lock it on, on this card) locks it on until you tap it again.',
    ],
    example: 'Tap the one-tap Shift, then a: you get A, and the next letter is small again.',
    docs: QMK + 'one_shot_keys',
    where: [{ label: 'Typing feel, One-tap modifiers', href: '#/typing/oneShot' }],
    related: ['one-shot-mod', 'layer-key'],
  },
  'typing-mouse-keys': {
    title: 'Mouse keys',
    qmkName: 'Mouse Keys',
    body: [
      'Keys can move the mouse pointer, click and scroll. A press moves the pointer one small step; held, it starts moving and speeds up until it reaches top speed.',
      'Top speed is how far it moves at once at full speed, and how long it takes to get there is counted in moves. The line under each says what that means in pixels a second. Scrolling works the same way, in wheel notches, with a top scroll speed of its own.',
      'Under More options: the first step, the wait before a held key starts moving on, and the time between moves, with the same for scrolling and how long scrolling takes to reach top speed. Most people never change them.',
    ],
    example: 'Put the mouse keys on the arrows of an Fn layer: a tap nudges the pointer, holding sweeps it across the screen.',
    docs: QMK + 'features/mouse_keys',
    where: [{ label: 'Typing feel, Mouse keys', href: '#/typing/mouse' }],
    related: ['key-palette'],
  },
  'typing-magic': {
    title: 'Swapped and disabled keys',
    qmkName: 'Magic keycodes',
    body: [
      'Switches that change what modifier keys do on every layer at once, without editing each key: swap Caps Lock and Ctrl, swap Alt and Win for a Mac, or switch the Windows keys off for games. Swapping Esc and Caps Lock has no switch here; it is a key on the Keys page.',
      'The keys still show their own names on the Keys page; the swap happens in the keyboard after that. Turn the switch off to undo it.',
      'Here too, under More options: “Any number of keys at once” (N-key rollover), which lets the computer see every key held together rather than six; the switch turns it on and off. A few BIOS screens and old computers don’t understand it; turn it off if keys stop working there. Some keyboards do it by themselves (adaptive N-key rollover, which Keychron’s firmware uses): they send keys the ordinary way and switch over once more than six are held. Such a keyboard tells the app so, and there the app doesn’t show the switch or the keys for it.',
    ],
    example: 'Turn on “Windows keys do nothing” before a game, and off again afterwards.',
    docs: QMK + 'keycodes_magic',
    where: [
      { label: 'Typing feel, Swapped and disabled keys', href: '#/typing/magic' },
      { label: 'Keys page, “A key”, Swapped and disabled keys (keys that change these switches)', href: '#/keys' },
    ],
    related: ['magic-keys', 'nothing', 'typing-reset'],
  },
  'typing-grave-esc': {
    title: 'The Esc and ` key',
    qmkName: 'Grave Escape, QK_GESC',
    body: [
      'On small keyboards one key often does both Esc and `: it sends Esc, or ` while Shift or Win is held (so Shift gives ~). You can put it on any key from the Keys page (search “Grave Escape”).',
      'These switches make it send Esc in some of those cases, for shortcuts that need Esc with a modifier.',
    ],
    example: 'Turn on “Esc while Ctrl is held” so that Ctrl + Shift + the key opens the Task Manager.',
    docs: QMK + 'features/grave_esc',
    where: [{ label: 'Typing feel, Esc and ` key', href: '#/typing/graveEsc' }],
    related: ['typing-magic'],
  },
  'typing-debounce': {
    title: 'Key bounce filter',
    qmkName: 'Debounce',
    body: [
      'When a switch closes, its contacts flicker for a few milliseconds before they settle. The keyboard waits this long to be sure a press is real, so one press never types twice.',
      'If a key sometimes types twice (chatter, common on worn switches), raise the time. Lower times react a little sooner, which only matters in fast games. “React at once” counts a press straight away and only ignores the flicker after it; “Wait until steady” waits first.',
    ],
    example: 'An E that sometimes types “ee”: raise the time in steps of 5 ms until it stops.',
    docs: QMK + 'feature_debounce_type',
    where: [{ label: 'Typing feel, Key bounce filter', href: '#/typing/debounce' }],
    related: ['test-keys'],
  },
  'typing-snap-click': {
    title: 'Snap Click',
    qmkName: 'SOCD (simultaneous opposite cardinal directions)',
    body: [
      'For games: when you hold two opposite keys, A and D for left and right, the game normally gets both and your character stops. Snap Click decides which one counts, so a quick change of direction is instant.',
      'Each pair has a rule: usually the last one pressed wins, and letting it go brings the other back. Some games and tournaments don’t allow this; check before you use it in competition.',
    ],
    example: 'Pair A and D with “The last one pressed wins”: holding A and tapping D strafes right, then left again.',
    docs: 'https://www.keychron.com/blogs/news/how-to-set-snap-click-on-launcher',
    where: [{ label: 'Typing feel, Snap Click', href: '#/typing/snap-click' }],
    related: ['typing-debounce'],
  },
  'typing-reset': {
    title: 'Resetting the typing settings',
    qmkName: 'Reset QMK Settings (Vial)',
    body: [
      'Puts every setting on this page back to how the firmware came, in one go: the timings, Capitals by holding, the mouse keys, and the swapped and disabled keys, including the Esc and Caps Lock swap and N-key rollover, which can also be set with keys. One-tap modifiers are switched on again, even if a key had switched them off. The key bounce filter and Snap Click are Keychron’s and stay as they are.',
      'It can’t be undone with Undo, so make a backup first (Device page) if you might want your settings back.',
    ],
    example: 'Lost track of what you changed and the keyboard feels odd? Back up, then reset, and start again from the firmware’s own settings.',
    docs: 'https://get.vial.today/manual/qmk-settings.html',
    where: [{ label: 'Typing feel, at the bottom', href: '#/typing' }],
    related: ['typing-feel', 'backup'],
  },

  // ---- Testing ----

  'test-keys': {
    title: 'Testing keys',
    qmkName: 'Matrix tester',
    body: [
      'Press every key once: each lights up while it is down and stays marked afterwards, so a key that never lights is one that doesn’t work.',
      'While the keyboard is locked, the app sees keys the way any web page does, through the browser: only the keys that type something, and only while this window is in front. Fn and other layer keys send nothing the browser can see. Unlocked, the app reads every switch straight from the keyboard, Fn included.',
      'A few keyboards have more switches than their firmware can report to an app in one go. There the page always goes by the browser, unlocked or not, and says so.',
      'The marks stay while you look at other pages; Start again clears them. Through the 2.4 GHz receiver, reading the switches pauses after two minutes without a key press, so the keyboard can go to sleep; any key carries on.',
    ],
    example: 'Unlock, then hold Fn: its key lights up although your computer never hears about it.',
    where: [{ label: 'Test page', href: '#/test' }],
    related: ['test-knob', 'unlock', 'typing-debounce'],
  },
  'test-knob': {
    title: 'Testing the knob',
    qmkName: 'Encoder',
    body: [
      'Turning the knob is not a switch, so the Test page sees a turn only when what it sends reaches the browser, locked or not: ordinary keys or scrolling.',
      'The volume keys stay with the computer, and the media keys often go to the browser itself, so a knob on volume can’t be checked here; nor can one that changes the lighting. The page says which, and on which layer the knob can be checked instead.',
    ],
    example: 'Hold the layer key where the knob scrolls and turn it both ways: both turns are marked as seen.',
    docs: QMK + 'features/encoders',
    where: [{ label: 'Test page', href: '#/test' }],
    related: ['test-keys', 'knob'],
  },

  // ---- Device: backups and the keyboard ----

  backup: {
    title: 'Making a backup',
    body: [
      'A backup is one file with everything the keyboard holds: every key on every layer, the knob, macros, multi-tap keys, key chords, shortcut replacements and repeat rules, typing settings, the lighting with key colours, mixed zones and the Caps Lock light, the key bounce filter, Snap Click and the wireless timers. The names you gave layers and macros, which live in this browser, go in it too.',
      'Saving a backup only reads from the keyboard; nothing on it changes. Keep the file somewhere safe and make a new one after big changes.',
    ],
    example: 'Back up before flashing new firmware; afterwards, restore the file to get your layout back.',
    docs: 'https://get.vial.today/manual/',
    where: [{ label: 'Device page, Back up and restore', href: '#/device' }],
    related: ['restore', 'vial-file', 'saving'],
  },
  restore: {
    title: 'Restore a backup',
    body: [
      'Restoring makes the keyboard match a backup file. The app first lists what is different and only writes that; everything else stays as it is. “Show the changes” lists every key, knob turn, macro and shortcut it would change, and a red box names anything risky first: the firmware update key, the key that wipes the keyboard’s memory, a layer nothing would reach any more or left without letters.',
      'A file from a different model is refused; one from the same model running other firmware is allowed, with a warning that some keys and settings may not work the same. Values a file can’t hold (a damaged file) are refused or left out, with a line saying which, before anything is written. Macros, and the key that restarts the keyboard for a firmware update, can only be written while the keyboard is unlocked; the app says so first, and leaves them out if it stays locked.',
      'If the keyboard goes away or stops answering part-way, the restore stops and says so, also after you connect again. Restoring the same file again finishes it: only what still differs is written.',
      'The keys and knob can be put back afterwards with Undo; macros, settings and lighting can’t, so back up first if you might want them again.',
    ],
    example: 'Restore last week’s backup to undo an afternoon of experiments in one go.',
    where: [{ label: 'Device page, Back up and restore', href: '#/device' }],
    related: ['backup', 'vial-file', 'unlock'],
  },
  'vial-file': {
    title: 'Vial files',
    qmkName: '.vil',
    body: [
      'Vial, the app this firmware was made for, saves layouts in its own kind of file. Layerworks can save one for Vial to load, and restore from one Vial saved.',
      'A Vial file holds the keys, knob, macros, multi-tap keys, key chords, shortcut replacements, repeat rules and typing settings, but not the lighting (key colours included), the key bounce filter, Snap Click, wireless timers, or layer and macro names. For a complete backup, use the Layerworks file.',
      'A Vial file names its keys, so it still fits after a firmware update. A Layerworks backup keeps their numbers, and Vial firmware from before 2023 numbers keys differently: a backup made on such firmware is refused on newer firmware (and the other way round). Restore a Vial file from that time instead.',
    ],
    example: 'Save a Vial file to share your layout with someone who uses Vial.',
    docs: 'https://get.vial.today/manual/',
    where: [{ label: 'Device page, Vial files', href: '#/device' }],
    related: ['backup', 'restore'],
  },
  'keyboard-info': {
    title: 'About this keyboard',
    body: [
      'What the keyboard says about itself when it connects: its name, how it is connected, the firmware version, how many layers and keys it has, and how much room it has for macros, multi-tap keys, key chords, shortcut replacements and repeat rules.',
      'Technical details lists the numbers behind it: USB IDs, protocol versions, the features the firmware reports. They help when asking for help or reporting a problem; you never need them to use the app.',
    ],
    example: 'Asked which firmware you are on? It is under Firmware; the rest is under Technical details.',
    where: [{ label: 'Device page, About this keyboard', href: '#/device' }],
    related: ['firmware', 'keyboard-features'],
  },
  'keyboard-features': {
    title: 'What this keyboard can do',
    body: [
      'Not every keyboard, or every firmware, has every feature. When the keyboard connects it tells the app what it has room for, and Home lists it: layers, a knob, lighting effects, macros and so on.',
      'Anything it lacks is folded away under “Not available on this keyboard”, each with the reason. The other pages leave those controls out or say why they can’t be used, so nothing pretends to work.',
    ],
    example: 'On the cable, the battery isn’t reported; through the 2.4 GHz receiver it is, and Home shows it.',
    where: [{ label: 'Home, What this keyboard can do', href: '#/' }],
    related: ['keyboard-info', 'firmware'],
  },
  'lights-off-timer': {
    title: 'Lights off after',
    qmkName: 'Wireless backlight timeout',
    body: [
      'On Keychron wireless keyboards, on Bluetooth or 2.4 GHz, the key lights turn off after this long without a key press, to save the battery. The first key you press turns them on again. The card shows only on keyboards that have these timers.',
      'It must be at least 5 seconds and shorter than the sleep time. The keyboard keeps it until you change it. The card offers the usual choices; a time set elsewhere shows as it is.',
    ],
    example: '30 seconds makes a charge last noticeably longer than the default 10 minutes.',
    where: [{ label: 'Device page, Wireless and sleep', href: '#/device' }],
    related: ['sleep-timer', 'lighting-brightness'],
  },
  'sleep-timer': {
    title: 'Sleep after',
    qmkName: 'Wireless idle timeout',
    body: [
      'On Bluetooth or 2.4 GHz, the keyboard goes to sleep after this long without a key press. Pressing a key wakes it; the first press may be lost while it reconnects.',
      'It must be at least a minute. Changing either timer while connected through the receiver can make the mouse pointer twitch once.',
    ],
    example: 'The default is 2 hours; 30 minutes saves battery if you often leave the keyboard on.',
    where: [{ label: 'Device page, Wireless and sleep', href: '#/device' }],
    related: ['lights-off-timer'],
  },
  'keymap-reset': {
    title: 'Reset to defaults',
    qmkName: 'Dynamic keymap reset (VIA); Keychron factory reset',
    body: [
      'The firmware has a keymap built in, the one it came with. Resetting puts it back on every layer and the knob, and clears what was set up on top: the typing settings, multi-tap keys, key chords, shortcut replacements and repeat rules. Macros stay unless you tick “Empty the macros too”; neither needs the keyboard unlocked.',
      'The lighting, the key colours and mixed zones, the Caps Lock light, the layer and macro names, and Keychron’s key bounce filter, Snap Click and wireless timers stay as they are. Undo can’t bring the old setup back, and resetting empties Undo, so save a backup first: restoring it puts everything back.',
      'Keychron keyboards also have a factory reset of their own, on the keyboard: hold Fn, J and Z together for about three seconds. It wipes everything the keyboard holds, the key bounce filter, Snap Click, lighting and wireless timers included, and forgets its Bluetooth and 2.4 GHz pairings. Back up first. It goes by what the keys do, so it only works while a key still switches to the Fn layer and J and Z still type J and Z; this reset works whatever the keys are.',
    ],
    example: 'Lost track of what you changed? Save a backup, reset, and start from the firmware’s own keys.',
    docs: 'https://get.vial.today/manual/',
    where: [{ label: 'Device page, Start over or update, More options', href: '#/device' }],
    related: ['backup', 'restore', 'typing-reset', 'cant-type'],
  },
  'cant-type': {
    title: 'When the keyboard won’t type',
    body: [
      'If a change leaves the keyboard unable to type, or a layer you can’t get out of, the app can still fix it: it talks to the keyboard whatever its keys do, and you can use it with the mouse. Before such a change the Keys page and the restore review say what it would do.',
      'Undo, in the bar at the bottom, takes the last changes back. Device page, Start over or update, Reset to defaults puts back the keys the firmware came with. A backup puts back everything.',
      'Without the app: Keychron’s own factory reset (hold Fn, J and Z) works only while those keys still do that. Holding Esc (on most keyboards the top-left key) while plugging the keyboard in starts firmware update mode whatever the keys are; putting firmware on it again, with a flashing tool, gives a fresh start but may erase what it holds.',
    ],
    example: 'Every key on the base layer set to Nothing by mistake: click Undo, or Reset to defaults on the Device page.',
    where: [{ label: 'Device page, Start over or update, More options', href: '#/device' }],
    related: ['undo', 'keymap-reset', 'backup', 'bootloader'],
  },
  bootloader: {
    title: 'Restart for a firmware update',
    qmkName: 'Bootloader',
    body: [
      'New firmware goes onto the keyboard in firmware update mode, which QMK calls the bootloader. Usually you get there by holding a key while plugging the keyboard in (Esc on most Keychron keyboards); this does the same from here.',
      'The keyboard then stops typing until new firmware is put on it with a flashing tool, or until it is unplugged and plugged back in. This app loses the connection; it doesn’t put firmware on the keyboard itself. Only on the cable, and only once the keyboard is unlocked: Vial asks for that, so a web page can’t do it unnoticed.',
    ],
    example: 'About to flash a new build: restart it from here, then run the flashing tool.',
    docs: QMK + 'newbs_flashing',
    where: [{ label: 'Device page, Start over or update, More options', href: '#/device' }],
    related: ['firmware', 'unlock', 'restart-keys'],
  },

  // ---- Firmware and QMK words ----

  firmware: {
    title: 'Firmware, QMK and Vial',
    qmkName: 'QMK, Vial, VIA',
    body: [
      'The firmware is the program inside the keyboard that turns key presses into what the computer receives. Keychron keyboards run QMK, the free firmware most enthusiast keyboards use.',
      'Vial is an addition to QMK that lets an app like this one change keys and settings while the keyboard runs, without building new firmware. VIA is an older way to do the same, which Keychron Launcher uses; Launcher doesn’t work with Vial firmware, so use Layerworks or Vial instead.',
      'New firmware is put on the keyboard (flashed) with other tools, in firmware update mode, which QMK calls the bootloader. Flashing can erase what the keyboard holds, so back up first.',
    ],
    example: 'The version under Firmware (Device page, About this keyboard) is what to quote when asking for help.',
    docs: QMK + 'newbs',
    where: [{ label: 'Device page, About this keyboard', href: '#/device' }],
    related: ['qmk-names', 'backup', 'keyboard-info'],
  },
  'qmk-names': {
    title: 'Two names for everything',
    body: [
      'Layerworks calls things by what they do: a multi-tap key, a key chord, “Same as the layer below”. QMK, Vial and the guides you find online use their own names for the same things: tap dance, combo, KC_TRNS. The app shows QMK’s name beside its own, small, wherever there is one.',
      'The searches on the Help, Keys and Typing feel pages understand both, and the glossary lists them side by side.',
    ],
    example: 'A guide says “add a combo”: that is a key chord here, on Shortcuts & macros.',
    docs: QMK + 'keycodes',
    where: [{ label: 'Help, Glossary', href: '#/help/glossary' }],
    related: ['firmware', 'raw-code'],
  },
} satisfies Record<string, HelpTopic>

export type HelpTopicId = keyof typeof topics
export const HELP_TOPICS: Record<HelpTopicId, HelpTopic> = topics
export const HELP_TOPIC_IDS = Object.keys(topics) as HelpTopicId[]

export const isHelpTopic = (id: string): id is HelpTopicId => Object.hasOwn(topics, id)
