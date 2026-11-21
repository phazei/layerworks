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
  speed, colour, plugin panel slot; a still picture of the effect on the keys; the Caps Lock light on Keychron
  keyboards), Settings (theme, key names by the computer's layout, layer names, about, the tour), Help (a guide: topics grouped the way the app is, search that knows QMK's names, a
  glossary, each topic with its own address), Test (keys seen from browser key events and, once unlocked, from the key
  matrix; knob turns from what they send to the browser), Device (backup and restore to one file, Vial `.vil`
  import and export, sleep timers, keyboard information; under More options, reset to defaults and restart for
  a firmware update), Shortcuts & macros (macros with a step editor and
  recording; multi-tap keys, key chords, shortcut replacements and repeat rules, each with an inline editor;
  drafts saved with "Save to keyboard"), Typing feel (the keyboard's QMK settings by what they feel like, with
  search; Keychron debounce and Snap Click; undoable; reset all). Keys also has "Press a key" (the next key pressed is
  assigned; every key once unlocked), "Tap or hold" (mod-tap,
  layer-tap) and names macros and multi-tap keys in the palette; the palette also has Typing helpers (Caps
  Word, Layer Lock, Esc/` key, Space Cadet), Swapped and disabled keys (QMK's "magic"), International keys,
  and a closed "More keys" fold (features on and off, restart, firmware update). Lighting has Key by key (paint colours) and
  Mixed zones (areas with their own effects) for Keychron keyboards; their editors open below the effect
  grid. No page is a placeholder any more.
- **A first-run tour** (six steps over the real shell) starts by itself once on Home and again from Help or
  Settings. The "?" buttons toggle the help panel.
- **Numbering:** macros and multi-tap keys carry QMK's own number ("Macro 1" is `M1`, the key Keychron prints
  M1; "Multi-tap 1" is `TD(1)`); number 0 is listed last and used last by Add. Key chords, shortcut
  replacements and repeat rules count from 1. The user's real keymap holds `M1`-`M5` on its M1-M5 keys.
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
  `origin` = github.com/phazei/layerworks (private); the user does the pushing.

## Standing instruction from the user

Keep building without waiting for approval of mock-ups: build real pages on the demo keyboard, commit section by
section, and let the user react to the result. The user reviews in the browser afterwards, so every package ends
with screenshots (see `AGENTS.md`) and notes on what to look at.

## Where the conversation stands

The user's plan, in order: (1) list what is left from the spec: done and discussed, "Left from the spec" below;
(2) build what the user picked from it: done and committed, waiting for the user to try it (the list under
"To try on the real keyboard" starts with it); (3) audit where the project is against the spec and the
documents; (4) update the files. Nothing is running in the background.

- Not decided, ask again: Tap or hold building a multi-tap key by itself (the user asked how it would go: the
  app takes the first empty multi-tap key, fills in tap and hold, puts it on the key, one undo for both; it uses
  up a slot, and changing the key later leaves the slot filled).
- Sessions to reuse: `ses_e1debfc70ffey83TnPHv8IaaIG` built the Keys inspector, palette, "Press a key", the
  Shortcuts pickers and list, and the key names by layout; `ses_dffa4d191ffeMwlEbSjDhltGcs` built the Caps Lock
  light, Lighting's picture for every effect, and Device's reset and firmware-update restart.

For the audit:

- The spec (`../docs/spec/layerworks.md`) stays where it is and is brought up to date; it is not archived (it is
  the living design, phase 8 and section 10 are unbuilt, and both `AGENTS.md` files point agents at it). The
  user asked about archiving finished specs and hasn't answered this recommendation yet.
- The parent repo's `TASKS.md` was corrected (it still said only phase 1 was built); that edit is uncommitted,
  the user commits there. The spec is in the parent repo too.
- Read the whole spec against `README.md` here, not only section 7; "Decided differently from the spec" below is
  the start of the list, not the end.

## Waiting on the user

- Decided by the user: macros keep their numbers; no moving or swapping. Vial's "negative mods" (a shortcut
  replacement's "must not be held") gets no more attention for now.
- Decided by the user: joystick, programmable buttons and the other niche families stay out of the palette
  (reachable by typing the QMK code). "Make this the base layer and remember it" (QMK's `PDF`) is left out too:
  a one-time key, and on Keychron keyboards the Mac/Win switch sets the base layer at every start
  (`../vial_qmk/keyboards/keychron/k15_max/k15_max.c`, `dip_switch_update_kb`), so it does nothing lasting.
- **Proposed, waiting for the user's go: plain VIA keyboards, without lighting.** Keys, layers, knob, macros and
  backup on firmware that has VIA but not Vial (the K15's VIA build, `..\tools\build.cmd`, is the test keyboard;
  back up before swapping firmware). It reverses the spec's "Vial firmware only" (sections 2 and 3), which is
  rewritten when this starts. Known so far:
  - The app's connection starts with Vial's keyboard ID and built-in definition; a VIA keyboard has neither, so
    the layout comes from a definition file.
  - VIA serves definitions at `https://usevia.app/definitions/v3/<vendorId * 65536 + productId>.json`, readable
    from a web page (`access-control-allow-origin: *`); a keyboard it doesn't know gets an HTML page with status
    200. `definitions/supported_kbs.json` lists the IDs it has: 129 Keychron boards, **not the K15 Max**
    (`3434:0AF0`). So loading a file is needed too; `..\via\k15_max_cable.json` is the K15's.
  - Keys, layers and macros use the same commands in both; the knob needs VIA's `0x14` / `0x15`; VIA's macro
    bytes and key numbering against Vial's are unchecked. Everything Vial-only is hidden through `capabilities`.
  - Lighting is left out (the user's call): VIA describes its lighting controls in the definition file ("custom
    menus", VIA protocol 11 and later), which would need a page built from that.
  - Size: medium, not small. The connect sequence, a VIA mode for the fake keyboard, and backup / restore without
    Vial data are the bulk.
  - Background: Vial kept VIA's protocol at version 9 and added its own commands; Keychron's firmware is at 12,
    upstream QMK at 13. Vial's author has said newer VIA protocols won't be supported (vial-gui issues 134 and
    138), so the two don't converge. Keychron Launcher refuses the Vial build because of that, on the cable
    too; the 2.4 GHz scrambling (XOR `0x28`) is only on the wireless path and is not the cause.
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
things below, the user's bug reports as they come, and the optional extras under "Later". Each item below is sized for one delegated agent;
two at most run at a time (`AGENTS.md`).

### Left from the spec

What `../docs/spec/layerworks.md` describes and the app doesn't have (checked against the code). The firmware
part and the Ripple plugin are under "Later".

- **Keys** (section 7): Tap or hold falling back to a multi-tap key by itself when the tap isn't a plain key
  (today it points to multi-tap keys; not decided, see "Where the conversation stands"); creating a macro or
  shortcut from the inspector (today: pick one, empty ones included, and a link to set it up; close enough).
- **Lighting**: a live preview of the effect on a picture is **dropped** by the user (the tiles' previews and the
  still picture under the grid are enough).
- **Key names by layout, what it doesn't do:** the browser reports only what each key types without Shift, so on
  a layout that isn't US the second legend is left out, QMK's shifted keys read "Shift + 1", AltGr characters
  appear nowhere and dead keys show as plain characters. A follow-up if wanted: a small table of the shifted
  rows of the commonest layouts (German, French, Spanish, UK), chosen by matching the unshifted map.
- **Plugins** (section 9): the "declared settings" level (a JSON description of extra settings, no code) and the
  `DeviceContext` handed to code plugins (request, pushes, state, capabilities, drawing on the picture). The
  registration (`plugins/api.ts`: pages, panels, push shapes, effect names) is there and the pages use it.
- **Decided by the user**: the key test stays as it is (no firmware changes for it); the Ripple plugin is
  deferred, with everything that goes with it (the firmware's ripple commands, plugin "declared settings", the
  `DeviceContext`).
- **Open in the spec**: whether backup/restore reads other apps' files beyond `.vil` (section 14); the name
  "Layerworks" checked against existing projects and trademarks.
- **Decided differently from the spec, to write into it**: the stage is on Home and Keys only (Test, Shortcuts
  and Lighting draw their own picture); no mock-up phase; the smallest window is 1000×700; sleep timers are on
  Device, not under Lighting; unlock / lock is in the sidebar's device card; the app is meant to work on any Vial
  keyboard, not only Keychron's (the spec's non-goals say otherwise).

### Small things from review

- Device: the restore plan is worked out when the file is opened; an Undo or Redo before pressing Restore isn't
  reflected in it. "Unlock first…" always gives macros as the reason, also when it is the bootloader key.
- Shortcuts: no test for "edits made while a save is running are kept". Editor headers show QMK's plural ("Combos") beside a single item. Summaries use the key
  tables' names ("Escape", "` and ~"). The chord picture is small at 1000×700.
- Help: searching "backup" lists "Restoring a backup" above "Backing up". No "?" yet on Settings' Appearance,
  Typing feel's Other settings card and the stage's resize handle. In headless screenshots the tour's ring can
  sit a little off a mid-page target (README "Help and the tour"); in a real browser it lines up.
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
- Macro text is typed as on a US layout (on a German layout "y" comes out as "z"); the help says so.
- Test: where the knob scrolls, ordinary mouse scrolling marks it as seen too; the browser can't tell them apart.
- The plain demo keyboard has no wireless features (Home's tests expect that); `?demo-wireless` turns them on.
- `readFirmware` lives in `src/pages/device/firmware.ts` and Home imports it from there; move it to `src/device`
  when something else needs it.
- The vendored keycode tests fail when run in shuffled order (upstream's; left alone).
- The build warns that the main chunk is over 500 kB; split the vendored keycode tables or the pages when it
  matters.

## Later

The user's order: finish the remaining functionality first; extras that need our own firmware come at the end
and are optional (a plugin or a capability), so the app stays useful on any Vial keyboard.

- **Phase 8, plugins**: the Ripple plugin for the K15 Max (names effect 41, sliders for the ripple's settings
  through a firmware command; see `../TASKS.md` "Firmware extensions").
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
- Knob turns on the Test page for any assignment need the keyboard to report them (the planned key push).
- Upstream candidates for Pipette (branches in `../pipette`): its web transport hands layer reports to waiting
  requests (`../docs/research/spike-results.md`, finding 1); its mixed-RGB editor uses the wrong effect
  numbering for zones (zones use the keyboard's own effect numbers; see `src/device/keychron-rgb.ts`).
