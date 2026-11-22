# AGENTS.md

Layerworks: a browser configurator for keyboards on Vial firmware, with Keychron's extras where the keyboard has
them (tested on the Keychron K15 Max). This repo lives in the git-ignored
`layerworks/` folder of the Alice-Keyboard project, whose `AGENTS.md` also applies (git rules, talking to the
keyboard, where information goes).

- **Design:** `../docs/spec/layerworks.md`. Read the relevant section before building anything.
- **Tasks:** `TASKS.md` here. Read it at the start of a session; update it when something is finished or decided.
- **How it works, how to run it:** `README.md`. Keep it current with every change.
- **Vendored Pipette code:** `VENDOR.md`. Never edit files under `src/vendor/` except as it describes.

## How the work is organised

The main session is an **orchestrator**: it keeps its own context small, hands each work package in `TASKS.md` to
a delegated agent (`general_opus`), and reviews what comes back. It does not build pages itself.

- **Brief.** A delegated agent starts knowing nothing. Its brief names the package in `TASKS.md`, tells it to read
  this file, `README.md`, `TASKS.md` and the spec sections the package cites before writing code, and restates
  the limits: no git commands that change anything, nothing written to the real keyboard, no edits under
  `src/vendor/`, no new dependencies without saying why. It asks for a short report: what was built, what was
  decided and why, what is unfinished, what the user should look at.
- **Done means:** `pnpm typecheck && pnpm lint && pnpm test` pass, `README.md` describes the new parts, and there
  are screenshots of the result on the demo keyboard.
- **Build, then show.** The user's standing instruction: pages are built for real on the demo keyboard without
  waiting for mock-ups to be approved, committed section by section, and the user reacts to the result in the
  browser. So every package ends with screenshots and notes on what to look at.
- **Review.** The orchestrator (or a second agent with a fresh context) runs the three checks itself, reads the
  diff for the rules below, and looks at the screenshots. Problems go back to the same agent (its session ID).
- **Commit.** After review, the orchestrator commits that package (the user has allowed staging and committing
  in this repo, section by section; never push, never rewrite history), then updates `TASKS.md`: the finished
  package is deleted, anything learned goes to its durable home.
- **Background and follow-ups.** Agents are launched in the background, so the orchestrator can answer the user
  meanwhile and is told when each finishes; `TASKS.md` "In progress right now" lists the running sessions, their
  files and what to do when they report. Follow-up work on a page goes to the session that built it (it knows
  the code); a review goes to a fresh one. An agent stopped by the account's rate limit is resumed in the same
  session.
- **The user's feedback** comes in batches while agents run. Decided items go to an agent as they are; items the
  user marks as open get a recommendation and go under "Waiting on the user", unbuilt. An agent's claim about
  the firmware is checked against the source (`../vial_qmk`) before it is written into these documents.
