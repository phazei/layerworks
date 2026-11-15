# Layerworks

A configurator for Keychron keyboards running Vial firmware
([tymon3310/vial-qmk](https://github.com/tymon3310/vial-qmk)), built to be usable without knowing QMK. It runs in
the browser (Chrome or Edge, over WebHID), on the cable or through the 2.4 GHz receiver.

The design is in the Alice-Keyboard project: `../docs/spec/layerworks.md`. What exists so far: the connection
layer, the shell (sidebar, keyboard stage, status line, help panel, themes) and a page for every section; Home and
Settings are built (see "The built pages"), most of the rest are still placeholders.

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
    keycodes.ts        key names, the palette's groups, shortcut and layer-key builders
    fake-keyboard.ts   a HidLink with no hardware and a small Vial keyboard behind it (tests, demo)
    useDevice.ts       the app's store and its React hook
    api.ts, index.ts   the public surface; pages, plugins and the shell import from here
  demo/              the demo keyboard: a K15 Max inside the page (k15-max.json, demo-link.ts)
  ui/                design tokens and shared components
    tokens.css         every colour, radius and shadow, dark and light
    controls.tsx       Button, IconButton, Toggle, Slider, Segmented, TextInput, Spinner, Badge, Checkbox,
                       SearchField, OptionButton (one of several choices, marked when current)
    layout.tsx         Card, Disclosure ("More options"), Dialog, Notice, HelpButton
    display.tsx        Facts / Fact (label over value), ActionTile (large shortcut link), ExternalLink (new tab)
    prefs.ts           what the app remembers in the browser (usePref)
    theme.ts           dark / light / system, applied as the `dark` class on <html>
    KeyboardPicture.tsx  the keyboard for one layer; wraps the vendored keyboard widget
    KeyTile.tsx        KeyTile (a palette key drawn like a keycap) and KeyCap (one key, not clickable)
  shell/             the frame around the pages
    Shell.tsx          the frame: sidebar, page title, stage, page, status line, help panel; picks the page
    Sidebar.tsx        app name, device card, pages grouped main / plugins ("Extras") / app
    DeviceCard.tsx     the connected keyboard: name, cable or 2.4 GHz, battery, locked, disconnect
    Stage.tsx          the keyboard stage: layer stack beside the picture, pressed keys, selection
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
                     a page's own parts in a folder beside it (home/, keys/, settings/, lighting/)
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
  container query; a window of about 1050 px), the layer stack becomes a row of chips above the picture.

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
  battery (on 2.4 GHz, when known), the layer in use by name, firmware version and lock state; four shortcut
  tiles (keys, lighting, backup, test); and what the keyboard can do, from `capabilities`
  (`home/features.ts` gives each feature its friendly and QMK name), with the missing ones and their reasons
  behind a `Disclosure`. With no keyboard it shows the connect prompt and three lines on what the app is for.
- **Keys** (`Keys.tsx`, `keys/`): click a key or one side of the knob on the stage; with nothing selected the
  page says so. The inspector (`keys/Inspector.tsx`) is two columns when it is wide (a container query), one
  when narrow. It asks "What should this key do?", says which layer it is on and, above the base layer, whether
  the key has its own assignment or falls through, and to what (`keys/describe.ts`, `fallThrough`: the layers
  down to the keyboard's base layer, then layer 0, as QMK does). "Now" shows the current assignment as a keycap,
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
    assignment lives there (nothing, transparent, or a code no choice builds, which is put in the field).

  Every assignment is `deviceStore.assign`, so it shows in the picture at once and Undo takes it back; the
  selection stays. A knob's direction 0 is counter-clockwise (left), 1 clockwise (right), as vial-qmk stores
  them. The palette's lighting keys are the shared `RGB_*` codes Keychron's keymaps use, not `RM_*`.
- **Settings** (`Settings.tsx`, `settings/`): theme; a name field per layer of the connected keyboard, with a
  reset to the default (the same names as the layer stack, `shell/layer-names.ts`); about: version from
  `package.json`, licence, and credits to Pipette (repo and commit from `vendor.json`), QMK, Vial and Lucide.
- **Lighting** (`Lighting.tsx`, `lighting/`): full height, no stage (the picture can't show the lighting yet).
  Left, the effects the keyboard lists (`capabilities.lighting.effects`) as tiles in groups (Steady, Moving, Rain
  and sparkles, Reacts to typing, Set per key or zone), each with a small moving preview in the chosen colour
  and speed (`EffectPreview.tsx`, `lighting.css`); Off and VialRGB Direct are not tiles. Right, staying in view:
  a "Lights on" switch, the current effect in words with its QMK name, and sliders for brightness (percent of
  the keyboard's maximum), speed, colour (rainbow track, swatch and colour name) and vividness. Turning the
  lights off sends effect 0; on again sends the effect remembered for this keyboard (`usePref`), and picking a
  tile while off turns them on. Plugin panels for `'lighting'` follow, one `Card` each. Without usable lighting
  the page shows the capability's reason instead.
  - `lighting/effects.ts` holds each effect's friendly name, description, group, preview, and whether it uses
    colour, vividness and speed, or the reason it doesn't, read from the firmware's effect code (sources in the
    file). A slider the current effect ignores is disabled with that reason under it.
  - Changes go through `lighting/latest.ts`: one `setLighting` at a time; while one is on its way only the newest
    of the rest waits, so a dragged slider never floods the keyboard and always ends on its last value. The
    sliders show the value at once, from what is still on its way.
  - A plugin can rename effects with `lightingEffects: { 41: { name, description } }` in its `definePlugin`, for
    firmware that puts its own effect in a standard slot (the K15's ripple is Solid Splash, VialRGB id 41).

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
`EDGE=<path>` points it at another `msedge.exe`.

## Changing things on the keyboard

- `deviceStore.assign(slot, keycode)` writes one key or knob direction, then updates the store. `undo()` and
  `redo()` write the previous or next value back. `DeviceState.writing` counts changes on their way;
  `writeError` holds the last failure.
- `deviceStore.setLighting(change)` sends the effect and its values at once and saves them to the keyboard 1.5 s
  after the last change.
- Nothing else writes yet.

## Demo keyboard

`src/demo/` puts a K15 Max inside the page: the same requests get the same kind of answers, and changes last
until the page is reloaded. It is for trying and screenshotting the app with nothing plugged in. Refresh its
data with `node scripts/demo-data.mjs` after the firmware definition or the keymap backup changes. Its lighting
is the real keyboard's: the 25 VialRGB effects the Vial build lists, maximum brightness 255, starting on Solid
Splash in indigo (`?demo-effect=` picks another). The test fake keeps its own small list (`RGB_EFFECTS`).

## How it talks to the keyboard

```
pages / plugins → device store → vendored protocol code → transport (request queue) → HidLink
                      ↑ layer changes ←──────────────────── unsolicited reports
```

- **One queue.** Every request goes through `Transport.request`, one at a time. The vendored protocol functions
  use it too (the store injects it), so nothing can overlap.
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

Unit tests sit in `__tests__/` beside the code. `src/device/__tests__/fake-keyboard.ts` provides a `HidLink`
with no hardware behind it and a small Vial keyboard to answer it, on the cable or through a receiver.

## Licence

GPL-3.0-or-later. See `LICENSE`, and `VENDOR.md` for the code that comes from Pipette.
