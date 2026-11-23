# AGENTS.md

Layerworks: a browser configurator for keyboards on Vial firmware, usable without knowing QMK, with Keychron's
extras where the keyboard has them. React, TypeScript, Tailwind, Vite; it talks to the keyboard over WebHID. It
has run on one real keyboard, a Keychron K15 Max; everything else is tried on a built-in demo keyboard.

- **What it is, for people:** `README.md`.
- **How it works inside:** `docs/` (`docs/README.md` is the index). Read the part about what you change before
  changing it, and update it with the change: the documents describe how things are, in the present tense, with
  no history.
- **The design and why:** `docs/spec.md`. Read the relevant section before building anything new.
- **Code copied from Pipette:** `VENDOR.md`. Never edit files under `src/vendor/` except as it describes.

## Commands

| Command | |
|---|---|
| `pnpm dev` | The app on `http://localhost:5199` |
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | Must pass before every hand-over. `pnpm test <file>` runs one file |
| `pnpm build` | Production build into `dist/` |
| `pnpm shots /keys /lighting` | Screenshots of pages on the demo keyboard |
| `pnpm hardware` | Reads a real keyboard without a browser and prints what it found. Reads only |
| `pnpm vendor check` | The vendored files still match the recorded Pipette commit |

Details and the URL options: `docs/development.md`.

## Seeing the result without a keyboard

`?demo` in the URL connects the built-in demo keyboard (`src/demo/`), a K15 Max that lives in the page.
`?demo-keyboard=<name>` makes it another keyboard (`corne`, `gh80`, `splinter`, `cloud`, `q2`, `q0`, `c100`,
`vipad`, `klein`, `macropad`), to see the app on keyboards that differ from the K15 (`docs/development.md`
"Other keyboards in the demo"); e.g. `pnpm shots --query=demo-keyboard=gh80 /keys`.

`pnpm shots /keys /lighting` builds, serves on port 5198, saves each page dark and light with headless Edge into
`%TEMP%\opencode\layerworks-shots\`, and stops the server; `--offline`, `--size=`, `--theme=`, `--query=`,
`--port=` and `--no-build` are in `docs/development.md` "Screenshots". Read the PNGs to look at them. Screenshots
go in the temp folder, not the repo.

If the script leaves a server behind (it was killed half-way):
`Get-NetTCPConnection -LocalPort 5198 -State Listen | % { Stop-Process -Id $_.OwningProcess -Force }`.

## Rules

- **Never load the whole computer.**
  - Checks, builds and screenshots run only through the package scripts (`pnpm typecheck`, `pnpm lint`,
    `pnpm test`, `pnpm build`, `pnpm shots`). They go through `scripts/calm.mjs`, which holds the command and
    everything it starts to a quarter of the cores, four at most, at below-normal priority. Anything else that does
    real work (a one-off Node script, a helper that starts a browser, a loop of test runs) is started as
    `node scripts/calm.mjs <command>`. Never `vite build`, `tsc`, `vitest` or Edge by another route.
  - While working, run only the test files you touch (`pnpm test <file>`); the full suite once, at the end. No
    watch modes, no loops left running.
  - Screenshots only where they are needed to judge the result: `--no-build` after the first build, one theme
    unless both matter.
  - Close what you start. No server, browser or script may be left running when you hand over. A dev server on
    port 5199 is the owner's: leave it alone.
- **Done means:** `pnpm typecheck`, `pnpm lint` and `pnpm test` pass, and the documents describe the change.
- **Git:** no command that changes anything (stage, commit, branch, stash, reset) unless the person you work for
  asks for it; never push, amend or rewrite history. Commit messages look like `feat(device): …`,
  `fix(compat): …`, `docs: …`.
- **A real keyboard:** send it nothing unless its owner asks, and after a backup (the app's Device page saves
  everything as a `.layerworks.json`). Code that writes is tested on the fake keyboard
  (`src/device/fake-keyboard.ts`) and tried in the browser on the demo keyboard. `pnpm hardware` only reads.
- **A claim about what firmware does** names where vial-qmk says so (file and function; the version the app is
  written against is in `docs/development.md`). Check the source; don't write it from memory.
- UI text is plain language for someone who has never heard of QMK: friendly name first, the QMK name beside it.
  Every setting has a help topic (`src/help/topics.ts`): a sentence or two, an example, a link to the QMK docs.
- Colours, radii and shadows come from `src/ui/tokens.css` through the Tailwind names; no literal values in
  components. Build pages from `src/ui/` controls and add missing ones there, not in the page. Colours that are data
  (the same in both themes, such as a zone's own colour or an effect's fixed colour) may be literal, with a comment
  saying so.
- Everyday options are visible; advanced ones sit behind a `Disclosure` ("More options"). No global
  simple/advanced switch, and no tabs inside pages.
- No `title` attributes for tooltips, and no modal dialogs for editing (spec section 5).
- Pages and plugins import from `src/device` and `src/ui`, never from `src/vendor`. Nothing in `src/ui` or
  `src/device` imports from `src/shell` or `src/pages`.
- **Compatibility items** (anything that exists because a keyboard differs from the K15 Max) are recognisable as
  such: decided in one named place (a `capabilities` field or a small named function, never scattered
  `vendorId` tests), with a comment "Compatibility: <which keyboards, what the firmware does>, <where in the
  firmware source>", a test named by the difference it covers, and a bullet in `docs/other-keyboards.md`, which
  is the index of them. Each one is its own commit (`fix(compat): …` / `feat(compat): …`).
- Everything that talks to the keyboard goes through the transport's queue. Never call `sendReport` or add an
  `inputreport` listener anywhere but `src/device/webhid.ts`.
- Tests live in `__tests__/` beside the code, named `*.test.ts(x)`. Node environment by default; a component test
  starts with `// @vitest-environment jsdom`.
