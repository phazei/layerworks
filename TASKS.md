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
  matrix once unlocked), Device (backup and restore to one file, Vial `.vil` import and export, sleep timers,
  keyboard information). Shortcuts & macros and Typing feel are placeholders.
- **Restore and the sleep timers write to the keyboard**; like all writes they have run on the fake and demo
  keyboards only.
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
- First real backup and restore, on the cable, after the checks above: Device → **Save a backup**; change one
  key; **Choose a backup file…** and check the summary lists only that key; restore. Then restore a file with a
  changed macro while locked (it should be skipped and say so), unlock, and restore again. Watch the status line
  for write errors. Changing a sleep timer over 2.4 GHz nudges the mouse pointer; the firmware does that itself.
- Reactions to the look (tokens, accent colour, density), and to the wording: effect names and groups on
  Lighting ("Vividness" for saturation), the layer line in the Keys inspector, Home's welcome lines.

## Next

The six first work packages (shell, Keys, Home and Settings, Lighting, Test and unlock, Device) are built. What
follows needs the user's reactions first, then continues with the spec's later phases. Each item below is sized
for one delegated agent; two at most run at a time (`AGENTS.md`).

### After the user's first look

- Apply the reactions (look, wording, layout).
- With the user present: the real-keyboard checks listed under "Waiting on the user". Fix what they show.

### Phase 6 packages (spec section 7)

- **Shortcuts & macros**: macro list and editor (the restore path already writes the macro buffer; needs
  unlock), tap dance ("multi-tap keys"), combos ("key chords"), key overrides, alt repeat. Largest remaining piece;
  split into macros first, then the four entry kinds.
- **Typing feel**: the QMK settings the keyboard reports (tap/hold timing, auto shift, mouse keys …) with plain
  names, and debounce / Snap Click from the Keychron data.
- **Keys, tap/hold choices**: "one thing when tapped, another when held" (mod-tap, layer-tap) in the inspector.
- **Lighting, per key**: Keychron per-key RGB and mixed zones (the data is in the backup already, not restored).

### Small things from review

- Device card: the quiet "Unlock…" and "Lock" buttons read as plain text; give them a slightly stronger style.
- Keys in a short window: the palette shows five columns and feels crowded.
- Restore doesn't write per-key RGB or Snap Click yet (they are in the backup file).
- The plain demo keyboard has no wireless features (Home's tests expect that); `?demo-wireless` turns them on.
- `readFirmware` lives in `src/pages/device/firmware.ts` and Home imports it from there; move it to `src/device`
  when something else needs it.
- The build warns that the main chunk is over 500 kB; split the vendored keycode tables or the pages when it
  matters.
## Later

- Phase 7 (help content, first-run tour), 8 (Ripple plugin with its firmware command; see `../TASKS.md` "Firmware extensions").
- Upstream candidate: Pipette's web transport hands layer reports to waiting requests
  (`../docs/research/spike-results.md`, finding 1). A fix would be a branch in `../pipette`.
