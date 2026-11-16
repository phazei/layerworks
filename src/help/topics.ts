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
    qmkName: 'MO, TT, TG, TO, OSL, DF',
    body: [
      'A layer key switches to another layer. The usual kind works while held, like Fn. Others switch a layer on until pressed again, or just for the next key.',
      '“Hold for a layer, or tap quickly to keep it on” (TT) works while held too, but a few quick taps leave the layer on until you tap it again. How many taps is a typing setting (Tapping toggle, five unless changed).',
      'The key that takes you to a layer should be empty ("same as the layer below") on that layer, or you can get stuck there.',
    ],
    example: '"While held → Fn2" on the right B key: holding B turns the keys around J into a number pad.',
    docs: QMK + 'feature_layers#switching-and-toggling-layers',
  },
  'tap-hold': {
    title: 'Tap or hold',
    qmkName: 'Mod-tap, layer-tap',
    body: [
      'One key that does one thing when you tap it and another while you hold it down: a modifier such as Ctrl, or a layer. Tapped, it sends a plain key.',
      'The keyboard waits to see which it is, so a tap is sent when you let go rather than when you press. How long counts as a hold is a typing setting (Typing feel page).',
      'Only plain keys can be the tap: letters, numbers, editing keys, F-keys. For a media key or a shortcut on a tap, use a multi-tap key (Shortcuts & macros).',
    ],
    example: 'Caps Lock as “Tap: Escape · Hold: Ctrl”: Esc where it is easy to reach, and Ctrl under your little finger.',
    docs: QMK + 'mod_tap',
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
  },
  'layer-tap': {
    title: 'Tap for a key, hold for a layer',
    qmkName: 'Layer-tap, LT(layer, kc)',
    body: [
      'Tapped, the key sends a plain key; held, another layer is on for as long as you hold it, like Fn.',
      'It can reach the first 16 layers (0 to 15), and only plain keys can be the tap.',
    ],
    example: 'Tap: Space · Hold: Fn2 on the space bar: your thumb types spaces and, held, brings up the number pad.',
    docs: QMK + 'feature_layers#switching-and-toggling-layers',
  },
  'one-shot-mod': {
    title: 'Modifier for the next key only',
    qmkName: 'One-shot modifier, OSM(mod)',
    body: [
      'Tap it and let go: the next key you press comes with that modifier, as if you had held it. Handy for capitals without holding Shift, or Ctrl shortcuts with one hand.',
      'Held down, it works like the ordinary modifier. How long it waits for the next key is a typing setting.',
    ],
    example: 'Shift for the next key only: tap it, then tap A, and you get a capital A.',
    docs: QMK + 'one_shot_keys',
  },
  'layer-mod': {
    title: 'A layer with modifiers held',
    qmkName: 'LM(layer, mod)',
    body: [
      'While held, another layer is on and the modifiers you ticked are held too, so every key on that layer comes with them.',
      'It can reach the first 16 layers (0 to 15).',
    ],
    example: 'While held, use Fn2 with Ctrl: the arrow keys on Fn2 then jump a word at a time.',
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
  'key-colours': {
    title: 'Key colours',
    qmkName: 'Keychron per-key RGB',
    body: [
      'With the “Key by key” effect every key shows a colour of its own. Pick a colour, then click a key or drag across several; the keyboard changes as you paint and keeps the colours after a moment.',
      'Brightness is one setting for the whole keyboard (the Brightness slider), so a key’s colour is only its colour and vividness. Undo takes back one stroke at a time.',
    ],
    example: 'Paint the letters white, then W, A, S and D red, for games.',
    docs: 'https://www.keychron.com/blogs/news/how-to-set-per-key-rgb-on-launcher',
  },
  'key-style': {
    title: 'How the key colours light up',
    qmkName: 'Per-key RGB type',
    body: [
      'Steady shows every colour all the time. Breathing fades them in and out together. The others light keys only while you type: the key you press, a glow around it, or a splash spreading from it, each in the colours you painted.',
      'The Speed slider sets how fast they breathe or fade.',
    ],
    example: '“Light up when pressed” on a dark desk: keys flash in their colour as you type.',
  },
  'lighting-zones': {
    title: 'Lighting zones',
    qmkName: 'Keychron mixed RGB',
    body: [
      'With the “Mixed zones” effect the keyboard is split into zones, and each zone plays its own effects. Every key belongs to one zone; paint keys to move them.',
      'A zone can play several effects in turn, each for as long as you set, fading from one to the next. Each effect has its own colour and speed; brightness is the keyboard’s.',
    ],
    example: 'W, A, S and D breathing red in one zone while the rest of the keyboard plays a rainbow wave.',
    docs: 'https://www.keychron.com/blogs/news/how-to-set-mix-rgb-on-launcher',
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
      'While the keyboard is locked, the app sees keys the way any web page does, through the browser: only the keys that type something, and only while this window is in front. Fn and other layer keys send nothing the browser can see. Unlocked, the app reads every switch straight from the keyboard, Fn included.',
      'Turning the knob is not a switch, so it shows only when what it sends reaches the browser, locked or not: ordinary keys or scrolling. The volume keys stay with the computer, and the media keys often go to the browser itself, so a knob on volume can’t be checked here; nor can one that changes the lighting. The page says which, and on which layer the knob can be checked instead.',
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
  macros: {
    title: 'Macros',
    qmkName: 'Dynamic macros, M0 – M15',
    body: [
      'A macro does several things when you press one key: types a piece of text, taps a shortcut, waits a moment, and so on, one step after another. It lives in the keyboard, so it works on any computer.',
      'Build one from steps, or record it as you type. Save it to the keyboard, then put it on a key from the Keys page, where the macros are listed under Macros.',
      'All the macros share one small space in the keyboard (926 bytes on the K15 Max): each typed character takes one byte, each key or wait a few.',
    ],
    example: 'A macro that types your e-mail address, on Fn + E.',
    docs: 'https://get.vial.today/manual/macros.html',
  },
  'macro-unlock': {
    title: 'Why saving a macro needs unlocking',
    qmkName: 'Vial unlock',
    body: [
      'A macro can type anything, including commands, so the keyboard only takes macro changes while it is unlocked: a web page can’t plant one behind your back.',
      'You can edit a macro while the keyboard is locked; the changes wait in the app until you unlock and save. Undoing a saved macro needs the keyboard unlocked too.',
    ],
    example: 'Click “Unlock to save…”, hold Esc and Enter until the bar is full, then save.',
  },
  'macro-hold': {
    title: 'Holding a key down and letting it go',
    qmkName: 'SS_DOWN, SS_UP',
    body: [
      '“Tap a key” presses and releases a key in one go, with Ctrl, Shift, Alt or Win if ticked. For a key that must stay down while other steps happen, use “Hold a key down”, then “Let a key go” later.',
      'Let every held key go before the macro ends, or the computer thinks it is still held until you press it yourself.',
    ],
    example: 'Hold Alt, tap Tab, tap Tab, let Alt go: switches to the window two back.',
    docs: QMK + 'feature_macros#sendstring',
  },
  'macro-wait': {
    title: 'Waiting',
    qmkName: 'SS_DELAY',
    body: [
      'A pause between steps, for a program that needs a moment: a window opening, a menu appearing. Up to about 65 seconds per wait.',
    ],
    example: 'Win + R, wait 0.3 s for the Run box, then type “notepad” and tap Enter.',
    docs: QMK + 'feature_macros#sendstring',
  },
  'macro-record': {
    title: 'Recording a macro',
    body: [
      'While recording, what you type becomes steps: letters and symbols become text, shortcuts such as Ctrl + C become one key step, and keys held across others become hold and let-go steps. Tick “Keep the pauses” to keep how long you waited between keys.',
      'Only keys that reach the browser can be recorded: not Fn or layer keys, and not shortcuts Windows or the browser keep for themselves. Text is typed as on a US keyboard layout.',
    ],
    example: 'Record, type “Kind regards,”, tap Enter, type your name, stop.',
  },
  'tap-dance': {
    title: 'Multi-tap keys',
    qmkName: 'Tap dance, TD(0) – TD(15)',
    body: [
      'One key that does different things depending on how you press it: a tap, a hold, two quick taps, or a tap followed by a hold. Leave any of them empty if you don’t need it.',
      'It only works once it is on a key: on the Keys page, click a key and pick it under Multi-tap keys.',
    ],
    example: 'Tap for Esc, tap twice for Caps Lock: Caps Lock is still there but hard to hit by accident.',
    docs: QMK + 'features/tap_dance',
  },
  'tapping-term': {
    title: 'How long counts as a hold',
    qmkName: 'Tapping term',
    body: [
      'How long the key must stay down to count as held rather than tapped, and how quickly a second tap must follow to count as a double tap. Each multi-tap key has its own; 200 ms suits most people.',
      'Shorter makes taps quicker but holds easier to trigger by accident; longer the other way round.',
    ],
    example: 'If a double tap often comes out as two single taps, raise it to 250 ms.',
    docs: QMK + 'tap_hold#tapping-term',
  },
  combos: {
    title: 'Key chords',
    qmkName: 'Combos',
    body: [
      'Press two to four keys at the same moment and the keyboard sends something else instead of them. Pressed one after the other, they type as usual.',
      'A chord works on its own once saved, on every layer. The keys are named by what they send (J, K), not by where they are, so a chord follows a key you move. How close together the presses must be is a typing setting (Typing feel page).',
    ],
    example: 'J and K together for Esc: no need to reach for the corner.',
    docs: QMK + 'features/combo',
  },
  'key-overrides': {
    title: 'Shortcut replacements',
    qmkName: 'Key overrides',
    body: [
      'When a key is pressed with certain modifiers held, the keyboard sends something else instead. The modifiers can be kept or taken away from what is sent.',
      'It works on its own once saved, on the layers you pick.',
    ],
    example: 'Shift + Backspace sends Delete, with Shift taken away so it isn’t Shift + Delete.',
    docs: QMK + 'features/key_overrides',
  },
  'override-modifiers': {
    title: 'Modifiers in a shortcut replacement',
    qmkName: 'trigger_mods, negative_mod_mask, suppressed_mods',
    body: [
      'Trigger: the modifiers that must be held. Ctrl means either Ctrl key; tick Left or Right only to tell them apart.',
      'Must not be held: if any of these is down, the replacement doesn’t happen. Taken away: modifiers held for the trigger that are let go while the replacement is sent, so Shift + Backspace gives Delete rather than Shift + Delete.',
    ],
    docs: QMK + 'features/key_overrides',
  },
  'override-options': {
    title: 'When a shortcut replacement starts and ends',
    qmkName: 'ko_option_*',
    body: [
      'By default it starts whichever comes last: the key pressed with the modifiers held, a modifier pressed while the key is held, or a modifier it must not see let go. Untick any of these to be stricter.',
      '“Any one of the modifiers” makes one of the trigger modifiers enough. The last two decide what happens to the original key afterwards; leave them alone unless something feels wrong.',
    ],
    docs: QMK + 'features/key_overrides#key-override-options',
  },
  'alt-repeat': {
    title: 'Repeat rules',
    qmkName: 'Alt repeat key, QK_AREP',
    body: [
      'The alternate repeat key does the “opposite” of the key you pressed last: after Ctrl + Z, Ctrl + Y; after Page Up, Page Down. A rule says what it sends after a given key; without a rule it has a few built in (arrows, Page Up/Down …).',
      'It needs the key itself on the keyboard: on the Keys page, click a key and pick “Alt Repeat” under Repeat keys.',
    ],
    example: 'After Ctrl + Z, the alternate repeat key sends Ctrl + Y: undo with one hand, redo with the other.',
    docs: QMK + 'features/repeat_key',
  },
  'repeat-options': {
    title: 'Repeat rule options',
    qmkName: 'Alt repeat options',
    body: [
      'Modifiers it allows: the rule still applies when these are held with the last key (Shift + Ctrl + Z, for example). Both ways: after the second key, the repeat key sends the first one. Left or right the same: a right Ctrl counts like a left one.',
      '“Fallback for every other key”: after any key that no rule covers, the alternate repeat key sends this rule’s key.',
    ],
    docs: QMK + 'features/repeat_key',
  },
  'typing-feel': {
    title: 'Typing feel',
    qmkName: 'QMK Settings',
    body: [
      'How the keyboard reads your presses: how long a press counts as a hold, how close together keys must go down to count as a chord, how the mouse keys speed up, which modifier keys are swapped. Each change goes to the keyboard at once and stays there, on any computer.',
      'Most people only ever touch the first few. If something feels wrong, “Reset all typing settings” at the bottom puts every one back to how the firmware came.',
    ],
    example: 'If a key that is A when tapped and Ctrl when held keeps giving Ctrl by accident, make “How long counts as a hold” longer.',
    docs: 'https://get.vial.today/manual/qmk-settings.html',
  },
  'typing-tap-hold': {
    title: 'Tap or hold',
    qmkName: 'Tap-Hold, tapping term',
    body: [
      'A key can do one thing when tapped and another when held: A when tapped and Ctrl when held, or Space when tapped and a layer when held. The keyboard can’t know which you mean until you let go, or until enough time has passed.',
      '“How long counts as a hold” is that time. Under More options are ways to decide sooner when you press another key in the meantime; try one at a time, in the box on this card.',
      'Multi-tap keys each have their own time, set on Shortcuts & macros.',
    ],
    example: 'Home-row Ctrl on F: at 200 ms, a quick “f” types f; F held while you press C gives Ctrl + C.',
    docs: QMK + 'tap_hold',
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
  },
  'typing-auto-shift': {
    title: 'Capitals by holding',
    qmkName: 'Auto Shift',
    body: [
      'With this on, a key held a little longer than a normal tap types its shifted version: a capital letter, or the symbol above a number. A normal tap types as before.',
      'Under More options: which keys it works on, whether it still works with Ctrl or Alt held, and what a held key does instead of repeating.',
    ],
    example: 'Tap 1 for 1, hold it for !; tap a for a, hold it for A.',
    docs: QMK + 'features/auto_shift',
  },
  'typing-one-shot': {
    title: 'One-tap modifiers',
    qmkName: 'One Shot Keys',
    body: [
      'A one-tap modifier is a Shift, Ctrl, Alt or Win key (or a layer key) that you tap instead of holding: it stays on for the next key you press, then lets go. Easier on the hands, and handy with one hand.',
      'They only work once such a key is on the keyboard: on the Keys page, under Switch layer for layers, or under More options for modifiers. Tapping one several times locks it on until you tap it again.',
    ],
    example: 'Tap the one-tap Shift, then a: you get A, and the next letter is small again.',
    docs: QMK + 'one_shot_keys',
  },
  'typing-mouse-keys': {
    title: 'Mouse keys',
    qmkName: 'Mouse Keys',
    body: [
      'Keys can move the mouse pointer, click and scroll. A press moves the pointer one small step; held, it starts moving and speeds up until it reaches top speed.',
      'Top speed is how far it moves at once at full speed, and how long it takes to get there is counted in moves. The line under each says what that means in pixels a second. Scrolling works the same way, in wheel notches.',
    ],
    example: 'On the K15 Max, hold Fn2 (right B) and use the arrows: a tap nudges the pointer, holding sweeps it across the screen.',
    docs: QMK + 'features/mouse_keys',
  },
  'typing-magic': {
    title: 'Swapped and disabled keys',
    qmkName: 'Magic keycodes',
    body: [
      'Switches that change what modifier keys do on every layer at once, without editing each key: swap Caps Lock and Ctrl, swap Alt and Win for a Mac, or switch the Windows keys off for games.',
      'The keys still show their own names on the Keys page; the swap happens in the keyboard after that. Turn the switch off to undo it.',
    ],
    example: 'Turn on “Windows keys do nothing” before a game, and off again afterwards.',
    docs: QMK + 'keycodes_magic',
  },
  'typing-grave-esc': {
    title: 'The combined Esc and ` key',
    qmkName: 'Grave Escape, QK_GESC',
    body: [
      'On small keyboards one key often does both Esc and `: it sends Esc, or ` while Shift or Win is held (so Shift gives ~). You can put it on any key from the Keys page (search “Grave Escape”).',
      'These switches make it send Esc in some of those cases, for shortcuts that need Esc with a modifier.',
    ],
    example: 'Turn on “Esc while Ctrl is held” so that Ctrl + Shift + the key opens the Task Manager.',
    docs: QMK + 'features/grave_esc',
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
  },
  'typing-reset': {
    title: 'Resetting the typing settings',
    qmkName: 'QMK Settings reset',
    body: [
      'Puts every setting on this page back to how the firmware came, in one go: the timings, Capitals by holding, the mouse keys, and the swapped and disabled keys. The key bounce filter and Snap Click are Keychron’s and stay as they are.',
      'It can’t be undone with Undo, so make a backup first (Device page) if you might want your settings back.',
    ],
    docs: 'https://get.vial.today/manual/qmk-settings.html',
  },
} satisfies Record<string, HelpTopic>

export type HelpTopicId = keyof typeof topics
export const HELP_TOPICS: Record<HelpTopicId, HelpTopic> = topics