- New code is `GPL-3.0-or-later` with an SPDX header line. No new dependency without saying why.

## Things that bite

- The vendored keycode tables are global and keyboard-specific. `recreateKeyboardKeycodes` runs in the store's
  load, before any keycode is named; naming keycodes before a keyboard is connected gives generic names.
- The vendored protocol functions send through one module-level transport (`setTransport`), so the app holds one
  keyboard at a time.
- Vial replies (`0xFE …`) don't echo the request, so only VIA and Keychron replies are checked by their first byte
  (`src/device/transport.ts`); an unasked report is recognised by its exact shape (`src/device/pushes.ts`).
- While locked, vial-qmk ignores macro writes and silently turns QK_BOOT into nothing in knob directions and in
  tap dance, combo, override and repeat entries. The store refuses such writes (`'locked'`) instead of sending
  them; keep it that way (`docs/keyboard.md` "Macros", "Tap dance, combos, key overrides, alt repeat"). A single
  key write (`0x05`) of QK_BOOT is *not* filtered by the firmware: the store's `assign` / undo / redo refuse it
  while locked (`KEY_BOOT_LOCKED`); every route to a key goes through them.
- Macro memory is written in VIA's order (`sendMacroBuffer` in the store): last byte 0xFF, the pieces, last byte 0.
  vial-qmk plays no macro while that byte isn't 0, which is the only guard against a half-written buffer. Every
  macro write (save, undo, restore) goes through it.
- A failed write may still have been carried out: `writeOrError` takes a `verify` that reads back what it touched.
  New writes pass one, so the page shows what the keyboard holds and undo steps exist only for changes that happened.
- Store methods run through `inOrder(change, dropped)`: a change asked for one keyboard is dropped if another (or a
  reload) is current by its turn. New methods need their "not done" value.
- Changes (`assign`, `undo`, `redo`, `setLighting`) run one at a time inside the store, in the order asked for.
- URL options that would change a keyboard or show made-up content on it are read through `screenshotOption`
  (`shell/session.ts`), which answers only on the demo keyboard.
- Vial unlock: the keyboard ignores keys and most commands until it finishes, with no cancel. One poll loop only,
  at least 110 ms between polls. While it counts, via.c sends every other request back unchanged, which looks
  like success: the store checks the unlock status before changes. "Stop waiting" (`stopUnlock`) only stops the
  app; texts about it must say the keyboard may still be counting (`docs/keyboard.md` "Unlocking").
- Lighting effects have two numberings. The app uses VialRGB ids; the keyboard's own list (QMK's `RGB_MATRIX_*`
  order, what Keychron Launcher shows) is different. Keychron's zone effects are the exception: they use the
  keyboard's own numbers (`zoneEffectNumbers` in `src/device/keychron-rgb.ts`).
- Keychron's lighting commands (`0xA8`: key colours, zones, lock lights) change the running copy only; `0xA8 0x02`
  saves all of it. The store saves after a pause, like the main lighting.
- On the first frame of a different lighting effect, the firmware reloads speed and colour from what was last
  saved (vial-qmk `quantum/rgb_matrix/rgb_matrix.c`, `rgb_task_render`), over values just sent. The store
  therefore sends, saves and sends again when the effect changes. The keyboard's own lighting keys change the
  lighting without telling the app: call `deviceStore.refreshLighting()` before trusting `state.lighting`.
- "Reset all typing settings" (Vial's `qmk_settings_reset`) also clears Magic's bits (swapped and disabled keys,
  N-key rollover), and can't be undone.
- On the K15 Max (adaptive N-key rollover), Magic's N-key rollover bit changes nothing; the app hides the switch
  and keys there (`capabilities.nkro`); see `docs/keyboard.md` "Typing settings".
- Writing Keychron's wireless timers while connected wirelessly nudges the mouse pointer once (firmware).
- Knob turns are not in the key matrix. The Test page sees a turn only through what it sends to the browser
  (volume and media keys, ordinary keys, the mouse wheel).
- Knob directions: 0 is counter-clockwise (left), 1 is clockwise (right), in Vial's commands and in the store.
- Macros and multi-tap keys are numbered by QMK's own number, on purpose: "Macro 1" is `M1` (the key Keychron
  prints M1), `M0` is "Macro 0" and comes last in lists and in Add. Don't shift it to count from 1.
- The tour starts by itself only on Home with no URL options, so screenshots never show it; `?tour=N` forces it.
- WebHID has no serial numbers. The receiver is recognised by its product ID (`0xD000`-`0xDFFF`).
- The vendored keycode tests fail when run in shuffled order (upstream's; leave them).
- `keychron-protocol.ts` logs to the console (`[KC] ...`) on every load. That's upstream's; leave it.
