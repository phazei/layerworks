# Tasks

The current state of Layerworks, for whoever picks it up next. Finished items are deleted; what was learned goes
into `README.md`, `AGENTS.md`, `VENDOR.md` or the spec (`../docs/spec/layerworks.md`). Phases are the spec's
(section 12). How the work is organised (orchestrator and delegated packages) is in `AGENTS.md`.

## Where we are

- **Phase 1, foundation: done and checked by the user** in the browser on the cable and through the 2.4 GHz
  receiver (picture loads, active layer follows Fn and Fn2; over 2.4 GHz: 259 requests, 2 sent again, 0 failed,
  1 stray report).
- **The shell is in place** (`src/shell/`, `src/pages/`): sidebar, keyboard stage with the layer stack, status
  line with undo / redo, help panel, connect prompt, themes.
- **Built pages, on the demo keyboard:** Home (at a glance, what the keyboard can do, shortcuts), Keys (click a
  key or knob direction; a key, a shortcut, a layer key, More options), Lighting (effect grid, lights on/off,
  brightness, speed, colour, plugin panel slot; no keyboard picture until there is a live preview), Settings
  (theme, layer names, about), Help (topic list). Shortcuts & macros, Typing feel, Test and Device are
  placeholders.
- **Device layer for changes:** `assign` / `undo` / `redo` for keys and knob, `setLighting` with delayed save,
  keycode names, palette groups, shortcut and layer-key builders. Unit-tested on the fake keyboard.
  **Never run against the real keyboard yet.**
- Not shown anywhere yet: the capabilities list and request counters of the old proof page (candidates for the
  Device page), battery and 2.4 GHz outside the sidebar's device card. The battery line has only been seen in
  code: the demo keyboard is on the cable.
- The user has given permission to stage and commit in this repo, section by section. No remote; no pushing.

## Standing instruction from the user

Keep building without waiting for approval of mock-ups: build real pages on the demo keyboard, commit section by
section, and let the user react to the result. The user reviews in the browser afterwards, so every package ends
with screenshots (see `AGENTS.md`) and notes on what to look at.

## Waiting on the user

- Whether to create a GitHub repo for Layerworks, and whether it is private.
- First real-keyboard check of writing (assign a key, undo, change lighting). Needs the user present and a fresh
  `..\tools\keyboard\keymap.py backup` first. Until then writes are tested on the fake keyboard only.
- Reactions to the look (tokens, accent colour, density), and to the wording: effect names and groups on
  Lighting ("Vividness" for saturation), the layer line in the Keys inspector, Home's welcome lines.

## Next: work packages

Each is sized for one delegated agent; two at most run at a time (`AGENTS.md`). Every package: follow `AGENTS.md`, keep `README.md` current, add
tests, and finish with `pnpm typecheck && pnpm lint && pnpm test` passing and screenshots of the demo keyboard.

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

### Small things from review

- Keys: what a "same as the layer below" key falls through to is worked out as held layer → base layer → layer 0;
  with Fn2 held it can name the Windows Fn key where the keyboard would use the Windows one. Follow QMK's real
  rule (the highest active layer below with an assignment) once the store knows the full layer state.
- Keys: "More options" stays open for later keys once opened (it is remembered); decide whether the inspector
  should only auto-open it for the key in hand. The demo keymap has no shortcut key, so that choice has no
  screenshot.
- Lighting: a disabled Vividness slider gives no reason of its own (the reason is on Colour above it).
- Home: the battery line (2.4 GHz only) has never been seen rendered; the demo keyboard is on the cable. A demo
  option for a wireless link would cover it. The firmware line shows whatever the keyboard reports; check it
  reads well on the real one (`v1.1.2 1970-01-01-00:00:00`).
## Later

- Phase 6 (advanced: tap/hold, shortcuts & macros, typing feel, per-key lighting), 7 (help content, first-run
  tour), 8 (Ripple plugin with its firmware command; see `../TASKS.md` "Firmware extensions").
- Upstream candidate: Pipette's web transport hands layer reports to waiting requests
  (`../docs/research/spike-results.md`, finding 1). A fix would be a branch in `../pipette`.
