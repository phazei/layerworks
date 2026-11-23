# Development

How to run, check and screenshot Layerworks, how the source is laid out, the demo keyboard, and how the page
is published and licensed.

## Run it

```
pnpm install
pnpm dev          # http://localhost:5199
```

Click **Connect a keyboard…** and pick the keyboard (cable) or the Keychron Link receiver (2.4 GHz). Only one
program can hold the keyboard at a time, so close Vial, Pipette or Launcher tabs first. **Try the demo keyboard**
works without one.

Options in the URL, before the `#`. Those that would change a keyboard, arm a click, or show made-up content on it
(`?put-on-key=`, `?press-key`, `?macro-draft`, `?device-more`, `?restore-sample`, `?unlock=start`) are honoured
only while the demo keyboard is connected (`screenshotOption` in `shell/session.ts`; `?unlock=start` on a real
keyboard opens the dialog at its first step instead), and `?layout=` only together with `?demo`. The ones that only
navigate or open views (`?help=`, `?theme=`, `?select=`, `?layer=`, `?choice=`, `?open=`, `?open-picker=`,
`?key-search=`, `?tour=`, plain `?unlock`) work everywhere: they show the person's own keyboard and change nothing.
The `?demo-…` options act on the demo keyboard only by nature.

| | |
|---|---|
| `?demo` | Connects the demo keyboard at start |
| `?theme=dark`, `?theme=light` | Forces a theme for this visit without remembering it (for screenshots) |
| `?help=<topic>` | Opens the help panel at a topic from `src/help/topics.ts` |
| `?select=3,2`, `?select=knob,0,1` | Selects a key (row, column) or a knob direction once a keyboard is in, for screenshots of the Keys inspector |
| `?layer=<n>` | Shows layer n on the stage instead of following the keyboard |
| `?choice=tapHold` | The Keys inspector opens on that choice (`key`, `shortcut`, `layer`, `tapHold`) rather than the one the key's assignment belongs to, for screenshots; with `?select=` |
| `?open=typing-magic` | Opens the "More options" folds with those ids (comma-separated; a `Disclosure`'s `id`), for screenshots, without remembering it |
| `?open-picker=Sends` | On Shortcuts & macros, the key field with that label ("Sends", "To send instead" …) opens its picker, for screenshots |
| `?layout=KeyY:z,KeyZ:y,Semicolon:ö` | Key legends as on a layout typing those characters (`KeyboardEvent.code:character`, URL-encoded), in place of the browser's own reading; for screenshots, as headless Edge is US |
| `?put-on-key=TD(1)` | The Keys page starts armed with that keycode (QMK name), as "Put it on a key…" leaves it, for screenshots |
| `?press-key` | The Keys palette's "Press a key" starts out waiting, for screenshots of what it says; with `?select=` |
| `?key-search=magic` | The key palette opens with that search typed, for screenshots; with `?select=` |
| `?demo-keyboard=<name>` | A developer option: the demo keyboard stands in for another keyboard instead of the K15 Max, to see the app on keyboards that differ from it: `corne`, `gh80`, `splinter`, `cloud`, `q2`, `q0`, `c100`, `vipad`, `klein`, `macropad` (see "Demo keyboard", "Other keyboards in the demo") |
| `?demo-layout=<n>` | The demo keyboard starts with that layout options value (VIA's number, the last label in the lowest bits; with `?demo-keyboard=gh80`, `518` is Split Backspace and a split space bar), for screenshots of another layout |
| `?demo-effect=<id>` | Starts the demo keyboard on another lighting effect (VialRGB id, e.g. `25`), for screenshots |
| `?demo-unlocked` | Starts the demo keyboard unlocked (the Test page reads every key) |
| `?demo-wireless` | The demo keyboard is reached through the 2.4 GHz receiver, reports a battery level (76 %) and has the K15 Max's wireless timers and debounce, for screenshots of the wireless parts |
| `?macro-draft`, `?macro-draft=problem` | The macro opened first (`#/shortcuts/macro/1`) gets an unsaved change: a text step and Enter (with `problem`, text a macro can't type), for screenshots of the unsaved state |
| `?device-more`, `?device-more=reset`, `?device-more=bootloader` | The Device page opens its More options, and with a value the reset or firmware update confirmation too, for screenshots |
| `?restore-sample`, `?restore-sample=risky` | The Device page opens a made-up backup of the connected keyboard (a few keys, a knob turn, a macro and the colour changed; with `risky` also the memory-wiping key on layer 0's first key) once it is read, for screenshots of the restore review |
| `?demo-press=2,2;2,3;0,1+3,14` | The demo presses keys (row,col) by itself from a second after connecting: each step in turn, keys joined by `+` together, the last step stays held |
| `?demo-turn=1;0` | Turns the demo's knob by itself from a second after connecting (1 clockwise, 0 counter-clockwise): the page gets what the knob sends on the base layer as a browser event, as a real turn would |
| `?unlock`, `?unlock=start` | Opens the unlock dialog once the lock state is read; `start` starts unlocking straight away (with `?demo-press=0,1+3,14` the demo holds Esc and Enter) |
| `?tour`, `?tour=3` | Opens the first-run tour at once (at the third step, counted from 1), seen before or not, for screenshots. Without any option in the address the tour starts by itself the first time a keyboard is in on Home; any other option keeps it away |

Example: `http://localhost:5199/?demo&theme=light#/keys`.

| Command | |
|---|---|
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | Must pass before every commit. `test` includes the vendored tests; `pnpm test <file>` runs one file. These three, `pnpm build` and `pnpm shots` go through `scripts/calm.mjs`: on Windows they and everything they start (test workers, the build's threads, headless Edge) are held to a quarter of the computer's cores, four at most, at below-normal priority, so a run never takes the whole computer (`LAYERWORKS_CORES=6` changes the number; the publishing workflow is not held). The tests' workers are the same number however they are started (`maxWorkers` in `vite.config.ts`). Anything else heavy runs as `node scripts/calm.mjs <command>`. The full suite takes about 70 s this way. |
| `pnpm build` | Production build into `dist/`, with `licences.txt` and `LICENSE.txt` beside the page (see "Hosting") |
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
    useMatrix.ts       the switch matrix as a React hook, one poll loop for every watcher (Test, "Press a key")
    keycodes.ts        key names, the palette's groups, builders and readers for shortcuts, layer keys and
                       tap / hold keys (mod-tap, layer-tap, one-shot modifiers, layer + modifiers)
    sendable.ts        which keys each place can send (the Shortcuts page's pickers), from vial-qmk's handling
    layout.ts          key legends that follow the computer's keyboard layout (basic keycode → character)
    fake-keyboard.ts   a HidLink with no hardware and a small Vial keyboard behind it (tests, demo)
    backup.ts          the backup file: create, read back with checks, turn into contents to restore
    restore.ts         restoring: whether a file fits the keyboard, the plan of writes (only what differs), in words
    vil.ts             Vial's .vil files in and out (through the vendored vil-compat and macro code)
    keyboard-file.ts   opens a file to restore from: a backup or a Vial file
    wireless.ts        Keychron's wireless timers: limits, choices, durations in words
    macros.ts          macros as steps: to and from the shared macro buffer, sizes, problems, recording
    entries.ts         tap dance, combos, key overrides, alt repeat: defaults, problems, option bits, modifiers
    settings.ts        the QMK settings catalogue: names, explanations, controls, groups; values in and out
    keychron-typing.ts Keychron's key bounce filter types and Snap Click rules in words, pair checks
    keychron-rgb.ts    Keychron's key colours, zones and lock lights: packets, the LED under each key, zone effect numbers
    keychron-layers.ts Keychron keymaps' layer orders (generated by scripts/keychron-layers.mjs)
    firmware.ts        Keychron's firmware version string in words (readFirmware; Home and Device)
    useDevice.ts       the app's store and its React hook
    api.ts, index.ts   the public surface; pages, plugins and the shell import from here
  demo/              the demo keyboard: a K15 Max inside the page (k15-max.json, demo-link.ts), or another keyboard
                     (?demo-keyboard=, other-keyboards.ts, keyboards/*.json)
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
    layer-names.ts     layer and macro names, kept in the browser per keyboard, and the layers' defaults
    theme.ts           dark / light / system, applied as the `dark` class on <html>
    KeyboardPicture.tsx  the keyboard for one layer; wraps the vendored keyboard widget
    usePictureKeys.tsx the picture without a mouse: one Tab stop, arrows between keys, Enter picks, names for
                       screen readers; picture-keys.ts: where each key is, which one an arrow goes to, its name
    picture-labels.ts  the picture's friendly labels: "Macro 1" (M1), "Multi-tap 1" (TD(1)), "Hold" over a layer's
                       name, a tap / hold key as hold over tap
    KeyTile.tsx        KeyTile (a palette key drawn like a keycap; `empty` draws it faint) and KeyCap (one key)
    ChoiceGrid.tsx     one of a few choices like Segmented, as a grid, so four labels fit a narrow column
    PageLink.tsx       a link in running text to another page of the app ("#/typing")
    Spotlight.tsx      a coach mark: a ring round a `data-tour` target, the rest dimmed, a card with Back / Next / Skip
    Tip.tsx            the name of an icon-only control beside it, on pointing and on keyboard focus (no `title`)
    Popover.tsx        PopoverButton: a box of controls beside its button; not modal, Esc / outside click close it
    coach-placement.ts where a coach mark's card goes beside its target
    ResizeHandle.tsx   a drag handle on a box's bottom edge (pointer and keyboard), and clamp
    Select.tsx         a drop-down choice (the browser's own list, styled)
    KeyCapture.tsx     "press a key": a button that takes the next key pressed as its value
    latest.ts          sends changes one at a time, only the newest waiting (dragged sliders)
    reveal.ts          goes to a section of a page: scrolls, gives it the focus, flashes it once there
    useElementSize.ts  an element's size as it changes (ResizeObserver)
    colour.ts          lighting colours (QMK hue and saturation) as CSS, names, tracks, light or dark
    ColourChooser.tsx  ready colours, recent ones, colour and vividness sliders
    PaintSurface.tsx   press and drag across the picture's keys to paint them, one stroke at a time
  shell/             the frame around the pages
    Shell.tsx          the frame: sidebar, page title, stage, page, status line, help panel; picks the page
    ErrorBoundary.tsx  what shows when the app or a page throws while drawing
    Sidebar.tsx        app name, device card, pages grouped main / plugins ("Extras") / app; names or icons only
    sidebar-collapse.ts  when the sidebar shows icons only: the window's width, the button, the remembered choice
    DeviceCard.tsx     the connected keyboard: name, cable or 2.4 GHz, battery, locked (unlock / lock), disconnect;
                       DeviceIcon, the same as one icon that opens the card, for the sidebar with icons only
    UnlockDialog.tsx   the unlock flow on screen; unlock-dialog.ts opens it (openUnlock)
    Stage.tsx          the keyboard stage: layer stack beside the picture, pressed keys, selection, resize handle
    stage-size.ts      how tall the stage is: automatic, chosen, minimum and cap
    LayerStack.tsx     the layers: pick, rename in place, active one marked, "Follow the keyboard"
    StatusLine.tsx     saved / saving / write error / unsaved work, parts still loading or not readable, undo / redo
    unsaved.ts         work a page holds that hasn't reached the keyboard yet (setUnsaved, useUnsaved)
    HelpPanel.tsx      the help topic, sliding in from the right
    Tour.tsx           the first-run tour on screen: goes to each step's page, waits for a keyboard, Esc skips
    ConnectPrompt.tsx  connect a keyboard / try the demo, and "reading the keyboard"
    router.ts          pages by URL (#/keys)
    page-title.ts      the window's title follows the page ("Keys · Layerworks")
    session.ts         connect, connect the demo, disconnect
    stage-store.ts     which layer and key the keyboard stage shows
    keyboard-layout.ts reads the computer's keyboard layout from the browser, for the key legends
    pressed-keys.ts    held keys, from the browser's key events
  pages/             the built-in sections, one file each, registered as the "core" plugin (index.ts);
                     a page's own parts in a folder beside it (home/, keys/, settings/, help/, lighting/, test/,
                     device/, shortcuts/, typing/)
  plugins/api.ts     definePlugin: pages, panels and effect names, for built-in sections and plugins alike
  help/              the help: topics.ts (every explanation), guide.ts (groups and reading order), glossary.ts,
                     search.ts, text.ts (layer names in texts), docs-site.ts (what a topic's link says it opens),
                     TopicBody.tsx and Highlight.tsx (shared by the panel and the Help page), help-store.ts (the
                     panel's topic), tour.ts (the tour's steps and state)
  vendor/pipette/    code copied from Pipette, unmodified (VENDOR.md)
  main.tsx           registers the pages, reads the URL options, renders the shell
hardware/            checks against the real keyboard (pnpm hardware)
scripts/vendor.mjs      keeps src/vendor in step with the Pipette clone
scripts/calm.mjs        runs a command on a few cores at low priority (the checks, the build and the screenshots)
scripts/demo-data.mjs   rebuilds the demo keyboard from a Vial definition and a keymap backup
scripts/demo-keyboards.mjs  rebuilds src/demo/keyboards/*.json, the other keyboards the demo can be, from vial-qmk
scripts/keychron-layers.mjs  rebuilds src/device/keychron-layers.ts from the Keychron keymaps in vial-qmk
scripts/screenshot.mjs  screenshots on the demo keyboard (pnpm shots)
```

The firmware source the app is written against, and which code comments and these documents cite as "vial-qmk"
with a path inside it (`quantum/vial.c`), is https://github.com/tymon3310/vial-qmk, branch
`vial-updated-keychron`, commit `9bb0ad4`. The scripts that read it (`scripts/demo-keyboards.mjs`,
`scripts/keychron-layers.mjs`) take its path as an argument; without one they look for a `vial_qmk` folder beside
this repo, as does the test that checks the typing settings against it (`device/__tests__/settings.test.ts`, skipped
when the folder isn't there).

## Tests

Unit tests sit in `__tests__/` beside the code. `src/device/fake-keyboard.ts` provides a `HidLink` with no
hardware behind it and a small Vial keyboard to answer it, on the cable or through a receiver; its `held` set is
the switch matrix, which unlocking checks. The unlock and matrix tests run on fake timers and check the poll
spacing and that nothing else is sent while unlocking. The restore tests (`device/__tests__/restore.test.ts`) back
up the fake keyboard, change it behind the store's back, restore and compare the fake's memory with the original,
counting the writes sent; `start-over.test.ts` covers the lock lights, the keymap reset (locked, with and without the
macros) and the restart for a firmware update (locked, through the receiver, unsupported, and ending disconnected);
`vil.test.ts` also reads a real Vial save (Pipette's `bento-max.vil` fixture). `failures.test.ts` injects failures
through a wrapping link (the keyboard goes away, a request never arrives, a reply is lost or late, another app's
unlock): macro saves cut off, writes read back, restores stopped and run again, "Stop waiting", queued changes
dropped for the next keyboard, the factory-reset notice. `file-checks.test.ts` covers damaged and foreign files and
the restore review's risks; `shell/__tests__/tab-lock.test.ts` two tabs on one keyboard; `ui/__tests__/prefs.test.ts`
damaged storage.

## Screenshots

```
pnpm shots /keys /lighting                   # dark and light, 1280 × 800, on the demo keyboard
pnpm shots --offline /home                   # no keyboard connected
pnpm shots --size=1000x700 --theme=dark /keys
pnpm shots --query=help=layer-key /keys      # with the help panel open
pnpm shots --no-build /keys                  # reuse the last build
pnpm shots --port=5197 /keys                 # own port and build folder, for two runs side by side
pnpm shots --query=tour=3 /home              # the tour at its third step
pnpm shots --query=sidebar=collapsed /keys   # the sidebar with icons only (a window under 1024 px has it anyway)
pnpm shots "/help?q=tap%20dance"             # the Help page with a search
```

Headless Edge runs the page in a smaller viewport than the picture (about 1250 × 705 for 1280 × 800) and enlarges
it for the capture without running scripts again. What is placed by measuring, like the tour's ring and card, can
therefore sit a little off in a screenshot when its target is in the middle of the page; in a browser it is exact.

`scripts/screenshot.mjs` builds, serves the build on port 5198, takes each page with headless Edge into
`%TEMP%\opencode\layerworks-shots\` (`keys-dark.png`, `keys-offline-light.png`, ...) and stops the server.
The server is `scripts/serve.mjs`: plain files, no fallback page, so a file the page asks for and the build doesn't
have is listed at the end as missing (and the run fails). `--sub-path=/layerworks/` serves the build under that
path, as GitHub Pages does (files get `-under-layerworks`).
Every picture gets a fresh browser profile in a temporary folder, removed at the end, so nothing remembered in
one shot (theme, "More options" open) shows in another. `EDGE=<path>` points it at another `msedge.exe`.

## Demo keyboard

`src/demo/` puts a K15 Max inside the page: the same requests get the same kind of answers, and changes last
until the page is reloaded. It is for trying and screenshotting the app with nothing plugged in. Refresh its
data with `node scripts/demo-data.mjs <vial.json> <keymap.json>` after the firmware definition or the keymap backup
changes: it rebuilds `src/demo/k15-max.json` from a Vial definition and a keymap backup, a JSON file with `keys`
(layers of rows of numeric keycodes) and `encoders` (layers of knobs, each a pair of keycodes, counter-clockwise
then clockwise). Its lighting
is the real keyboard's: the 25 VialRGB effects the Vial build lists, maximum brightness 255, starting on Solid
Splash in indigo (`?demo-effect=` picks another; 48 and 49 open the key colour and zone editors). The test fake
keeps its own small list (`RGB_EFFECTS`). Its Keychron lighting is the K15 Max's as its firmware starts out: the
real LED map, red Esc and Enter, blue letters, yellow around them, W A S D in zone 2.

The keys of whatever keyboard is typed on stand in for the demo's switches: each browser key event presses the
demo key that sends the same key on its base layer, so holding Esc and Enter unlocks it, and once unlocked the Test
page sees those keys through the matrix too. It starts locked (`?demo-unlocked` for unlocked); `?demo-press=`
presses keys by itself for screenshots. Unlocking, the matrix and the commands ignored while counting behave as
vial-qmk's do (`fake-keyboard.ts`).

It answers every write the app makes and keeps it: keys, knob, lighting, macros (only while unlocked), tap dance
and the other entries, QMK settings and their reset, layout options, and Keychron's wireless timers, debounce and
Snap Click, and the lock lights (Caps Lock only, white to start with); locked, QK_BOOT in knob and entry writes
becomes 0, as in vial-qmk. The keymap reset puts back its keymap without the examples below (the saved keymap stands
in for the firmware's own, which can't be read) and the settings' defaults, and empties the entries; the macro reset
needs no unlock. Restarting for a firmware update, once unlocked, drops the connection 100 ms after answering, as the
real keyboard leaves USB. It reports the K15 Max's 26 QMK
settings with the values the real keyboard has (its firmware defaults, `K15_SETTINGS`), which the reset puts back.
On the cable its Keychron commands report the default layer, the key bounce filter (react at once, 50 ms, as read
from the real keyboard), adaptive N-key rollover as the K15 Max answers `0xA7 0x12` (refusing to be set, so Typing
feel shows no switch for it), and Snap Click (20 slots, one example pair: A and D, the last one pressed wins);
`?demo-wireless` connects it through the receiver with those and the K15 Max's wireless features, timers (10 min,
2 h), a battery of 76 % and the real firmware string (`v1.1.2 1970-01-01-00:00:00`).

Its macro buffer has three examples (`DEMO_MACROS` in `demo-link.ts`) in M1 – M3, M0 left empty: an e-mail
address, Ctrl + A then Ctrl + C, and Win + R, wait, "notepad", Enter. The K15's keys printed M1 – M5 are QMK's
M1 – M5, so they run Macros 1 – 5, as on a real Keychron.

It also has two of each other kind (`DEMO_ENTRIES`): multi-tap keys 1 and 2 (TD(0) left empty), Esc / Caps Lock
(on Fn + Caps Lock on the Windows layers) and Ctrl + C / Ctrl + V; key chords J + K → Esc, D + F → Tab and both Shifts → Caps Word; Shift + Backspace → Delete and
Shift + Esc → ~; after Ctrl + Z the repeat key sends Ctrl + Y, and Home ↔ End. The alternate repeat key is on Fn2 +
Space. Fn2 also holds the Keys page's examples: Caps Lock tap Esc / hold Ctrl, Tab tap Tab / hold Windows Fn, the
left Windows key "Windows keys off, or on again" (GU_TOGG) and Esc "Restart" (QK_REBOOT).

### Other keyboards in the demo

A developer option, `?demo-keyboard=<name>`, makes the demo stand in for another keyboard, to see the app on
keyboards that differ from the K15 Max (`demo/other-keyboards.ts`):

| Name | Keyboard (vial-qmk) | Shows |
|---|---|---|
| `corne` | crkbd | a split keyboard with rotated thumb keys, underglow, a definition whose `lighting` is an object |
| `gh80` | gh80_3000 | layout options (nine groups), no lighting, two layers |
| `splinter` | kiserdesigns/splinter | no name in its definition (the browser has its USB name), six knobs, eight layout option groups |
| `cloud` | lazydesigners/cloud | a knob its firmware lets no app change (built without an encoder map), underglow, layout options |
| `q2` | keychron/q2/ansi_encoder | a Keychron board whose layers go Mac, Windows, Fn, Fn 2, Fn 3, with Keychron's lighting |
| `q0` | keychron/q0/base | a Keychron number pad: no Mac / Windows switch, no knob |
| `c100` | keychron/c100_8k | a Keychron board with more than 8 matrix rows (10), with Keychron's per-key lighting |
| `vipad` | vipad | firmware that never locks (`VIAL_INSECURE`), eighteen layers, two knobs, an RGB matrix the definition writes as an object |
| `klein` | era/sirind/klein_hs | a switch matrix too big for the switch-matrix read (10 rows of 16), rotated keys, a backlight |
| `macropad` | ymdk/ymd09 | a 3 × 3 macropad: no knob, no entry slots, no typing settings |

Each is `src/demo/keyboards/<name>.json`, written by `node scripts/demo-keyboards.mjs [path to vial-qmk]` (default
a `vial_qmk` folder beside the repo): the keymap's Vial definition (vial-qmk's data, GPL-2.0-or-later, named in the file and in the
licences file), the USB identity WebHID would report (the definition's IDs, else `keyboard.json` / `info.json`'s,
with `keyboard_name` as the product name), where the keys and knobs are, and what the firmware has, read from the
keymap's `config.h` and `rules.mk`: Vial keyboard ID, layers, unlock keys, `VIAL_INSECURE`, the knob map
(`ENCODER_MAP_ENABLE`, off unless switched on), entry slots (8 of each, none where the feature is switched off),
Caps Word and Layer Lock, QMK settings, VialRGB, and Keychron's commands (Keychron boards). The files are loaded
only when asked for, so they don't add to the app's size. The keymap is made up: ordinary keys in a US keyboard's
order on layer 0, Fn (MO 1) on the last key, the other layers transparent, knobs turning the volume on layer 0. The
fake answers Vial's knob commands by index (`knobs`), and sends them back unchanged where the firmware has no knob
map (`knobMap: false`), as vial-qmk does. Typing settings, where the firmware has them, are the K15 Max's. They are
reached on the cable only (no `?demo-wireless`), and keep the demo's other options (`?demo-unlocked`,
`?demo-press=` …). To add one, add a line to `BOARDS` in the script and run it.

## Hosting

The page is published at https://layerworks.tybyfy.com/ by `.github/workflows/pages.yml`: on every push to
`main` (and by hand from the Actions tab) it installs with the pnpm in `packageManager`, runs typecheck, lint and
tests, builds, and deploys with GitHub's Pages actions. The repository must be public, with Settings → Pages →
Source set to "GitHub Actions".

- **The address** is GitHub Pages under a domain of its own: a DNS `CNAME` record `layerworks` →
  `phazei.github.io` at the registrar of `tybyfy.com` (Porkbun), and `layerworks.tybyfy.com` as the custom domain
  in Settings → Pages, with "Enforce HTTPS" on (WebHID needs HTTPS). The workflow deploys an artifact, so no
  `CNAME` file is needed in the repo. `https://phazei.github.io/layerworks/` redirects there.
- **Any path.** `base: './'` in `vite.config.ts` makes every address in the build relative, so the same `dist/`
  works under `/layerworks/`, under a fork's name or at `/`; the routes are after the `#`. To try it as published:
  `pnpm build`, then `node scripts/serve.mjs --sub-path=/layerworks/` (http://localhost:5198/layerworks/).
- **Commit stamp.** The build records the commit it was built from (`GITHUB_SHA` in the workflow, else
  `git rev-parse HEAD`, else "unknown"; a made-up hash in tests) as `BUILD_COMMIT` (`src/build-info.ts`). Settings,
  About links to the source at that commit, and to the issues for reporting a problem (Help's start page too).
- **Licences file.** `scripts/notices.ts`, a small Vite plugin, writes `dist/licences.txt` from what is really in
  the bundle: the npm package of every bundled module, with its name, version and licence file. The texts it can't
  find there (the vendored Pipette code and Vial GUI, kle-serial, LZMA-JS, and xz-decompress, which ships no
  licence file) are in `scripts/layerworks-notices.ts` and `scripts/notices/`. A bundled package with no licence
  text stops the build. The GPL's text goes beside it as `dist/LICENSE.txt`. About links both.
- **Project facts** (copyright holder, source and issues addresses) are constants in `src/project.ts`, used by
  About and the licences file.
- Nothing is loaded from other servers (no fonts, analytics or CDNs). Everything the app keeps in the browser is
  named `layerworks:…` (`src/ui/prefs.ts`), so it stays apart from other pages wherever the build is served (a
  fork on `<name>.github.io` shares its origin with that account's other projects).

## Licence

Copyright © 2026 phazei (`COPYRIGHT_HOLDER` in `src/project.ts`). GPL-3.0-or-later: free software, with no
warranty. See `LICENSE`, and `VENDOR.md` for the code that comes from Pipette. Layerworks is an independent project,
not affiliated with or endorsed by Keychron, QMK, Vial or VIA.
