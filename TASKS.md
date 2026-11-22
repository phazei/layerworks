# Tasks

The current state of Layerworks, for whoever picks it up next. Finished items are deleted; what was learned goes
into `README.md`, `AGENTS.md`, `VENDOR.md` or the spec (`../docs/spec/layerworks.md`). Phases are the spec's
(section 12). How the work is organised (orchestrator and delegated packages) is in `AGENTS.md`.

## Where we are

- **Phases 1 to 7 of the spec are built**: every page, the help guide and the first-run tour (what each page does:
  `README.md` "The built pages"). Phase 8 (the plugin API's second level and the Ripple plugin) is deferred.
- **Checked by the user on the real keyboard**: the picture and the live layer on the cable and through the 2.4 GHz
  receiver; assigning keys, undo / redo, lighting, unlock and lock, the Test page unlocked (M1-M5, Mute, Fn and
  Fn2 register), backup, restore and `.vil` restore. The user likes the look, the wording and the help as they are.
- Not yet confirmed on the real keyboard: saving and undoing a macro, the stage's resize handle, the lighting
  values after a restore followed by an effect change, restoring macros while locked (should be skipped), the
  sleep timers; and the list under "To try on the real keyboard".

## Where the conversation stands

The audits are done and applied: the spec (`../docs/spec/layerworks.md`) and the documents are current, the Help
section was checked against the app and the firmware and corrected, and N-key rollover is hidden where the
keyboard does it by itself. The parent repo's documents are edited and uncommitted (the user commits there). The
findings files are in `%TEMP%\opencode\layerworks-audit\` (`spec-audit.md`, `help-audit.md`).

The text on the pages themselves (hover lines, hints, effect descriptions, confirmations, messages) was audited
and corrected too (`ui-text-audit.md` in the same folder, T1 to T43, by `ses_dff103bf6ffeeheF4xktrsBLLr`).
Nothing is running in the background, and nothing is waiting for an answer from the user.

- The audit's calls made by the orchestrator, for the user to flip if wanted: the firmware key push and matrix
  read stay optional and deferred; creating a macro from the Keys inspector is dropped; the main lighting and the
  sleep timers stay outside Undo; Keychron's factory reset (Fn + J + Z) is described in the help.
- Sessions to reuse: `ses_e1debfc70ffey83TnPHv8IaaIG` built the Keys inspector, palette, "Press a key", the
  Shortcuts pickers and list, the key names by layout and the N-key rollover capability;
  `ses_dffa4d191ffeMwlEbSjDhltGcs` built the Caps Lock light, Lighting's picture for every effect, and Device's
  reset and firmware-update restart; `ses_e1dbde8fdffe6vAbqPoj1rjpio` built the Help guide and tour and applied
  the Help audit; `ses_dff3fa2b0ffe6kjHrCoP9ijYcU` audited the spec and rewrote the documents.
## Waiting on the user

- **Proposed, waiting for the user's go: plain VIA keyboards, without lighting.** Keys, layers, knob, macros and
  backup on firmware that has VIA but not Vial (the K15's VIA build, `..\tools\build.cmd`, is the test keyboard;
  back up before swapping firmware). It reverses the spec's "Vial firmware only" (sections 2 and 3). What is known
  (definitions from usevia.app, protocol versions, what is unchecked): `../docs/research/via-support.md`. Lighting
  stays out (the user's call: VIA describes it in the definition's "custom menus"). Size: medium; the connect
  sequence without Vial's definition, a VIA mode for the fake keyboard, and backup / restore without Vial data are
  the bulk.
- The user is testing page by page and reports bugs as found; the dev server (`pnpm dev`) is open while agents
  edit, so the user sees work in progress.
- **To try on the real keyboard** (take a backup first):
  - Built last, not yet tried: **Press a key** on Keys (locked: a letter, then Fn to see the explanation;
    unlocked: the M1 key and the Fn2 key, on the cable and over 2.4 GHz). **Caps Lock light** on Lighting (colour,
    off and on, undo, replug after 2 s to see it was saved). **Reset to defaults** on Device, More options (box
    unticked: macros survive; then restore the backup; it puts back the compiled `keymap.c`, not the saved
    keymap; each reset request waits 5 s, twice: say if the page reports a failure although the reset worked).
    **Restart for a firmware update** (unlock, restart, the keyboard shows up as the STM32 updater; replug to
    get it back). The Shortcuts list's sections; the still picture under Lighting's effect grid.
    **"Put it on a key…"** in a macro or multi-tap key (opens Keys waiting for a click; another layer first,
    then a key, then Undo), and Tap or hold's "multi-tap key" link (opens the first empty one).
  - The Shortcuts pickers: a key chord that sends Caps Word; a macro with a step "Swap Caps Lock and left
    Ctrl", pressed twice with Caps Lock tried in between; Shift + Backspace → Delete opens with no lighting
    keys in its "To send instead" list.
  - The newest changes: the printed M1 key reads "Macro 1" in the picture and palette; "Unlock to save…" on a
    macro saves by itself once the keyboard is unlocked; the tap-toggle sentence on Switch layer shows the
    keyboard's own tap count; the tour (Settings or Help, "Take the tour").
  - Macros: unlock, edit Macro 1, save, press its key, then Undo and press it again; the other macros should be
    untouched.
  - Shortcuts: J + K → Esc as a key chord; Shift + Backspace → Delete as a shortcut replacement; a multi-tap
    key put on a key, tapped and double-tapped; undo each.
  - Keys: Caps Lock as tap Escape / hold Ctrl; Space as tap Space / hold Fn2.
  - Typing feel: change the hold time and undo; "Windows keys do nothing" on and off (the firmware releases all
    held keys on that write); a Snap Click pair (A and D), then replug to see it was saved; debounce (the
    keyboard is at 50 ms); "Reset all typing settings…" last.
  - Lighting: paint a few keys in Key by key (they change at once; replug after 2 s and they stay); a starting
    point, then undo a stroke; in Mixed zones paint keys into zone 2 and change its effect (the effect shown
    is the one picked: this checks the zone effect numbering); the main colour after going from Mixed zones
    to another effect; a restore that includes key colours; the lighting after a restore (what the page shows
    matches the keyboard after picking another effect).
  - The stage's resize handle.

## Next

Every page in the spec's section 7 is built, and the help guide and tour of phase 7. What is left is the small
things below, the user's bug reports as they come, and the optional extras under "Later". Each item below is
sized for one delegated agent; two at most run at a time (`AGENTS.md`).

### Left from the spec

What `../docs/spec/layerworks.md` describes and the app doesn't have, apart from phase 8 and the firmware
extensions (under "Later"):

- **Layout options** (spec section 7, Keys): the picture and the Test page's key count use the definition's
  default layout; `ui/KeyboardPicture.tsx` passes no `layoutOptions` to the widget (which takes them) and
  `device/matrix.ts` `matrixKeys` uses an empty map. Make both follow the keyboard's layout options (read at load,
  `KeyboardData.layoutOptions`). A control to change them comes once a keyboard that has them is tried (the K15 Max
  has none).

### Small things from review

- Device: the restore plan is worked out when the file is opened; an Undo or Redo before pressing Restore isn't
  reflected in it. "Unlock first…" always gives macros as the reason, also when it is the bootloader key.
- Shortcuts: no test for "edits made while a save is running are kept". Editor headers show QMK's plural
  ("Combos") beside a single item. Summaries use the key tables' names ("Escape", "` and ~"). The chord picture is
  small at 1000×700.
- Help: no "?" on the stage's resize handle.
- `src/ui/KeyboardPicture.tsx` imports the layer names from `src/shell/layer-names.ts`, the one place `ui`
  reaches into the shell; move the names store down (`src/device` or `src/ui`) when it is next touched.
- The picture: "Hold" over a long layer name ("Windows Fn") takes three lines on a 1u key; tight but legible.
- Typing feel: clicking a group in the side list scrolls to it but doesn't move keyboard focus there.
- Lighting: a zone slot's play time can't be set while it is the zone's only effect (harmless). The picture in
  the key colours editor is small at 1000×700. Read back while the lights are off, the keyboard can report the
  saved colour rather than the last one sent; turning the lights on sends the values the page shows.
- Keys in a short window: the palette shows five columns and feels crowded. The palette's group titles are small
  muted text, the weak-header pattern the Shortcuts list had.
- Key names by layout: a US letter in the palette search can find two tiles (on German, "y" finds the tile shown
  as Z and the one shown as Y); "!" still finds "Shift + 1" through its US name, wrong on French.
- Device card: the quiet "Unlock…" and "Lock" buttons read as plain text; give them a slightly stronger style.
- `readFirmware` lives in `src/pages/device/firmware.ts` and Home imports it from there; move it to `src/device`
  when something else needs it.
- `src/pages/test/useMatrix.ts` only re-exports `src/device/useMatrix.ts`; the Test page can import the device one.
- The build warns that the main chunk is over 500 kB; split the vendored keycode tables or the pages when it
  matters.

## Later

The user's order: finish the remaining functionality first; extras that need our own firmware come at the end
and are optional (a plugin or a capability), so the app stays useful on any Vial keyboard. Nothing in the app
waits on them: unlocking shows every key on the Test page and to "Press a key".

- **Phase 8, plugins** (deferred by the user): the plugin API's second level (declared settings; a device context
  that hands a plugin's `pushes` to the transport and fills `capabilities.hasCommand`), and the Ripple plugin for
  the K15 Max (names effect 41, sliders for the ripple's settings through a firmware command; spec sections 9 and
  10, `../TASKS.md` "Firmware extensions").
- **Firmware extensions** (spec section 10, optional): the key-press push (it would let the Test page see every
  knob turn, whatever it sends) and a matrix read without unlock; an unlock that can't strand the keyboard.
- **"Put back the firmware's key"** (firmware extra): no VIA or Vial command reads the keymap compiled into the
  firmware; ours can add one (`keycode_at_keymap_location_raw` and the encoder equivalent), giving the Keys
  inspector "the firmware's own key here is Page Up" and a put-back button where the firmware has the command.
- **Live lighting from the PC** (a plugin): music, a tint per layer, through VialRGB's direct mode (9 LEDs per
  packet, not saved; `../docs/research/README.md` section 2, "Ours only").
