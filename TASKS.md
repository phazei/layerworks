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
  (theme, layer names, about), Help (topic list), Test (keys seen from browser key events, and from the key
  matrix once unlocked). Shortcuts & macros, Typing feel and Device are placeholders.
- **Unlock flow** (`src/device/unlock.ts`, `src/shell/UnlockDialog.tsx`): built and tested on the fake keyboard;
  tryable on the demo keyboard by holding Esc and Enter. **Never run against the real keyboard yet.**
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
- First real unlock, after that backup, on the cable: device card → **Unlock…** → **Start unlocking**, hold Esc
  and Enter. The bar should move steadily for about 6 s. If it keeps falling back to 0, the 120 ms pause between
  polls (`UNLOCK_POLL_MS` in `src/device/unlock.ts`) is too short; try 150. Then check **Lock** works, that the
  Test page sees Fn2 (right B) while unlocked, and repeat over 2.4 GHz. Replugging the keyboard ends a stuck unlock.
- Reactions to the look (tokens, accent colour, density), and to the wording: effect names and groups on
  Lighting ("Vividness" for saturation), the layer line in the Keys inspector, Home's welcome lines.

## Next: work packages

Each is sized for one delegated agent; two at most run at a time (`AGENTS.md`). Every package: follow `AGENTS.md`, keep `README.md` current, add
tests, and finish with `pnpm typecheck && pnpm lint && pnpm test` passing and screenshots of the demo keyboard.

### 6. Device page (spec section 7 "Device")

- Backup / restore to one file (keymap, knob, macros, entries, settings, lighting, Keychron data, layer names),
  `.vil` import / export, firmware information, wireless and sleep timers.
- Restore writes a lot: fake keyboard only until the user has tested it.

### Small things from review

- Literal values that should be tokens: the `Toggle` knob (`bg-white shadow`), the `Dialog` backdrop
  (`bg-black/50`), the `.lw-slider` thumb in `styles.css`.
- Light theme: a key held down on the Test page has a dark label on the green `--success`; the label colour is
  chosen inside the vendored widget, so the fix is a lighter pressed colour or a wrapper-side override.
- Keys at 1000×700: the stage takes most of the height and the palette starts below the fold. Needs a layout
  decision (a smaller picture, or the layer stack collapsing further).
- Settings and Help sit in a narrow column and leave the right half empty at 1280 px.
- Home: the "Protection" fact could offer `openUnlock()`; its "?" sits beside the layer name rather than the label.
- Home: the battery line (2.4 GHz only) has never been seen rendered; the demo keyboard is on the cable. A demo
  option for a wireless link would cover it. The firmware line shows whatever the keyboard reports; check it
  reads well on the real one (`v1.1.2 1970-01-01-00:00:00`).
- `src/pages/test/seen.ts` resets its state during render; works, could be cleaner.
- `pnpm shots` keeps one browser profile between runs, so remembered choices ("More options" open, theme) from an
  earlier run can show in a later shot. A fresh profile per run would fix it.
- The keyboard has 90 physical keys; "92" in older notes counts the knob's two directions.
## Later

- Phase 6 (advanced: tap/hold, shortcuts & macros, typing feel, per-key lighting), 7 (help content, first-run
  tour), 8 (Ripple plugin with its firmware command; see `../TASKS.md` "Firmware extensions").
- Upstream candidate: Pipette's web transport hands layer reports to waiting requests
  (`../docs/research/spike-results.md`, finding 1). A fix would be a branch in `../pipette`.
