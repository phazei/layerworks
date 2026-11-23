# Spec: Layerworks, a keyboard configurator

Status: phases 1 to 7 are built; the plugin API's second level, the Ripple plugin and the firmware extensions are
deferred (section 12). This document is the intended design and is kept current as decisions are made. How each page
works, control by control, is in [pages.md](pages.md); the other documents are listed in [README.md](README.md).

Name: **Layerworks** (repo `layerworks`). Nothing else in keyboards carries the name (the other "Layerworks" are
3D-printing businesses and a Japanese WordPress company).

The choices here rest on research notes that are not part of this repo: a survey of what the existing apps offer,
a study of what Pipette code can be reused, and measurements on a K15 Max.

## 1. Goal

A configurator for keyboards running Vial firmware that:

- offers everything a Vial keyboard can change at runtime, which no single existing app does (rare key families
  are reachable by typing their QMK code rather than offered in the palette);
- can be used by someone who has never heard of a macro or a tap dance;
- is organised into a few self-contained sections in a left menu, with everyday options visible and advanced ones
  one click away;
- shows the keyboard live: the active layer and the keys being pressed;
- works on any Vial keyboard: layout, key names, counts and features all come from the keyboard's definition and
  capabilities, never from code written for one board. Keychron's extras (key colours and zones, the Caps Lock
  light, sleep timers, key bounce filter, Snap Click) appear on keyboards that have them;