- **A reference keymap without firmware help**: load a backup file as a reference and show per key what it
  holds, with "put back from the backup". Works on any keyboard. Pipette's "Keyboard" tab in its key picker is
  the same idea: a keyboard layout (the live one, another device, or a saved file) used as a source of keys.
- **Key names on other layouts, shifted characters**: a small table of the shifted rows of the commonest layouts
  (German, French, Spanish, UK), chosen by matching the unshifted map, if wanted (README "Key names and the
  computer's layout" says what the browser doesn't tell).
- **`..\tools\keyboard\keymap.py`** writes its own `backups/keymap.json` (keys and knob only), which the app
  doesn't read. Make it write a known format instead (a `.layerworks.json` holding only keys and knob, with the
  app accepting such partial files, is the least work; `.vil` needs QMK key names in Python), and point
  `scripts/demo-data.mjs` at the new file (also in `../TASKS.md` "Small things").
- **The K15's own key names** in the palette's "This keyboard" group come from the definition in the parent
  project (`..\keyboards\keychron\k15_max\ansi_encoder\rgb\keymaps\ripple\vial.json`, `..\via\*.json`): "Misson
  Control" (a typo), "2.4G", "Bluetooth Host 1". Better titles are in `ui-text-audit.md`, T11 ("Bluetooth device 1
  (hold to pair; on Bluetooth only)" …). Not now (the user): it needs a firmware build and flash; do it when the
  firmware is next touched.
- Vial's "negative mods" (a shortcut replacement's "must not be held", under More options): no more work on it
  unless the user asks.
- Upstream candidates for Pipette (branches in `../pipette`): its web transport hands layer reports to waiting
  requests (`../docs/research/spike-results.md`, finding 1); its mixed-RGB editor uses the wrong effect
  numbering for zones (zones use the keyboard's own effect numbers; see `src/device/keychron-rgb.ts`).