- Packages that touch the same files run one after another; independent ones can run side by side, **two
  delegated agents at most at a time** (the user's limit). Agents working side by side each get: the list of files
  that are theirs, the files they must leave alone, "targeted edits only" for shared files (`README.md`,
  `src/ui/*`, `src/help/topics.ts`, `src/main.tsx`), "a failure in someone else's file is probably mid-edit: wait
  and re-run", and their own `pnpm shots --port=`.

## Seeing the result without a keyboard

`?demo` in the URL connects the built-in demo keyboard (`src/demo/`), a K15 Max that lives in the page.
`?demo-keyboard=<name>` makes it another keyboard (`corne`, `gh80`, `splinter`, `cloud`, `q2`, `q0`, `macropad`),
to see the app on keyboards that differ from the K15 (README "Other keyboards in the demo"); e.g.
`pnpm shots --query=demo-keyboard=gh80 /keys`.
`pnpm shots /keys /lighting` builds, serves on port 5198, saves each page dark and light with headless Edge into
`%TEMP%\opencode\layerworks-shots\`, and stops the server; `--offline`, `--size=`, `--theme=`, `--query=` and
`--no-build` are in README "Screenshots". Read the PNGs to look at them. Screenshots go in the temp folder, not
the repo.

If the script leaves a server behind (it was killed half-way):
`Get-NetTCPConnection -LocalPort 5198 -State Listen | % { Stop-Process -Id $_.OwningProcess -Force }`.

## Rules

- `pnpm typecheck`, `pnpm lint` and `pnpm test` pass before every hand-over.
- Git: the orchestrator may stage and commit in this repo after reviewing a package; delegated agents never run a
  git command that changes anything. Commit messages in the user's style (`feat(device): ...`, `docs: ...`).
  The remote is `origin` (github.com/phazei/layerworks, private); the user pushes, agents never do. Never amend
  or rewrite history. In `../pipette` and the parent project, nothing without the user asking.
- UI text is plain language for someone who has never heard of QMK: friendly name first, the QMK name beside it.
  Every setting has a help topic (`src/help/topics.ts`): a sentence or two, an example, a link to the QMK docs.
- Colours, radii and shadows come from `src/ui/tokens.css` through the Tailwind names; no literal values in
  components. Build pages from `src/ui/` controls and add missing ones there, not in the page. Colours that are data
  (the same in both themes, such as a zone's own colour or an effect's fixed colour) may be literal, with a comment
  saying so.
- Everyday options are visible; advanced ones sit behind a `Disclosure` ("More options"). No global
  simple/advanced switch, and no tabs inside pages.
- Pages and plugins import from `src/device` and `src/ui`, never from `src/vendor`.
- **Compatibility items** (anything that exists because a keyboard differs from the K15 Max) are recognisable as
  such: decided in one named place (a `capabilities` field or a small named function, never scattered
  `vendorId` tests), with a comment "Compatibility: <which keyboards, what the firmware does>, <where in the
  firmware source>", a test named by the difference it covers, and a bullet in README "Other keyboards", which is
  the index of them. Each one is its own commit (`fix(compat): …` / `feat(compat): …`).
- Everything that talks to the keyboard goes through the transport's queue. Never call `sendReport` or add an
  `inputreport` listener anywhere but `src/device/webhid.ts`.
- Ask before writing anything to the keyboard, and back up first. The user backs up with the app (Device page, a
  `.layerworks.json` file with everything); from a script,
  `..\tools\keyboard\.venv\Scripts\python ..\tools\keyboard\keymap.py backup` saves keys and knob only (run it with
  that Python; the bare `.py` path opens the file in an editor). `pnpm hardware` only reads. Code that writes is tested on the fake keyboard (`src/device/fake-keyboard.ts`) and
  tried in the browser on the demo keyboard; the first run on the real one is the user's.
- Tests live in `__tests__/` beside the code, named `*.test.ts(x)`. Node environment by default; a component test
  starts with `// @vitest-environment jsdom`.
- New code is `GPL-3.0-or-later` with an SPDX header line.
- No `title` attributes for tooltips, and no modal dialogs for editing (spec section 5).

## Things that bite

- The vendored keycode tables are global and keyboard-specific. `recreateKeyboardKeycodes` runs in the store's
  load, before any keycode is named; naming keycodes before a keyboard is connected gives generic names.
- The vendored protocol functions send through one module-level transport (`setTransport`), so the app holds one
  keyboard at a time.
- Vial replies (`0xFE …`) don't echo the request, so only VIA and Keychron replies are checked by their first byte
  (`src/device/transport.ts`); an unasked report is recognised by its exact shape (`src/device/pushes.ts`).
- While locked, vial-qmk ignores macro writes and silently turns QK_BOOT into nothing in knob directions and in
  tap dance, combo, override and repeat entries. The store refuses such writes (`'locked'`) instead of sending
  them; keep it that way (README "Macros", "Tap dance, combos, key overrides, alt repeat"). A single key write
  (`0x05`) of QK_BOOT is *not* filtered by the firmware: the store's `assign` / undo / redo refuse it while locked
  (`KEY_BOOT_LOCKED`); every route to a key goes through them.
- Macro memory is written in VIA's order (`sendMacroBuffer` in the store): last byte 0xFF, the pieces, last byte 0.
  vial-qmk plays no macro while that byte isn't 0, which is the only guard against a half-written buffer. Every
  macro write (save, undo, restore) goes through it.
- A failed write may still have been carried out: `writeOrError` takes a `verify` that reads back what it touched.
  New writes pass one, so the page shows what the keyboard holds and undo steps exist only for changes that happened.
- Store methods run through `inOrder(change, dropped)`: a change asked for one keyboard is dropped if another (or a
  reload) is current by its turn. New methods need their "not done" value.
- URL options that would change a keyboard or show made-up content on it are read through `screenshotOption`
  (`shell/session.ts`), which answers only on the demo keyboard.
- Vial unlock: the keyboard ignores keys and most commands until it finishes, with no cancel. One poll loop only,
  at least 110 ms between polls (`../docs/research/spike-results.md`). While it counts, via.c sends every other
  request back unchanged, which looks like success: the store checks the unlock status before changes. "Stop
  waiting" (`stopUnlock`) only stops the app; texts about it must say the keyboard may still be counting.
- Lighting effects have two numberings. The app uses VialRGB ids; the keyboard's own list (QMK's `RGB_MATRIX_*`
  order, what Keychron Launcher shows) is different. The K15 Max's ripple replaces Solid Splash: number 22 in
  the keyboard's list, **VialRGB id 41** in the app. Keychron's zone effects are the exception: they use the
  keyboard's own numbers (`zoneEffectNumbers` in `src/device/keychron-rgb.ts`).