- can be extended with keyboard-specific panels without changing the core (first: the ripple effect's settings in
  the owner's own K15 Max firmware). Anything that needs that firmware is optional and comes last.

The K15 Max (tymon3310/vial-qmk) is the only keyboard tested, so others are "expected to work", not "supported",
until someone tries them.

## 2. Non-goals

- Firmware without Vial: plain VIA builds and Keychron Launcher's protocol. Target: Vial protocol 6 with VIA
  protocol 9, plus Keychron's commands where present. Plain VIA keyboards (without lighting) are under
  consideration.
- Hall-effect features and anything else the firmware lacks.
  Launcher's "Keyboard Matrix Scanning Idle Time" is Hall-effect only. The USB polling rate is read where the
  firmware has it; the K15 Max's firmware has it switched off, so there is no control for it.
- Typing statistics, cloud sync, layout sharing, theme/language packs. They can come later as plugins.
- A desktop app for now. Browser first (Chrome/Edge, WebHID); nothing in the design may prevent a desktop shell later.
- Bluetooth. There is no raw HID path over it; the app works on the cable and the 2.4 GHz receiver.
- Flashing firmware, for now. The app restarts the keyboard into its bootloader; the flashing is done with other
  tools.

## 3. Decisions already made

| Decision | Why |
|---|---|
| New app, not a Pipette restyle or fork | Pipette's whole UI structure is the problem; its shell is what we'd replace |
| Reuse Pipette's non-UI code and its keyboard picture, copied in | 88 files run unmodified, with two small stand-ins (`VENDOR.md`) |
| Vial firmware only | Wider feature set than VIA; Vial's own commands for tap dance, combos, overrides, settings |
| Any Vial keyboard; Keychron's extras where the keyboard has them; extras needing the owner's own firmware optional and last | Useful beyond one keyboard; nothing breaks without that firmware |
| Browser first | No install; a first prototype proved it works over WebHID |
| GPL-3.0-or-later | Required by the reused code |
| No global simple/advanced switch | Per-section "more options" instead |
| Live keys: browser key events + matrix polling | Polling alone misses about a quarter of fast keystrokes |
| Own repo, not a fork of Pipette | Copying files into a different structure; nothing to merge |
| Keyboard stage on Home and Keys only; other pages draw their own picture | Each page's picture serves its job (colours, seen keys, chord keys), and editors get the room |
| Designed for 1280 × 800, usable down to 560 px wide (the sidebar collapses to its icons) | Laptop screens and narrow windows; Pipette's 1280 × 1024 minimum window is a complaint |
| Pages built on the demo keyboard and reviewed in the browser, without a mock-up pass | The owner reacts to real pages faster than to drawings |
| Unlock / lock in the sidebar's device card | Reachable from every page that may need it |
| Sleep timers on Device, not Lighting | They are about the keyboard's power, not its look |
| Macros and multi-tap keys carry QMK's number (Macro 1 is `M1`), slot 0 last; they are never moved or swapped | Keychron prints M1-M5 on keys that send QMK's M1-M5 |
| Macros and shortcuts are created on Shortcuts & macros and put on a key from there or from the palette | One place to edit them; the inspector stays a picker |
| Tap or hold builds mod-tap and layer-tap only, never a tap dance by itself | A hidden tap dance would hide what is going on |
| Lighting shows tile previews and a still picture, not a live animation on the picture | Enough to choose an effect |
| `PDF`, joystick, programmable buttons, MIDI and other rare families stay out of the palette (a typed code still works) | Most firmware lacks them; on Keychron boards the Mac/Windows switch sets the base layer at every start, so `PDF` does nothing lasting |
| Edits built in several steps are drafts until used or saved; everything else is written at once | Trying things doesn't fill undo or half-write a macro |
| Help texts are our own short descriptions with an example, linking to QMK's page for depth | Plain words first; QMK's docs stay one click away |
| Vial `.vil` is the only other app's file read | No other file worth importing so far |
| N-key rollover is hidden where the keyboard reports adaptive N-key rollover | The switch does nothing there; the help still explains it |

## 4. Repository

```
layerworks\
  src\
    vendor\pipette\      <- copied files, original relative paths kept, see VENDOR.md
    device\              <- link, transport, pushes, store, capabilities, unlock, keycodes, backup and restore
    demo\                <- the demo keyboard: a K15 Max inside the page
    shell\               <- sidebar and device card, keyboard stage, status line, help panel, unlock dialog, tour
    pages\               <- one file per section, its parts in a folder beside it
    ui\                  <- design tokens and shared components (button, slider, toggle, dialog, picture, ...)
    plugins\             <- the plugin API; the built-in sections register through it too
    help\                <- help topics, the guide's groups, glossary, search, the tour's steps
  docs\                  <- how it works inside (README.md is the index), this spec
  hardware\              <- read-only checks against the real keyboard (pnpm hardware)
  scripts\               <- vendor.mjs, demo-data.mjs, screenshot.mjs
  VENDOR.md, vendor.json <- source repo, commit, file list, and every local change with its reason
```

What is vendored: Pipette's keycode tables, layout parsing, protocol constants and commands (VIA, Vial, Keychron),
the definition's decompression, macro encoding, `.vil` conversion, and the keyboard picture with its tests. Not
vendored: Pipette's web transport (rewritten, see section 6), its hooks, shell, dialogs and key picker. The list is
`VENDOR.md`.

Rules for `vendor/pipette/`:

- Source: tymon3310/pipette-desktop, branch `vial-keychron`. The commit and the file list are in `vendor.json`;
  `scripts/vendor.mjs` checks the copies against that commit and re-copies them from a newer one.
- Vendored files are unmodified. Where one imports a Pipette file we don't want (the Tauri HID backend, the key
  picker), a small stand-in of our own sits at that path instead. If an edit ever becomes unavoidable, it is a
  small, marked change listed in `VENDOR.md`, so it can be re-applied after an update or offered upstream.
- The upstream tests of the vendored files are copied with them and run with ours.
- App code imports vendored code only through `device/` (protocol) and `ui/` (components), never directly from
  pages or plugins (an ESLint rule). That keeps a later swap or update local.

**Reference clone** of Pipette (by default `../pipette`, beside this repo; see `VENDOR.md`): the owner's fork of
tymon3310/pipette-desktop with remotes `origin` (the fork), `tymon` and `upstream` (darakuneko). Two jobs:

