# Keyboard

How the app talks to the keyboard, unlocks it and changes it, and how each kind of setting is read, written,
undone and backed up.

<!-- contents:start -->
**Contents**

- [How it talks to the keyboard](#how-it-talks-to-the-keyboard)
  - [Requests, replies and pushes](#requests-replies-and-pushes)
  - [2.4 GHz, one tab per keyboard, browser storage](#24-ghz-one-tab-per-keyboard-browser-storage)
  - [Staged loading and capabilities](#staged-loading-and-capabilities)
- [Unlocking](#unlocking)
  - [The unlock flow in the store](#the-unlock-flow-in-the-store)
  - [The unlock dialog](#the-unlock-dialog)
- [Changing things on the keyboard](#changing-things-on-the-keyboard)
  - [Assign, undo and failed writes](#assign-undo-and-failed-writes)
  - [Factory reset, a lost keyboard, lighting saves](#factory-reset-a-lost-keyboard-lighting-saves)
  - [The store's other changes](#the-stores-other-changes)
  - [Keymap reset and the restart for a firmware update](#keymap-reset-and-the-restart-for-a-firmware-update)
- [Key colours and zones](#key-colours-and-zones)
  - [Writing key colours and zones](#writing-key-colours-and-zones)
  - [The colour and zone editors](#the-colour-and-zone-editors)
  - [Lock lights, and restoring Keychron lighting](#lock-lights-and-restoring-keychron-lighting)
- [Typing settings](#typing-settings)
  - [Settings catalogue, values, writing and reset](#settings-catalogue-values-writing-and-reset)
  - [Key bounce filter and Snap Click commands](#key-bounce-filter-and-snap-click-commands)
  - [N-key rollover](#n-key-rollover)
- [Key names and the computer's layout](#key-names-and-the-computers-layout)
- [Macros](#macros)
  - [Macro steps, saving and problems](#macro-steps-saving-and-problems)
  - [Write order, uses and macro names](#write-order-uses-and-macro-names)
- [Tap dance, combos, key overrides, alt repeat](#tap-dance-combos-key-overrides-alt-repeat)
- [Backups](#backups)
  - [The backup file](#the-backup-file)
  - [Restore: checks and the plan](#restore-checks-and-the-plan)
  - [Restore: the review before writing](#restore-the-review-before-writing)
  - [Restore: writing the plan](#restore-writing-the-plan)
  - [Vial files (.vil)](#vial-files-vil)
<!-- contents:end -->

## How it talks to the keyboard

```
pages / plugins → device store → vendored protocol code → transport (request queue) → HidLink
                      ↑ layer changes ←──────────────────── unsolicited reports
```

### Requests, replies and pushes

- **One queue.** Every request goes through `Transport.request`, one at a time. The vendored protocol functions
  use it too (the store injects it), so nothing can overlap. `Transport.exclusive(job)` gives one job the queue
  for as long as it runs (the unlock flow); everything else waits behind it.
- **The switch matrix** (`0x02 0x03`, `device/matrix.ts`) is read one request at a time through the queue: a
  20 ms pause after each reply on the cable (about 45 reads a second), 60 ms through the receiver. Each read is
  a snapshot, so a very quick tap can fall between two.
- **Replies are checked.** VIA and Keychron replies start with the request's command byte (or `0xFF` for an
  unknown command), and for the commands whose next bytes the firmware leaves as sent (`VIA_ECHOED`: keycode get /
  set echo layer, row and column, buffer reads offset and size, lighting and Keychron their sub-command) those must
  match too; anything else is dropped as stray. Vial replies (`0xFE …`) carry data from the first byte and can't be
  checked, except that a settings or entry reply equal to its request is rejected as `busy` (an unlock is counting).
- **After a request gets no reply** the queue is held until nothing has arrived for 300 ms (at most 1.2 s), so a reply
  that was only late is dropped instead of being taken by the next request. `stats.unanswered` counts requests in a
  row without a reply.
- **Pushes are recognised by shape.** The keyboard reports every layer change as `[0xA3, base, held, 0 × 29]`
  without being asked. That exact shape goes to listeners, never to a waiting request, unless the request is
  `0xA3` itself on the cable, or a Vial knob read (whose reply can look the same). Keychron's factory-reset notice
  (`FACTORY_RESET_PUSH`) is known too. Further shapes can be listened for through `deviceStore.transport.onPush`;
  `PluginDef.pushes` is declared but not yet handed to the transport (spec section 9).

### 2.4 GHz, one tab per keyboard, browser storage

- **2.4 GHz.** Requests and replies are XOR-ed with `0x28`; pushes and the receiver's own notices (`0xBC`,
  `0xE2`) are not. Timeouts are short (300 ms) with up to 6 sends, because packets get lost now and then.
- **One Layerworks tab per keyboard** (`shell/session.ts`). WebHID lets every tab open the keyboard and gives every
  tab every reply, so each would take the other's for its own. Connecting claims a Web Lock named after the
  keyboard's vendor and product ID (WebHID has no serial number); a second tab gets "Layerworks is already open in
  another tab with this keyboard" and "Use it here", which steals the lock, and the first tab lets go and says so.
  Without `navigator.locks` nothing is claimed. Other programs (Vial, Launcher) can't be seen; an unlock they start is
  (see "Unlocking").
- **Browser storage** (`ui/prefs.ts`): a stored value is used only when it has its name's shape (`SHAPES`: layer and
  macro names are lists of strings, key colours hue and saturation bytes) or, for other names, the fallback's kind;
  anything else counts as absent. Every `phazei.github.io` project shares this storage.

### Staged loading and capabilities

- **Loading is staged.** Definition, keymap and knob come first, so the picture appears quickly; macros, entries,
  settings, lighting, lock state and Keychron state follow in the background (`DeviceState.loading`). A part that
  fails is listed in `DeviceState.failed` and the rest still loads.
- **Capabilities** are rebuilt as parts arrive. `capabilities.check('macros')` returns whether it's available and,
  if not, a sentence saying why. `hasCommand` answers false for now: nothing registers detected commands yet (spec
  section 9).

## Unlocking

Vial keeps a few things locked: macro writes, the switch matrix, the bootloader jump and the reset key. Unlocking
means holding the keyboard's unlock keys (Esc and Enter on the K15 Max; the keyboard lists them) while it counts
50 steps. While it counts, the keyboard doesn't type, answers almost no command, and can't be cancelled; it ends
by finishing or by restarting (unplugging, or moving the connection switch). Once unlocked it stays so until it
restarts or changes connection mode.

### The unlock flow in the store

- `deviceStore.unlock()` runs `device/unlock.ts`: through `Transport.exclusive`, which holds the request queue for
  the whole flow, so nothing else is sent (requests asked for meanwhile wait, with no timeout running, and go out
  afterwards). Status, start (skipped when the keyboard is already counting), then one poll loop with a pause of
  120 ms after each reply on the cable and 150 ms through the receiver (the firmware needs more than 100 ms
  between steps and starts the count again otherwise). A poll without a reply is not resent; the loop just
  polls again and marks the progress `silent`. `DeviceState.unlocking` holds `{ remaining, total, silent }`.
  It resolves `'unlocked'`, `'disconnected'` (the keyboard went away mid-way), `'failed'` (it never started
  counting, so it still works) or `'stopped'` (`deviceStore.stopUnlock()`: the app stopped waiting; the keyboard,
  if it was counting, still is). A second call joins the first.
- **Another app's unlock.** While an unlock counts, via.c sends every request back unchanged, which looks like
  success. Before a change the store asks the unlock status (one of the few requests still answered), at most every
  2 s; counting, the change fails with `OTHER_APP_UNLOCKING` (or `UNLOCK_LEFT_COUNTING` after "Stop waiting"), and
  the transport rejects as `busy` a Vial reply that is its request sent back (settings and entry commands, whose real
  replies always differ).
- `deviceStore.lock()` locks again. `capabilities.check('keyMatrix')` returns `needsUnlock: true` with its reason
  while locked: the sign for a page to offer unlocking.
- A keyboard found counting at connect (an app closed mid-unlock) isn't read: the store reports `STILL_UNLOCKING`,
  which says to replug it.

### The unlock dialog

- **On screen** (`shell/UnlockDialog.tsx`, opened by `openUnlock(reason)` from `shell/unlock-dialog.ts`; mounted
  once in the shell): first what unlocking is for, the keys to hold marked on a small picture, and that the
  keyboard won't type and nothing can stop it once started; then the count as a bar ("Keep holding…", "The count
  started again…"), Esc ignored and the browser asking before the page is left; then done, or "disconnected" /
  "didn't start" / "stopped waiting". Its only button, "Stop waiting", appears once the keyboard stops answering or
  after 15 s, with what to do when it doesn't answer; afterwards the dialog says the keyboard may still be counting
  and how to restart it. The device card shows Locked with "Unlock…", Unlocking…, or Unlocked with
  "Lock". `openUnlock` returns a promise for whoever asked: true as soon as the unlock completes (while the dialog
  still says so), false when the dialog is closed without it; already unlocked, true at once with no dialog. The
  macro and entry save bars await it and save by themselves; the restore review works its plan out again.

## Changing things on the keyboard

### Assign, undo and failed writes

- `deviceStore.assign(slot, keycode)` writes one key or knob direction, then updates the store. `undo()` and
  `redo()` write the previous or next value back. `DeviceState.writing` counts changes on their way;
  `writeError` holds the last failure, in plain words (the technical message goes to the console).
- **QK_BOOT while locked** is refused by the store on every route to a key or knob direction (`assign`, undo, redo:
  `KEY_BOOT_LOCKED`), not only by the inspector's unlock prompt: vial-qmk filters it in knob, entry and buffer writes
  but not in the single key write (`0x05`, via.c), so a link or plugin could otherwise put it on a key.
- **A change belongs to the keyboard it was asked for.** Changes run one at a time (`inOrder`); one whose keyboard
  has gone (or was read afresh after Keychron's factory reset) by its turn is dropped and resolves its "not done"
  value, so nothing queued for one keyboard lands on the next.
- **A write without a reply is read back.** A timeout doesn't mean the keyboard didn't do it (the reply can be lost
  or late). `writeOrError` then reads what the write touched (the key through VIA `0x04`, the knob, the entry, the
  setting, the macro memory, the lighting, Keychron's state) and shows that: found done, it counts as done (with its
  undo step); not done, it keeps no undo step. With three requests in a row unanswered it doesn't try, and the
  message adds that the app couldn't check. Messages: `NOT_ANSWERING` (through the receiver: asleep, switched off or
  out of range, press a key; on the cable: check it is plugged in).

### Factory reset, a lost keyboard, lighting saves

- **Keychron's factory reset** (Fn + J + Z) sends `[0xA7, 0x11, 0 …]` (`state_notify.c`); the store then reads the
  whole keyboard again on the same link and forgets undo (`FACTORY_RESET_PUSH`).
- **Losing the keyboard** (unplugged, receiver pulled, not `disconnect()`) leaves `DeviceState.lost` set until the next
  connect, with `duringWrite` when a change was on its way; the connect prompt says so.
- Lighting waiting for its 1.5 s save (main and Keychron's) sets `DeviceState.savePending`, which the status line
  counts as "Saving…"; `deviceStore.flushSaves()` saves at once, and the shell calls it on `beforeunload` and
  `pagehide`. The browser asks before the page is left while `writing > 0` or a restore runs.
- `deviceStore.setLighting(change)` sends the effect and its values at once and saves them to the keyboard 1.5 s
  after the last change. vial-qmk reloads speed and colour from what was last saved on the first frame of a
  different effect (`rgb_matrix.c`), over what was just sent, so a change of effect (on and off included) is sent,
  saved and sent again; restore writes its lighting the same way. Without that, the keyboard would run a new
  effect with the old saved speed or colour while the page showed the new ones.
- `deviceStore.refreshLighting()` reads the effect and its values again (one request). The keyboard's own lighting
  keys change them without telling anyone; the Lighting page calls it when it opens, when the window gets the focus
  back and when a held layer is let go (the lighting keys sit on the Fn layers).

### The store's other changes

- `deviceStore.lock()` locks the keyboard (see "Unlocking").
- `deviceStore.restore(plan, onProgress)` writes a restore plan (see "Backups") as one change in the queue.
- `deviceStore.saveMacro(index, steps)` saves one macro (see "Macros"). Undo and redo take a saved macro back and
  forth like a key, but only while the keyboard is unlocked; locked, they leave the step where it is and set
  `writeError` to `MACRO_UNDO_LOCKED`.
- `deviceStore.saveEntry(kind, index, entry)` saves one tap dance, combo, key override or alt repeat entry (see
  "Tap dance, combos, key overrides, alt repeat"); one undo step.
- `deviceStore.setWirelessTimers({ backlitTime, idleTime })` sets Keychron's wireless timers (`0xA7 0x0C`); the
  keyboard saves them itself. Pairs the firmware would refuse (lights-off under 5 s, sleep under 60 s) or that put
  sleep before lights-off are not sent (`timersProblem`). Writing them while wirelessly connected makes the
  firmware nudge the mouse pointer once.
- `deviceStore.setSetting(qsid, value)`, `setDebounce({ type, time })` and `setSnapClick(index, entry)` change one
  typing setting (see "Typing settings"); `resetSettings()` puts every QMK setting back to the firmware's defaults.
- `deviceStore.setKeyColours(colours, undoKey)`, `setKeyStyle(style)`, `setZones(regions, undoKey)` and
  `setZoneEffects(zone, effects)` change Keychron's key colours and zones (see "Key colours and zones");
  `setLockLights(change)` the lock lights.

### Keymap reset and the restart for a firmware update

- `deviceStore.resetKeymap({ macros })` sends VIA's keymap reset (`0x06`; quantum/via.c → `dynamic_keymap_reset` in
  quantum/dynamic_keymap.c): every layer's keys and the knob from the keymap built into the firmware,
  `qmk_settings_reset`, and every tap dance (with the firmware's tapping term), combo, key override (every layer,
  the three activation options, off) and alt repeat entry emptied. With `macros`, also the macro reset (`0x10`,
  memory filled with 0). via.c gates neither by Vial's unlock (only macro writes are); `dynamic_keymap_reset`
  unlocks itself briefly so QK_BOOT in the firmware's keymap goes back in. Lighting, Keychron's settings and layout
  options are untouched; Keychron's key bounce filter, Snap Click and wireless timers have no reset command at all
  (only the keyboard's factory reset, `factory_test.c`). Each request waits up to 5 s (the keyboard rewrites the
  keymap before it answers) and is sent again once if lost; doing it twice is harmless. Afterwards the store reads
  the keymap and knob, then macros, entries and settings (shown as loading). Undo and redo are cleared once the reset
  got through; without an answer, only if the keys read back changed (or couldn't be read).
- `deviceStore.restartToBootloader()` sends Vial's bootloader jump (`0x0B`, via.c, only in builds without
  `VIAL_INSECURE`; ignored until unlocked; the keyboard answers, waits 100 ms and jumps). Resolves `'cable-only'`
  through the receiver and `'locked'` while locked without sending, `'unsupported'` when the keyboard answers
  "unknown command", else saves any lighting waiting for its pause, sends it once and, once answered, disconnects
  (`'restarting'`), so nothing more is sent to a keyboard that is leaving USB.

## Key colours and zones

Keychron's own lighting (`0xA8`, `device/keychron-rgb.ts`; the firmware is vial-qmk `keyboards/keychron/
common/rgb/`), shown on keyboards whose Keychron features include it (`0xA2` bit 0x80). The store reads it with the
other Keychron data into `DeviceState.keychron.rgb`: the LED count, the LED under each key (`keyLeds` keeps the rows
and columns the keyboard has; the vendored read asks for 8 rows, and the store reads every row again where the matrix
has more, see [other-keyboards.md "Other keyboards"](other-keyboards.md#other-keyboards)), the colour of every LED, the per-key
style, the zone of every LED and each zone's effect slots.

### Writing key colours and zones

- **Writing**: every command changes the running copy, shown on the next frame; `0xA8 0x02` saves all of it at
  once with `eeprom_update_block`, which only writes bytes that changed. The store therefore sends changes as they
  are made and saves 1.5 s after the last one, like the main lighting. Colours go nine LEDs to a packet, zones 28,
  effect slots three, and only the stretches that change (`colourPackets`, `regionPackets`); each reply is checked
  (status 0). A stroke (`undoKey`) is one undo step; the editors send through `ui/latest.ts`, so a fast drag sends
  the newest table and never floods the keyboard.
- **Key colours**: hue and saturation only. Every per-key style replaces a key's brightness with the keyboard's
  (`per_key_rgb.c`), so the app writes 255 and the page's Brightness slider sets it for all keys. Styles (0 – 4):
  steady, breathing, light up when pressed, glow around pressed keys, splash; speed is the main Speed slider.
- **Zones**: 2 zones on the K15 Max, every LED in one; each zone has 5 effect slots, played in turn for their time
  (ms) with a one-second fade, effect 0 being empty. Each slot has its own hue, saturation and speed; brightness is
  the keyboard's. Zone effects use the keyboard's own effect numbers (QMK's `RGB_MATRIX_*` order), not VialRGB ids:
  `zoneEffectNumbers` numbers the effects the keyboard lists in `rgb_matrix_effects.inc` order (the K15 Max: Solid
  Color 1 ... Solid Splash 22, Direct 23, per-key 24, mixed 25), and a zone takes any below mixed except Direct.
- While mixed lighting runs, each zone puts its colour and speed in the keyboard's running settings every frame;
  `refreshLighting` keeps the store's colour and speed then, so the next effect gets the user's.

### The colour and zone editors

- **The editors** draw the keyboard with `KeyboardPicture`'s `fills` (a colour per key; labels dark or light by
  the colour's luminance, `isLightColour`) and `outlines` (zones), inside `ui/PaintSurface.tsx`, which turns a press
  and drag over keys into one stroke. Key colours: ready colours, recent colours, colour and vividness
  (`ui/ColourChooser.tsx`), paint or pick up a colour, colour a group at once (letters, numbers, F-keys, arrows,
  modifiers from the base layer's keycodes, and each matrix row; `lighting/key-groups.ts`), three starting
  points, and the style. Zones: pick a zone and paint keys into it; per zone, its effects with the grid's names and
  previews, their colour, vividness and speed where the effect uses them, and how long each plays when there are
  several. Each zone is outlined in its own colour and its own line, solid, dashed, dotted, dash-dot
  (`lighting/zone-marks.tsx`), with the same mark beside its name, so zones differ by more than colour (orange and
  green look alike to someone who can't tell red from green). The colours are data, the same in both themes except
  that the light theme takes a darker shade (`light-dark()`), so each outline is 3:1 against the keys in both.

### Lock lights, and restoring Keychron lighting

- **Lock lights** (`0xA8 0x03` / `0x04`, `os_indicator_config_t`, read at load into `rgb.osIndicatorConfig`): which
  lock lights the keyboard has (bits Num, Caps, Scroll, Compose, Kana; the K15 Max has only Caps Lock), an off bit
  each, and one colour for all (hue, saturation, brightness; the firmware raises a brightness under 128 to 128). A
  set is shown at once and saved by `0xA8 0x02` with the rest, so `setLockLights` saves after the same pause.
  Firmware default: all on, white. A switch and a colour drag are separate undo steps; quick colour changes merge.
  How the light is drawn is the firmware's: stock Keychron lights the key steadily; the owner's K15 Max keymap flashes
  it with the hue and saturation at full brightness and honours the off bit.
- **Restore** writes them back (`keyColours`, `zones`, `lockLights` in the plan), from the Keychron state the backup keeps, and
  only on a keyboard with as many lights and zones; Snap Click too (`snapClick`).

## Typing settings

Vial's "QMK Settings" are numbered (`qsid`) and the keyboard lists the ones its firmware has: 26 on the K15 Max
(1-7, 9-17 because mouse keys are on, 18-27; vial-qmk `quantum/qmk_settings.c`). The store reads them at load
(`DeviceState.settings`, each as the bytes the keyboard sent).

### Settings catalogue, values, writing and reset

- **The catalogue** (`device/settings.ts`): `SETTING_FIELDS` has one entry per control, for every id vial-qmk
  declares plus 8 (the tap-hold bits of older vial-qmk): a stable `key`, the `qsid`, the friendly name, QMK's name,
  a one- or two-sentence explanation of what it feels like, its group, whether it is advanced, and its control: a
  `number` (unit, range, step, presets, what 0 means), a `switch` (the whole value 0 or 1), or a `flag` (one bit,
  `inverted` for QMK's "don't …" bits, so Auto Shift's "Letters" is on when `NO_AUTO_SHIFT_ALPHA` is clear). Mouse-key
  fields have `describe`, a sentence worked out from the other settings. `SETTING_GROUP_INFO` names the groups.
- **Values**: `SETTING_WIDTHS` gives each id's size (1, 2 or 4 bytes; the single-bit ids 22-24 and 26 are one byte,
  0 or 1). `settingValues` decodes what the keyboard sent (little-endian; bytes past the width are leftovers of the
  request and ignored); `encodeSetting`, `withSettingValue`, `flagOn` and `withFlag` go the other way. Ids the app
  doesn't know have no width and are never written.
- **Writing**: `deviceStore.setSetting(qsid, value)` sends Vial's `0xFE 0x0B` with the value as wide as the
  setting; the firmware saves it to its EEPROM at once and no unlocking is needed. The store shows the new value once
  the keyboard has taken it. A change is one undo step; changes to the same setting less than a second apart, with
  nothing to redo, merge into that step (a dragged slider is one step, and one that ends where it started is none).
  The bounce filter and Snap Click pairs are undone the same way.
- **Reset**: `deviceStore.resetSettings()` sends Vial's `0xFE 0x0C` (`qmk_settings_reset`), then reads every
  setting again, since only the keyboard knows its defaults. It also clears the swapped and disabled keys and N-key
  rollover (Magic's bits), and is not undoable. Keychron's bounce filter and Snap Click are not part of it.

### Key bounce filter and Snap Click commands

- **Key bounce filter** (`setDebounce`, Keychron `0xA7 0x06`): a type (`DEBOUNCE_TYPES` in
  `device/keychron-typing.ts`, Keychron's numbering 0-6) and a time in ms (0-255; the asymmetric type keeps at most
  127). Saved by the keyboard at once.
- **Snap Click** (`setSnapClick`, `0xA7 0x09`, then `0xA7 0x0A` to save, since a set only changes the running
  table): 20 slots on the K15 Max, each a rule (`SNAP_CLICK_RULES`: 1 last pressed wins once, 2 last pressed wins, 3
  first key wins, 4 second key wins, 5 cancel out; 0 an empty slot) and two plain keys (8-bit keycodes).
  `snapClickProblem` refuses a pair the firmware would (a rule without both keys) and one with the same key twice.

### N-key rollover

- N-key rollover: the app's switch is Magic's bit 7 (QMK setting 21, and the `NK_*` keys), which sets
  `keymap_config.nkro`. Firmware built with Keychron's adaptive N-key rollover (`APDAPTIVE_NKRO_ENABLE`, in
  `keychron_common.mk`, so the K15 Max) never reads that bit when it builds reports (`tmk_core/protocol/report.c`,
  `quantum/action_util.c`): it switches to N-key rollover by itself once six keys are down. Such a keyboard says so:
  Keychron's `0xA7 0x12` reply (`keychron/common/nkro.c`: bit 0 on, bit 1 switchable, bit 2 adaptive; setting it
  is refused there), read at load into `keychron.nkroAdaptive`. `capabilities.nkro` (`device/capabilities.ts`,
  `nkroMode`) is `'automatic'` there, `'pending'` while the Keychron part is still being read, and `'setting'`
  otherwise (firmware without Keychron's commands keeps the switch, where it lists the setting). Only with
  `'setting'` does Typing feel show "Any number of keys at once" (and its search find it) and the palette offer the
  `NK_*` keys, so nothing appears and then goes while loading. A key that already holds one still reads by its
  name, and its "Now" line adds "Changes nothing here: this keyboard does it by itself."; typing the code under More
  options still works. The help topics keep explaining it, with why it isn't shown. Reset all typing settings is
  unaffected. Keychron's own NKRO_SET isn't used. Its report rate isn't offered either: the K15 Max doesn't have it.

## Key names and the computer's layout

A keyboard sends positions; the computer's layout decides the character (QMK's `KC_Y` types z on German QWERTZ).
Chrome and Edge give, through `navigator.keyboard.getLayoutMap()`, the character each of the 48 writing keys types
without Shift. `shell/keyboard-layout.ts` reads it when the app starts (`watchKeyboardLayout`, from `main.tsx`), again
when the window comes to the front or the tab becomes visible, and when a key typed in the page gives another
character than the map said: the browsers have no layout-change event (Edge has no `onlayoutchange`). It turns the
map into "basic keycode → character" (`legendsFromLayoutMap` in `device/layout.ts`); a layout that types what US does
on every key gives null, and nothing changes. The Settings switch (pref `key-legends-layout`) turns it off.

Every name of a key comes from `device/keycodes.ts` (`legendOf`, used by `keycodeName`, `keycodeCap`,
`keycodeTitle` and the palette's `keyPalette`) and `ui/picture-labels.ts` (the pictures, through the widget's
`labelOverrides`; no vendored code changes), so the pictures, tiles, keycaps, the "Now" line and every sentence
("Ctrl + Y", "Tap: Z · Hold: Ctrl", the shortcut summaries and macro steps) follow it. QMK names (`KC_Y`) don't.
The rule for what the browser doesn't tell: on a layout other than US a key shows only its unshifted character (a
letter as a capital), and the keys QMK stores as Shift + a key read "Shift + 1", not a symbol. AltGr characters
appear nowhere and dead keys show as plain characters. Keys the map leaves out keep their US names. The palette's search matches what is shown (label and words, under the chosen layout) and QMK's names, never the US legend of a key shown otherwise: on German "y" finds only the key shown as Y, on French "!" doesn't find Shift + 1. The Shell,
the pictures and the palettes re-render on a change (`useLegendRevision`). Text in a macro is still typed as on a
US layout (vial-qmk's `send_string` looks characters up in a US table, `quantum/send_string/send_string.c`).

## Macros

The keyboard keeps its macros (16 on the K15 Max) one after another in one shared buffer (926 bytes), each ended by
a 0 byte. `device/macros.ts` turns them into steps and back:

```ts
type MacroStep =
  | { kind: 'text'; text: string }          // typed as on a US layout: printable ASCII only
  | { kind: 'tap'; key: number }            // press and release; a shortcut keycode (Ctrl + C) brings its modifiers
  | { kind: 'down'; key: number }           // hold
  | { kind: 'up'; key: number }             // let go
  | { kind: 'wait'; ms: number }            // up to 65 024 ms
```

### Macro steps, saving and problems

- The bytes are vial-gui's, through the vendored `macro.ts`: Vial protocol 2 and later prefix each action with 1,
  have waits and 16-bit keys; protocol 1 has neither (`stepProblem` says so for those steps).
- `readMacros(buffer, protocol, count)` gives every macro's steps; `encodeMacro` / `decodeMacro` one macro's bytes.
  `macroSize` is a macro's bytes plus its ending 0; `macroSpace` what all of them take and what is left.
- `replaceMacro` builds the new buffer with one macro replaced and every other one byte for byte as it was (so a
  macro the app doesn't fully understand is never rewritten), padded with 0, or says by how much it is too long.
- `stepProblem` explains a step that can't be saved: text with characters a macro can't type (named; "Use a Tap a
  key step for Enter or Tab"), a key not picked, a wait out of range, what protocol 1 lacks.
- `DeviceStore.saveMacro(index, steps)` resolves `'saved'`, `'unchanged'`, `'locked'` (nothing sent: via.c ignores
  macro writes until unlocked), `'too-big'`, `'invalid'` or `'failed'`. It writes only the 28-byte pieces of the
  buffer that change, through the store's change queue, and is one undo step.

### Write order, uses and macro names

- **Write order** (`sendMacroBuffer`, used by saves, undo and restore alike): the buffer's last byte is set to 0xFF
  first, then the changed pieces go out, then the last byte gets its real value (0). vial-qmk plays no macro while
  that byte isn't 0 (`dynamic_keymap_macro_send`), so a write that stops part-way leaves macros that don't run, not
  a mixture where old macros play on the wrong M-keys. After a failed save the store reads the buffer back, shows
  it, and says `MACRO_INTERRUPTED`; `macrosHalted(buffer)` tells a half-written buffer, the macro page then offers
  to save again, and `saveMacro` writes even an unchanged macro while the buffer is halted.
- `macroUses(keyboard, index)` lists the keys and knob turns whose keycode is that macro (`macroKeycode`: QMK's M0 …).
- The names users give macros live in the browser per keyboard, by QMK index (`ui/layer-names.ts`:
  `useStoredMacroNames`, `renameMacro`, `setMacroNames`), and travel in the backup file. On screen a macro is
  called by QMK's number (`index` 1 is "Macro 1"; see "Numbering" under Shortcuts & macros).

## Tap dance, combos, key overrides, alt repeat

Vial keeps four more kinds of entry, each in a fixed number of slots (16 each on the K15 Max); a slot whose keys
are all empty does nothing (`entryIsEmpty`). The store reads them all at load (`DeviceState.entries`), with the
vendored types (vial.h's structs), which `device/entries.ts` builds on:

| Kind (on screen) | Fields | Notes |
|---|---|---|
| Multi-tap key (tap dance) | `onTap`, `onHold`, `onDoubleTap`, `onTapHold`, `tappingTerm` (ms) | Works once its `TD(n)` is on a key (`tapDanceKeycode`) |
| Key chord (combo) | `key1` – `key4` (packed to the front, `withChordKeys`), `output` | Keys are keycodes, not positions. The chord time is the global QMK setting |
| Shortcut replacement (key override) | `triggerKey`, `replacementKey`, `layers` (bit per layer), `triggerMods`, `negativeMods`, `suppressedMods`, `options`, `enabled` | Mods are 8-bit masks, left in bits 0-3, right in 4-7; both sides set = either (`MOD_PAIRS`, `modsText`). `OVERRIDE_OPTIONS` are vial.h's bits; the default is the three activations |
| Repeat rule (alt repeat) | `lastKey`, `altKey`, `allowedMods`, `options`, `enabled` | Needs QK_ALT_REPEAT_KEY on the keyboard (`altRepeatKeycode`). `REPEAT_OPTIONS`: fallback for every other key, both ways, left/right the same |

- `emptyEntry(kind)` gives the defaults a new entry starts from (200 ms, every layer, the default options, on);
  `entriesMatch` treats two empty entries as the same. `entryProblem` says in words what keeps one from being saved
  (a chord with fewer than two keys, a repeated key or no output, a replacement without a key or a layer …); an
  empty entry always saves, which clears the slot.
- `DeviceStore.saveEntry(kind, index, entry)` resolves `'saved'`, `'unchanged'`, `'locked'`, `'invalid'` or
  `'failed'`. vial.c needs no unlock for these writes, but while locked it replaces QK_BOOT with nothing in the
  fields it checks (a tap dance's four keys, a combo's output, an override's replacement, a repeat rule's two keys);
  such an entry resolves `'locked'` without sending anything, and undoing into one while locked sets `writeError` to
  `ENTRY_UNDO_LOCKED`. A saved entry is one undo step.
- The Keys palette has two groups for them: *Multi-tap keys* (`TD(1)` …, `TD(0)` last) and *Repeat keys* (Repeat,
  Alt Repeat).

## Backups

### The backup file

One JSON file, `<keyboard-name>-<date>.layerworks.json` (`device/backup.ts`):

```
{ "format": "layerworks-backup", "version": 1, "savedAt": "2026-11-15T10:30:00.000Z",
  "keyboard": { name, vendorId, productId, uid, rows, cols, layers, knobs, viaProtocol, vialProtocol, firmware },
  "layerNames": ["", "My Fn", ...],             one per layer, as stored in the browser ("" = default name)
  "macroNames": ["", "Sign-off", ...],          one per macro, likewise; missing in files saved before it existed
  "keymap": [[[keycode, ...] row] layer],        keymap[layer][row][col], every matrix position
  "knobs": [[[left, right] knob] layer],         left = counter-clockwise (direction 0); by the knob's firmware
                                                 number, 0 to the highest ([0, 0] where no knob has it)
  "layoutOptions": 0,
  "macros": [byte, ...] | null,                  the macro buffer as the keyboard stores it
  "entries": { tapDance, combo, keyOverride, altRepeatKey } | null,
  "settings": { "<QMK setting id>": [byte, ...] } | null,
  "lighting": { mode, speed, hue, sat, val } | null,       VialRGB effect id
  "keychron": { wireless: { backlitTime, idleTime } | null, debounce: { type, time } | null, state } | null }
```

`null` is a part that couldn't be read (or the keyboard doesn't have). Keycodes are numbers. Vendor and product
come from the keyboard's definition, else from the cable link (a receiver has its own IDs). `keychron.state` is
everything else the Keychron commands returned; restore takes Snap Click, the key colours, the lighting zones and the lock lights
(`rgb.osIndicatorConfig`) from it (`backupContents`; a damaged part is left out, not the whole file). `parseBackup` checks
every part and throws a `BackupError` that says what is wrong ("The backup file is damaged: layer 1, row 0 of the
keymap."); a higher `version` is refused with "made by a newer version of Layerworks". Every value is range-checked
there, before anything is written (keycodes 16-bit, lighting speed and colour bytes).

### Restore: checks and the plan

**Restore** (`device/restore.ts`, `DeviceStore.restore`):

- `readKeyboardFile` tells a backup from a Vial file and turns either into `KeyboardContents`.
- `checkFit` refuses a file for another keyboard (vendor and product differ, when both are known) or with a
  different matrix size, and warns when the Vial keyboard ID differs (same model, other firmware; Vial's ID is
  per firmware definition, not per keyboard).
- `planRestore` compares with what the store holds and keeps only differences: keys and knob directions, layout
  options, the macro buffer (whole, padded to the keyboard's size), entries by index, QMK settings by value
  (whatever their width in the file), lighting, wireless timers, debounce, Snap Click slots, key colours and style,
  lighting zones and their effects, lock lights, layer and macro names. What the keyboard can't
  take (more layers, more entries, unknown settings, an effect it lacks) is listed in `plan.ignored`, and so is what
  it shouldn't: a QMK setting far outside its range (`settingValueProblem`: more than four times the slider's top,
  or a switch that isn't 0 or 1; the firmware takes any number), a key bounce filter the keyboard has no type for,
  and macro memory in which a macro runs another macro, a multi-tap key or a repeat key (`macroRunningShortcut`: a
  macro running itself recurses in vial-qmk until the keyboard locks up). Brightness above the keyboard's maximum is
  lowered to it. `describePlan` puts the plan in words, one line per part.

### Restore: the review before writing

- **The review** (`pages/device/Restore.tsx`) shows `describePlan`'s lines, then a red box with what the plan would
  newly cause (`planRisks` → `device/risks.ts`, `keymapRisks`: the firmware update key, the memory-wiping key
  `QK_CLEAR_EEPROM`, a base layer left with fewer than 10 letters, a base layer losing its last Tab, Enter or Esc (a
  tap-or-hold key with that tap, the numpad's Enter and Grave Escape count), a layer that no key on a base layer reaches any
  more, a layer turned on and left on with no key to leave it), and "Show the changes (n)", a `Disclosure` listing
  every key, knob turn, macro (its steps in a line) and entry that changes (`planItems`). The Keys inspector asks
  with the same `keymapRisks` before a single change that would cause one of them.
- The review keeps the file, not a plan: the plan is worked out from the store's state on every render (`usePlan`),
  so an Undo or Redo while it is open (or the restore's own undo step) shows at once, and a plan that becomes empty
  closes the confirmation and reads "already matches". When Restore is confirmed, the page waits for changes asked
  for before it, reads the lighting again and works the plan out once more; it runs only if that is what the
  confirmation listed, otherwise the review says the keyboard changed meanwhile. What needs unlocking is named as it
  is (`unlockWhat`): the macros, the firmware update key (on keys, knob turns or shortcuts), or both, in the notice,
  in the unlock dialog's reason and in the report's "left out" line.

### Restore: writing the plan

- `DeviceStore.restore` writes the plan through the store's change queue, part by part. Every write is tried; one
  that fails is reported (in plain words, the technical message under "Details") and the rest go on (each write
  stands alone, and restoring again retries only what still differs). If the keyboard goes away it stops and says
  so; if two writes in a row get no reply (asleep, switched off, out of range) it stops too, `stoppedBecause:
  'not-answering'`. The report says how far it got (`done`, `total`), and the page records a restore that stopped
  (`shell/restore-record.ts`, for this visit): the connect prompt and the Device page say "Restoring *file* stopped
  after n of m changes … restore it again", since the restore panel itself is gone once the keyboard is. While the keyboard is locked, writes vial-qmk would
  ignore or alter are skipped and reported, not attempted: the macro buffer (via.c ignores it), and QK_BOOT in a
  knob direction or entry (vial.c turns it into nothing). QK_BOOT on a key is skipped too, as Vial asks first.
  Lighting is saved at once. All key and knob writes become one undo step; macros, entries, settings, lighting and
  timers are not undoable. Layer and macro names are written by the page afterwards (they live in the browser,
  `setLayerNames`, `setMacroNames`).

### Vial files (.vil)

**Vial files** (`device/vil.ts`): `exportVil` writes vial-gui's format (keys and knob by QMK name, macros as
action lists, settings as numbers, the uid as a bare number) through Pipette's vendored `vil-compat.ts`;
`parseVil` reads one back, macros encoded for the connected keyboard's Vial protocol. A Vial file has no lighting,
Keychron settings or layer names, so restoring one leaves those alone. The vendored converter passes numbers through
and turns unknown key names into 0, so `parseVil` checks the file first (`vilProblems`): a value the keyboard's
commands can't hold (a keycode outside 0–0xFFFF or not a whole number, a tapping term past 16 bits, mods or options
past a byte, layout options or settings that aren't numbers) refuses the file with a line saying where; a key name
this keyboard doesn't know (another firmware's own keys, `USER13` …) leaves that place alone and says so
(`contents.notes`, shown with `plan.ignored`).
