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
  import and export, sleep timers, keyboard information), Shortcuts & macros (macros: list, step editor,
  recording, names, save to the keyboard; the other four kinds are listed as coming soon). Typing feel is a
  placeholder.
- **The keyboard stage** takes at most half of the space it shares with the page and has a resize handle.
- **Checked by the user on the real keyboard:** assigning keys, undo / redo, lighting, unlock and lock, the Test
  page unlocked (M1-M5, Mute, Fn and Fn2 register), backup, restore and `.vil` restore. The user likes the look,
  the wording and the help as they are.
- Chrome on Windows does not pass the volume keys to a page (the user's check), so knob turns that send volume
  can't be seen; the Test page says so and points to the layer where the knob scrolls.
- Not yet confirmed on the real keyboard: saving and undoing a macro, the stage's resize handle, the lighting
  values after a restore followed by an effect change, restoring macros while locked (should be skipped), the
  sleep timers.
- The user has given permission to stage and commit in this repo, section by section. The remote is
  `origin` = github.com/phazei/layerworks (private); push only when the user says so.

## Standing instruction from the user

Keep building without waiting for approval of mock-ups: build real pages on the demo keyboard, commit section by
section, and let the user react to the result. The user reviews in the browser afterwards, so every package ends
with screenshots (see `AGENTS.md`) and notes on what to look at.

## Waiting on the user

- To try on the real keyboard (take a backup first): unlock, edit Macro 1 on Shortcuts & macros, save, press its
  key, then Undo and press it again; the other macros should be untouched. The stage's resize handle. The
  lighting after a restore (what the page shows matches the keyboard after picking another effect).
- Whether to push after every reviewed commit from now on, or only when asked.
## Next

The first six work packages (shell, Keys, Home and Settings, Lighting, Test and unlock, Device) are built and the
user's first reactions are applied. Each item below is sized for one delegated agent; two at most run at a time
(`AGENTS.md`).
### Phase 6 packages (spec section 7)

- **Shortcuts & macros, the other four kinds**: tap dance ("multi-tap keys"), combos ("key chords"), key overrides
  ("shortcut replacements"), alt repeat ("repeat rules"), each as a list section beside Macros.
- **Typing feel**: the QMK settings the keyboard reports (tap/hold timing, auto shift, mouse keys …) with plain
  names, and debounce / Snap Click from the Keychron data.
- **Keys, tap/hold choices**: "one thing when tapped, another when held" (mod-tap, layer-tap) in the inspector.
- **Lighting, per key**: Keychron per-key RGB and mixed zones (the data is in the backup already, not restored).

### Small things from review

- Status line says "Saved on the keyboard" while a macro has unsaved edits.
- At 1000×700 the half-height cap leaves a very small picture (the Follow toggle and the layer row take most of
  the stage).
- Macro text is typed as on a US layout (on a German layout "y" comes out as "z"); the help says so.
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

The user's order: finish the remaining functionality first; extras that need our own firmware come at the end
and are optional (a plugin or a capability), so the app stays useful on any Vial keyboard.

- **"Put back the firmware's key"** (firmware extra): no VIA or Vial command reads the keymap compiled into the
  firmware; ours can add one (`keycode_at_keymap_location_raw` and the encoder equivalent), giving the Keys
  inspector "the firmware's own key here is Page Up" and a put-back button where the firmware has the command.
- **A reference keymap without firmware help**: load a backup file as a reference and show per key what it
  holds, with "put back from the backup". Works on any keyboard. Pipette's "Keyboard" tab in its key picker is
  the same idea: a keyboard layout (the live one, another device, or a saved file) used as a source of keys.
- **`..\tools\keyboard\keymap.py`** writes its own `backups/keymap.json` (keys and knob only), which the app
  doesn't read. Make it write a known format instead (a `.layerworks.json` holding only keys and knob, with the
  app accepting such partial files, is the least work; `.vil` needs QMK key names in Python), and point
  `scripts/demo-data.mjs` at the new file.
- Knob turns on the Test page for any assignment need the keyboard to report them (the planned key push).- Phase 7 (help content, first-run tour), 8 (Ripple plugin with its firmware command; see `../TASKS.md` "Firmware extensions").
- Upstream candidate: Pipette's web transport hands layer reports to waiting requests
  (`../docs/research/spike-results.md`, finding 1). A fix would be a branch in `../pipette`.