- Source for vendoring: diff a new upstream commit against the recorded one, re-copy the changed files.
- Home for upstreamable fixes: a fix to a vendored file is made as a small commit on a branch there (from
  `upstream/main`, or `tymon/vial-keychron` for Keychron-only files), then copied into `vendor/pipette/`. That
  branch is ready to offer as a pull request.

The app itself is not a branch of that fork: it uses about 12k of Pipette's ~210k lines, in a different structure,
so merging would mostly produce conflicts on files we don't have.

Stack: Vite, React 19, TypeScript (`strict`), Tailwind v4, Vitest, lucide-react icons. Same as Pipette, so vendored
components work as is.

## 5. Structure of the screen

```
+-----------+----------------------------------------------------------+
| Layerworks|  Page title (?)                                          |
| [Device   |  +----------------------------------------------------+  |
|  card]    |  | layer stack | keyboard picture, live               |  |  <- stage: Home and Keys
| Home      |  +-----------------------------------[resize handle]--+  |
| Keys      |  Page content                                      help  |
| Shortcuts |    everyday controls                               panel |
| Lighting  |    ▸ More options  (advanced, remembers open/closed)     |
| Typing    |                                                          |
| Test      |                                                          |
| Device    |                                                          |
| -Extras-  |                                                          |
| Help      |----------------------------------------------------------|
| Settings  |  status line: saved / unsaved / error, undo, redo        |
+-----------+----------------------------------------------------------+
```

- **Sidebar**: icon + label, one level; icons only in a window narrower than 1024 px or by its button. Device card
  on top: name, connection (cable / 2.4 GHz), battery, locked state with Unlock… / Lock, disconnect; with icons
  only it is one icon that opens the card beside it. Plugins that add whole pages appear in their own group, "Extras".
