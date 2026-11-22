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

Everything but the Ripple plugin and the firmware extras is built. Three audits are done and applied: the spec
and the documents, the Help section, and the text on the pages themselves (findings in
`%TEMP%\opencode\layerworks-audit\`: `spec-audit.md`, `help-audit.md`, `ui-text-audit.md`). The parent repo's
documents are edited and uncommitted (the user commits there).

**Preparing a release** (the user's answers, 2026-11-21). Hosting: GitHub Pages from this repo, like the user's
`https://phazei.github.io/MediaSyncer/`. The user won't test everything on the keyboard: bugs are reported as
found, and people who find one are asked to open an issue. The licence stays GPL-3.0-or-later (the user: "since
everything else is GPL then GPL it is").

**In progress right now:**

- `ses_dfe287d45ffeph6OlbTU2Fsd01` (read-only): item 1, other keyboards, findings to
  `%TEMP%\opencode\layerworks-audit\other-keyboards-audit.md`. It has scratch tests in `src/__audit__/` while it
  runs (they make `pnpm lint` fail; never commit them) and must delete them: check `git status` is clean when it
  reports. Port 5203. When it reports: read the findings, check firmware claims against `../vial_qmk`, tell the
  user; then start item 3's fixes (below), then item 4.

**Item 3 is audited** (`failure-audit.md`, 19 findings F1 to F19, by `ses_dfe21a33cffeE72FiCdiqmXdSX`; two
firmware claims checked: macros play unless the buffer's last byte is non-zero, `dynamic_keymap.c:250`; a single
`set_keycode` of `QK_BOOT` is not blocked while locked in this fork, only buffer writes, encoders and entries
are). **The user approved all 19 fixes**; they go to the same session once the other-keyboards audit has finished
(they change the store, which that audit is running against). The worst: a macro save that stops half-way leaves
scrambled macros the keyboard still plays (write the last byte first, as VIA does); `?put-on-key=QK_BOOT` skips
the unlock check (move it into the store's assign; screenshot URL options only on the demo); on 2.4 GHz a
sleeping keyboard makes restore grind and the unlock dialog wait for ever; a write that times out is shown as
not done though it often was; two tabs on one keyboard are not detected (Web Locks); `.vil` values are not
range-checked; a damaged value under a `layerworks:` name in browser storage blanks the app.

**Items 2 and 5 are done** (`licence-audit.md`; built by `ses_dfe11cdf9ffe4Pd28GXZNCI06g`; README "Hosting" and
"Licence" describe the result). Nothing blocked going public: the licences are compatible, the files hold nothing
personal, and the name is fine for a free open-source app (other "Layerworks" are 3D-printing businesses and a
Japanese WordPress company; nothing in keyboards). The copyright line names `phazei` (the user), and the commit
address in the history stays (already public on the user's other repos). The workflow
(`.github/workflows/pages.yml`) has never run: its first run is the user's first push after the repo is public.
Left open:

- **The address.** The user owns `tybyfy.com` and is thinking of `layerworks.tybyfy.com` instead of
  `phazei.github.io/layerworks/`. Better decided before release: the browser ties the keyboard permission and the
  stored names to the address, and an own address shares its storage with no other project. If chosen: a DNS
  `CNAME` record `layerworks` → `phazei.github.io` (the user), the domain entered in Settings → Pages (the user;
  no `CNAME` file is needed when the workflow deploys), and the address in README "Hosting", `package.json`
  `homepage` and the workflow's comment. The build is relative, so nothing else changes.
- **The version** shown in About is `0.0.0` (`package.json`); a release wants a real one.
- **"Report a problem"** is in About and on Help's start page, not beside the connect error (left out so people
  don't open issues for problems on their own computer).
- The bundle is one chunk, 857 kB (275 kB gzipped); the builder advises against splitting pages, at most React in
  a chunk of its own. `pnpm audit --prod` is clean; one moderate finding in a lint-only package (minimatch).
- The user's steps on GitHub are under "Waiting on the user".

1. **Other keyboards** (a read-only agent first): load a spread of public Vial definitions into the fake keyboard
   (no knob, no lighting, lighting that isn't VialRGB, not Keychron, odd matrix sizes, layout options, few or no
   macros and entries, older Vial protocol) and report what breaks or reads wrongly on each page. "Layout
   options" below belongs to this.
2. **Licences and the name** (a read-only agent): how much of the app is vendored GPL code (files, lines, what
   each part does); that the notices, SPDX headers, the Settings licence list and the dependencies' licences are
   complete and compatible; the demo data's origin (Keychron's keymap and definition) and whether the files or
   the git history hold anything personal; "Layerworks" against existing projects and trademarks.
3. **Things that go wrong mid-write** (a read-only agent): unplugging during a restore, a reset or a macro save;
   two tabs on one keyboard; a damaged or hostile backup or `.vil` file. What the app says and whether the
   keyboard can be left half-written. A browser without WebHID is checked: in Firefox the user sees "This browser
   can’t talk to keyboards. Open Layerworks in Chrome or Edge on a computer. You can still try the demo
   keyboard.", and the demo works.
4. **Accessibility and colours**: text contrast of the token pairs in both themes, keyboard-only use, screen
   reader names. The user: worth a look, not important as long as it is close.
5. **Hosting**: `vite.config.ts` sets no `base`, so the build's asset addresses would break under
   `https://phazei.github.io/layerworks/`; set it (the routes are `#/…`, so no rewrite rules are needed). A
   GitHub Actions workflow that builds and publishes on push to `main` (the user pushes). GitHub Pages on a free
   account needs the repo public. The app's preferences are in `localStorage` under `layerworks:` names, which
   matters because every `phazei.github.io` project shares one origin. `pnpm audit`; the main chunk over 500 kB.
   The published page must link to the source (the licence requires the source to be offered).
6. **Documents for a public repo** (the user does this round in release prep): `README.md` reads like an agents
   file and is too long for one; it becomes a README for people (what it is, which keyboards, how to open it,
   screenshots, how to report a bug), and its how-it-works content moves to documents under `docs/`. The spec is
   in the parent repo (`../docs/spec/layerworks.md`) and several documents cite `../vial_qmk` and other parent
   paths: a standalone clone has dead links, so the spec moves here or the references say where it lives.
   `TASKS.md` and `AGENTS.md` carry session IDs and are written for agents.

- The audit's calls made by the orchestrator, for the user to flip if wanted: the firmware key push and matrix
  read stay optional and deferred; creating a macro from the Keys inspector is dropped; the main lighting and the
  sleep timers stay outside Undo; Keychron's factory reset (Fn + J + Z) is described in the help.
- Sessions to reuse: `ses_e1debfc70ffey83TnPHv8IaaIG` built the Keys inspector, palette, "Press a key", the
  Shortcuts pickers and list, the key names by layout and the N-key rollover capability;
  `ses_dffa4d191ffeMwlEbSjDhltGcs` built the Caps Lock light, Lighting's picture for every effect, and Device's
  reset and firmware-update restart; `ses_e1dbde8fdffe6vAbqPoj1rjpio` built the Help guide and tour and applied
  the Help audit; `ses_dff3fa2b0ffe6kjHrCoP9ijYcU` audited the spec and rewrote the documents;
  `ses_dff103bf6ffeeheF4xktrsBLLr` audited and corrected the pages' own texts.

## Waiting on the user
- **Publishing, once on GitHub** (after the documents round): make the repo public (Settings → General → Danger
  Zone); Settings → Pages → Build and deployment → Source: "GitHub Actions"; push `main` (or run "Publish to
  GitHub Pages" from the Actions tab). If the first run fails at install, `node-hid` (a dev dependency with a
  native part) is the likely cause.
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
- **Plain VIA keyboards, without lighting** (a to-do, not started; the user: stays as a to-do for now). Keys,
  layers, knob, macros and backup on firmware that has VIA but not Vial (the K15's VIA build,
  `..\tools\build.cmd`, is the test keyboard; back up before swapping firmware). It reverses the spec's "Vial
  firmware only" (sections 2 and 3). What is known: `../docs/research/via-support.md`. Lighting stays out (VIA
  describes it in the definition's "custom menus"). Size: medium; the connect sequence without Vial's definition,
  a VIA mode for the fake keyboard, and backup / restore without Vial data are the bulk.
- **A licence other than the GPL** (asked by the user, not planned): the app is GPL-3.0-or-later because the
  vendored Pipette code (GPL-3.0-or-later as a whole) is bundled into it; bundling, importing or linking makes one work, a
  separate program talked to at arm's length does not. Only our own code could be relicensed, so it would take
  replacing every vendored part (keycode tables, layout parsing, protocol commands, macro and `.vil` encoding,
  the keyboard picture) with independently written code, and the demo's Keychron keymap data. QMK, Vial, VIA's
  app and Pipette are all GPL, so nothing in this field expects otherwise.
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
