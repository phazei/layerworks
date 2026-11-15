# Vendored code

`src/vendor/pipette/` holds files copied from [Pipette](https://github.com/darakuneko/pipette-desktop), by way of
tymon3310's fork, which adds Keychron support. They keep their original paths relative to Pipette's `src/`, their
licence headers, and their contents: **no vendored file is modified**.

| | |
|---|---|
| Source | https://github.com/tymon3310/pipette-desktop, branch `vial-keychron` |
| Version | the commit in `vendor.json` (`source.commit`) |
| Licence | GPL-3.0-or-later (files carry GPL-2.0-or-later or GPL-3.0-or-later headers) |
| File list | `vendor.json` (`files`, plus `extra` for test fixtures) |
| Reference clone | `../pipette` (the `pipette/` folder of the Alice-Keyboard project) |

## What is vendored

- `shared/keycodes`, `shared/kle`, `shared/constants`, `shared/hid`, and three `shared/types` files: keycode
  tables and names, layout parsing, protocol constants, the load sequence for definition and keymap.
- `tauri-shim/{protocol,keychron-protocol,transport}.ts`: the VIA / Vial and Keychron commands.
- `web/{lzma,lzma-browser}.ts`: decompression of the keyboard's definition.
- `renderer/components/keyboard/*` with `hooks/useEffectiveTheme.ts` and `utils/chart-palette.ts`: the keyboard
  picture.
- The upstream tests of those files (`__tests__/`), and the three fixtures they read, in
  `src/vendor/e2e-tauri/fixtures/` (where the tests' relative paths point).

Not vendored: Pipette's web transport (`web/hid-transport.ts`; replaced by `src/device/transport.ts` and
`src/device/webhid.ts`), its hooks, shell, dialogs and key picker.

## Stand-ins

Two files in the vendor folder are ours, not Pipette's. They sit where vendored code imports a file we don't
copy, so the vendored files themselves stay untouched. `vendor.json` lists them under `standIns`.

| File | Stands in for | Why |
|---|---|---|
| `tauri-shim/hid-transport.ts` | Pipette's Tauri HID backend | `tauri-shim/transport.ts` defaults to it. Ours throws; `src/device/store.ts` injects the real transport with `setTransport`. |
| `renderer/components/keycodes/KeycodeGrid.ts` | `KeycodeGrid.tsx`, the key picker | The keyboard widget imports one small function from it, copied verbatim. |

## Local changes

None. If one becomes unavoidable: keep it small, mark it in the file with a `LAYERWORKS:` comment, add the file to
`patched` in `vendor.json` (so `check` and `copy` skip it), and list it here with its reason. Prefer fixing it
upstream instead (below).

## Rules

- App code reaches vendored code only through `src/device/` (protocol, keycodes, layout) and `src/ui/`
  (components). ESLint forbids importing `vendor/` from `src/pages/` and `src/plugins/`.
- Vendored code is not linted here (upstream's rules apply to it) but is type-checked and its tests run.
- The build defines `process.env` as `{}`, because `keychron-protocol.ts` reads debug flags from it.

## Working with the reference clone

`../pipette` is a clone of the user's fork with three remotes: `origin` (the fork), `tymon` (tymon3310) and
`upstream` (darakuneko).

```
node scripts/vendor.mjs check            # vendored files still match the recorded commit
node scripts/vendor.mjs changed <ref>    # which vendored files differ between the recorded commit and <ref>
node scripts/vendor.mjs copy <ref>       # copy them from <ref> and record it
```

The script reads the clone's git objects, not its working tree, and writes only in this repo.

**Updating:** fetch in the clone, run `changed tymon/vial-keychron`, read the diff, then `copy`, and run
`pnpm typecheck && pnpm test`. A newly needed file is added to `files` in `vendor.json`.

**Fixing a bug in vendored code:** make the fix in the clone as a small commit on its own branch (from
`upstream/main`, or `tymon/vial-keychron` for Keychron-only files), so it can be offered as a pull request. Until
it is merged, carry it here as a local change (above).