- **Keyboard stage**: the layer stack beside the live picture, on Home (to look) and Keys (to pick a key or a knob
  direction). It keeps its layer and selection between those pages, takes at most half of the height it shares
  with the page, and has a resize handle. Pages that need a picture for their own job (Lighting's colours, Test's
  seen keys, a key chord's keys) draw their own; the others use the full height.
- **Pages** are routes with URLs, so a help article can link straight to a setting. A page can have addresses of
  its own below its route (`#/shortcuts/macro/1`, `#/help/<topic>`, `#/typing/<group>`).
- **Help panel**: a "?" beside the page title and every setting opens a side panel with the explanation, and
  closes it when pressed again; the page stays usable.
- No modal dialogs for editing. Dialogs are for confirmations and the unlock flow only.
- Designed for 1280 × 800, usable down to 560 px wide: below 1024 px the sidebar shows its icons only (a button
  changes it by hand) and the keyboard's card becomes an icon that opens it; the stage shrinks and its layer stack
  becomes a row above the picture when the stage is narrow. Narrower than 560 px the page area scrolls sideways.

## 6. Architecture

```
pages / plugins  →  device store (state + actions)  →  protocol (vendored)  →  request queue  →  HidLink
                         ↑ events (layer, connection)  ←───────────────────────  unsolicited reports
```

**Transport** (`device/transport.ts` over a `HidLink`; replaces Pipette's web transport):

- One serialised request queue, used by everything including plugins and the vendored protocol code. Per-request
  timeout and resends (2.4 GHz: short timeout with several resends; measurements saw 1-2 s stalls with Pipette's 2 s
  timeout). One job can hold the queue for as long as it runs (the unlock flow).
- 2.4 GHz receiver: handshake `0xB1/0xB2/0xB5`, XOR `0x28` on requests and replies, skip `0xBC/0xE2` notices.
- **Separates unsolicited reports from replies** by exact shape, tested on the raw bytes (pushes arrive unscrambled
  even over 2.4 GHz). Known today: layer push `[0xA3, default, layer, 0...]`. A report matching a known push while
  no matching request waits goes to listeners. The list of push shapes is extensible (`onPush`).
- Devices are told apart by product ID and usage page; WebHID has no serial number.
- Replies to VIA and Keychron commands are checked: they start with the request's command byte, or `0xFF` for an
  unknown command. Anything else is dropped as stray. Vial replies carry data from the first byte and can't be.
- Fully typed and unit-tested. It sits on a small `HidLink` interface (raw reports in and out). Implementations:
  WebHID, node-hid (`pnpm hardware`), a fake keyboard for tests and the demo keyboard (section 13); a desktop shell
  would add its own.

**Device store** (`device/store.ts`): a framework-free store holding everything read from the keyboard, with the
load sequence and write actions. React reads it through a thin hook.

- Load order: identify → definition → layers, keymap, knob, then in the background: macros, tap dance / combos /
  overrides / alt repeat, QMK settings, lighting, lock state, Keychron state. The keyboard picture shows as soon as
  the keymap is in (about 180 ms on the cable). A part that can't be read is named and the rest still loads.
- A change to a key, the knob, the lighting or a setting goes to the keyboard at once and updates the store on
  success. Something built in several steps is a draft until it is used or saved: a shortcut, tap-or-hold or layer
  key on the Keys page is written by its "Use …" button; a macro or other shortcut entry is saved with "Save to
  keyboard", and its draft survives moving between pages.
- Undo and redo, in the status line, cover every change the keyboard can take back: keys and knob, saved macros
  (while unlocked) and entries, typing settings, key colours, zones and the Caps Lock light; a dragged slider is
  one step. The main lighting controls and the sleep timers are not undoable: they show their current state and
  are changed back by picking again. The resets and a restore's parts other than keys and knob can't be undone,
  and say so before they run.
- The status line always shows whether everything is saved on the keyboard, names drafts not yet saved, and lists
  parts still loading or unreadable. Lighting changes that need an explicit save are saved automatically after a
  short pause.

**Capabilities** (`device/capabilities.ts`): one object built at connect and rebuilt as parts arrive: protocol
versions, entry counts, supported QMK settings, lighting effects, Keychron feature flags. Pages and plugins ask it;
a missing capability shows the control as unavailable with the reason, and one that needs unlocking says so.
Commands detected by plugins are part of the plugin API's second level (section 9), not built.

**Unlock** (one flow, in `device/`, on screen in the shell):

- Asked for only when an action needs it: saving macros, matrix polling, jumping to the bootloader, putting the
  firmware-update key (QK_BOOT) on a key or in an entry. Never for layer display or ordinary editing.
- A dialog explains first: keys stop working until it finishes, there is no cancel, it lasts until the keyboard
  restarts or changes connection mode. Then: hold the keyboard's unlock keys (Esc + Enter on the K15 Max), with the
  keyboard's own 50-step countdown as a bar.
- One poll loop, at least 110 ms between polls (faster resets the count), all other traffic paused.
- If the page is closed mid-unlock the keyboard stays unresponsive until restarted; the dialog says how (switch
  connection mode or replug), and the browser asks before the page is left.
- Whoever asked for the unlock goes on by itself once it completes: a macro's "Unlock to save…" saves, a restore
  works its plan out again, a firmware-update restart proceeds.

## 7. Sections

Friendly names lead; the QMK name is shown beside it and is searchable. [pages.md](pages.md) "The built pages"
describes each page control by control.

### Home
Status at a glance: connection, battery, active layer, firmware version, lock state. Shortcuts to common tasks
(change a key, pick a lighting effect, back up, test). What the keyboard can do, from its capabilities, with what
it lacks and why one click away. The first-run tour starts here.

### Keys
- **Layer stack** beside the keyboard, named not numbered. On Keychron keyboards the first four layers are Mac,
  Mac Fn, Windows, Windows Fn by default (the Mac/Windows switch picks a pair); others are "Layer n". Names are
  editable. The keyboard has nowhere to store them, so they live in the browser, keyed by the keyboard's ID, and
  travel in the backup file. The live layer is marked; "follow keyboard" is on by default.
- Click a key (or a knob direction) → an **inspector** below with "What should this key do?", opened on the choice
  the current assignment belongs to:
  - **A key**: a categorised, searchable palette: the everyday groups, the keyboard's own keys (from its
    definition), macros and multi-tap keys by name (empty slots too, with a link to set them up on Shortcuts &
    macros), typing helpers, swapped and disabled keys, international keys, and rarer ones in a closed "More keys"
    fold. A key holding a family the palette leaves out is named by its family. "Press a key" is the alternative:
    the next key pressed on the keyboard is assigned (every key, Fn included, once unlocked).
  - **A shortcut**: modifier checkboxes + a key (Ctrl+C).
  - **Switch layer**: a sentence per type ("while held", "toggle on/off", "for the next key only", ...), and the
    layer with modifiers held.
  - **Tap or hold**: "tap for X, hold for Y", where Y is a modifier or a layer (mod-tap, layer-tap). The tap must be
    a plain key; for more, the page points to multi-tap keys.
  - *More options*: sticky modifier for the next key, "nothing", "same as layer below", raw code.
- Each key on a higher layer shows whether it's its own or falls through to the layer below, and to what.
- Not built: VIA layout options (alternative key layouts in the definition). The picture and the Test page's key
  count use the definition's default layout, and nothing changes the option.

### Shortcuts & macros
A list on the left, editor on the right, one section per kind, no tabs. Each kind has as many slots as the
keyboard has room for (the K15 Max: 16 macros sharing 926 bytes, 16 of each other kind).
- **Macros**: text, key taps and shortcuts, waits; recorded or built step by step; the space used is shown.
  Saving needs unlock.
- **Multi-tap keys** (tap dance), **Key chords** (combos), **Shortcut replacements** (key overrides), **Repeat
  rules** (alt repeat): a kind with nothing in use sits under *More options* until one is used.
- An edit is a draft until "Save to keyboard"; the browser asks before closing a tab with drafts.
- A macro, a multi-tap key or a repeat rule shows the keys it runs on (a repeat rule: where the repeat key is),
  and "Put it on a key…" opens the Keys page waiting for the key to give it.
- A key field offers only what the firmware does in that place (a shortcut replacement sends ordinary keys only;
  a macro step can send anything a key can).
- Macro names live in the browser per keyboard, like layer names, and travel in the backup file.

### Lighting
- Effect grid, the effects the keyboard lists, in groups, each tile with a small moving preview in the chosen
  colour and speed; brightness, speed, colour and vividness; lights on / off. Below the grid, a still picture of
  the effect on the keys.
- Keychron keyboards add "Key by key" (paint colours on the picture) and "Mixed zones" (areas of keys, each with
  its own effects in turn) as effects, their editor below the grid, and the Caps Lock light (colour, on / off).
- Plugin panels for the lighting section appear here (Ripple).
- One home for lighting, not two.

### Typing feel
- The keyboard's QMK settings and Keychron's key bounce filter and Snap Click, grouped by what they feel like (tap
  or hold, key chords, capitals by holding, one-tap modifiers, mouse keys, swapped and disabled keys, ...). Each
  group shows its everyday settings and keeps the rest under *More options*; each setting has a sentence on what
  it feels like and a help topic with an example.
- "Tap or hold" leads with the hold time, with presets and a try-it box.
- A search across all settings; "Reset all typing settings". Only settings the keyboard reports are shown.

### Test
Live key test: keys light while pressed and stay marked once seen. Uses browser key events plus matrix polling
(polling needs unlock; without it, a note says which keys can't be seen). Knob turns count when the browser
receives what they send; the page says which turns it can't see and on which layer to turn instead.

### Device
Sleep timers (wireless keyboards); **back up / restore** (one file with everything: keymap, knob, macros, all
entries, settings, lighting, Keychron data, layer and macro names; also import/export of Vial `.vil`); firmware
information. A restore is reviewed first: the file is checked against the keyboard and only the differences are
listed, in words, before anything is written.
*More options*: restart for a firmware update (cable only, needs unlock), reset to defaults (macros optional). All
confirmations name what is lost.

### Help
A guide: topics grouped the way the app is, in reading order, each with its own address, links to where it is in
the app and to related topics; a glossary mapping friendly names and other apps' words to QMK terms; a search that
knows QMK's names. Same texts as the help panel. "Take the tour" starts the first-run tour again.

### Settings (app)
Theme (dark / light / system), key names following the computer's keyboard layout (on by default; the browser
reports only unshifted characters), layer names, the tour, about and licences.

## 8. Live display

| Signal | Source | Unlock | Use |
|---|---|---|---|
| Active layer | Keychron push `0xA3`; shown layer = max(default, held) | no | Layer stack and keyboard picture, always on |
| Ordinary keys | Browser key events, mapped through the current keymap | no | Pressed highlight on the stage and the Test page while the window has focus |
| All keys | Matrix poll `0x02 0x03`, 20 ms on cable, slower on 2.4 GHz | yes | Test page and Keys' "Press a key": keys the PC never sees (Fn) |
| All keys, lossless | Firmware key push (extension, section 10) | tbd | Not built: would replace polling when present |

Polling stops when the page is hidden and, on 2.4 GHz, after a period of no input, because each poll resets the
keyboard's sleep timer.

## 9. Plugins

Two levels, both declared against keyboard identity and capabilities.

**Code plugins** (built): a module that registers pages, panels and effect names through `definePlugin`
(`src/plugins/api.ts`). The built-in sections register the same way, as the `core` plugin, so the plugin
path is exercised from day one.

```ts
interface PluginDef {
  id: string
  matches?: (device: { link: LinkInfo; keyboard: KeyboardData }) => boolean  // which keyboards; omit for all
  requires?: (capabilities: Capabilities) => boolean                          // what the keyboard must do
  pages?: PageDef[]          // path, title, icon, group, stage use, offline, help topic, component
  panels?: PanelDef[]        // { section: 'lighting' | 'typing' | 'device', title, component }
  pushes?: PushShape[]       // declared; not yet handed to the transport
  lightingEffects?: Record<number, { name: string; description?: string }>  // rename effects by VialRGB id
}
```

A plugin with `matches` or `requires` only appears while a matching keyboard is connected. The Ripple plugin would
match the K15 Max, rename effect 41 (the ripple sits in Solid Splash's slot) and add a lighting panel.

**Not built, intended** (with the Ripple plugin, phase 8):

- **Declared settings** (no code): a JSON description of extra settings: label, help text, control type (slider,
  toggle, choice, colour), range, and the commands that read and write it. The app renders them in the named
  section. Enough for the ripple's width, radius, cut fade and colour mode.
- **A device context** handed to code plugins, instead of importing the store:

```ts
interface DeviceContext {
  request(bytes: Uint8Array, opts?: { timeoutMs?: number }): Promise<Uint8Array>  // the shared queue
  on(push: PushShape, cb: (report: Uint8Array) => void): () => void
  state: DeviceStore        // keymap, layers, LED map, active layer, selection
  caps: Capabilities        // including commands the plugin detected (caps.hasCommand)
  stage: KeyboardStage      // draw on the keyboard picture (preview, highlights)
}
```

  With it, a plugin's declared `pushes` reach the transport and the commands it detects reach `hasCommand`.

Plugins are built in (a folder in the repo). Loading plugins from outside is a later question; the API is designed
so it wouldn't change. A possible later plugin: live lighting from the PC (music, a tint per layer) through
VialRGB's direct mode.

## 10. Firmware extensions (separate work, in the owner's own K15 Max firmware)

Deferred, and optional: the app is complete without them and stays useful on any Vial keyboard. Each is detected
through capabilities.

| Extension | Purpose | Notes |
|---|---|---|
| Ripple settings get/set | Sliders for the Ripple plugin | Settings already live in the EEPROM user word |
| Key event push | Lossless live key display, no polling; the Test page could then see every knob turn, whatever it sends | Decide whether it should need unlock |
| Matrix read without unlock | Key test and live display without the unlock ceremony | Vial's own matrix command stays locked (it's in vial-qmk, which we don't edit); this is our own read command or the key push. Trade-off: a page the user has granted access to the keyboard could watch key presses |
| Unlock cancel / timeout | Stop a half-finished unlock leaving the keyboard dead | Small change in `vial.c`'s handling, if it can be done from the keymap |
| Firmware keymap read | "The firmware's own key here is Page Up", with a button to put it back | No VIA or Vial command reads the keymap compiled into the firmware |

The Test page and "Press a key" don't need the matrix read or the key push: unlocking shows every key.

Constraint to resolve first: the Vial build has no free hook for custom commands today
(Keychron's `keyboards/keychron/common/keychron_raw_hid.c` defines `raw_hid_receive_kb` strongly, so a keymap can't
add its own, and unknown command ids are answered `0xFF`). Design one command prefix for all our extensions, with an "extensions
supported" query, replies that echo the command, and pushes with a distinct, documented shape.
The firmware trees (Keychron's QMK and vial-qmk) are never edited; this has to work from the keymap.

## 11. Look

Reference: Keychron Launcher: dark by default, rounded cards on a near-black page, one
accent colour, pill-shaped controls, generous spacing. Not a copy: no neumorphic or animated-gradient effects, and
our own accent.

Colours, radii, shadows and motion are tokens defined once in `ui/tokens.css`; spacing and type use Tailwind's
scale. The vendored keyboard picture reads its colours from CSS variables. Light theme from the start.
Keyboard-operable throughout, visible focus, text contrast at WCAG AA.

## 12. Phases

Each phase ends with something usable and a check on the keyboard.

1. **Foundation**: repo, vendored files + `VENDOR.md`, new transport with tests, device store with the load
   sequence, capabilities. Built.
2. **Design**: tokens and shared components. Built; there is no mock-up pass (decisions table).
3. **Shell + Keys (everyday)**: sidebar, keyboard stage, layer stack, inspector with key, shortcut and layer
   choices, knob, undo/redo, status line. Built.
4. **Lighting (everyday) + Test + unlock flow**. Built.
5. **Device**: backup / restore, timers, information. Built.
6. **Advanced, section by section**: tap/hold, shortcuts & macros, typing feel, per-key lighting and zones. Built.
7. **Help content and first-run tour**. Built.
8. **Plugin API's second level (declared settings, device context) + Ripple plugin**, together with the firmware
   command (section 10). Deferred: extras that need the owner's own firmware come last and are optional.

## 13. Verification

- Unit tests for transport (fake device: replies, pushes, timeouts, 2.4 GHz scrambling), store, capabilities and
  the pages. Vendored tests are copied with their files where they exist.
- `typecheck`, `lint`, `test` pass before each hand-over.
- Code that writes is tested on the fake keyboard (`device/fake-keyboard.ts`, which behaves as vial-qmk does,
  locked or not) and tried in the browser on the **demo keyboard**, a K15 Max inside the page (`?demo`, or "Try the
  demo keyboard"). Options in the address put the app in a given state, and `pnpm shots` takes screenshots of pages
  on the demo keyboard, dark and light ([development.md](development.md) "Run it", "Screenshots").
- `pnpm hardware` reads the real keyboard through the device layer, without a browser, and writes nothing.
- On the keyboard, cable and 2.4 GHz: the first run of anything that writes is the owner's. Back up first (the
  app's own backup file covers everything), and ask before writing, as `AGENTS.md` requires.

## 14. Open questions

- The name "Layerworks" against existing projects and trademarks.
