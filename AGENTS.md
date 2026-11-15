# AGENTS.md

Layerworks: a browser configurator for Keychron keyboards on Vial firmware. This repo lives in the git-ignored
`layerworks/` folder of the Alice-Keyboard project, whose `AGENTS.md` also applies (git rules, talking to the
keyboard, where information goes).

- **Design:** `../docs/spec/layerworks.md`. Read the relevant section before building anything.
- **Tasks:** `TASKS.md` here. Read it at the start of a session; update it when something is finished or decided.
- **How it works, how to run it:** `README.md`. Keep it current with every change.
- **Vendored Pipette code:** `VENDOR.md`. Never edit files under `src/vendor/` except as it describes.

## Rules

- `pnpm typecheck`, `pnpm lint` and `pnpm test` pass before every hand-over.
- Git: the user commits. Propose commit messages in their style (`feat(device): ...`, `docs: ...`); never run a git
  command that changes anything without permission. This applies to `../pipette` too.
- Pages and plugins import from `src/device` and `src/ui`, never from `src/vendor`.
- Everything that talks to the keyboard goes through the transport's queue. Never call `sendReport` or add an
  `inputreport` listener anywhere but `src/device/webhid.ts`.
- Ask before writing anything to the keyboard, and back up first (`..\tools\keyboard\keymap.py backup`).
  `pnpm hardware` only reads.
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
- WebHID has no serial numbers. The receiver is recognised by its product ID (`0xD000`-`0xDFFF`).
- `keychron-protocol.ts` logs to the console (`[KC] ...`) on every load. That's upstream's; leave it.
