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
- **Built pages:** Home (at a glance, what the keyboard can do, shortcuts), Keys (click a key or knob direction;
  a key, a shortcut, a layer key, More options), Lighting (effect grid with previews, lights on/off, brightness,
  speed, colour, plugin panel slot; no keyboard picture until there is a live preview), Settings (theme, layer
  names, about), Help (topic list), Test (keys seen from browser key events and, once unlocked, from the key
  matrix; knob turns from what they send to the browser), Device (backup and restore to one file, Vial `.vil`
  import and export, sleep timers, keyboard information). Shortcuts & macros and Typing feel are placeholders.
- **Checked by the user on the real keyboard:** assigning keys, undo / redo, lighting, unlock and lock, the Test
  page unlocked (M1-M5, Mute, Fn and Fn2 register), backup, restore and `.vil` restore. The user likes the look,
  the wording and the help as they are.
- Not yet confirmed on the real keyboard: knob turns on the Test page, the lighting values after a restore
  followed by an effect change, restoring macros while locked (should be skipped), the sleep timers.
- The user has given permission to stage and commit in this repo, section by section. No remote; no pushing.

## Standing instruction from the user

Keep building without waiting for approval of mock-ups: build real pages on the demo keyboard, commit section by
section, and let the user react to the result. The user reviews in the browser afterwards, so every package ends
with screenshots (see `AGENTS.md`) and notes on what to look at.

## Waiting on the user

- Whether to create a GitHub repo for Layerworks, and whether it is private.
- **"Put back the firmware's key":** the keyboard keeps only what is saved; no VIA or Vial command reads the
  keymap compiled into the firmware. Our firmware can answer that with one small command
  (`keycode_at_keymap_location_raw`, and the encoder equivalent), which would give the Keys inspector "The
  firmware's own key here is Page Up" and a button to put it back, on any keyboard whose firmware has the
  command. Proposed as part of the firmware extensions (`../TASKS.md`); needs a build and a flash.
- **`backups/keymap.json`** (from `..\tools\keyboard\keymap.py`: keys and knob only) is not accepted by the
  Device page's restore. Either teach restore to read it, or leave `keymap.py` as the command-line tool for
  before a flash and use `.layerworks.json` everywhere else.
- To try on the real keyboard: the Test page with the knob (Windows layer: both directions mark while the volume
  changes; holding Fn2: scrolling marks them; holding Fn: the note names what can't be seen), and the lighting
  after a restore (the effect, speed and colour shown match the keyboard after picking another effect).
- Running `keymap.py`: `..\tools\keyboard\.venv\Scripts\python ..\tools\keyboard\keymap.py backup` (the bare
  `.py` path opens the file in an editor instead of running it).

## Next

The first six work packages (shell, Keys, Home and Settings, Lighting, Test and unlock, Device) are built and the
user's first reactions are applied. Each item below is sized for one delegated agent; two at most run at a time
(`AGENTS.md`).
### Phase 6 packages (spec section 7)

- **Shortcuts & macros**: macro list and editor (the restore path already writes the macro buffer; needs
  unlock), tap dance ("multi-tap keys"), combos ("key chords"), key overrides, alt repeat. Largest remaining piece;
  split into macros first, then the four entry kinds.
- **Typing feel**: the QMK settings the keyboard reports (tap/hold timing, auto shift, mouse keys …) with plain
  names, and debounce / Snap Click from the Keychron data.
- **Keys, tap/hold choices**: "one thing when tapped, another when held" (mod-tap, layer-tap) in the inspector.
- **Lighting, per key**: Keychron per-key RGB and mixed zones (the data is in the backup already, not restored).

### Small things from review

- Test: where the knob scrolls, ordinary mouse scrolling marks it as seen too; the browser can't tell them apart.
- Lighting: read back while the lights are off, the keyboard can report the saved colour rather than the last
  one sent. Turning the lights on sends the values the page shows.
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
