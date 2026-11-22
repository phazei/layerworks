# Layerworks

A configurator for keyboards running Vial firmware, built to be usable without knowing QMK, with Keychron's extras
(key colours and zones, the Caps Lock light, sleep timers, key bounce filter, Snap Click) where the keyboard has
them. It is built and tested on a Keychron K15 Max with [tymon3310/vial-qmk](https://github.com/tymon3310/vial-qmk).
It runs in the browser (Chrome or Edge, over WebHID), on the cable or through Keychron's 2.4 GHz receiver.

The design is in the Alice-Keyboard project: `../docs/spec/layerworks.md`. Every section of it has its page here
(see "The built pages"); the plugin API's second level and the Ripple plugin are not built (spec sections 9, 12).

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
| `?demo-keyboard=<name>` | A developer option: the demo keyboard stands in for another keyboard instead of the K15 Max, to see the app on keyboards that differ from it: `corne`, `gh80`, `splinter`, `cloud`, `q2`, `q0`, `c100`, `vipad`, `klein`, `macropad` (README "Demo keyboard", "Other keyboards in the demo") |
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
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | Must pass before every hand-over. `test` includes the vendored tests; `pnpm test <file>` runs one file. These three, `pnpm build` and `pnpm shots` go through `scripts/calm.mjs`: on Windows they and everything they start (test workers, the build's threads, headless Edge) are held to a quarter of the computer's cores, four at most, at below-normal priority, so a run never takes the whole computer (`LAYERWORKS_CORES=6` changes the number; the publishing workflow is not held). The tests' workers are the same number however they are started (`maxWorkers` in `vite.config.ts`). Anything else heavy runs as `node scripts/calm.mjs <command>`. The full suite takes about 70 s this way. |
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
    layer-names.ts     layer names, kept in the browser per keyboard, and their defaults
    keychron-layers.ts Keychron keymaps' layer orders (generated by scripts/keychron-layers.mjs)
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
scripts/demo-data.mjs   rebuilds the demo keyboard from ../keyboards/.../vial.json and ../backups/keymap.json
scripts/demo-keyboards.mjs  rebuilds src/demo/keyboards/*.json, the other keyboards the demo can be, from ../vial_qmk
scripts/keychron-layers.mjs  rebuilds src/shell/keychron-layers.ts from the Keychron keymaps in ../vial_qmk
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

- **The sidebar** shows each page's icon and name, or the icons only (`shell/Sidebar.tsx`, `sidebar-collapse.ts`).
  A window narrower than 1024 px shows the icons only; the button beside the logo (under its mark with icons only;
  "Collapse sidebar" / "Expand sidebar") changes it by hand at any width. The hand choice is remembered in the browser (pref `sidebar`: the choice
  and which side of 1024 px the window was on) and holds, across reloads too, while the window stays on that side;
  when the window crosses 1024 px it is forgotten and the sidebar takes that width's shape. So it changes shape only
  when the button is pressed or the window crosses the threshold, and after a crossing it is always what that width
  calls for. `?sidebar=collapsed` / `expanded` shows it so without remembering it (screenshots). With icons only,
  each link keeps its page's name as its accessible name and `aria-current`; the name appears beside the icon on
  pointing and on keyboard focus (`ui/Tip.tsx`; Esc hides it). The logo is its mark, "Extras" is a line, Help and
  Settings stay at the bottom, and the width change is animated (none with reduced motion). The keyboard's card
  becomes one icon (`DeviceIcon`): a keyboard with a mark for how it is connected (cable, 2.4 GHz, demo) and one for
  locked or unlocked (none where the firmware never locks); its name says all of it ("Keychron K15 Max …, demo
  keyboard, locked"). It opens the full card beside it (`ui/Popover.tsx`), so Unlock… and Disconnect are two clicks
  away. Esc closes it and puts the focus back on the icon (Unlock… does the same before its dialog opens); a click
  outside or the focus leaving closes it. With no keyboard, the icon is a dashed plug that links to Home's connect prompt.
- **Pages that need a keyboard** show the connect prompt instead while none is connected, and "Reading the
  keyboard…" while one connects. Pages with `offline: true` (Home, Help, Settings) always show.
- **The status line** says "Saved on the keyboard", "Saving…" while `DeviceState.writing` is above 0, or the
  `writeError`. While a page holds work not yet on the keyboard (a macro or another shortcut being edited), it says
  so instead ("Macro 3 has changes not yet saved to the keyboard", or the macro's own name when it has one, "2
  macros have unsaved changes"), as a link to
  the work: pages declare it with `setUnsaved(id, { label, group, href, keyboard })` (`shell/unsaved.ts`), the
  Shortcuts drafts for theirs. Beside it: the parts still being read in the background, or the ones that could not
  be read. Undo and redo call `deviceStore.undo` / `redo`.
- **The help panel** slides in over the right edge of the page (not over the status line) when anything calls
  `openHelp(topic)`, usually a `HelpButton`. A `HelpButton` toggles (`toggleHelp`): pressed again while its topic
  is shown, it closes the panel; another "?" switches topic. It carries `aria-expanded` and `aria-controls`
  (`help-panel`). Opening it moves the focus into it (it is visible at once; only the slide is animated, as a hidden
  panel can't take the focus), and Esc or the close button hides it and gives the focus back to what opened it, the
  "?" usually; the page stays usable. A topic's link says where it goes ("Read
  more in the QMK documentation", "… the Vial manual", "… Keychron’s guide"; `help/docs-site.ts`). Under the text:
  related topics (they open in the panel) and "Open on the Help page".
- **The first-run tour** (see "Help and the tour") is mounted once in the shell (`shell/Tour.tsx`).
- **When something throws while drawing** (`shell/ErrorBoundary.tsx`): one boundary around the page area (the stage
  and the page, in `Shell.tsx`) and one around the whole app (`main.tsx`). The page one shows "Something went wrong
  on this page" in the page's place, with the sidebar and device card still working; another page or another keyboard
  starts afresh (`resetKey`). Both say nothing was sent to the keyboard because of it, link "report a problem" to the
  issues page (`ISSUES_URL`, `src/project.ts`), keep the error text behind "What went wrong", and offer Reload and
  "Try again". Since a section remembered as open ("More options", "Technical details", pref `open:<id>`) can make a
  page throw on every visit, "Try again" first closes every remembered section (`closeRememberedSections`).
- **Theme**: dark by default; Settings offers dark, light and "Like the system". Stored with `prefs.ts`
  (`theme`); a small script in `index.html` applies it before the app loads, and a `<style>` there gives the page its
  colour (`--surface`, each theme's) before the stylesheet arrives, so a reload doesn't flash white. Small text and
  control outlines meet WCAG's contrast in both themes (4.5:1 for text such as warnings on controls and red on its
  tint, 3:1 for `--control-edge`, the outline of text boxes, select boxes, checkboxes and an off switch); a test
  reads `tokens.css` and checks those pairs (`ui/__tests__/colour-contrast.test.ts`).
- Designed for 1280 × 800, usable down to 560 px wide with the sidebar's icons only (every page lays out without
  overlap; the K15's keys in the picture are about 24 px at 640 px and get smaller below). Narrower than that, the
  page area (title, stage, page and status line together) keeps 496 px (`min-w-124` in `Shell.tsx`) and scrolls
  sideways, so nothing overlaps or is cut off. When the stage itself is narrower than 768 px (a
  container query; a window of about 1050 px), the layer stack becomes one row above the picture: the layers as
  chips (the dot marks the active one, the rename pencil appears on pointing or focus) and "Follow the keyboard" at
  its right end, wrapping under them only when the row is too narrow. The stage takes at most half of the height it shares with the page (see "The keyboard stage and selection"), so the page
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

The window's title follows the page shown, from its `title`: "Keys · Layerworks", "Page not found · Layerworks"
(`shell/page-title.ts`, `usePageTitle`, called once in `Shell.tsx`), never the keyboard's name; `index.html`'s
title is the one before the app starts.

## The built pages

- **Home** (`Home.tsx`, `home/`): the landing page. Under the stage: the keyboard's name with connection,
  battery (on 2.4 GHz, when known), the active layer by name, firmware version and lock state (with Unlock… while
  locked; the facts' "?" sit beside their labels); four shortcut
  tiles (keys, lighting, backup, test); and what the keyboard can do, from `capabilities`
  (`home/features.ts` gives each feature its friendly and QMK name; lighting counts the effects the Lighting page
  offers, `capabilities.effectCount`, without Off and Direct Control; N-key rollover reads "the keyboard does it by
  itself" where the keyboard reports adaptive N-key rollover, and "a switch on Typing feel" where it is QMK's
  setting 21, and is available exactly where one of the two applies), with the missing ones and their reasons
  behind a `Disclosure`. With no keyboard it shows the connect prompt and three lines on what the app is for.
- **Keys** (`Keys.tsx`, `keys/`): click a key or one side of the knob on the stage; with nothing selected the
  page says so. Armed from a shortcut's "Put it on a key…" (see Shortcuts & macros, the macro editor), it says
  which shortcut the next click puts on a key instead, and the clicked key gets it. The inspector (`keys/Inspector.tsx`) is two columns from 42rem (a container query), so in a small
  window the palette starts at the top of the card; one column when narrower. With two columns the card fills
  exactly the space under the stage (placed absolutely in a wrapper, at least 15rem tall), so nothing in it makes
  the page taller: the palette scrolls in its box, and the left column (question, choice, More options) and a
  tall choice scroll on their own. With one column the card is as tall as its contents and the page scrolls,
  More options last. It asks "What should this key do?", says which layer it is on and, above the base layer,
  whether
  the key has its own assignment or falls through, and to what (`keys/describe.ts`, `fallThrough`: from a layer
  above the keyboard's base layer to the base layer, then layer 0; from any other layer straight to layer 0;
  worded "normally", since other layers held at the same time aren't counted). "Now" shows the current assignment as a keycap,
  in words, and its QMK name; a key that does two things has a two-line cap, tap above hold ("Esc" over "Ctrl",
  `capLabel`), and reads "Tap: Escape · Hold: Ctrl". A macro or multi-tap key shows its name and summary
  ("Macro 1 · Types “hello@example.com”", "Multi-tap key 1 · Tap: Escape · Double tap: Caps Lock") with "Open on
  Shortcuts & macros" (or "Set it up …" for an empty one) linking to that slot. Then the choice, a `ChoiceGrid`
  (`ui/ChoiceGrid.tsx`: two by two in the 18rem column, one row of four in a one-column card from 32rem), opened
  on the one that matches the current assignment:
  - **A key** (`keys/KeyPalette.tsx`): `keyPalette()` groups as key tiles in a box that scrolls and fills the
    space left; the current key is marked and scrolled into view. The search matches label, description and QMK
    names (a single character only matches a label, so "a" finds A); the line beside it says what the key under
    the pointer does (`plainDescription`: the friendly words, "1 and !" for a number or symbol key, and plain words
    in `PLAIN` where the vendored name misleads, such as the Undo or Copy key most computers ignore, the mouse
    buttons and the mouse speed keys). When nothing matches it says so, and only the Keys page's "A key" adds where
    to type a QMK name (the `noMatch` prop; the pickers elsewhere have no Key code field). A click assigns. Beside the search, "Press a key" (`keys/PressKey.tsx`, also for a knob
    direction) takes the next key pressed on the keyboard and assigns it through the same path as a tile (one undo
    step; the firmware update key still asks to unlock). Locked, it listens to the browser's key events
    (`ui/KeyCapture.tsx`'s `useKeyCapture`, `keycodeOfEvent`), so only keys the computer receives count, and a line
    under the search says so with "Unlock to see every key…". Unlocked, it also reads the switch matrix while it
    waits (`device/useMatrix.ts`, the Test page's hook, with `enabled`): a new key down there gives a position, and
    the value is what that key does now on the active layer, falling through to the base layer and layer 0
    (`keyNow` in `keys/describe.ts`), so macro, layer and tap-or-hold keys come as they are. A browser event waits up
    to 400 ms for the matrix to report the press (it reads every 20 – 60 ms) and the matrix's key wins. vial-qmk
    answers the matrix request only while unlocked (`via.c`, `id_switch_matrix_state`). The pressed key still does
    its job on the computer, which the line says. Esc (or Esc's position on the matrix), a second click or a click
    elsewhere stops waiting. Macro and multi-tap tiles say what they are (`keys/shortcut-keys.ts`, from
    the keyboard's macros and tap dances and the macro names kept in the browser): the macro's name or "Macro 3",
    "Multi-tap 1" (broken after the hyphen), by QMK's own number (M3, TD(1)), slot 0 last; the hover line and screen
    readers get the one-line summary ("Email: Types
    “hello@example.com”"), and the search matches names and summaries. Slots with nothing set up stay in their
    place, drawn faint with a dashed edge, still pickable. Both groups have "Set up on Shortcuts & macros" beside
    their title. The palette does this itself, so the Shortcuts page's key pickers show the same tiles.

    After the everyday groups the Keys page (`keyPalette(features)`; the Shortcuts page's pickers take what fits their
    place, see "What each picker offers" under Shortcuts & macros) adds, each with its own "?" and, where it helps, a short note under its title:
    *Typing helpers* (Caps Word, the Esc and ` key, the seven Space Cadet keys, Layer Lock), *Swapped and disabled
    keys* (QMK's Magic keycodes, worded like the Typing feel switches they change, with a link there; NKRO on / off
    included where they do something (not on a keyboard that does N-key rollover by itself; see "Typing settings"),
    the split-keyboard ones left out) and *International keys* (ISO, Japanese and the language keys); then,
    under a closed "More keys" fold (remembered; open by itself when the edited key is one of them; a search looks
    everywhere), *Features on and off* (Capitals by holding, key chords, shortcut replacements, one-tap modifiers)
    and *Restart and firmware update*. Their tiles and words come from `FRIENDLY` in `device/keycodes.ts` (every
    description unique, as it names the tile for screen readers; the picture uses the same labels). A few keys
    vial-qmk has and the vendored tables lack or never register (Esc / Caps Lock swap, the Caps / Ctrl and \ /
    Backspace toggles, NKRO) are `EXTRA_KEYS` there, for Vial protocol 6: named, typed and offered like the rest.
    What the keyboard can be asked about is used: Caps Word and Layer Lock show only with Vial's feature flags for
    them, the chord, replacement and Capitals by holding switches only when the keyboard has chord or replacement
    slots or reports the Auto Shift setting. Nothing else about the firmware can be known, so the notes speak
    generally. Putting the firmware update key on a key or knob turn asks to unlock first (`openUnlock`), as Vial
    does; vial-qmk turns it into nothing in a knob turn written while locked. Families most firmware lacks
    (joystick and programmable buttons, MIDI, audio, haptic, steno, backlight, underglow, dynamic macros, swap hands,
    Unicode …) are left out, with a line and a help topic at the end of the fold; a key holding one is named by its
    family ("MIDI", "A MIDI music key …") in the picture, the "Now" line and the key-code field rather than as a
    number. `?key-search=magic` opens the palette with a search, for screenshots.
  - **A shortcut** (`keys/ShortcutChoice.tsx`): Ctrl, Shift, Alt, Win checkboxes and a palette of the keys that
    take modifiers (`canTakeModifiers`); nothing is written until "Use Ctrl + C", so trying doesn't fill undo.
    Nothing is ticked to start with, and the key starts as the one the key holds now when the palette has it.
  - **Switch layer** (`keys/LayerChoice.tsx`): pick the layer, then one of the `LAYER_ACTIONS` sentences with
    its name; a sentence assigns. "Hold for Fn2, or tap it 5 times to keep it on" is QMK's TT; the count is the
    keyboard's Tapping toggle (`keys/tapping-toggle.ts`: Vial's QMK setting 20 where the keyboard reports it, with a
    line under the sentences linking to the Typing feel page; otherwise QMK's default, 5, said to be fixed in the
    firmware). Folded under "With modifiers held too": the layer with modifiers held (QMK's LM, layers 0-15),
    nothing ticked to start with, then used with its own button ("Use Fn2 + Ctrl").
  - **Tap or hold** (`keys/TapHoldChoice.tsx`): one thing when tapped, another while held. "When held" a modifier
    (mod-tap, `LCTL_T(kc)` …: Ctrl, Shift, Alt, Win to tick, none ticked to start with) or a layer (layer-tap,
    `LT(layer, kc)`, the layers by name; only 0-15 fit in the keycode); "Tap for" a key from a palette of plain keys
    (the shortcut palette's: the firmware keeps 8 bits for the tap), starting as the key's own tap, or the plain key
    it holds now ("Z"), so only the hold needs picking. Nothing is written until the button, named by the result
    ("Use Tap: Escape · Hold: Ctrl"). A note under the palette (under it, so in a small window the palette starts high) points to
    multi-tap keys for anything that isn't a plain key, and to the Typing feel page for how long counts as a hold. Under "Left- or right-hand modifier", the side
    (QMK can't mix sides in one key; opened by itself for a right-hand key).
  - *More options* (`keys/MoreOptions.tsx`): Nothing, Same as the layer below, a one-tap modifier ("a modifier for
    the next key only"; QMK's one-shot modifier, `OSM`: Ctrl, Shift, Alt, Win and Right-hand to tick, none ticked unless the key holds
    one, then "Use one-tap Shift"), and a key-code field that shows what the typed code means (`parseKeycode`) before "Use this code". It
    opens by itself when the current assignment lives there (nothing, transparent, a one-shot modifier, or a code
    no choice builds, which is put in the field), for that key only: `Disclosure`'s `forceOpen` leaves the
    remembered open/closed state alone.

  The builders and readers are in `device/keycodes.ts`: `modTapKeycode` / `readModTap`, `layerTapKeycode` /
  `readLayerTap` (both `readTapHold`), `oneShotModKeycode` / `readOneShotMod`, `layerModKeycode` / `readLayerMod`,
  all with a 5-bit modifier mask (Ctrl, Shift, Alt, Win in bits 0-3, `RIGHT_HAND` for bit 4); they return null for
  what the firmware can't hold (no modifier, a layer over 15, a tap key that isn't a basic one, `canBeTapped`).
  `keycodeName` reads such keys as "Esc / Ctrl", "Space / Layer 4", "Ctrl+C"; `keycodeCap` gives the two-line form.

  Every assignment is `deviceStore.assign`, so it shows in the picture at once and Undo takes it back; the
  selection stays. A knob's direction 0 is counter-clockwise (left), 1 clockwise (right), as vial-qmk stores
  them. The palette's "Lighting controls" follow what the keyboard's definition says it has (`lightingKeysFor`,
  from `definition.lighting`, also in the list and `{ "extends": … }` forms some definitions use; passed as
  `PaletteFeatures.lighting` by the Keys page and the Shortcuts pickers): the shared `RGB_*` codes Keychron's keymaps
  use (not `RM_*`; vial-qmk sends them to an RGB matrix and to underglow alike) for VialRGB and an RGB matrix, those
  plus underglow's own effect keys (`RGB_M_*`) for `qmk_rgblight`, the backlight keys (`BL_*`) for `qmk_backlight`,
  both for `qmk_backlight_rgblight`, and no group for `none` or no lighting at all. A name the app doesn't know
  keeps the shared `RGB_*` keys.
- **Settings** (`Settings.tsx`, `settings/`): theme; "Take the tour" and a link to Help (`settings/TourCard.tsx`);
  *Key names* (`settings/KeyLegends.tsx`): "Name keys by what my computer's layout types", on by default, with what
  was found ("the key a US keyboard has as Y types Z here", a US layout, or that the browser can't tell, then no
  switch; see "Key names and the computer's layout"); a name field per layer of the connected keyboard, with a
  reset to the default (the same names as the layer stack, `shell/layer-names.ts`); about: version from
  `package.json`, licence, and credits to Pipette (repo and commit from `vendor.json`), QMK, Vial and Lucide.
  Appearance, the tour and layer names on the left, About on the right once the page is 56rem wide; one column
  below that.
- **Help** (`Help.tsx`, `help/`): see "Help and the tour".
- **Lighting** (`Lighting.tsx`, `lighting/`): full height, no stage (the page draws its own picture).
  Left, the effects the keyboard lists (`capabilities.lighting.effects`) as tiles in groups (Steady, Moving, Rain
  and sparkles, Reacts to typing, Set per key or zone), each with a small moving preview in the chosen colour
  and speed (`EffectPreview.tsx`, `lighting.css`), moving the way the effect moves on the keyboard (worked out
  from the firmware's effect code; the reasoning is beside each preview); Off and VialRGB Direct are not tiles.
  Right, staying in view:
  a "Lights on" switch, the current effect in words with its QMK name, and sliders for brightness (percent of
  the keyboard's maximum), speed, colour (rainbow track, swatch and colour name) and vividness. Turning the
  lights off sends effect 0; on again sends the effect remembered for this keyboard (`usePref`), and picking a
  tile while off turns them on. Below them the keyboard picture (see below), then, in a two-column grid, the Caps
  Lock light and the plugin panels for `'lighting'`, one `Card` each. Without usable lighting
  the page shows the capability's reason instead. The page reads the lighting again on opening, on window focus
  and when Fn is let go (`refreshLighting`), to catch the keyboard's own lighting keys.
  - `lighting/effects.ts` holds each effect's friendly name, description, group, preview, and whether it uses
    colour, vividness and speed, or the reason it doesn't, read from the firmware's effect code (sources in the
    file). A slider the current effect ignores is disabled with that reason under it; when colour and
    vividness are off for the same reason, it is said once under both and describes both.
  - Changes go through `ui/latest.ts` (`lighting/latest.ts` passes it on): one `setLighting` at a time; while one
    is on its way only the newest
    of the rest waits, so a dragged slider never floods the keyboard and always ends on its last value. The
    sliders show the value at once, from what is still on its way.
  - A plugin can rename effects with `lightingEffects: { 41: { name, description } }` in its `definePlugin`, for
    firmware that puts its own effect in a standard slot (the K15's ripple is Solid Splash, VialRGB id 41).
  - Keychron's two effects ("Key by key", "Mixed zones") bring an editor below the grid, scrolled into view when
    picked or from the button under the effect's settings: `lighting/KeyColours.tsx` and `lighting/Zones.tsx` (see "Key colours and zones"). Their tiles only show
    on keyboards with Keychron lighting (`perKeyLighting`, `lightingZones`); until the Keychron part is read they
    stay, so they don't flicker on keyboards that have them.
  - Every other effect (and lights off) puts *On the keys* in that same place, in the same frame (picture left, a
    17rem column right), so switching to or from the editors doesn't move the page: the keyboard with a still hint
    of the lighting, not an animation (`lighting/EffectPicture.tsx`, `lighting/picture.ts`). It works from what
    `effects.ts` knows (`hue`, `preview`): effects that use the colour tint every key with it; rainbow effects show
    a fixed rainbow from the keys' real positions, left to right, top to bottom, in rings or round the middle (of
    each half for the two-centre ones), as the effect runs; Rainbow, all keys (every key one colour that keeps
    changing) gets the left to right rainbow too, as the colours it passes through, with a caption of its own
    saying all keys share one colour on the keyboard (`cycle`); Digital rain is green, the heat map blue,
    the random raindrops scattered colours; lights off is black keys. Brightness and vividness apply, live with the
    sliders. A line beside it says what it shows: for One colour that every key has the colour; for the other
    colour effects that the effect decides which keys light, and when, since most of them leave keys dark.
  - *Caps Lock light* (`lighting/LockLights.tsx`, when `capabilities.has('lockLights')`): worded for the lock lights
    the keyboard reports ("Caps Lock light"; "Lock lights" with a switch each when it has several), a switch per
    light, then colour and vividness as sliders like the main ones; brightness (128 – 255, the firmware's floor)
    under More options, since some firmware ignores it. Visible rather than folded away: it is small, and its colour
    is what a user comes to change. `deviceStore.setLockLights`, undoable (see "Key colours and zones").
- **Typing feel** (`Typing.tsx`, `typing/`): full height, no stage (no setting here needs the picture; Snap Click
  keys are pressed on the keyboard instead). A sentence on what the page is for and a search field, then one `Card`
  per group, each with its QMK name small beside the title, a one-sentence description and a help topic. On a wide
  page (from 56rem) a list of the groups sits beside the cards and scrolls to one. Only settings the keyboard reports
  are shown; a group with none is left out.
  - The QMK settings come from `device/settings.ts` (see "Typing settings"), grouped by what a person wants rather
    than how QMK files them: *Tap or hold*, *Key chords*, *Capitals by holding* (Auto Shift), *One-tap modifiers*,
    *Mouse keys*, *Swapped and disabled keys* (Magic), then Keychron's *Key bounce filter* and *Snap Click*, then the
    rarely needed *Esc and ` key* (Grave Escape), and *Other settings* for ids the app doesn't know (shown as sent,
    read only). Everyday settings are visible, the rest under *More options*.
  - A time or number is a `Slider` with its value in plain units ("200 ms", "5 s", "8 notches"), quick choices as
    chips where they help ("Quick 150 ms · Usual 200 ms · Relaxed 250 ms · Slow 300 ms" for the hold time), and the
    explanation under it; mouse-key values add what they come to ("About 1,250 pixels a second at top speed").
    Anything on or off is a `Toggle`, one per bit for settings made of bits. A setting that does nothing because of
    another is greyed out with the reason (Auto Shift's settings while it is off; `typing/rules.ts`).
  - *Tap or hold* has a "Try it here" box to type in while changing the hold time; *Key chords* links to the chords
    on Shortcuts & macros.
  - The search (`typing/rules.ts`) matches every word against the friendly name, QMK name, explanation and group;
    while searching, only matching settings show, those under More options included, and the plugin panels and the
    reset are hidden. "No setting matches …" when nothing does.
  - Changes go through `ui/latest.ts`, one queue for the page's QMK settings (`deviceStore.setSetting`) and one for
    the bounce filter (`setDebounce`): sliders show their value at once and the keyboard gets the newest.
  - *Key bounce filter* (`typing/Debounce.tsx`, when `keychron.hasDebounce`): the wait in ms and how it waits, "React
    at once" or "Wait until steady" (the other five types under More options), each with what it does.
  - *Snap Click* (`typing/SnapClick.tsx`, when `keychron.hasSnapClick`): the pairs in use as two keycaps with the
    rule as a `Select` ("The last one pressed wins", "Both down cancel out", "A always wins" …) and its explanation,
    and a remove button; then "Add a pair" with ready-made pairs (A and D, W and S, the arrows) and "Other keys…",
    where each key is pressed on the keyboard (`ui/KeyCapture.tsx`; ordinary keys only).
  - Plugin panels for `'typing'` follow, one `Card` each. Last, "Reset all typing settings…"
    (`typing/ResetSettings.tsx`) asks in a danger `Dialog` and calls `deviceStore.resetSettings`.
- **Test** (`Test.tsx`, `test/`): full height, with its own picture (no layer stack; labels follow the active
  layer). "37 of 90 keys seen" with a bar and "Start again"; a key is lit while down and stays marked once seen
  (`KeyboardPicture`'s `seen`, in `--key-bg-seen`; a held key is `--key-bg-pressed`, light in the light theme so the
  widget's dark label reads on it). Total: the picture's physical keys (`matrixKeys`; the K15 Max
  has 90), and beside it "1 of 2 knob turns"; "Every key works" needs both. Two sources, combined:
  - the browser's key events (`usePressedKeys`), always: only keys that type something (letters, media and
    browser keys such as Volume Up: `keycodeOfEvent` in `shell/pressed-keys.ts`), only while the window is in
    front (the page says so when it isn't). While the page is open it keeps keys without Ctrl or Win from doing
    their browser job (the arrows, Page Up / Down, Home, End, Space and Enter away from a control, Backspace, the
    function keys, Alt, the menu key), outside dialogs and text fields; Tab and Shift + Tab still move the focus and
    Enter or Space still press the focused button or link, so the page can be used and left from the keyboard
    (`test/keep-keys.ts`, `keptOnTestPage`; a note on the page says so). Every key still counts as seen. It can't
    stop media keys changing the volume, and doesn't try;
  - the keyboard's switch matrix (`device/useMatrix.ts`, shared with the Keys page's "Press a key", →
    `deviceStore.watchMatrix`, one poll loop for every watcher) while unlocked: every key,
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

  Seen keys show by more than their tint: `seen` also outlines them in `--key-edge-seen`, 3:1 against a key not seen
  yet in both themes. Once no more than a quarter of the keys is left, "Not seen yet: F5, Insert and Right Ctrl."
  under the picture names them, up to 20 then "and 7 more", with knob turns still to check (`test/not-seen.ts`): by
  what a key does on the layer shown (the base layer's where it does nothing there, "the key at row 3, column 5"
  where neither), in the picture's words where the description is only QMK's name ("Macro 1").
- **Device** (`Device.tsx`, `device/`): full height, no stage; two columns from 56rem (like Settings).
  - *Back up and restore* (`device/Backup.tsx`, `device/Restore.tsx`): "Save a backup" downloads the backup file
    (see "Backups") once every part has been read, and says which parts are missing if some couldn't be read.
    "Choose a backup file…" opens a backup or a Vial file and goes through the restore steps in place: a refusal
    with the reason (another keyboard, keys wired differently, not a backup); or the file's name and date, any
    warning (same model, other firmware), the list of what will change in words (`describePlan`), marked "needs
    unlocking" where that applies with "Unlock first…", and what the file holds that this keyboard can't take.
    Once "Unlock first…" has unlocked the keyboard, the plan is worked out again; restoring still waits for
    "Restore…". "Restore…" asks in a danger `Dialog` that lists the same lines; then a progress bar, then what was
    restored, what failed (with the error), what was left out because the keyboard is locked (with "Unlock…", which
    after unlocking goes back to the review of the same file), and that Undo takes back the keys and knob. A file that already matches says so. *Vial files* (a `Disclosure`): "Save a
    Vial file".
  - *Wireless and sleep* (`device/Wireless.tsx`), only when `keychron.hasWireless`: the battery (through the
    receiver), and "Lights off after" and "Sleep after" as choices (`BACKLIT_CHOICES`, `IDLE_CHOICES`, plus the
    keyboard's own value if it is another); a choice that would put sleep before lights-off is disabled. A click
    is `deviceStore.setWirelessTimers`.
  - *Start over or update* (`device/StartOver.tsx`), its two actions under More options (`device-more`):
    - "Reset to defaults…" (keymap reset): a danger `Dialog` listing what goes back to the firmware's own (every key
      on all layers, the knob, the typing settings with the swapped and disabled keys, and the kinds of multi-tap
      keys, chords, replacements and repeat rules the keyboard has), an "Empty the macros too" box (unticked: the
      macros stay), what stays (lighting, key colours, zones and the Caps Lock light, layer and macro names, and the
      Keychron settings the keyboard has), that Undo can't bring it back, and "Save a backup first" (the Backup
      card's `saveBackup`). Then `deviceStore.resetKeymap({ macros })` and a line saying it is done. Neither reset
      needs unlocking, so the box is offered locked too (see "Changing things on the keyboard").
    - "Restart for a firmware update…" (bootloader): disabled through the receiver with the reason (firmware goes on
      over the cable). The dialog says the keyboard stops typing until new firmware is put on it or it is unplugged
      and plugged back in, and that the app loses the connection; locked, its button is "Unlock and restart…", which
      opens the unlock dialog (`openUnlock`) and goes on by itself once unlocked. Then
      `deviceStore.restartToBootloader()`; the app ends in its ordinary disconnected state. A firmware without the
      command, or no answer, is said under the button.
  - *About this keyboard* (`device/KeyboardInfo.tsx`): name and maker, connection, firmware version
    (`device/firmware.ts`: "v1.1.2 1970-01-01-00:00:00" reads "1.1.2"; the date only when it is a real one),
    layers, keys and knob, lock state, and how many macros, tap dances, combos, key overrides, alt-repeat rules and
    QMK settings it has room for. *Technical details* (a `Disclosure`): USB IDs (and the receiver's), Vial keyboard
    ID, protocol versions, Keychron feature bits, the raw firmware string, matrix size, layout options, feature
    flags, macro memory, QMK setting IDs, lighting, and the transport's request counters, refreshed every second.
- **Shortcuts & macros** (`Shortcuts.tsx`, `shortcuts/`): full height, no stage (the editors need the room, and
  the keys a shortcut is on are listed and linked instead). A list on the left and the one picked on the right, two
  columns from 42rem; no tabs. The page's own addresses (`shortcuts/route.ts`): `#/shortcuts/macro/1` opens Macro 1,
  likewise `multi-tap/N`, `chord/N`, `replacement/N` and `repeat/N`, with the number shown on screen. Without a
  number (`#/shortcuts/multi-tap`, `shortcutKindHref`) it opens the first slot of that kind with nothing saved and
  no draft, in Add's order (`shortcuts/first-free.ts`; number 0 last), replacing the address so Back skips it
  (`replacePath` in `shell/router.ts`); with none free it shows that kind's section, scrolled to and above the fold.
  Links that mean "set one up" use these (Tap or hold's "multi-tap key", the palette's "Set up on Shortcuts &
  macros", Typing feel's chords, the help topics' "where"); links to a given entry keep its number.
  - *Numbering*: macros and multi-tap keys carry QMK's own number: "Macro 1" is `M1` (Keychron keyboards map the
    keys printed M1 – M5 to QMK's M1 – M5), "Macro 0" is `M0`, "Multi-tap key 1" is `TD(1)`; `macro/0` and
    `multi-tap/0` address slot 0. Slot 0 comes last wherever they are listed (here, the Keys palette), and "Add"
    takes the lowest free number from 1, slot 0 only when every other is taken (`numberedSlots`, `firstFreeSlot`,
    `macroTitle`, `tapDanceTitle` in `device/keycodes.ts`; tests pin the rule). Macro names are kept per QMK index,
    so a stored name or a backup's `macroNames` stays with its macro. Key chords, shortcut replacements and repeat
    rules have no number of QMK's that shows anywhere: they count from 1 ("Key chord 1" is the first slot).
  - *The list* (`shortcuts/ShortcutList.tsx`): one section per kind: Macros first; then, in the usual order, each
    other kind (Multi-tap keys, Key chords, Shortcut replacements, Repeat rules) that has an entry in use or a draft
    or whose editor is open; the kinds with none of that under *More options* (closed until opened, remembered). An
    unused kind comes up when its editor opens (Add, or an address), so saving its first entry doesn't move the list.
    Each section has its name (a larger heading), help, QMK name and "2 of 16 used", and "Add", which opens the next
    free slot; a line divides it from the section above, and its entries hang under it, indented on a rail. It lists
    only the slots in use, being edited or open, so 80 slots stay a short list: each with its title ("Macro 1" or
    the user's name, "Key chord 3"), QMK's name where it has one (M1, TD(1)), "Not saved" while it has a draft, how
    many keys run it (macros, multi-tap keys), and a one-line summary (`shortcuts/describe.ts`: "Types
    “hello@example.com”", "J + K together → Escape", "Shift + Backspace → Delete", "Tap: Escape · Double tap: Caps
    Lock", "After Ctrl + Z → Ctrl + Y", "(off)" for one turned off). Macros also show their shared space as a bar
    ("Room for about 863 more characters · 63 of 926 bytes used").
  - *The other editors* (`shortcuts/EntryEditor.tsx` with `ChordEditor`, `OverrideEditor`, `TapDanceEditor`,
    `RepeatEditor`): a title ("Key chord 3", "Combos"), saved or "Not saved yet" with Save to keyboard, Revert and
    what stands in the way (`entryProblem`; "Unlock to save…" only when it holds QK_BOOT where the firmware checks,
    and it saves by itself once the unlock completes;
    `shortcuts/SaveBar.tsx`, shared with the macro editor; edits made while a save is on its way stay a draft),
    a sentence or two on the idea and a "Try: …" button that fills in a ready example, then the fields, More
    options, and "Clear this …". A key is keycaps, its name and "Change…" (the Keys page's palette with Ctrl, Shift,
    Alt and Win to tick); optional ones can be removed. Modifiers are Ctrl, Shift, Alt and Win checkboxes meaning
    either side; left and right apart only under More options. A saved entry holding something the keyboard won't
    do (a replacement it can't send) shows the problem in red even unchanged, and can't be saved as it is.
  - *What each picker offers* (`device/sendable.ts`, `KEY_USES`, `groupsFor`, `canSend`; each with the vial-qmk
    function it is read from): what the firmware runs in that place and nothing else. A chord's output, a multi-tap
    key's four keys, a repeat rule's "sends" and a macro's "Tap a key" step go through the firmware's whole key
    handling, so they offer every group of the Keys page, the less common ones and "More keys" included (two-byte
    keycodes travel in a macro as Vial's `VIAL_MACRO_EXT_*` steps on protocol 2 and later). Left out for sense,
    not ability: multi-tap and repeat keys there, and macros too in a macro step. "Hold a key down" / "Let a key
    go" offer the everyday groups, typing helpers and international keys (a swap or restart held does what a tap
    does). A chord's own keys and the key a repeat rule follows are what keys on the keyboard send: the everyday
    groups. A shortcut replacement's trigger and replacement are ordinary keys only (up to `0xFF`, the replacement
    with modifiers up to `0x1FFF`): vial-qmk registers them with `register_code(uint8_t)`, so lighting, "This
    keyboard", macro, layer and the less common keys are not offered, and `entryProblem` names one a saved entry
    holds. The pickers ask the same `paletteFeatures` as the Keys page for the feature switches.
    - *Key chord*: the keys are clicked on a small picture of the base layer (marked once in the chord, a click
      again takes one out), with each as a keycap and an × beside it; a chord holds what those keys send there (J,
      K), not their positions, so it follows a key that moves. Then what it sends. More options: a key from the
      palette, for one that isn't on the base layer. Works on its own once saved; the timing is a typing setting.
    - *Shortcut replacement*: hold (modifiers), and press (key), to send instead (key), let go of while sending
      (modifiers), on / off. More options: the three modifier sets left and right apart (must be held, must not be
      held, let go of), the layers it works on, and the six option flags in words.
    - *Multi-tap key*: tap, hold, tap twice; More options: tap then hold, and its own hold time (ms, with
      150 – 300 ms choices). "Runs when you press" lists the keys with its TD(n), as for macros.
    - *Repeat rule*: after (key), the repeat key sends (key), on / off; More options: modifiers it still applies
      with, both ways, left and right the same, and fallback for every other key. "Runs when you press" lists where
      the alternate repeat key (QK_AREP) is.
  - *The editor* (`shortcuts/MacroEditor.tsx`): the name (an inline field; names live in the browser per keyboard,
    `shell/layer-names.ts` `renameMacro`), whether it matches the keyboard or is "Not saved yet", and while it isn't:
    "Save to keyboard" (or, locked, "Unlock to save…", which opens the unlock dialog and saves by itself once the
    unlock completes; cancelled or not completed, nothing is saved and the draft stays), Revert,
    what stands in the way (steps to fix, no room, locked). "Runs when you press": the keys and knob turns with this
    macro, as layer and key ("Windows: the M1 key"); a click shows that key on the Keys page (`stage.showLayer`,
    `stage.select`), then a quiet "Put it on another key…"; none: "Put it on a key…" and where else to find it.
    Both open the Keys page armed with this keycode (`keys/arming.ts`, `armKey`; `shortcuts/Uses.tsx`, also for
    multi-tap keys and the alternate repeat key): a card says "Click the key that should run Macro 1" (by its
    name), on which layer, and with a hint when the shortcut is empty or has unsaved changes (allowed, as from the
    palette: the key does nothing, or runs what the keyboard holds, until saved), with Cancel. The stage stops
    following the keyboard's layer while it waits, and nothing is selected, so the next key or knob direction
    clicked is selected and gets the keycode through `deviceStore.assign` (one undo step); the inspector then says
    "Macro 1 is on it now. It was A; Undo, at the bottom, puts that back." Esc, Cancel or leaving the Keys page end
    it without assigning. Then the steps
    (`shortcuts/StepRow.tsx`), numbered, each edited in place, with move up, move down and remove: *Type text* (a
    field), *Tap a key* (keycaps and the key in words; "Change key…" opens the Keys page's palette with Ctrl, Shift,
    Alt and Win to tick, `shortcuts/KeyPicker.tsx`), *Wait* (seconds, with 0.05 – 1 s choices); under *More
    options*, *Hold a key down* and *Let a key go*, with why. A step's problem shows under it in red
    (`stepProblem`). *Record what I type* (`shortcuts/Recorder.tsx`) and the bytes this macro takes against the
    room left close the card.
  - *Drafts* (`shortcuts/drafts.ts`): an edit is a draft per keyboard, kind and slot, kept outside React, so leaving
    the page and coming back finds it; a draft equal to what is saved is dropped (two empty entries count as equal,
    whatever their other fields; an empty slot is edited from the defaults: 200 ms, every layer). While any draft exists the browser
    asks before the tab is closed or reloaded. Navigation inside the app is never blocked.
  - *Recording*: while recording, key events in the window are captured (and kept from doing anything else) and
    turned into steps by `stepsFromRecording`: a press and release is a tap, keys tapped with only modifiers held
    become shortcuts (Ctrl + C), runs of printable keys become text (US layout, as the firmware types it), anything
    else stays hold and let go; keys still held at the end are let go. "Keep the pauses as waits" keeps gaps over
    150 ms. Esc stops it (and is never recorded: an Esc step is added with "Tap a key"), as do Stop recording and
    leaving the window; the focus then goes back to "Record what I type". Fn and layer keys, and shortcuts Windows or the
    browser keep (Alt + Tab, Ctrl + W, the Windows key), can't be recorded.

## Help and the tour

**Topics** (`help/topics.ts`): each has a title, QMK's name, one to three paragraphs, an example, a documentation
link, `where` (the places in the app it is about, as addresses: `#/keys`, `#/shortcuts/chord/1`, `#/typing/tapHold`;
the Typing feel page scrolls to the group named after `#/typing/`) and `related` topics. A layer named in a text is
written `{layer:N|Generic name}` (`help/text.ts`): the connected keyboard's name for layer N, or the generic name
with none, so the Help page reads right offline.

**The guide** (`help/guide.ts`) puts every topic in exactly one group, in reading order: Getting started; Keys and
layers; Shortcuts & macros; Lighting; Typing feel; Testing; Device: backups and the keyboard; Firmware and QMK
words. `GUIDE_ONLY` names the few topics no "?" opens (Caps Word, Layer Lock, "Two names for everything"); the tests
check that every other topic is opened somewhere in the app and that every topic is in the guide. Every typing
setting has help: `FIELD_HELP` (`pages/typing/help.ts`) gives a setting its own "?" where a topic other than its
card's explains it (the tap-or-hold settings past the everyday one, `typing-hold-decision` and
`typing-tap-hold-more`); the rest are explained by their card's topic (`GROUP_HELP`), which a test checks. **The glossary**
(`help/glossary.ts`) maps the words other apps and guides use (QMK, Vial, VIA, keycode, tap dance, combo,
KC_TRNS, EEPROM, bootloader, N-key rollover …) to the app's name and topic.

**The Help page** (`pages/Help.tsx`, `pages/help/`), offline as well: a list at the left (search, "Start here",
the groups, the glossary; each group's title is a filled band (`bg-band`) that stays at the top of the list while
its topics, slightly indented, scroll under it, and the open topic is scrolled into the list's view) and the topic at the right, each column scrolling on its own; narrower than 42rem the
list and the topic take turns ("All topics" goes back). Addresses: `#/help` (the overview: "Take the tour", "Read
Getting started", the groups as tiles), `#/help/<topic>`, `#/help/glossary`, and `?q=…` after any of them to start
with a search. A topic shows its text, "Where this is in the app" as links, related topics, and the previous and
next topic in reading order; opening one moves the focus to its title. **The search** (`help/search.ts`) wants every
word of the query in a topic's title, QMK name, text, example or a glossary line pointing to it; titles and QMK names
weigh most, so "MO", "LT", "tap dance", "combo", "KC_TRNS" or "debounce" find the friendly topic first, and a query
that is one of a topic's names (its title, a part of its QMK name, a glossary term) puts that topic first. Variants
are handled there, in one place: US spellings ("color", "gray"); hyphen, space and joined forms ("mod-tap", "mod
tap", "modtap"); codes with any number ("TD(1)" finds "TD(0)"); and words of three letters or fewer match only whole
words, plurals included ("mac" finds "Mac", not "macro"). Each result shows its group and the passage where the words are, marked
(`help/Highlight.tsx`), and the topic opened from it is marked too. Nothing found: suggestions to click and the
glossary.

**The tour** (`help/tour.ts`, `shell/Tour.tsx`, `ui/Spotlight.tsx`): six steps, each on a page and pointing at a
`data-tour` marker: the stage (`stage`, Home), the Keys page under it (`keys-page`), the status line (`status`), the
page title's "?" (`page-help`), the sidebar's pages (`nav`; its list shows each page's icon beside the name, so the pages can be found in the sidebar with icons only), the backup card (`backup`, Device). The coach mark
(`Spotlight`) draws an accent ring round the target and dims the rest lightly; clicks go through, so the app stays
usable. Its card has the step count, a sentence or two, Skip tour, Back and Next (Done on the last), and sits beside
the target where there is room (`ui/coach-placement.ts`); with no target found it is centred. It follows the target
as the page scrolls or resizes (measured every 250 ms and on resize and scroll), and a target in the lower half is
held by its distance from the bottom. Focus goes to Next at each step (to the card while Next waits); the arrow keys
move back and forth inside the card; Esc skips, unless it is closing the help panel, a dialog or a text field; when
the tour closes, the focus goes back where it was. There is no movement animation. With no keyboard connected
the tour shows "First, a keyboard" at the connect prompt on Home, with Next disabled, and carries on when one is in.
On the demo keyboard the first step says to click a layer instead of holding Fn.

- It starts by itself once: `main.tsx` calls `armTour(params)`; with no option at all in the address and the tour not
  yet seen, it waits until a keyboard is in while Home is shown. Taking it to the end or skipping it is remembered in
  the browser (pref `tour-seen`). Any address option (`?demo`, `?theme` …, as screenshots and demo links have) keeps
  it away, so screenshots of other pages never show it; `?tour` / `?tour=3` open it regardless.
- Again from the Help page's overview and from Settings ("Take the tour").
- Tests render `<Shell />` without `main.tsx`, so the tour never starts in them unless a test arms or starts it.

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

## The keyboard stage and selection

Pages with `stage` get the stage above them: the layer stack and the keyboard picture, with the keys held down
shown pressed (`usePressedKeys`). Its state lives in `src/shell/stage-store.ts`, outside React, so moving between
stage pages keeps the layer and selection:

- `useStage()` → `{ follow, layer, selection }`. `shownLayer(state, liveLayer, layerCount)` is the layer the
  picture shows: the keyboard's active layer while following, otherwise the one picked.
- Clicking a layer shows it and turns following off; the toggle turns it back on. The toggle is only there where the
  keyboard reports its layer (Keychron's `0xA3`); elsewhere the picture shows the layer picked, and keys typed light
  up as worked out on layer 0 (`NO_LAYER` in `pressed-keys.ts`, as on the Test page). A double click or the pencil
  renames a layer (`renameLayer`); the names live in the browser per keyboard (`layer-names.ts`).
- `stage: 'select'` makes keys and knob directions clickable. A click sets `selection` (a key's row and column,
  or a knob and direction, without the layer); Esc clears it.
- **Without a mouse** (`ui/usePictureKeys.tsx`, `ui/picture-keys.ts`): wherever the picture has an `onSelect` (the
  Keys stage, a key chord's picture, Lighting's key colours and zones) it is one Tab stop, a list box. The arrow keys
  move to the nearest key that lies that way by where the keys are drawn (each key's middle, rotation and the chosen
  layout options included; being off to the side counts twice as much as distance ahead, and a key must be at least
  0.4 of a key ahead, so slanted rows and split halves read as a person would point), Home / End go to the first and
  last in reading order, Enter or Space picks as a click would; Esc is left to the page. Knob directions are among
  the keys, except knobs the firmware keeps ("Fixed"), which are hidden from it. The widget is vendored, so after
  each render the hook puts `role="option"`, an id, a name ("Escape, row 1, column 2"; "Knob turned left: Volume
  Down"; the picture's words where the description is only QMK's name, "Macro 1") and `aria-selected` on its key
  groups, and the box carries `aria-activedescendant`. The key the arrows are on gets a ring of its own (an outline
  in `--content` with a `--card` halo, shown only after keyboard focus or an arrow), apart from the selected key's
  fill. `clickable={false}` leaves clicks to `PaintSurface` (painting), `picked` marks several keys (a chord),
  `describeKey` adds to a key's name (its colour, its zone). A picture without `onSelect` takes no Tab stop. A page reads `useStage().selection` and turns it
  into a slot with `toSlot(selection, shownLayer(...))` for `deviceStore.assign`. On `stage: 'view'` pages the
  picture is not clickable and no selection is drawn, but the selection is kept for when the user comes back.
- A different keyboard connecting (or none) resets the stage.
- **Labels**: the picture (`ui/KeyboardPicture.tsx`, everywhere it is drawn) uses the keycode tables' labels, except
  where those are only QMK's names (`ui/picture-labels.ts`): a macro reads "Macro 1" (M1), a multi-tap key
  "Multi-tap 1" (TD(1)), each on two lines; a layer key reads its kind's short word over the layer's name, as the
  Switch layer sentences say it ("Hold" over "Fn2" for MO, "Hold/tap" for TT, "Toggle", "Next key", "Switch to",
  "Base"; "Hold +Ctrl" for LM; "Base, kept" for QMK's PDF, which the app names but doesn't offer, as a
  Mac / Windows switch sets the base layer at every start; a long name on two lines); and a tap / hold key is split as the widget draws such
  keys, the hold above ("Ctrl", "Fn2") and the tap below ("Esc"); a knob direction gets the same text, tap above
  hold. Layer names are the connected keyboard's (`shell/layer-names.ts`; `KeyboardPicture`'s `layerNames` overrides
  them), "Layer 4" where there is none. Keys go to the widget's `labelOverrides`; for knobs, which have none, the
  text takes the keycode's place.
- **Default layer names** (`knownLayerNames`, `defaultLayerName` in `shell/layer-names.ts`): what the keyboard's
  keymap says each layer is for, where the app knows it, otherwise "Layer n". It knows Keychron's (and Lemokey's)
  Vial keymaps in vial-qmk, from the order of each keymap's `enum layers` (`MAC_BASE` "Mac", `WIN_FN` "Windows Fn",
  `_FN2` "Fn 2", `BASE` "Base"; an identifier like `L3` says nothing and stays "Layer 3"). The table,
  `shell/keychron-layers.ts`, is generated by `node scripts/keychron-layers.mjs [path to vial-qmk]` (default
  `../vial_qmk`); run it again after vial-qmk is updated. It is looked up by the Vial keyboard ID (exactly that
  keymap; the same on the cable and through a 2.4 GHz receiver, as it is read over Vial), then by the model in the
  keyboard's definition (`vendorId:productId`, also read over Vial: a keymap of the same model built elsewhere, such
  as the K15's ripple keymap, has its own Vial ID), then, on the cable only, by the link's USB IDs (a few
  definitions, Keychron's R series, carry none; a receiver's IDs are its own). A model whose keymaps disagree is
  left out. Layers past the table's (the ripple keymap's fifth) are "Layer n". 313 keymaps, 310 models.
- **Height** (`stage-size.ts`, applied as CSS in `Stage.tsx`): the stage shares the main area between the page
  title and the status line with the page. Left alone it is as tall as the picture wants at this width (the picture
  shrinks with the width and never grows past its own drawing size), at most half of that shared space, but never
  so little that the keys get smaller than 24 px (`LEGIBLE_KEY`, worked out from the picture's own size and the
  widget's 1u, so it holds for any keyboard): in a small window half can be too little. The picture
  fits the box it is given, width and height, keeping its shape (`KeyboardPicture`'s `fit`). The handle on its
  bottom edge (`ui/ResizeHandle.tsx`) makes it shorter or taller by dragging (mouse or touch) or with the
  keyboard (arrows, Page Up / Down, Home / End; it is a focusable separator); double-click or Enter goes back to
  automatic. The chosen size is remembered in the browser as a share of the shared space (pref `stage-size`), so it
  follows the window. The handle can go below the legible size, but never below room for a 120 px picture (and, with the layers as a row above it, the
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

## Changing things on the keyboard

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

Keychron's own lighting (`0xA8`, `device/keychron-rgb.ts`; the firmware is `../vial_qmk/keyboards/keychron/
common/rgb/`), shown on keyboards whose Keychron features include it (`0xA2` bit 0x80). The store reads it with the
other Keychron data into `DeviceState.keychron.rgb`: the LED count, the LED under each key (`keyLeds` keeps the rows
and columns the keyboard has; the vendored read asks for 8 rows, and the store reads every row again where the matrix
has more, see "Other keyboards"), the colour of every LED, the per-key
style, the zone of every LED and each zone's effect slots.

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
- **Lock lights** (`0xA8 0x03` / `0x04`, `os_indicator_config_t`, read at load into `rgb.osIndicatorConfig`): which
  lock lights the keyboard has (bits Num, Caps, Scroll, Compose, Kana; the K15 Max has only Caps Lock), an off bit
  each, and one colour for all (hue, saturation, brightness; the firmware raises a brightness under 128 to 128). A
  set is shown at once and saved by `0xA8 0x02` with the rest, so `setLockLights` saves after the same pause.
  Firmware default: all on, white. A switch and a colour drag are separate undo steps; quick colour changes merge.
  How the light is drawn is the firmware's: stock Keychron lights the key steadily; the K15's ripple keymap flashes
  it with the hue and saturation at full brightness and honours the off bit.
- **Restore** writes them back (`keyColours`, `zones`, `lockLights` in the plan), from the Keychron state the backup keeps, and
  only on a keyboard with as many lights and zones; Snap Click too (`snapClick`).

## Typing settings

Vial's "QMK Settings" are numbered (`qsid`) and the keyboard lists the ones its firmware has: 26 on the K15 Max
(1-7, 9-17 because mouse keys are on, 18-27; `../vial_qmk/quantum/qmk_settings.c`). The store reads them at load
(`DeviceState.settings`, each as the bytes the keyboard sent).

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
- **Key bounce filter** (`setDebounce`, Keychron `0xA7 0x06`): a type (`DEBOUNCE_TYPES` in
  `device/keychron-typing.ts`, Keychron's numbering 0-6) and a time in ms (0-255; the asymmetric type keeps at most
  127). Saved by the keyboard at once.
- **Snap Click** (`setSnapClick`, `0xA7 0x09`, then `0xA7 0x0A` to save, since a set only changes the running
  table): 20 slots on the K15 Max, each a rule (`SNAP_CLICK_RULES`: 1 last pressed wins once, 2 last pressed wins, 3
  first key wins, 4 second key wins, 5 cancel out; 0 an empty slot) and two plain keys (8-bit keycodes).
  `snapClickProblem` refuses a pair the firmware would (a rule without both keys) and one with the same key twice.
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
appear nowhere and dead keys show as plain characters. Keys the map leaves out keep their US names. A palette tile keeps its US legend (`usLabel`) and description for the search. The Shell,
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
- **Write order** (`sendMacroBuffer`, used by saves, undo and restore alike): the buffer's last byte is set to 0xFF
  first, then the changed pieces go out, then the last byte gets its real value (0). vial-qmk plays no macro while
  that byte isn't 0 (`dynamic_keymap_macro_send`), so a write that stops part-way leaves macros that don't run, not
  a mixture where old macros play on the wrong M-keys. After a failed save the store reads the buffer back, shows
  it, and says `MACRO_INTERRUPTED`; `macrosHalted(buffer)` tells a half-written buffer, the macro page then offers
  to save again, and `saveMacro` writes even an unchanged macro while the buffer is halted.
- `macroUses(keyboard, index)` lists the keys and knob turns whose keycode is that macro (`macroKeycode`: QMK's M0 …).
- The names users give macros live in the browser per keyboard, by QMK index (`shell/layer-names.ts`:
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
everything else the Keychron commands returned; restore takes Snap Click, the key colours, the lighting zones and the lock lights
(`rgb.osIndicatorConfig`) from it (`backupContents`; a damaged part is left out, not the whole file). `parseBackup` checks
every part and throws a `BackupError` that says what is wrong ("The backup file is damaged: layer 1, row 0 of the
keymap."); a higher `version` is refused with "made by a newer version of Layerworks". Every value is range-checked
there, before anything is written (keycodes 16-bit, lighting speed and colour bytes).

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
- **The review** (`pages/device/Restore.tsx`) shows `describePlan`'s lines, then a red box with what the plan would
  newly cause (`planRisks` → `device/risks.ts`, `keymapRisks`: the firmware update key, the memory-wiping key
  `QK_CLEAR_EEPROM`, a base layer left with fewer than 10 letters, a layer that no key on a base layer reaches any
  more, a layer turned on and left on with no key to leave it), and "Show the changes (n)", a `Disclosure` listing
  every key, knob turn, macro (its steps in a line) and entry that changes (`planItems`). The Keys inspector asks
  with the same `keymapRisks` before a single change that would cause one of them.
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

**Vial files** (`device/vil.ts`): `exportVil` writes vial-gui's format (keys and knob by QMK name, macros as
action lists, settings as numbers, the uid as a bare number) through Pipette's vendored `vil-compat.ts`;
`parseVil` reads one back, macros encoded for the connected keyboard's Vial protocol. A Vial file has no lighting,
Keychron settings or layer names, so restoring one leaves those alone. The vendored converter passes numbers through
and turns unknown key names into 0, so `parseVil` checks the file first (`vilProblems`): a value the keyboard's
commands can't hold (a keycode outside 0–0xFFFF or not a whole number, a tapping term past 16 bits, mods or options
past a byte, layout options or settings that aren't numbers) refuses the file with a line saying where; a key name
this keyboard doesn't know (another firmware's own keys, `USER13` …) leaves that place alone and says so
(`contents.notes`, shown with `plan.ignored`).

## Demo keyboard

`src/demo/` puts a K15 Max inside the page: the same requests get the same kind of answers, and changes last
until the page is reloaded. It is for trying and screenshotting the app with nothing plugged in. Refresh its
data with `node scripts/demo-data.mjs` after the firmware definition or the keymap backup changes. Its lighting
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
`../vial_qmk`): the keymap's Vial definition (vial-qmk's data, GPL-2.0-or-later, named in the file and in the
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
- **Loading is staged.** Definition, keymap and knob come first, so the picture appears quickly; macros, entries,
  settings, lighting, lock state and Keychron state follow in the background (`DeviceState.loading`). A part that
  fails is listed in `DeviceState.failed` and the rest still loads.
- **Capabilities** are rebuilt as parts arrive. `capabilities.check('macros')` returns whether it's available and,
  if not, a sentence saying why. `hasCommand` answers false for now: nothing registers detected commands yet (spec
  section 9).

## Other keyboards

The app is built on a Keychron K15 Max; these are the places where it adapts to keyboards that differ from it. Each
item names the difference, what the app does, where that is decided (one place, marked "Compatibility:" in the
code) and the test that covers it. Keep this list complete: an adaptation without a bullet here is a bug.

- **A page that throws on another keyboard's data.** Definitions hold what the K15's doesn't (Corne's `lighting` is an
  object). A page that throws shows "Something went wrong on this page" in its place, the rest of the app keeps
  working, and "Try again" closes remembered sections first. Decided in `shell/ErrorBoundary.tsx` (around the page
  area in `Shell.tsx`, around the app in `main.tsx`). Test: `shell/__tests__/ErrorBoundary.test.tsx`.

- **Keychron layer orders, and Keychron boards without a Mac / Windows switch.** Keychron's keymaps order their
  layers four ways (Mac pair first, Windows pair first, Mac and Windows bases first, number pads with Base and Fn).
  Default layer names come from each keymap's own order, "Layer n" where it says nothing and on every other keyboard.
  Decided in `knownLayerNames` (`shell/layer-names.ts`) from `shell/keychron-layers.ts`, generated by
  `scripts/keychron-layers.mjs`. Tests: `shell/__tests__/layer-names.test.ts` ("a Keychron board whose Windows layer
  is 1", "with the Windows pair first", "a Keychron number pad …", unknown keyboards).

- **Keyboards that don't report their layer** (every one without Keychron's `0xA3`). The stage lights typed keys as
  worked out on layer 0, and "Follow the keyboard" isn't offered. Decided in `reportsLayer` and `NO_LAYER`
  (`shell/pressed-keys.ts`). Test: `shell/__tests__/Stage.test.tsx` ("the stage on a keyboard that doesn't report its
  layer").

- **Backlight, underglow, an RGB matrix, or no lighting.** The palette's Lighting controls offer the keys that
  keyboard's lighting answers to, and none without lighting. Decided in `lightingKeysFor` (`device/keycodes.ts`), from
  the definition's `lighting` and the firmware's VialRGB flag (read as one kind by `lightingKind`). Test:
  `device/__tests__/lighting-keys.test.ts`.

- **A definition whose `lighting` is an object or a list** (Corne and six others write `{ "extends": "qmk_rgblight" }`,
  two `["qmk_rgblight"]`; 89 leave it out). The store reads it as one of a few known kinds, the name it holds (none
  when it names none, "other" for a name the app doesn't know), so nothing else meets the object; Technical details
  shows the kind with what was written beside it. Decided in `lightingKind` (`device/lighting-kind.ts`), which the
  palette's lighting keys use too. Tests: `device/__tests__/lighting-kind.test.ts`,
  `pages/device/__tests__/lighting-object.test.tsx` (on the demo Corne).

- **A definition without a name** (130 of vial-qmk's 857, e.g. kiserdesigns/splinter). The keyboard is called by the
  product name the browser reports (the firmware's USB descriptor; not through a 2.4 GHz receiver, whose name is its
  own), else "Keyboard", in the device card, Home, Device and the backup's name and file name. Decided in
  `keyboardName` (`device/keyboard-name.ts`), used by the store's load. Test: `device/__tests__/keyboard-name.test.ts`
  (on the demo Splinter too).

- **Firmware without Vial** (VIA, Keychron's stock firmware). Such keyboards offer the same raw HID interface, so the
  browser lists them, but answer Vial's commands "unknown command" (0xFF) or send them back. The app asks for the
  Vial keyboard ID first and, without a Vial answer, says plainly that the keyboard runs VIA firmware, not Vial, with
  a link to Vial's site (never "Failed to decompress keyboard definition"); the `connecting` help topic says so too.
  Decided in `answersVial` (`device/vial-firmware.ts`), called first in the store's load. Tests:
  `device/__tests__/vial-firmware.test.ts`, `shell/__tests__/ConnectPrompt.test.tsx`.

- **A knob the firmware doesn't let apps change** (built without `ENCODER_MAP_ENABLE`, e.g. lazydesigners/cloud,
  planck/rev7). Vial's knob commands then come back unchanged, which would read as made-up keys (0xFE03 and
  `layer << 8 | knob`). Such knobs are left out of `knobs` and `knobCount` (so nothing about them is shown, tested,
  undone, backed up or restored) and counted in `fixedKnobs`; the picture marks them "Fixed" and doesn't let them be
  picked, Keys and Device say why, and the `knob` capability's reason and help topic say so. Decided in
  `firmwareKeepsKnobs` (`device/knob-map.ts`), at the store's load. Test: `pages/__tests__/fixed-knob.test.tsx` (on
  the demo Cloud).

- **Firmware that never locks** (built with `VIAL_INSECURE`; in vial-qmk, vipad). It starts unlocked, ignores Lock and
  names no unlock keys. The device card, Home and Device say "Never locks" (with why) and offer neither Lock nor
  Unlock, and the store sends no lock, so nothing is ever refused as "locked"; the `unlock` help topic says so.
  Decided in `neverLocks` (`device/unlock.ts`): unlocked with no unlock keys. Test:
  `pages/__tests__/never-locks.test.tsx` (on the demo Vipad).

- **A switch matrix too big for the switch-matrix read** (`(cols / 8 + 1) × rows` over 28: era/sirind/klein_hs and
  klein_sd 10 × 16, bpiphany/frosty_flake 18 × 8, converter/adb_usb 16 × 8). VIA's read then answers with nothing.
  The app never reads it: the Test page and "Press a key" go by the browser, unlocked or not, say why, and offer no
  unlock for it; the `keyMatrix` capability gives the reason and the `test-keys` help topic says so. Decided in
  `matrixReadable` (`device/matrix.ts`), used by the capability, the store's poll and `useMatrix`. Test:
  `pages/__tests__/matrix-too-big.test.tsx` (on the demo Klein).

- **VialRGB the firmware reports but the definition doesn't name** (keyboards/vipad writes `{ "extends":
  "qmk_rgb_matrix" }`, rgbkb/mun2 "none", both built with `VIALRGB_ENABLE`). Firmware with VialRGB says so in byte 12
  of its keyboard ID reply; there the lighting is read and changed as VialRGB whatever the definition names, the
  palette offers its lighting keys, and Technical details says the firmware's word beat the definition's. Where
  neither names any lighting, Lighting says "no lighting the app can change" (its own lighting keys may still work).
  Decided in `firmwareHasVialRgb` and `lightingKind` (`device/lighting-kind.ts`; `KeyboardData.firmwareVialRgb`).
  Test: `pages/__tests__/firmware-vialrgb.test.tsx` (on the demo Vipad).

- **Keychron per-key lighting on a board with more than 8 matrix rows** (keychron/c100_8k, 10 rows). The vendored
  Keychron reload reads the LED map for rows 0 – 7 only, so keys below had no LED: they couldn't be painted in Key by
  key or put in a zone. Where the matrix has more rows, the store reads the LED map again for every row (at load and
  in the read-back after a failed Keychron write). Decided in `ledRowsMissed` (`device/keychron-rgb.ts`), used by the
  store's `readKeychron`. Test: `device/__tests__/keychron-led-rows.test.ts` (on the demo C100 8K).

- **Layout options** (278 of vial-qmk's 857 definitions draw alternatives: split Backspace or not, ISO Enter, bottom
  rows …, a group per label in `layouts.labels`). The keyboard keeps which choice it has as one number (VIA's layout
  options, read at load into `KeyboardData.layoutOptions`). Every picture (Keys and the stage, Home, Lighting's
  still picture and its painting, the unlock highlight) draws only the chosen layout: the vendored widget moves the
  chosen alternatives into the first one's place and leaves the others out, given the choices (`layoutOptions`).
  A stored value out of range for the labels, or a choice without keys, counts as the first choice, so a whole
  keyboard is always drawn. Counts follow the same keys (`matrixKeys`): the Test page's "N of M keys seen" (so it can
  reach "Every key works"), Device's "Keys", and Lighting's groups for colouring keys (no LED under an unchosen
  alternative counts, and "Rainbow across" spreads over the keys drawn). The **Layout** card on Keys, under the
  first card while no key is selected (beside the picture it changes), sets them in the definition's own words: a
  switch for a plain label, a list for a title and its choices (`layoutOptionList`). A change is written to the
  keyboard at once (VIA's `0x03 0x02`, read back if the write fails; `setLayoutChoice` in the store, the one group's
  bits changed, `withLayoutChoice`) and is one undo step per group; a selected key the new layout doesn't have is let
  go of. Backups keep the value as before; the restore review names what changes ("Layout: Bottom Row: Default",
  `layoutChangeWords`). Help topic `layout-options`. Decided in `layoutChoices` and `visibleLayoutKeys`
  (`device/layout-options.ts`). Tests: `device/__tests__/layout-options.test.tsx`,
  `pages/__tests__/layout-counts.test.tsx`, `pages/keys/__tests__/LayoutCard.test.tsx` (on the demo GH80-3000).

- **No knob, or several.** The Test page says "the knob" or "each knob", "it" or "them", decided in `severalKnobs`
  (`pages/test/knob.ts`); Keys says "one side of a knob", which reads right with any number. Tests:
  `pages/test/__tests__/knob.test.ts`, `pages/keys/__tests__/knob-words.test.tsx`.

- **Unlock keys other than Esc and Enter.** The unlock dialog names the keyboard's own keys; the `unlock` help topic
  gives the K15's Esc and Enter only as an example. Text only (`help/topics.ts`, `unlock`).

- **Firmware without any shortcut slots** (no tap dance, combos, key overrides or alt repeat). The Shortcuts page
  says there is nothing to set up instead of pointing at sections that don't exist. Decided in `hasEntrySlots`
  (`pages/Shortcuts.tsx`). Test: `pages/shortcuts/__tests__/Shortcuts.test.tsx` ("doesn't point at multi-tap keys
  and the rest where the firmware has none of them either").

- **Lighting the app can't change** (backlight, underglow, none). Home says "Keys change freely", not "Keys and
  lighting", and its second shortcut tile is "Make a macro or shortcut" instead of "Pick a lighting effect".
  Decided by the `lighting` capability (`device/capabilities.ts`), read in `pages/home/Status.tsx` and
  `pages/Home.tsx`. Test:
  `pages/__tests__/Home.test.tsx` ("Home on a keyboard whose lighting the app can't change").

- **Backups made on firmware that numbers keys differently.** A backup keeps raw keycode numbers; vial-qmk renumbered
  them with Vial protocol 6 (2023), and protocol 1 stores macros differently, so such a backup is refused with a
  pointer to a Vial file from that time (which names keys). Decided in `sameKeyNumbering`, used by `checkFit`
  (`device/restore.ts`). Test: `device/__tests__/file-checks.test.ts` ("a backup from firmware that numbers keys
  differently").

- **One unlock key, or three or more.** The unlock dialog says "Hold A" for one key, "Hold A and B together" and
  "both keys" for two, "all of them" for more (a firmware names up to 15). Decided in `holdUnlockKeys`
  (`shell/UnlockDialog.tsx`). Test: `shell/__tests__/unlock-keys.test.ts`.

- **No knob, or several, on the Device page.** Backup and Restore texts say "the knob", "the knobs" or nothing.
  Decided in `theKnobs` / `keysAndKnobs` (`pages/device/knob-words.tsx`). Test:
  `pages/device/__tests__/knob-words.test.ts` ("the knob in Backup and Restore texts").

- **The firmware update key on keyboards not made by Keychron.** When the firmware lacks the restart command, the
  Device page says to hold Esc on Keychron keyboards, and elsewhere the top-left key (QMK's bootmagic position) or
  the keyboard's instructions. Decided in `updateKeyHint` (`pages/device/StartOver.tsx`). Test:
  `pages/device/__tests__/update-key.test.ts` ("the key that reaches firmware update mode, by maker").

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
