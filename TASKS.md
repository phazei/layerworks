# Tasks

The current state of Layerworks, for whoever picks it up next. Finished items are deleted; what was learned goes
into `README.md`, `AGENTS.md`, `VENDOR.md` or the spec (`../docs/spec/layerworks.md`). Phases are the spec's
(section 12). How the work is organised (orchestrator and delegated packages) is in `AGENTS.md`.

## Where we are

- **Phase 1, foundation: done and checked by the user** in the browser on the cable and through the 2.4 GHz
  receiver (picture loads, active layer follows Fn and Fn2; over 2.4 GHz: 259 requests, 2 sent again, 0 failed,
  1 stray report).
- **Groundwork for phases 2-4: in the repo, not yet used by any page.**
  - Device layer: `assign` / `undo` / `redo` for keys and knob, `setLighting` with delayed save, keycode names,
    palette groups, shortcut and layer-key builders (`src/device/keycodes.ts`). Unit-tested on the fake keyboard.
    **Never run against the real keyboard yet.**
  - Demo keyboard (`src/demo/`): a K15 Max inside the page, from the firmware definition and `backups/keymap.json`.
  - `src/ui/`: tokens (dark and light), controls, layout pieces, preferences.
  - `src/shell/`: router, session (connect / demo / disconnect), stage store, layer names, pressed-key detection.
  - `src/plugins/api.ts`: `definePlugin`, pages and panels. `src/help/`: first topics and the help-panel store.
- `src/App.tsx` is still the phase 1 proof page. It works, but is to be replaced by the shell (package 1).
- The user has given permission to stage and commit in this repo, section by section. No remote; no pushing.

## Standing instruction from the user

Keep building without waiting for approval of mock-ups: build real pages on the demo keyboard, commit section by
section, and let the user react to the result. The user reviews in the browser afterwards, so every package ends
with screenshots (see `AGENTS.md`) and notes on what to look at.

## Waiting on the user

- Whether to create a GitHub repo for Layerworks, and whether it is private.
- First real-keyboard check of writing (assign a key, undo, change lighting). Needs the user present and a fresh
  `..\tools\keyboard\keymap.py backup` first. Until then writes are tested on the fake keyboard only.
- Reactions to the look (tokens, accent colour, density) once the shell and Keys page exist.

## Next: work packages

Each is sized for one delegated agent. Do them in order; 3 and 4 can run in parallel once 1 is merged. Every
package: follow `AGENTS.md`, keep `README.md` current, add tests, and finish with `pnpm typecheck && pnpm lint &&
pnpm test` passing and screenshots of the demo keyboard.

### 1. Shell (spec sections 5 and 8)

Replace `src/App.tsx` with the real frame.

- `src/shell/Shell.tsx`: sidebar on the left, main area with the keyboard stage (when the page asks for it and a
  keyboard is connected), the page, and the status line at the bottom. Help panel slides in from the right.
- Sidebar: app name, device card (name, cable / 2.4 GHz, battery when wireless, locked state, disconnect), then
  the pages from `activePages()` grouped `main` / `plugins` / `app`, icon + label, current page marked.
- Keyboard stage: layer stack (named layers from `layer-names.ts`, rename in place, live layer marked, "Follow
  the keyboard" toggle with its help topic) beside `KeyboardPicture`, with pressed keys from `usePressedKeys`.
  State lives in `stage-store.ts` so it survives page changes. Selection is passed through for pages that edit.
- Status line: "Saved on the keyboard" / "Saving…" / the write error, and undo / redo buttons (`deviceStore`).
- Not connected: pages that need a keyboard show a connect prompt (granted devices, "Connect a keyboard…",
  "Try the demo keyboard", the WebHID-unsupported message). `?demo` in the URL connects the demo at start.
- Theme: dark / light / system, stored with `prefs.ts`, applied as the `dark` class on `<html>`.
- Pages register through `definePlugin` in a built-in `core` plugin (`src/pages/index.ts`). Until their packages
  are done, Shortcuts & macros, Typing feel, Test, Device and Help are placeholder pages that say in a sentence
  what will be there.
- `scripts/screenshot.mjs`: builds, serves, and saves screenshots of given `#/paths` in demo mode, dark and light
  (recipe in `AGENTS.md`).
- Tests: plugin registry, layer names, stage store, `positionsSending`, and a jsdom test that the shell renders
  the demo keyboard's pages.

### 2. Keys page (spec section 7 "Keys")

- Click a key or a knob direction on the stage → inspector under it: "What should this key do?"
- Choices (segmented): **A key** (searchable palette from `keyPalette()`, grouped, friendly group titles; search
  matches label, description and QMK name), **A shortcut** (modifier checkboxes + a basic key), **Switch layer**
  (the sentences in `LAYER_ACTIONS` with the layer's name).
- *More options* (`Disclosure`): "Nothing", "Same as the layer below", and a key-code field (`parseKeycode`) that
  shows what the typed code means before applying.
- The inspector opens on the choice that matches the key's current assignment, and shows the current assignment
  in words plus its QMK name. Each key not on the base layer says whether it is its own or falls through.
- Assigning calls `deviceStore.assign`; errors show in the status line. Help buttons on each choice.
- Tests against the demo/fake keyboard: pick a key, a shortcut, a layer key, transparent; undo.

### 3. Home and Settings (spec section 7)

- Home: connection, battery, active layer, firmware version, lock state at a glance; shortcuts to "Change a key",
  "Pick a lighting effect", "Back up". Works as the landing page when nothing is connected (connect prompt).
- Settings: theme, layer names (all layers of the connected keyboard), about and licences (GPL-3.0-or-later,
  Pipette credit from `VENDOR.md`).

### 4. Lighting, everyday (spec section 7 "Lighting")

- Effect grid from `capabilities.lighting.effects` with names from `VIALRGB_EFFECTS` made friendly; brightness,
  speed, colour (hue and saturation) sliders; "off". Uses `deviceStore.setLighting`. Controls an effect ignores
  are disabled with the reason.
- A slot for plugin panels (`activePanels(state, 'lighting')`).
- Which effects use colour and speed is firmware knowledge: check `../vial_qmk` (read-only) rather than guessing.
- Note: effect 22 on this keyboard is the ripple (`../AGENTS.md` "Effect slots"); name it from the plugin side
  later, not in core.

### 5. Test page and the unlock flow (spec sections 6 "Unlock", 7 "Test", 8)

- Test: keys light while pressed and stay marked once seen; browser key events always, matrix polling when
  unlocked; a note saying which keys can't be seen while locked.
- Unlock: one flow in `src/device/`, one poll loop, at least 110 ms between polls, all other traffic paused, the
  keyboard's own 50-step countdown as the progress bar, the warning dialog first. The fake keyboard needs unlock
  and matrix-state emulation to test it. **Real-keyboard test only with the user present.**

### 6. Device page (spec section 7 "Device")

- Backup / restore to one file (keymap, knob, macros, entries, settings, lighting, Keychron data, layer names),
  `.vil` import / export, firmware information, wireless and sleep timers.
- Restore writes a lot: fake keyboard only until the user has tested it.

## Later

- Phase 6 (advanced: tap/hold, shortcuts & macros, typing feel, per-key lighting), 7 (help content, first-run
  tour), 8 (Ripple plugin with its firmware command; see `../TASKS.md` "Firmware extensions").
- Upstream candidate: Pipette's web transport hands layer reports to waiting requests
  (`../docs/research/spike-results.md`, finding 1). A fix would be a branch in `../pipette`.
