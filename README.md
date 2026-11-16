# Layerworks

A configurator for Keychron keyboards running Vial firmware
([tymon3310/vial-qmk](https://github.com/tymon3310/vial-qmk)), built to be usable without knowing QMK. It runs in
the browser (Chrome or Edge, over WebHID), on the cable or through the 2.4 GHz receiver.

The design is in the Alice-Keyboard project: `../docs/spec/layerworks.md`. What exists so far: the connection
layer, the shell (sidebar, keyboard stage, status line, help panel, themes), the unlock flow and a page for every
section; Home, Keys, Shortcuts & macros (macros so far), Lighting, Test, Device and Settings are built (see "The built pages"), the rest are still
placeholders.

## Run it

```
pnpm install
pnpm dev          # http://localhost:5199
```

Click **Connect a keyboard…** and pick the keyboard (cable) or the Keychron Link receiver (2.4 GHz). Only one
program can hold the keyboard at a time, so close Vial, Pipette or Launcher tabs first. **Try the demo keyboard**
works without one.

Options in the URL, before the `#`:

| | |
|---|---|
| `?demo` | Connects the demo keyboard at start |
| `?theme=dark`, `?theme=light` | Forces a theme for this visit without remembering it (for screenshots) |
| `?help=<topic>` | Opens the help panel at a topic from `src/help/topics.ts` |
| `?select=3,2`, `?select=knob,0,1` | Selects a key (row, column) or a knob direction once a keyboard is in, for screenshots of the Keys inspector |
| `?layer=<n>` | Shows layer n on the stage instead of following the keyboard |
| `?demo-effect=<id>` | Starts the demo keyboard on another lighting effect (VialRGB id, e.g. `25`), for screenshots |
| `?demo-unlocked` | Starts the demo keyboard unlocked (the Test page reads every key) |
| `?demo-wireless` | The demo keyboard is reached through the 2.4 GHz receiver, reports a battery level (76 %) and has the K15 Max's wireless timers and debounce, for screenshots of the wireless parts |
| `?macro-draft`, `?macro-draft=problem` | The macro opened first (`#/shortcuts/macro/1`) gets an unsaved change: a text step and Enter (with `problem`, text a macro can't type), for screenshots of the unsaved state |
| `?restore-sample` | The Device page opens a made-up backup of the connected keyboard (a few keys, a knob turn, a macro and the colour changed) once it is read, for screenshots of the restore review |
| `?demo-press=2,2;2,3;0,1+3,14` | The demo presses keys (row,col) by itself from a second after connecting: each step in turn, keys joined by `+` together, the last step stays held |
| `?demo-turn=1;0` | Turns the demo's knob by itself from a second after connecting (1 clockwise, 0 counter-clockwise): the page gets what the knob sends on the base layer as a browser event, as a real turn would |
| `?unlock`, `?unlock=start` | Opens the unlock dialog once the lock state is read; `start` starts unlocking straight away (with `?demo-press=0,1+3,14` the demo holds Esc and Enter) |

Example: `http://localhost:5199/?demo&theme=light#/keys`.

| Command | |
|---|---|
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | Must pass before every hand-over. `test` includes the vendored tests. |
| `pnpm build` | Production build into `dist/` |
| `pnpm hardware` | Loads the real keyboard through the device layer, without a browser, and prints what it read. Reads only. Set `LINK=receiver` to go through the 2.4 GHz receiver (`$env:LINK='receiver'; pnpm hardware`). |
| `pnpm vendor check` | Vendored files still match the recorded Pipette commit (see `VENDOR.md`) |
| `pnpm shots /keys /home` | Screenshots on the demo keyboard, dark and light (see "Screenshots") |

## Layout

```
src/
  device/            talking to the keyboard
    link.ts            HidLink: raw reports in and out (WebHID, node-hid and the test fake implement it)
    transport.ts       the request queue: one request at a time, timeouts, resends, 2.4 GHz encoding
    pushes.ts          reports the keyboard sends unasked (layer changes), recognised by shape
    webhid.ts          HidLink over WebHID
    store.ts           everything read from the keyboard, the load sequence, and the changes
                       (assign / undo / redo for keys and knob, setLighting)
    capabilities.ts    what this keyboard can do, with a reason for what it can't
    unlock.ts          the Vial unlock flow: one poll loop with the queue held
    matrix.ts          reading the switch matrix (which keys are down), and the picture's physical keys
    keycodes.ts        key names, the palette's groups, shortcut and layer-key builders
    fake-keyboard.ts   a HidLink with no hardware and a small Vial keyboard behind it (tests, demo)
    backup.ts          the backup file: create, read back with checks, turn into contents to restore
    restore.ts         restoring: whether a file fits the keyboard, the plan of writes (only what differs), in words
    vil.ts             Vial's .vil files in and out (through the vendored vil-compat and macro code)
    keyboard-file.ts   opens a file to restore from: a backup or a Vial file
    wireless.ts        Keychron's wireless timers: limits, choices, durations in words
    macros.ts          macros as steps: to and from the shared macro buffer, sizes, problems, recording
    useDevice.ts       the app's store and its React hook
    api.ts, index.ts   the public surface; pages, plugins and the shell import from here
  demo/              the demo keyboard: a K15 Max inside the page (k15-max.json, demo-link.ts)
  ui/                design tokens and shared components
    tokens.css         every colour, radius and shadow, dark and light
    controls.tsx       Button, IconButton, Toggle, Slider, Segmented, TextInput, Spinner, Badge, Checkbox,
                       SearchField, OptionButton (one of several choices, marked when current)
    layout.tsx         Card, Disclosure ("More options"), Dialog, Notice, HelpButton
    Modal.tsx          a modal with its own buttons, which can refuse Esc (the unlock flow)
    ProgressBar.tsx    a filled bar
    display.tsx        Facts / Fact (label over value), ActionTile (large shortcut link), ExternalLink (new tab)
    files.tsx          FileButton (opens the file picker), downloadText (saves text as a download), readText
    prefs.ts           what the app remembers in the browser (usePref)
    theme.ts           dark / light / system, applied as the `dark` class on <html>
    KeyboardPicture.tsx  the keyboard for one layer; wraps the vendored keyboard widget
    KeyTile.tsx        KeyTile (a palette key drawn like a keycap) and KeyCap (one key, not clickable)
    ResizeHandle.tsx   a drag handle on a box's bottom edge (pointer and keyboard), and clamp
    useElementSize.ts  an element's size as it changes (ResizeObserver)
  shell/             the frame around the pages
    Shell.tsx          the frame: sidebar, page title, stage, page, status line, help panel; picks the page
    Sidebar.tsx        app name, device card, pages grouped main / plugins ("Extras") / app
    DeviceCard.tsx     the connected keyboard: name, cable or 2.4 GHz, battery, locked (unlock / lock), disconnect
    UnlockDialog.tsx   the unlock flow on screen; unlock-dialog.ts opens it (openUnlock)
    Stage.tsx          the keyboard stage: layer stack beside the picture, pressed keys, selection, resize handle
    stage-size.ts      how tall the stage is: automatic, chosen, minimum and cap
    LayerStack.tsx     the layers: pick, rename in place, active one marked, "Follow the keyboard"
    StatusLine.tsx     saved / saving / write error, parts still loading or not readable, undo / redo
    HelpPanel.tsx      the help topic, sliding in from the right
    ConnectPrompt.tsx  connect a keyboard / try the demo, and "reading the keyboard"
    router.ts          pages by URL (#/keys)
    session.ts         connect, connect the demo, disconnect
    stage-store.ts     which layer and key the keyboard stage shows
    layer-names.ts     layer names, kept in the browser per keyboard
    pressed-keys.ts    held keys, from the browser's key events
  pages/             the built-in sections, one file each, registered as the "core" plugin (index.ts);
                     a page's own parts in a folder beside it (home/, keys/, settings/, lighting/, test/, device/,
                     shortcuts/)
  plugins/api.ts     definePlugin: pages and panels, for built-in sections and plugins alike
  help/              help topics (topics.ts) and which one the help panel shows
  vendor/pipette/    code copied from Pipette, unmodified (VENDOR.md)
  main.tsx           registers the pages, reads the URL options, renders the shell
hardware/            checks against the real keyboard (pnpm hardware)
scripts/vendor.mjs      keeps src/vendor in step with the Pipette clone
scripts/demo-data.mjs   rebuilds the demo keyboard from ../keyboards/.../vial.json and ../backups/keymap.json
scripts/screenshot.mjs  screenshots on the demo keyboard (pnpm shots)
```

## The screen

```
+------------+-----------------------------------------------+
| Layerworks |  Page title (?)                               |
| device card|  +-----------------------------------------+  |
|            |  | layer stack | keyboard picture          |  |  ← stage, on pages that ask for it
| Home       |  +-----------------------------------------+  |
| Keys       |  page (scrolls)                         help  |
| ...        |                                         panel |
| Help       |-----------------------------------------------|
| Settings   |  Saved on the keyboard (?)        Undo  Redo  |  ← status line, while connected
+------------+-----------------------------------------------+
```

- **Pages that need a keyboard** show the connect prompt instead while none is connected, and "Reading the
  keyboard…" while one connects. Pages with `offline: true` (Home, Help, Settings) always show.
- **The status line** says "Saved on the keyboard", "Saving…" while `DeviceState.writing` is above 0, or the
  `writeError`. Beside it: the parts still being read in the background, or the ones that could not be read.
  Undo and redo call `deviceStore.undo` / `redo`.
- **The help panel** slides in over the right edge of the page (not over the status line) when anything calls
  `openHelp(topic)`, usually a `HelpButton`. Esc or the close button hides it; the page stays usable.
- **Theme**: dark by default; Settings offers dark, light and "Like the system". Stored with `prefs.ts`
  (`theme`); a small script in `index.html` applies it before the app loads, so nothing flashes.
- Sized for 1280 × 800 and usable down to about 1000 px wide. When the stage itself is narrower than 768 px (a
  container query; a window of about 1050 px), the layer stack becomes a row of chips above the picture. The stage
  takes at most half of the height it shares with the page (see "The keyboard stage and selection"), so the page
  under it always keeps the other half.

## Pages and plugins

A page is a `PageDef` (`src/plugins/api.ts`), registered through `definePlugin`. The built-in sections are the
`core` plugin in `src/pages/index.ts`, which lists one export per page file in sidebar order:

```ts
export const keysPage: PageDef = {
  path: 'keys',            // shown at #/keys; "#/" is home
  title: 'Keys',
  icon: Keyboard,          // lucide-react
  group: 'main',           // 'main' (default), 'plugins' (shown as "Extras") or 'app' (bottom of the sidebar)
  stage: 'select',         // 'view', 'select', or leave out for a full-height page
  offline: false,          // true: works without a keyboard
  help: 'assign-key',      // the "?" beside the page title
  component: KeysPage,
}
```

The shell picks the page from the first segment of the path (`#/keys/anything` is still Keys), so a page can use
the rest for its own addresses. To build out a section, replace its file in `src/pages/`; nothing else changes.
A plugin with `matches` or `requires` only appears while a matching keyboard is connected.

## The built pages

- **Home** (`Home.tsx`, `home/`): the landing page. Under the stage: the keyboard's name with connection,
  battery (on 2.4 GHz, when known), the active layer by name, firmware version and lock state (with Unlock… while
  locked; the facts' "?" sit beside their labels); four shortcut
  tiles (keys, lighting, backup, test); and what the keyboard can do, from `capabilities`
  (`home/features.ts` gives each feature its friendly and QMK name), with the missing ones and their reasons
  behind a `Disclosure`. With no keyboard it shows the connect prompt and three lines on what the app is for.
- **Keys** (`Keys.tsx`, `keys/`): click a key or one side of the knob on the stage; with nothing selected the
  page says so. The inspector (`keys/Inspector.tsx`) is two columns from 42rem (a container query), so in a small
  window the palette starts at the top of the card; one column when narrower. With two columns the card fills
  exactly the space under the stage (placed absolutely in a wrapper, at least 15rem tall), so nothing in it makes
  the page taller: the palette scrolls in its box, and the left column (question, choice, More options) and a
  tall choice scroll on their own. With one column the card is as tall as its contents and the page scrolls,
  More options last. It asks "What should this key do?", says which layer it is on and, above the base layer,
  whether
  the key has its own assignment or falls through, and to what (`keys/describe.ts`, `fallThrough`: from a layer
  above the keyboard's base layer to the base layer, then layer 0; from any other layer straight to layer 0;
  worded "normally", since other layers held at the same time aren't counted). "Now" shows the current assignment as a keycap,
  in words, and its QMK name. Then one `Segmented` choice, opened on the one that matches the current assignment:
  - **A key** (`keys/KeyPalette.tsx`): `keyPalette()` groups as key tiles in a box that scrolls and fills the
    space left; the current key is marked and scrolled into view. The search matches label, description and QMK
    names (a single character only matches a label, so "a" finds A); the line beside it says what the key under
    the pointer does. A click assigns.
  - **A shortcut** (`keys/ShortcutChoice.tsx`): Ctrl, Shift, Alt, Win checkboxes and a palette of the keys that
    take modifiers (`canTakeModifiers`); nothing is written until "Use Ctrl + C", so trying doesn't fill undo.
  - **Switch layer** (`keys/LayerChoice.tsx`): pick the layer, then one of the `LAYER_ACTIONS` sentences with
    its name; a sentence assigns.
  - *More options* (`keys/MoreOptions.tsx`): Nothing, Same as the layer below, and a key-code field that shows
    what the typed code means (`parseKeycode`) before "Use this code". It opens by itself when the current
    assignment lives there (nothing, transparent, or a code no choice builds, which is put in the field), for
    that key only: `Disclosure`'s `forceOpen` leaves the remembered open/closed state alone.

  Every assignment is `deviceStore.assign`, so it shows in the picture at once and Undo takes it back; the
  selection stays. A knob's direction 0 is counter-clockwise (left), 1 clockwise (right), as vial-qmk stores
  them. The palette's lighting keys are the shared `RGB_*` codes Keychron's keymaps use, not `RM_*`.
- **Settings** (`Settings.tsx`, `settings/`): theme; a name field per layer of the connected keyboard, with a
  reset to the default (the same names as the layer stack, `shell/layer-names.ts`); about: version from
  `package.json`, licence, and credits to Pipette (repo and commit from `vendor.json`), QMK, Vial and Lucide.
  Appearance and layer names on the left, About on the right once the page is 56rem wide; one column below that.
- **Lighting** (`Lighting.tsx`, `lighting/`): full height, no stage (the picture can't show the lighting yet).
  Left, the effects the keyboard lists (`capabilities.lighting.effects`) as tiles in groups (Steady, Moving, Rain
  and sparkles, Reacts to typing, Set per key or zone), each with a small moving preview in the chosen colour
  and speed (`EffectPreview.tsx`, `lighting.css`), moving the way the effect moves on the keyboard (worked out
  from the firmware's effect code; the reasoning is beside each preview); Off and VialRGB Direct are not tiles.
  Right, staying in view:
  a "Lights on" switch, the current effect in words with its QMK name, and sliders for brightness (percent of
  the keyboard's maximum), speed, colour (rainbow track, swatch and colour name) and vividness. Turning the
  lights off sends effect 0; on again sends the effect remembered for this keyboard (`usePref`), and picking a
  tile while off turns them on. Plugin panels for `'lighting'` follow, one `Card` each. Without usable lighting
  the page shows the capability's reason instead. The page reads the lighting again on opening, on window focus
  and when Fn is let go (`refreshLighting`), to catch the keyboard's own lighting keys.
  - `lighting/effects.ts` holds each effect's friendly name, description, group, preview, and whether it uses
    colour, vividness and speed, or the reason it doesn't, read from the firmware's effect code (sources in the
    file). A slider the current effect ignores is disabled with that reason under it; when colour and
    vividness are off for the same reason, it is said once under both and describes both.
  - Changes go through `lighting/latest.ts`: one `setLighting` at a time; while one is on its way only the newest
    of the rest waits, so a dragged slider never floods the keyboard and always ends on its last value. The
    sliders show the value at once, from what is still on its way.
  - A plugin can rename effects with `lightingEffects: { 41: { name, description } }` in its `definePlugin`, for
    firmware that puts its own effect in a standard slot (the K15's ripple is Solid Splash, VialRGB id 41).
- **Test** (`Test.tsx`, `test/`): full height, with its own picture (no layer stack; labels follow the active
  layer). "37 of 90 keys seen" with a bar and "Start again"; a key is lit while down and stays marked once seen
  (`KeyboardPicture`'s `seen`, in `--key-bg-seen`; a held key is `--key-bg-pressed`, light in the light theme so the
  widget's dark label reads on it). Total: the picture's physical keys (`matrixKeys`; the K15 Max
  has 90), and beside it "1 of 2 knob turns"; "Every key works" needs both. Two sources, combined:
  - the browser's key events (`usePressedKeys`), always: only keys that type something (letters, media and
    browser keys such as Volume Up: `keycodeOfEvent` in `shell/pressed-keys.ts`), only while the window is in
    front (the page says so when it isn't). While the page is open it keeps keys without Ctrl or Win from doing
    their browser job (scrolling, Tab, F5 ...), outside dialogs and text fields; it can't stop media keys
    changing the volume, and doesn't try;
  - the keyboard's switch matrix (`test/useMatrix.ts` → `deviceStore.watchMatrix`) while unlocked: every key,
    Fn included. It reads only while the page is shown and the tab is visible; through the receiver it pauses
    after 2 minutes without a change (each read keeps the keyboard awake) until a key or click.

  The matrix can't see knob turns (they aren't switches), so a knob direction counts as seen when the browser
  gets what it sends on the active layer (`useKnobTurns`): a key event (volume, media, a plain key, or a key
  with modifiers, by its key) or a mouse wheel movement for the wheel keycodes (`howHeard`). It is lit for 250 ms,
  then marked seen; ordinary mouse scrolling counts too where the knob scrolls. The widget has no state for knob
  directions, so `KeyboardPicture`'s `knobsTurned` / `knobsSeen` recolour them with a CSS rule scoped to the
  picture (`[data-encoder-pos]` circles).

  Not everything arrives (`test/knob.ts`, `visibility`): Chrome on Windows keeps the volume keys (Volume Up / Down,
  Mute) from the page, and the media keys (next / previous track, play / pause, stop) often go to the browser's own
  media handling. The note names what the active layer's knob sends that the page can't or may not see, and where
  to turn it instead: the first layer the keyboard can reach from its base (the base layer's layer keys) on which
  every direction is seen, e.g. "Hold Fn2 and turn it: there it scrolls, which this page can see." The knob count is
  out of the directions the page can check on some reachable layer ("1 of 2 knob turns", or "Knob turns can't be
  checked here"), and only those count towards "Every key works". A volume key that does arrive still counts.

  A note under the picture says which source is in use; locked, it names what can't be seen and offers "Unlock to
  see every key…". Seen keys survive a visit to another page (`test/seen.ts`), not another keyboard.
- **Device** (`Device.tsx`, `device/`): full height, no stage; two columns from 56rem (like Settings).
  - *Back up and restore* (`device/Backup.tsx`, `device/Restore.tsx`): "Save a backup" downloads the backup file
    (see "Backups") once every part has been read, and says which parts are missing if some couldn't be read.
    "Choose a backup file…" opens a backup or a Vial file and goes through the restore steps in place: a refusal
    with the reason (another keyboard, keys wired differently, not a backup); or the file's name and date, any
    warning (same model, other firmware), the list of what will change in words (`describePlan`), marked "needs
    unlocking" where that applies with "Unlock first…", and what the file holds that this keyboard can't take.
    "Restore…" asks in a danger `Dialog` that lists the same lines; then a progress bar, then what was restored,
    what failed (with the error), what was left out because the keyboard is locked (with "Unlock…"), and that Undo
    takes back the keys and knob. A file that already matches says so. *Vial files* (a `Disclosure`): "Save a
    Vial file".
  - *Wireless and sleep* (`device/Wireless.tsx`), only when `keychron.hasWireless`: the battery (through the
    receiver), and "Lights off after" and "Sleep after" as choices (`BACKLIT_CHOICES`, `IDLE_CHOICES`, plus the
    keyboard's own value if it is another); a choice that would put sleep before lights-off is disabled. A click
    is `deviceStore.setWirelessTimers`.
  - *About this keyboard* (`device/KeyboardInfo.tsx`): name and maker, connection, firmware version
    (`device/firmware.ts`: "v1.1.2 1970-01-01-00:00:00" reads "1.1.2"; the date only when it is a real one),
    layers, keys and knob, lock state, and how many macros, tap dances, combos, key overrides, alt-repeat rules and
    QMK settings it has room for. *Technical details* (a `Disclosure`): USB IDs (and the receiver's), Vial keyboard
    ID, protocol versions, Keychron feature bits, the raw firmware string, matrix size, layout options, feature
    flags, macro memory, QMK setting IDs, lighting, and the transport's request counters, refreshed every second.
- **Shortcuts & macros** (`Shortcuts.tsx`, `shortcuts/`): full height, no stage (the editor needs the room, and
  the keys a macro is on are listed and linked instead). A list on the left and the one picked on the right, two
  columns from 42rem; no tabs. The page's own addresses: `#/shortcuts/macro/1` opens Macro 1 (`shortcuts/route.ts`).
  - *The list* (`shortcuts/MacroList.tsx`): the shared macro space as a bar ("Room for about 863 more characters ·
    63 of 926 bytes used"), then every macro: its name (the user's, or "Macro 1"), QMK's name (M0), "Not saved"
    while it has a draft, how many keys run it, and a one-line summary (`shortcuts/describe.ts`: "Types
    “hello@example.com”", "Ctrl + A, waits 0.05 s, Ctrl + C", "Empty"). Under *More options*, the other kinds of
    shortcut (multi-tap keys, key chords, shortcut replacements, repeat rules), each with its QMK name and how many
    the keyboard has room for, marked "Coming soon"; each becomes a section of the list like the macros'.
  - *The editor* (`shortcuts/MacroEditor.tsx`): the name (an inline field; names live in the browser per keyboard,
    `shell/layer-names.ts` `renameMacro`), whether it matches the keyboard or is "Not saved yet", and while it isn't:
    "Save to keyboard" (or, locked, "Unlock and save…", which opens the unlock dialog and writes nothing), Revert,
    what stands in the way (steps to fix, no room, locked). "Runs when you press": the keys and knob turns with this
    macro, as layer and key ("Windows Fn: the P key"); a click shows that key on the Keys page (`stage.showLayer`,
    `stage.select`). None: how to put it on a key, and a button to the Keys page. Then the steps
    (`shortcuts/StepRow.tsx`), numbered, each edited in place, with move up, move down and remove: *Type text* (a
    field), *Tap a key* (keycaps and the key in words; "Change key…" opens the Keys page's palette with Ctrl, Shift,
    Alt and Win to tick, `shortcuts/KeyPicker.tsx`), *Wait* (seconds, with 0.05 – 1 s choices); under *More
    options*, *Hold a key down* and *Let a key go*, with why. A step's problem shows under it in red
    (`stepProblem`). *Record what I type* (`shortcuts/Recorder.tsx`) and the bytes this macro takes against the
    room left close the card.
  - *Drafts* (`shortcuts/drafts.ts`): an edit is a draft per keyboard and macro, kept outside React, so leaving the
    page and coming back finds it; a draft equal to the saved macro is dropped. While any draft exists the browser
    asks before the tab is closed or reloaded. Navigation inside the app is never blocked.
  - *Recording*: while recording, key events in the window are captured (and kept from doing anything else) and
    turned into steps by `stepsFromRecording`: a press and release is a tap, keys tapped with only modifiers held
    become shortcuts (Ctrl + C), runs of printable keys become text (US layout, as the firmware types it), anything
    else stays hold and let go; keys still held at the end are let go. "Keep the pauses as waits" keeps gaps over
    150 ms. Stop with the mouse; leaving the window stops it too. Fn and layer keys, and shortcuts Windows or the
    browser keep (Alt + Tab, Ctrl + W, the Windows key), can't be recorded.

## Unlocking

Vial keeps a few things locked: macro writes, the switch matrix, the bootloader jump and the reset key. Unlocking
means holding the keyboard's unlock keys (Esc and Enter on the K15 Max; the keyboard lists them) while it counts
50 steps. While it counts, the keyboard doesn't type, answers almost no command, and can't be cancelled; it ends
by finishing or by restarting (unplugging, or moving the connection switch). Once unlocked it stays so until it
restarts or changes connection mode.

- `deviceStore.unlock()` runs `device/unlock.ts`: through `Transport.exclusive`, which holds the request queue for
  the whole flow, so nothing else is sent (requests asked for meanwhile wait, with no timeout running, and go out
  afterwards). Status, start (skipped when the keyboard is already counting), then one poll loop with a pause of
  120 ms after each reply on the cable and 150 ms through the receiver (the firmware needs more than 100 ms
  between steps and starts the count again otherwise). A poll without a reply is not resent; the loop just
  polls again and marks the progress `silent`. `DeviceState.unlocking` holds `{ remaining, total, silent }`.
  It resolves `'unlocked'`, `'disconnected'` (the keyboard went away mid-way) or `'failed'` (it never started
  counting, so it still works). A second call joins the first.
- `deviceStore.lock()` locks again. `capabilities.check('keyMatrix')` returns `needsUnlock: true` with its reason
  while locked: the sign for a page to offer unlocking.
- A keyboard found counting at connect (an app closed mid-unlock) isn't read: the store reports `STILL_UNLOCKING`,
  which says to replug it.
- **On screen** (`shell/UnlockDialog.tsx`, opened by `openUnlock(reason)` from `shell/unlock-dialog.ts`; mounted
  once in the shell): first what unlocking is for, the keys to hold marked on a small picture, and that the
  keyboard won't type and nothing can stop it once started; then the count as a bar ("Keep holding…", "The count
  started again…"), with no buttons, Esc ignored and the browser asking before the page is left; then done, or
  "disconnected" / "didn't start". The device card shows Locked with "Unlock…", Unlocking…, or Unlocked with
  "Lock".

## The keyboard stage and selection

Pages with `stage` get the stage above them: the layer stack and the keyboard picture, with the keys held down
shown pressed (`usePressedKeys`). Its state lives in `src/shell/stage-store.ts`, outside React, so moving between
stage pages keeps the layer and selection:

- `useStage()` → `{ follow, layer, selection }`. `shownLayer(state, liveLayer, layerCount)` is the layer the
  picture shows: the keyboard's active layer while following, otherwise the one picked.
- Clicking a layer shows it and turns following off; the toggle turns it back on. A double click or the pencil
  renames a layer (`renameLayer`); the names live in the browser per keyboard (`layer-names.ts`).
- `stage: 'select'` makes keys and knob directions clickable. A click sets `selection` (a key's row and column,
  or a knob and direction, without the layer); Esc clears it. A page reads `useStage().selection` and turns it
  into a slot with `toSlot(selection, shownLayer(...))` for `deviceStore.assign`. On `stage: 'view'` pages the
  picture is not clickable and no selection is drawn, but the selection is kept for when the user comes back.
- A different keyboard connecting (or none) resets the stage.
- **Height** (`stage-size.ts`, applied as CSS in `Stage.tsx`): the stage shares the main area between the page
  title and the status line with the page. Left alone it is as tall as the picture wants at this width (the picture
  shrinks with the width and never grows past its own drawing size), at most half of that shared space. The picture
  fits the box it is given, width and height, keeping its shape (`KeyboardPicture`'s `fit`). The handle on its
  bottom edge (`ui/ResizeHandle.tsx`) makes it shorter or taller by dragging (mouse or touch) or with the
  keyboard (arrows, Page Up / Down, Home / End; it is a focusable separator); double-click or Enter goes back to
  automatic. The chosen size is remembered in the browser as a share of the shared space (pref `stage-size`), so it
  follows the window. It never goes below room for a 120 px picture (and, with the layers as a row above it, the
  row), and that minimum wins over the cap in a very short window. Beside the picture, the layer stack scrolls
  within itself when the stage is shorter than it; as a row above the picture it is always shown whole. Pages under
  the stage, like the Keys inspector, take the rest and follow the handle as it moves.

## Screenshots

```
pnpm shots /keys /lighting                   # dark and light, 1280 × 800, on the demo keyboard
pnpm shots --offline /home                   # no keyboard connected
pnpm shots --size=1000x700 --theme=dark /keys
pnpm shots --query=help=layer-key /keys      # with the help panel open
pnpm shots --no-build /keys                  # reuse the last build
pnpm shots --port=5197 /keys                 # own port and build folder, for two runs side by side
```

`scripts/screenshot.mjs` builds, serves the build on port 5198, takes each page with headless Edge into
`%TEMP%\opencode\layerworks-shots\` (`keys-dark.png`, `keys-offline-light.png`, ...) and stops the server.
Every picture gets a fresh browser profile in a temporary folder, removed at the end, so nothing remembered in
one shot (theme, "More options" open) shows in another. `EDGE=<path>` points it at another `msedge.exe`.

## Changing things on the keyboard

- `deviceStore.assign(slot, keycode)` writes one key or knob direction, then updates the store. `undo()` and
  `redo()` write the previous or next value back. `DeviceState.writing` counts changes on their way;
  `writeError` holds the last failure.
- `deviceStore.setLighting(change)` sends the effect and its values at once and saves them to the keyboard 1.5 s
  after the last change. vial-qmk reloads speed and colour from what was last saved on the first frame of a
  different effect (`rgb_matrix.c`), over what was just sent, so a change of effect (on and off included) is sent,
  saved and sent again; restore writes its lighting the same way. Without that, the keyboard would run a new
  effect with the old saved speed or colour while the page showed the new ones.
- `deviceStore.refreshLighting()` reads the effect and its values again (one request). The keyboard's own lighting
  keys change them without telling anyone; the Lighting page calls it when it opens, when the window gets the focus
  back and when a held layer is let go (the lighting keys sit on the Fn layers).
- `deviceStore.lock()` locks the keyboard (see "Unlocking").
- `deviceStore.restore(plan, onProgress)` writes a restore plan (see "Backups") as one change in the queue.
- `deviceStore.saveMacro(index, steps)` saves one macro (see "Macros"). Undo and redo take a saved macro back and
  forth like a key, but only while the keyboard is unlocked; locked, they leave the step where it is and set
  `writeError` to `MACRO_UNDO_LOCKED`.
- `deviceStore.setWirelessTimers({ backlitTime, idleTime })` sets Keychron's wireless timers (`0xA7 0x0C`); the
  keyboard saves them itself. Pairs the firmware would refuse (lights-off under 5 s, sleep under 60 s) or that put
  sleep before lights-off are not sent (`timersProblem`). Writing them while wirelessly connected makes the
  firmware nudge the mouse pointer once.

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
- `macroUses(keyboard, index)` lists the keys and knob turns whose keycode is that macro (`macroKeycode`: QMK's M0 …).
- The names users give macros live in the browser per keyboard (`shell/layer-names.ts`: `useStoredMacroNames`,
  `renameMacro`, `setMacroNames`), and travel in the backup file.

## Backups

One JSON file, `<keyboard-name>-<date>.layerworks.json` (`device/backup.ts`):

```
{ "format": "layerworks-backup", "version": 1, "savedAt": "2026-11-15T10:30:00.000Z",
  "keyboard": { name, vendorId, productId, uid, rows, cols, layers, knobs, viaProtocol, vialProtocol, firmware },
  "layerNames": ["", "My Fn", ...],             one per layer, as stored in the browser ("" = default name)
  "macroNames": ["", "Sign-off", ...],          one per macro, likewise; missing in files saved before it existed
  "keymap": [[[keycode, ...] row] layer],        keymap[layer][row][col], every matrix position
  "knobs": [[[left, right] knob] layer],         left = counter-clockwise (direction 0)
  "layoutOptions": 0,
  "macros": [byte, ...] | null,                  the macro buffer as the keyboard stores it
  "entries": { tapDance, combo, keyOverride, altRepeatKey } | null,
  "settings": { "<QMK setting id>": [byte, ...] } | null,
  "lighting": { mode, speed, hue, sat, val } | null,       VialRGB effect id
  "keychron": { wireless: { backlitTime, idleTime } | null, debounce: { type, time } | null, state } | null }
```

`null` is a part that couldn't be read (or the keyboard doesn't have). Keycodes are numbers. Vendor and product
come from the keyboard's definition, else from the cable link (a receiver has its own IDs). `keychron.state` is
everything else the Keychron commands returned, for reference; restore doesn't use it. `parseBackup` checks
every part and throws a `BackupError` that says what is wrong ("The backup file is damaged: layer 1, row 0 of the
keymap."); a higher `version` is refused with "made by a newer version of Layerworks".

**Restore** (`device/restore.ts`, `DeviceStore.restore`):

- `readKeyboardFile` tells a backup from a Vial file and turns either into `KeyboardContents`.
- `checkFit` refuses a file for another keyboard (vendor and product differ, when both are known) or with a
  different matrix size, and warns when the Vial keyboard ID differs (same model, other firmware; Vial's ID is
  per firmware definition, not per keyboard).
- `planRestore` compares with what the store holds and keeps only differences: keys and knob directions, layout
  options, the macro buffer (whole, padded to the keyboard's size), entries by index, QMK settings by value
  (whatever their width in the file), lighting, wireless timers, debounce, layer and macro names. What the keyboard can't
  take (more layers, more entries, unknown settings, an effect it lacks) is listed in `plan.ignored`.
  `describePlan` puts the plan in words, one line per part.
- `DeviceStore.restore` writes the plan through the store's change queue, part by part. Every write is tried; one
  that fails is reported and the rest go on (each write stands alone, and restoring again retries only what still
  differs). If the keyboard goes away it stops and says so. While the keyboard is locked, writes vial-qmk would
  ignore or alter are skipped and reported, not attempted: the macro buffer (via.c ignores it), and QK_BOOT in a
  knob direction or entry (vial.c turns it into nothing). QK_BOOT on a key is skipped too, as Vial asks first.
  Lighting is saved at once. All key and knob writes become one undo step; macros, entries, settings, lighting and
  timers are not undoable. Layer and macro names are written by the page afterwards (they live in the browser,
  `setLayerNames`, `setMacroNames`).

**Vial files** (`device/vil.ts`): `exportVil` writes vial-gui's format (keys and knob by QMK name, macros as
action lists, settings as numbers, the uid as a bare number) through Pipette's vendored `vil-compat.ts`;
`parseVil` reads one back, macros encoded for the connected keyboard's Vial protocol. A Vial file has no lighting,
Keychron settings or layer names, so restoring one leaves those alone.

## Demo keyboard

`src/demo/` puts a K15 Max inside the page: the same requests get the same kind of answers, and changes last
until the page is reloaded. It is for trying and screenshotting the app with nothing plugged in. Refresh its
data with `node scripts/demo-data.mjs` after the firmware definition or the keymap backup changes. Its lighting
is the real keyboard's: the 25 VialRGB effects the Vial build lists, maximum brightness 255, starting on Solid
Splash in indigo (`?demo-effect=` picks another). The test fake keeps its own small list (`RGB_EFFECTS`).

The keys of whatever keyboard is typed on stand in for the demo's switches: each browser key event presses the
demo key that sends the same key on its base layer, so holding Esc and Enter unlocks it, and once unlocked the Test
page sees those keys through the matrix too. It starts locked (`?demo-unlocked` for unlocked); `?demo-press=`
presses keys by itself for screenshots. Unlocking, the matrix and the commands ignored while counting behave as
vial-qmk's do (`fake-keyboard.ts`).

It answers every write the app makes and keeps it: keys, knob, lighting, macros (only while unlocked), tap dance
and the other entries, QMK settings, layout options, and Keychron's wireless timers and debounce; locked, QK_BOOT
in knob and entry writes becomes 0, as in vial-qmk. On the cable its Keychron commands report the default layer
only; `?demo-wireless` connects it through the receiver with the K15 Max's wireless features, timers (10 min,
2 h), debounce, a battery of 76 % and the real firmware string (`v1.1.2 1970-01-01-00:00:00`).

Its macro buffer starts with three examples (`DEMO_MACROS` in `demo-link.ts`): an e-mail address, Ctrl + A then
Ctrl + C, and Win + R, wait, "notepad", Enter. Macro 1 is also on Fn + P on the Windows layers; the K15's own M1 –
M5 keys already run macros 2 – 6.

## How it talks to the keyboard

```
pages / plugins → device store → vendored protocol code → transport (request queue) → HidLink
                      ↑ layer changes ←──────────────────── unsolicited reports
```

- **One queue.** Every request goes through `Transport.request`, one at a time. The vendored protocol functions
  use it too (the store injects it), so nothing can overlap. `Transport.exclusive(job)` gives one job the queue
  for as long as it runs (the unlock flow); everything else waits behind it.
- **The switch matrix** (`0x02 0x03`, `device/matrix.ts`) is read one request at a time through the queue: a
  20 ms pause after each reply on the cable (about 45 reads a second), 60 ms through the receiver. Each read is
  a snapshot, so a very quick tap can fall between two.
- **Replies are checked.** VIA and Keychron replies start with the request's command byte (or `0xFF` for an
  unknown command); anything else is dropped as stray. Vial replies (`0xFE …`) carry data from the first byte and
  can't be checked.
- **Pushes are recognised by shape.** The keyboard reports every layer change as `[0xA3, base, held, 0 × 29]`
  without being asked. That exact shape goes to listeners, never to a waiting request, unless the request is
  `0xA3` itself on the cable. Plugins can register further shapes (`Transport.onPush`).
- **2.4 GHz.** Requests and replies are XOR-ed with `0x28`; pushes and the receiver's own notices (`0xBC`,
  `0xE2`) are not. Timeouts are short (300 ms) with up to 6 sends, because packets get lost now and then.
- **Loading is staged.** Definition, keymap and knob come first, so the picture appears quickly; macros, entries,
  settings, lighting, lock state and Keychron state follow in the background (`DeviceState.loading`). A part that
  fails is listed in `DeviceState.failed` and the rest still loads.
- **Capabilities** are rebuilt as parts arrive. `capabilities.check('macros')` returns whether it's available and,
  if not, a sentence saying why.

## Tests

Unit tests sit in `__tests__/` beside the code. `src/device/fake-keyboard.ts` provides a `HidLink` with no
hardware behind it and a small Vial keyboard to answer it, on the cable or through a receiver; its `held` set is
the switch matrix, which unlocking checks. The unlock and matrix tests run on fake timers and check the poll
spacing and that nothing else is sent while unlocking. The restore tests (`device/__tests__/restore.test.ts`) back
up the fake keyboard, change it behind the store's back, restore and compare the fake's memory with the original,
counting the writes sent; `vil.test.ts` also reads a real Vial save (Pipette's `bento-max.vil` fixture).

## Licence

GPL-3.0-or-later. See `LICENSE`, and `VENDOR.md` for the code that comes from Pipette.
