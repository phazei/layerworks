# Tasks

The current state of Layerworks, for whoever picks it up next. Finished items are deleted; what was learned goes
into `README.md`, `AGENTS.md`, `VENDOR.md` or the spec (`../docs/spec/layerworks.md`). Phases are the spec's
(section 12).

## Where we are

- **Phase 1, foundation: built.** Vendored Pipette code (unmodified, 80 files), transport, device store,
  capabilities, and a bare page. Type-check, lint and 770 tests pass. `pnpm hardware` loads the real K15 Max on
  the cable: picture data in about 180 ms, everything in about 550 ms, 259 requests, no resends or strays.
- Checked by the user in the browser on the cable and through the 2.4 GHz receiver: the picture loads and the
  active layer follows Fn and Fn2 on both. Over 2.4 GHz: 259 requests, 2 sent again, 0 failed, 1 stray report.
- The user has given permission to stage and commit in this repo, section by section. No remote yet; no pushing.

## Waiting on the user

- Whether to create a GitHub repo for Layerworks, and whether it is private.

## Next

1. **Phase 2, design:** tokens in `src/ui`, shared components (button, slider, toggle, dialog, card), mock-ups of
   the shell, Keys and Lighting pages for the user to approve before any page is built. Replaces the placeholder
   colours in `src/styles.css`.

## Later

- Phases 3-8.
- Untested on hardware so far: anything that writes.
- Upstream candidate: Pipette's web transport hands layer reports to waiting requests
  (`../docs/research/spike-results.md`, finding 1). A fix would be a branch in `../pipette`.
