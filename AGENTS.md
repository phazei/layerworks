# AGENTS.md

Layerworks: a browser configurator for Keychron keyboards on Vial firmware. This repo lives in the git-ignored
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
- **Review.** The orchestrator (or a second agent with a fresh context) runs the three checks itself, reads the
  diff for the rules below, and looks at the screenshots. Problems go back to the same agent (its session ID).
- **Commit.** After review, the orchestrator commits that package (the user has allowed staging and committing
  in this repo, section by section; never push, never rewrite history), then updates `TASKS.md`: the finished
  package is deleted, anything learned goes to its durable home.
- Packages that touch the same files run one after another; independent ones can run side by side, **two
  delegated agents at most at a time** (the user's limit). Agents working side by side each get: the list of files
  that are theirs, the files they must leave alone, "targeted edits only" for shared files (`README.md`,
  `src/ui/*`, `src/help/topics.ts`, `src/main.tsx`), "a failure in someone else's file is probably mid-edit: wait
  and re-run", and their own `pnpm shots --port=`.

## Seeing the result without a keyboard

`?demo` in the URL connects the built-in demo keyboard (`src/demo/`), a K15 Max that lives in the page.
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
  components. Build pages from `src/ui/` controls and add missing ones there, not in the page.
- Everyday options are visible; advanced ones sit behind a `Disclosure` ("More options"). No global
  simple/advanced switch, and no tabs inside pages.
- Pages and plugins import from `src/device` and `src/ui`, never from `src/vendor`.
- Everything that talks to the keyboard goes through the transport's queue. Never call `sendReport` or add an
  `inputreport` listener anywhere but `src/device/webhid.ts`.
- Ask before writing anything to the keyboard, and back up first:
  `..\tools\keyboard\.venv\Scripts\python ..\tools\keyboard\keymap.py backup` (run it with that Python; the bare
  `.py` path opens the file in an editor). `pnpm hardware` only reads. Code that writes is tested on the fake keyboard (`src/device/fake-keyboard.ts`) and
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
- Vial replies don't echo the request. Don't match replies by their first byte; see `src/device/pushes.ts`.
- Vial unlock: the keyboard ignores keys and most commands until it finishes, with no cancel. One poll loop only,
  at least 110 ms between polls (`../docs/research/spike-results.md`).
- Lighting effects have two numberings. The app uses VialRGB ids; the keyboard's own list (QMK's `RGB_MATRIX_*`
  order, what Keychron Launcher shows) is different. The K15 Max's ripple replaces Solid Splash: number 22 in
  the keyboard's list, **VialRGB id 41** in the app.
- On the first frame of a different lighting effect, this firmware reloads speed and colour from what was last
  saved (`../vial_qmk/quantum/rgb_matrix/rgb_matrix.c`, `rgb_task_render`), over values just sent. The store
  therefore sends, saves and sends again when the effect changes. The keyboard's own lighting keys change the
  lighting without telling the app: call `deviceStore.refreshLighting()` before trusting `state.lighting`.
- Knob turns are not in the key matrix. The Test page sees a turn only through what it sends to the browser
  (volume and media keys, ordinary keys, the mouse wheel).
- Knob directions: 0 is counter-clockwise (left), 1 is clockwise (right), in Vial's commands and in the store.
- Changes (`assign`, `undo`, `redo`, `setLighting`) run one at a time inside the store, in the order asked for.
- WebHID has no serial numbers. The receiver is recognised by its product ID (`0xD000`-`0xDFFF`).
- `keychron-protocol.ts` logs to the console (`[KC] ...`) on every load. That's upstream's; leave it.