- Keychron's lighting commands (`0xA8`: key colours, zones, lock lights) change the running copy only; `0xA8 0x02`
  saves all of it. The store saves after a pause, like the main lighting.
- "Reset all typing settings" (Vial's `qmk_settings_reset`) also clears Magic's bits (swapped and disabled keys,
  N-key rollover), and can't be undone.
- On the K15 Max (adaptive N-key rollover), Magic's N-key rollover bit changes nothing; the app hides the switch
  and keys there (`capabilities.nkro`); see README "Typing settings".
- Writing Keychron's wireless timers while connected wirelessly nudges the mouse pointer once (firmware).
- The vendored keycode tests fail when run in shuffled order (upstream's; leave them).
- On the first frame of a different lighting effect, this firmware reloads speed and colour from what was last
  saved (`../vial_qmk/quantum/rgb_matrix/rgb_matrix.c`, `rgb_task_render`), over values just sent. The store
  therefore sends, saves and sends again when the effect changes. The keyboard's own lighting keys change the
  lighting without telling the app: call `deviceStore.refreshLighting()` before trusting `state.lighting`.
- Knob turns are not in the key matrix. The Test page sees a turn only through what it sends to the browser
  (volume and media keys, ordinary keys, the mouse wheel).
- Macros and multi-tap keys are numbered by QMK's own number, on purpose: "Macro 1" is `M1` (the key Keychron
  prints M1), `M0` is "Macro 0" and comes last in lists and in Add. Don't shift it to count from 1.
- The tour starts by itself only on Home with no URL options, so screenshots never show it; `?tour=N` forces it.
- Knob directions: 0 is counter-clockwise (left), 1 is clockwise (right), in Vial's commands and in the store.
- Changes (`assign`, `undo`, `redo`, `setLighting`) run one at a time inside the store, in the order asked for.
- WebHID has no serial numbers. The receiver is recognised by its product ID (`0xD000`-`0xDFFF`).
- `keychron-protocol.ts` logs to the console (`[KC] ...`) on every load. That's upstream's; leave it.
