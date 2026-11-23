# Pages

What each built page shows and does, and the files behind it.

The design is in [spec.md](spec.md). Every section of it has its page here (see "The built pages"); the plugin
API's second level and the Ripple plugin are not built (spec sections 9, 12).

<!-- contents:start -->
**Contents**

- [The built pages](#the-built-pages)
  - [Home](#home)
  - [Keys](#keys)
    - [A key: the palette](#a-key-the-palette)
    - [Press a key](#press-a-key)
    - [Macro and multi-tap tiles](#macro-and-multi-tap-tiles)
    - [The palette's other groups and More keys](#the-palettes-other-groups-and-more-keys)
    - [A shortcut](#a-shortcut)
    - [Switch layer](#switch-layer)
    - [Tap or hold](#tap-or-hold)
    - [More options: nothing, one-tap modifier, key code](#more-options-nothing-one-tap-modifier-key-code)
    - [Keycode builders and readers](#keycode-builders-and-readers)
    - [Assigning, knob directions and lighting keys](#assigning-knob-directions-and-lighting-keys)
  - [Settings](#settings)
  - [Help](#help)
  - [Lighting](#lighting)
    - [Effect data, the slider queue and plugin names](#effect-data-the-slider-queue-and-plugin-names)
    - [Key by key and Mixed zones](#key-by-key-and-mixed-zones)
    - [On the keys: the still picture](#on-the-keys-the-still-picture)
    - [Caps Lock light](#caps-lock-light)
  - [Typing feel](#typing-feel)
  - [Test](#test)
  - [Device](#device)
    - [Back up and restore](#back-up-and-restore)
    - [Wireless and sleep](#wireless-and-sleep)
    - [Start over or update](#start-over-or-update)
    - [About this keyboard](#about-this-keyboard)
  - [Shortcuts & macros](#shortcuts--macros)
    - [Numbering of macros and multi-tap keys](#numbering-of-macros-and-multi-tap-keys)
    - [The list of shortcuts](#the-list-of-shortcuts)
    - [Editors for chords, replacements, multi-tap keys and repeat rules](#editors-for-chords-replacements-multi-tap-keys-and-repeat-rules)
    - [What each picker offers](#what-each-picker-offers)
    - [The macro editor](#the-macro-editor)
    - [Drafts of shortcuts](#drafts-of-shortcuts)
    - [Recording a macro](#recording-a-macro)
<!-- contents:end -->

## The built pages

### Home

Files: `Home.tsx`, `home/`.

The landing page. Under the stage: the keyboard's name with connection,
battery (on 2.4 GHz, when known), the active layer by name, firmware version and lock state (with Unlock… while
locked; the facts' "?" sit beside their labels); four shortcut
tiles (keys, lighting, backup, test); and what the keyboard can do, from `capabilities`
(`home/features.ts` gives each feature its friendly and QMK name; lighting counts the effects the Lighting page
offers, `capabilities.effectCount`, without Off and Direct Control; N-key rollover reads "the keyboard does it by
itself" where the keyboard reports adaptive N-key rollover, and "a switch on Typing feel" where it is QMK's
setting 21, and is available exactly where one of the two applies), with the missing ones and their reasons
behind a `Disclosure`. With no keyboard it shows the connect prompt and three lines on what the app is for.

### Keys

Files: `Keys.tsx`, `keys/`.

Click a key or one side of the knob on the stage; with nothing selected the
page says so. Armed from a shortcut's "Put it on a key…" (see Shortcuts & macros, the macro editor), it says
which shortcut the next click puts on a key instead, and the clicked key gets it. The inspector (`keys/Inspector.tsx`) is two columns from 42rem (a container query), so in a small
window the palette starts at the top of the card; one column when narrower. With two columns the card fills
exactly the space under the stage (placed absolutely in a wrapper, at least 15rem tall), so nothing in it makes
the page taller: the palette scrolls in its box, and the left column (question, choice, More options) and a
tall choice scroll on their own. Both columns are `relative`, and so is a `Checkbox`'s label: its hidden input
is placed absolutely, and inside a box that isn't positioned it would escape the box's clipping and give the
page empty room to scroll into (it did, with More options open). With one column the card is as tall as its contents and the page scrolls,
More options last; there the palette, search row and "A key" list together, takes the height that can be seen
under the stage less 4rem (the room the two-column layout leaves around it: `keys/visible-height.ts`), so
scrolled into place it fills what can be seen. It asks "What should this key do?", says which layer it is on and, above the base layer,
whether
the key has its own assignment or falls through, and to what (`keys/describe.ts`, `fallThrough`: from a layer
above the keyboard's base layer to the base layer, then layer 0; from any other layer straight to layer 0;
worded "normally", since other layers held at the same time aren't counted). "Now" shows the current assignment as a keycap,
in words, and its QMK name; a key that does two things has a two-line cap, tap above hold ("Esc" over "Ctrl",
`capLabel`), and reads "Tap: Escape · Hold: Ctrl". A macro or multi-tap key shows its name and summary
("Macro 1 · Types “hello@example.com”", "Multi-tap key 1 · Tap: Escape · Double tap: Caps Lock") with "Open on
Shortcuts & macros" (or "Set it up …" for an empty one) linking to that slot. Then the choice, a `ChoiceGrid`
(`ui/ChoiceGrid.tsx`: two by two in the 18rem column, one row of four in a one-column card from 32rem), opened
on the one that matches the current assignment:

#### A key: the palette

Files: `keys/KeyPalette.tsx`.

`keyPalette()` groups as key tiles in a box that scrolls and fills the
space left; the current key is marked and scrolled into view. The search matches label, description and QMK
names (a single character only matches a label, so "a" finds A); the line beside it says what the key under
the pointer does (`plainDescription`: the friendly words, "1 and !" for a number or symbol key, and plain words
in `PLAIN` where the vendored name misleads, such as the Undo or Copy key most computers ignore, the mouse
buttons and the mouse speed keys). When nothing matches it says so, and only the Keys page's "A key" adds where
to type a QMK name (the `noMatch` prop; the pickers elsewhere have no Key code field). A click assigns.

#### Press a key

Beside the search, "Press a key" (`keys/PressKey.tsx`, also for a knob
direction) takes the next key pressed on the keyboard and assigns it through the same path as a tile (one undo
step; the firmware update key still asks to unlock). Locked, it listens to the browser's key events
(`ui/KeyCapture.tsx`'s `useKeyCapture`, `keycodeOfEvent`), so only keys the computer receives count, and a line
under the search says so with "Unlock to see every key…". Unlocked, it also reads the switch matrix while it
waits (`device/useMatrix.ts`, the Test page's hook, with `enabled`): a new key down there gives a position, and
the value is what that key does now on the active layer, falling through to the base layer and layer 0
(`keyNow` in `keys/describe.ts`), so macro, layer and tap-or-hold keys come as they are. A browser event waits up
to 400 ms for the matrix to report the press (it reads every 20 – 60 ms) and the matrix's key wins. vial-qmk
answers the matrix request only while unlocked (`via.c`, `id_switch_matrix_state`). The pressed key still does
its job on the computer, which the line says. Esc (or Esc's position on the matrix), a second click or a click
elsewhere stops waiting.

#### Macro and multi-tap tiles

Macro and multi-tap tiles say what they are (`keys/shortcut-keys.ts`, from
the keyboard's macros and tap dances and the macro names kept in the browser): the macro's name or "Macro 3",
"Multi-tap 1" (broken after the hyphen), by QMK's own number (M3, TD(1)), slot 0 last; the hover line and screen
readers get the one-line summary ("Email: Types
“hello@example.com”"), and the search matches names and summaries. Slots with nothing set up stay in their
place, drawn faint with a dashed edge, still pickable. Both groups have "Set up on Shortcuts & macros" beside
their title. The palette does this itself, so the Shortcuts page's key pickers show the same tiles.

#### The palette's other groups and More keys

After the everyday groups the Keys page (`keyPalette(features)`; the Shortcuts page's pickers take what fits their
place, see "What each picker offers" under Shortcuts & macros) adds, each with its own "?" and, where it helps, a short note under its title:
*Typing helpers* (Caps Word, the Esc and ` key, the seven Space Cadet keys, Layer Lock), *Swapped and disabled
keys* (QMK's Magic keycodes, worded like the Typing feel switches they change, with a link there; NKRO on / off
included where they do something (not on a keyboard that does N-key rollover by itself; see [keyboard.md "Typing settings"](keyboard.md#typing-settings)),
the split-keyboard ones left out) and *International keys* (ISO, Japanese and the language keys); then,
under a closed "More keys" fold (remembered; open by itself when the edited key is one of them; a search looks
everywhere), *Features on and off* (Capitals by holding, key chords, shortcut replacements, one-tap modifiers)
and *Restart and firmware update*. Their tiles and words come from `FRIENDLY` in `device/keycodes.ts` (every
description unique, as it names the tile for screen readers; the picture uses the same labels). A few keys
vial-qmk has and the vendored tables lack or never register (Esc / Caps Lock swap, the Caps / Ctrl and \ /
Backspace toggles, NKRO) are `EXTRA_KEYS` there, for Vial protocol 6: named, typed and offered like the rest.
What the keyboard can be asked about is used: Caps Word and Layer Lock show only with Vial's feature flags for
them, the chord, replacement and Capitals by holding switches only when the keyboard has chord or replacement
slots or reports the Auto Shift setting. Nothing else about the firmware can be known, so the notes speak
generally. Putting the firmware update key on a key or knob turn asks to unlock first (`openUnlock`), as Vial
does; vial-qmk turns it into nothing in a knob turn written while locked. Families most firmware lacks
(joystick and programmable buttons, MIDI, audio, haptic, steno, backlight, underglow, dynamic macros, swap hands,
Unicode …) are left out, with a line and a help topic at the end of the fold; a key holding one is named by its
family ("MIDI", "A MIDI music key …") in the picture, the "Now" line and the key-code field rather than as a
number. `?key-search=magic` opens the palette with a search, for screenshots.

#### A shortcut

Files: `keys/ShortcutChoice.tsx`.

Ctrl, Shift, Alt, Win checkboxes and a palette of the keys that
take modifiers (`canTakeModifiers`); nothing is written until "Use Ctrl + C", so trying doesn't fill undo.
Nothing is ticked to start with, and the key starts as the one the key holds now when the palette has it.

#### Switch layer

Files: `keys/LayerChoice.tsx`.

Pick the layer, then one of the `LAYER_ACTIONS` sentences with
its name; a sentence assigns. "Hold for Fn2, or tap it 5 times to keep it on" is QMK's TT; the count is the
keyboard's Tapping toggle (`keys/tapping-toggle.ts`: Vial's QMK setting 20 where the keyboard reports it, with a
line under the sentences linking to the Typing feel page; otherwise QMK's default, 5, said to be fixed in the
firmware). Folded under "With modifiers held too": the layer with modifiers held (QMK's LM, layers 0-15),
nothing ticked to start with, then used with its own button ("Use Fn2 + Ctrl").

#### Tap or hold

Files: `keys/TapHoldChoice.tsx`.

One thing when tapped, another while held. "When held" a modifier
(mod-tap, `LCTL_T(kc)` …: Ctrl, Shift, Alt, Win to tick, none ticked to start with) or a layer (layer-tap,
`LT(layer, kc)`, the layers by name; only 0-15 fit in the keycode); "Tap for" a key from a palette of plain keys
(the shortcut palette's: the firmware keeps 8 bits for the tap), starting as the key's own tap, or the plain key
it holds now ("Z"), so only the hold needs picking. Nothing is written until the button, named by the result
("Use Tap: Escape · Hold: Ctrl"). A note under the palette (under it, so in a small window the palette starts high) points to
multi-tap keys for anything that isn't a plain key, and to the Typing feel page for how long counts as a hold. Under "Left- or right-hand modifier", the side
(QMK can't mix sides in one key; opened by itself for a right-hand key).

#### More options: nothing, one-tap modifier, key code

Files: `keys/MoreOptions.tsx`.

Nothing, Same as the layer below, a one-tap modifier ("a modifier for
the next key only"; QMK's one-shot modifier, `OSM`: Ctrl, Shift, Alt, Win and Right-hand to tick, none ticked unless the key holds
one, then "Use one-tap Shift"), and a key-code field that shows what the typed code means (`parseKeycode`) before "Use this code". It
opens by itself when the current assignment lives there (nothing, transparent, a one-shot modifier, or a code
no choice builds, which is put in the field), for that key only: `Disclosure`'s `forceOpen` leaves the
remembered open/closed state alone.

#### Keycode builders and readers

The builders and readers are in `device/keycodes.ts`: `modTapKeycode` / `readModTap`, `layerTapKeycode` /
`readLayerTap` (both `readTapHold`), `oneShotModKeycode` / `readOneShotMod`, `layerModKeycode` / `readLayerMod`,
all with a 5-bit modifier mask (Ctrl, Shift, Alt, Win in bits 0-3, `RIGHT_HAND` for bit 4); they return null for
what the firmware can't hold (no modifier, a layer over 15, a tap key that isn't a basic one, `canBeTapped`).
`keycodeName` reads such keys as "Esc / Ctrl", "Space / Layer 4", "Ctrl+C"; `keycodeCap` gives the two-line form.

#### Assigning, knob directions and lighting keys

Every assignment is `deviceStore.assign`, so it shows in the picture at once and Undo takes it back; the
selection stays. A knob's direction 0 is counter-clockwise (left), 1 clockwise (right), as vial-qmk stores
them. The palette's "Lighting controls" follow what the keyboard's definition says it has (`lightingKeysFor`,
from `definition.lighting`, also in the list and `{ "extends": … }` forms some definitions use; passed as
`PaletteFeatures.lighting` by the Keys page and the Shortcuts pickers): the shared `RGB_*` codes Keychron's keymaps
use (not `RM_*`; vial-qmk sends them to an RGB matrix and to underglow alike) for VialRGB and an RGB matrix, those
plus underglow's own effect keys (`RGB_M_*`) for `qmk_rgblight`, the backlight keys (`BL_*`) for `qmk_backlight`,
both for `qmk_backlight_rgblight`, and no group for `none` or no lighting at all. A name the app doesn't know
keeps the shared `RGB_*` keys.

### Settings

Files: `Settings.tsx`, `settings/`.

Theme; "Take the tour" and a link to Help (`settings/TourCard.tsx`);
*Key names* (`settings/KeyLegends.tsx`): "Name keys by what my computer's layout types", on by default, with what
was found ("the key a US keyboard has as Y types Z here", a US layout, or that the browser can't tell, then no
switch; see [keyboard.md "Key names and the computer's layout"](keyboard.md#key-names-and-the-computers-layout)); a name field per layer of the connected keyboard, with a
reset to the default (the same names as the layer stack, `ui/layer-names.ts`); about: version from
`package.json`, licence, and credits to Pipette (repo and commit from `vendor.json`), QMK, Vial and Lucide.
Appearance, the tour and layer names on the left, About on the right once the page is 56rem wide; one column
below that.

### Help

Files: `Help.tsx`, `help/`.

See [screen.md "Help and the tour"](screen.md#help-and-the-tour).

### Lighting

Files: `Lighting.tsx`, `lighting/`.

Full height, no stage (the page draws its own picture).
Left, the effects the keyboard lists (`capabilities.lighting.effects`) as tiles in groups (Steady, Moving, Rain
and sparkles, Reacts to typing, Set per key or zone), each with a small moving preview in the chosen colour
and speed (`EffectPreview.tsx`, `lighting.css`), moving the way the effect moves on the keyboard (worked out
from the firmware's effect code; the reasoning is beside each preview); Off and VialRGB Direct are not tiles.
Right, staying in view:
a "Lights on" switch, the current effect in words with its QMK name, and sliders for brightness (percent of
the keyboard's maximum), speed, colour (rainbow track, swatch and colour name) and vividness. Turning the
lights off sends effect 0; on again sends the effect remembered for this keyboard (`usePref`), and picking a
tile while off turns them on. Below them the keyboard picture (see below), then, in a two-column grid, the Caps
Lock light and the plugin panels for `'lighting'`, one `Card` each. Without usable lighting
the page shows the capability's reason instead. The page reads the lighting again on opening, on window focus
and when Fn is let go (`refreshLighting`), to catch the keyboard's own lighting keys.

#### Effect data, the slider queue and plugin names

- `lighting/effects.ts` holds each effect's friendly name, description, group, preview, and whether it uses
  colour, vividness and speed, or the reason it doesn't, read from the firmware's effect code (sources in the
  file). A slider the current effect ignores is disabled with that reason under it; when colour and
  vividness are off for the same reason, it is said once under both and describes both.
- Changes go through `ui/latest.ts` (`lighting/latest.ts` passes it on): one `setLighting` at a time; while one
  is on its way only the newest
  of the rest waits, so a dragged slider never floods the keyboard and always ends on its last value. The
  sliders show the value at once, from what is still on its way.
- A plugin can rename effects with `lightingEffects: { 41: { name, description } }` in its `definePlugin`, for
  firmware that puts its own effect in a standard slot (the owner's K15 Max puts its ripple effect in Solid Splash, VialRGB id 41).

#### Key by key and Mixed zones

Keychron's two effects ("Key by key", "Mixed zones") bring an editor below the grid, scrolled into view when
  picked or from the button under the effect's settings: `lighting/KeyColours.tsx` and `lighting/Zones.tsx` (see [keyboard.md "Key colours and zones"](keyboard.md#key-colours-and-zones)). Their tiles only show
  on keyboards with Keychron lighting (`perKeyLighting`, `lightingZones`); until the Keychron part is read they
  stay, so they don't flicker on keyboards that have them.

#### On the keys: the still picture

Every other effect (and lights off) puts *On the keys* in that same place, in the same frame (picture left, a
  17rem column right), so switching to or from the editors doesn't move the page: the keyboard with a still hint
  of the lighting, not an animation (`lighting/EffectPicture.tsx`, `lighting/picture.ts`). It works from what
  `effects.ts` knows (`hue`, `preview`): effects that use the colour tint every key with it; rainbow effects show
  a fixed rainbow from the keys' real positions, left to right, top to bottom, in rings or round the middle (of
  each half for the two-centre ones), as the effect runs; Rainbow, all keys (every key one colour that keeps
  changing) gets the left to right rainbow too, as the colours it passes through, with a caption of its own
  saying all keys share one colour on the keyboard (`cycle`); Digital rain is green, the heat map blue,
  the random raindrops scattered colours; lights off is black keys. Brightness and vividness apply, live with the
  sliders. A line beside it says what it shows: for One colour that every key has the colour; for the other
  colour effects that the effect decides which keys light, and when, since most of them leave keys dark.

#### Caps Lock light

Files: `lighting/LockLights.tsx`; shown when `capabilities.has('lockLights')`.

Worded for the lock lights
the keyboard reports ("Caps Lock light"; "Lock lights" with a switch each when it has several), a switch per
light, then colour and vividness as sliders like the main ones; brightness (128 – 255, the firmware's floor)
under More options, since some firmware ignores it. Visible rather than folded away: it is small, and its colour
is what a user comes to change. `deviceStore.setLockLights`, undoable (see [keyboard.md "Key colours and zones"](keyboard.md#key-colours-and-zones)).

### Typing feel

Files: `Typing.tsx`, `typing/`.

Full height, no stage (no setting here needs the picture; Snap Click
keys are pressed on the keyboard instead). A sentence on what the page is for and a search field, then one `Card`
per group, each with its QMK name small beside the title, a one-sentence description and a help topic. On a wide
page (from 56rem) a list of the groups sits beside the cards and scrolls to one; the group picked takes the focus
and, once the scrolling has arrived, flashes twice in the accent colour (a still ring with reduced motion;
`ui/reveal.ts`, `revealSection` and `jumpTarget`). Only settings the keyboard reports
are shown; a group with none is left out.

#### Setting groups, controls and search

- The QMK settings come from `device/settings.ts` (see [keyboard.md "Typing settings"](keyboard.md#typing-settings)), grouped by what a person wants rather
  than how QMK files them: *Tap or hold*, *Key chords*, *Capitals by holding* (Auto Shift), *One-tap modifiers*,
  *Mouse keys*, *Swapped and disabled keys* (Magic), then Keychron's *Key bounce filter* and *Snap Click*, then the
  rarely needed *Esc and ` key* (Grave Escape), and *Other settings* for ids the app doesn't know (shown as sent,
  read only). Everyday settings are visible, the rest under *More options*.
- A time or number is a `Slider` with its value in plain units ("200 ms", "5 s", "8 notches"), quick choices as
  chips where they help ("Quick 150 ms · Usual 200 ms · Relaxed 250 ms · Slow 300 ms" for the hold time), and the
  explanation under it; mouse-key values add what they come to ("About 1,250 pixels a second at top speed").
  Anything on or off is a `Toggle`, one per bit for settings made of bits. A setting that does nothing because of
  another is greyed out with the reason (Auto Shift's settings while it is off; `typing/rules.ts`).
- *Tap or hold* has a "Try it here" box to type in while changing the hold time; *Key chords* links to the chords
  on Shortcuts & macros.
- The search (`typing/rules.ts`) matches every word against the friendly name, QMK name, explanation and group;
  while searching, only matching settings show, those under More options included, and the plugin panels and the
  reset are hidden. "No setting matches …" when nothing does.
- Changes go through `ui/latest.ts`, one queue for the page's QMK settings (`deviceStore.setSetting`) and one for
  the bounce filter (`setDebounce`): sliders show their value at once and the keyboard gets the newest.

#### Key bounce filter, Snap Click, plugin panels and reset

- *Key bounce filter* (`typing/Debounce.tsx`, when `keychron.hasDebounce`): the wait in ms and how it waits, "React
  at once" or "Wait until steady" (the other five types under More options), each with what it does.
- *Snap Click* (`typing/SnapClick.tsx`, when `keychron.hasSnapClick`): the pairs in use as two keycaps with the
  rule as a `Select` ("The last one pressed wins", "Both down cancel out", "A always wins" …) and its explanation,
  and a remove button; then "Add a pair" with ready-made pairs (A and D, W and S, the arrows) and "Other keys…",
  where each key is pressed on the keyboard (`ui/KeyCapture.tsx`; ordinary keys only).
- Plugin panels for `'typing'` follow, one `Card` each. Last, "Reset all typing settings…"
  (`typing/ResetSettings.tsx`) asks in a danger `Dialog` and calls `deviceStore.resetSettings`.

### Test

Files: `Test.tsx`, `test/`.

Full height, with its own picture (no layer stack; labels follow the active
layer). "37 of 90 keys seen" with a bar and "Start again"; a key is lit while down and stays marked once seen
(`KeyboardPicture`'s `seen`, in `--key-bg-seen`; a held key is `--key-bg-pressed`, light in the light theme so the
widget's dark label reads on it). Total: the picture's physical keys (`matrixKeys`; the K15 Max
has 90), and beside it "1 of 2 knob turns"; "Every key works" needs both. Two sources, combined:
- the browser's key events (`usePressedKeys`), always: only keys that type something (letters, media and
  browser keys such as Volume Up: `keycodeOfEvent` in `shell/pressed-keys.ts`), only while the window is in
  front (the page says so when it isn't). While the page is open it keeps keys without Ctrl or Win from doing
  their browser job (the arrows, Page Up / Down, Home, End, Space and Enter away from a control, Backspace, the
  function keys, Alt, the menu key), outside dialogs and text fields; Tab and Shift + Tab still move the focus and
  Enter or Space still press the focused button or link, so the page can be used and left from the keyboard
  (`test/keep-keys.ts`, `keptOnTestPage`; a note on the page says so). Every key still counts as seen. It can't
  stop media keys changing the volume, and doesn't try;
- the keyboard's switch matrix (`device/useMatrix.ts`, shared with the Keys page's "Press a key", →
  `deviceStore.watchMatrix`, one poll loop for every watcher) while unlocked: every key,
  Fn included. It reads only while the page is shown and the tab is visible; through the receiver it pauses
  after 2 minutes without a change (each read keeps the keyboard awake) until a key or click.

#### Knob turns on the Test page

The matrix can't see knob turns (they aren't switches), so a knob direction counts as seen when the browser
gets what it sends on the active layer (`useKnobTurns`): a key event (volume, media, a plain key, or a key
with modifiers, by its key) or a mouse wheel movement for the wheel keycodes (`howHeard`). It is lit for 250 ms,
then marked seen; ordinary mouse scrolling counts too where the knob scrolls. The widget has no state for knob
directions, so `KeyboardPicture`'s `knobsTurned` / `knobsSeen` recolour them with a CSS rule scoped to the
picture (`[data-encoder-pos]` circles).

Not everything arrives (`test/knob.ts`, `visibility`): Chrome on Windows keeps the volume keys (Volume Up / Down,
Mute) from the page, and the media keys (next / previous track, play / pause, stop) often go to the browser's own
media handling. The note names what the active layer's knob sends that the page can't or may not see, and where
to turn it instead: the first layer the keyboard can reach from its base (the base layer's layer keys) on which
every direction is seen, e.g. "Hold Fn2 and turn it: there it scrolls, which this page can see." The knob count is
out of the directions the page can check on some reachable layer ("1 of 2 knob turns", or "Knob turns can't be
checked here"), and only those count towards "Every key works". A volume key that does arrive still counts.

#### The source in use, and keys not seen yet

A note under the picture says which source is in use; locked, it names what can't be seen and offers "Unlock to
see every key…". Seen keys survive a visit to another page (`test/seen.ts`), not another keyboard.

Seen keys show by more than their tint: `seen` also outlines them in `--key-edge-seen`, 3:1 against a key not seen
yet in both themes. Once no more than a quarter of the keys is left, "Not seen yet: F5, Insert and Right Ctrl."
under the picture names them, up to 20 then "and 7 more", with knob turns still to check (`test/not-seen.ts`): by
what a key does on the layer shown (the base layer's where it does nothing there, "the key at row 3, column 5"
where neither), in the picture's words where the description is only QMK's name ("Macro 1").

### Device

Files: `Device.tsx`, `device/`.

Full height, no stage; two columns from 56rem (like Settings).

#### Back up and restore

Files: `device/Backup.tsx`, `device/Restore.tsx`.

"Save a backup" downloads the backup file
(see [keyboard.md "Backups"](keyboard.md#backups)) once every part has been read, and says which parts are missing if some couldn't be read.
"Choose a backup file…" opens a backup or a Vial file and goes through the restore steps in place: a refusal
with the reason (another keyboard, keys wired differently, not a backup); or the file's name and date, any
warning (same model, other firmware), the list of what will change in words (`describePlan`), marked "needs
unlocking" where that applies with "Unlock first…", and what the file holds that this keyboard can't take.
Once "Unlock first…" has unlocked the keyboard, the plan is worked out again; restoring still waits for
"Restore…". "Restore…" asks in a danger `Dialog` that lists the same lines; then a progress bar, then what was
restored, what failed (with the error), what was left out because the keyboard is locked (with "Unlock…", which
after unlocking goes back to the review of the same file), and that Undo takes back the keys and knob. A file that already matches says so. *Vial files* (a `Disclosure`): "Save a
Vial file".

#### Wireless and sleep

Files: `device/Wireless.tsx`; only when `keychron.hasWireless`.

The battery (through the
receiver), and "Lights off after" and "Sleep after" as choices (`BACKLIT_CHOICES`, `IDLE_CHOICES`, plus the
keyboard's own value if it is another); a choice that would put sleep before lights-off is disabled. A click
is `deviceStore.setWirelessTimers`.

#### Start over or update

Files: `device/StartOver.tsx`.

Its two actions under More options (`device-more`):
- "Reset to defaults…" (keymap reset): a danger `Dialog` listing what goes back to the firmware's own (every key
  on all layers, the knob, the typing settings with the swapped and disabled keys, and the kinds of multi-tap
  keys, chords, replacements and repeat rules the keyboard has), an "Empty the macros too" box (unticked: the
  macros stay), what stays (lighting, key colours, zones and the Caps Lock light, layer and macro names, and the
  Keychron settings the keyboard has), that Undo can't bring it back, and "Save a backup first" (the Backup
  card's `saveBackup`). Then `deviceStore.resetKeymap({ macros })` and a line saying it is done. Neither reset
  needs unlocking, so the box is offered locked too (see [keyboard.md "Changing things on the keyboard"](keyboard.md#changing-things-on-the-keyboard)).
- "Restart for a firmware update…" (bootloader): disabled through the receiver with the reason (firmware goes on
  over the cable). The dialog says the keyboard stops typing until new firmware is put on it or it is unplugged
  and plugged back in, and that the app loses the connection; locked, its button is "Unlock and restart…", which
  opens the unlock dialog (`openUnlock`) and goes on by itself once unlocked. Then
  `deviceStore.restartToBootloader()`; the app ends in its ordinary disconnected state. A firmware without the
  command, or no answer, is said under the button.

#### About this keyboard

Files: `device/KeyboardInfo.tsx`.

Name and maker, connection, firmware version
(`device/firmware.ts`: "v1.1.2 1970-01-01-00:00:00" reads "1.1.2"; the date only when it is a real one),
layers, keys and knob, lock state, and how many macros, tap dances, combos, key overrides, alt-repeat rules and
QMK settings it has room for. *Technical details* (a `Disclosure`): USB IDs (and the receiver's), Vial keyboard
ID, protocol versions, Keychron feature bits, the raw firmware string, matrix size, layout options, feature
flags, macro memory, QMK setting IDs, lighting, and the transport's request counters, refreshed every second.

### Shortcuts & macros

Files: `Shortcuts.tsx`, `shortcuts/`.

Full height, no stage (the editors need the room, and
the keys a shortcut is on are listed and linked instead). A list on the left and the one picked on the right, two
columns from 42rem; no tabs. Narrower, they take turns as on the Help page: the list alone, then the picked one in
its place with "All shortcuts" above it (and Back) to return; the focus goes into the editor when it replaces the
list, and back to its row when the list returns. The page's own addresses (`shortcuts/route.ts`): `#/shortcuts/macro/1` opens Macro 1,
likewise `multi-tap/N`, `chord/N`, `replacement/N` and `repeat/N`, with the number shown on screen. Without a
number (`#/shortcuts/multi-tap`, `shortcutKindHref`) it opens the first slot of that kind with nothing saved and
no draft, in Add's order (`shortcuts/first-free.ts`; number 0 last), replacing the address so Back skips it
(`replacePath` in `shell/router.ts`); with none free it shows that kind's section, scrolled to and above the fold.
Links that mean "set one up" use these (Tap or hold's "multi-tap key", the palette's "Set up on Shortcuts &
macros", Typing feel's chords, the help topics' "where"); links to a given entry keep its number.

#### Numbering of macros and multi-tap keys

Macros and multi-tap keys carry QMK's own number: "Macro 1" is `M1` (Keychron keyboards map the
keys printed M1 – M5 to QMK's M1 – M5), "Macro 0" is `M0`, "Multi-tap key 1" is `TD(1)`; `macro/0` and
`multi-tap/0` address slot 0. Slot 0 comes last wherever they are listed (here, the Keys palette), and "Add"
takes the lowest free number from 1, slot 0 only when every other is taken (`numberedSlots`, `firstFreeSlot`,
`macroTitle`, `tapDanceTitle` in `device/keycodes.ts`; tests pin the rule). Macro names are kept per QMK index,
so a stored name or a backup's `macroNames` stays with its macro. Key chords, shortcut replacements and repeat
rules have no number of QMK's that shows anywhere: they count from 1 ("Key chord 1" is the first slot).

#### The list of shortcuts

Files: `shortcuts/ShortcutList.tsx`.

One section per kind: Macros first; then, in the usual order, each
other kind (Multi-tap keys, Key chords, Shortcut replacements, Repeat rules) that has an entry in use or a draft
or whose editor is open; the kinds with none of that under *More options* (closed until opened, remembered). An
unused kind comes up when its editor opens (Add, or an address), so saving its first entry doesn't move the list.
Each section has its name (a larger heading), help, QMK name and "2 of 16 used", and "Add", which opens the next
free slot; a line divides it from the section above, and its entries hang under it, indented on a rail. It lists
only the slots in use, being edited or open, so 80 slots stay a short list: each with its title ("Macro 1" or
the user's name, "Key chord 3"), QMK's name where it has one (M1, TD(1)), "Not saved" while it has a draft, how
many keys run it (macros, multi-tap keys), and a one-line summary (`shortcuts/describe.ts`: "Types
“hello@example.com”", "J + K together → Esc", "Shift + Bksp → Del", "Tap: Esc · Double tap: Caps
Lock", "After Ctrl + Z → Ctrl + Y", "(off)" for one turned off). Keys in summaries (and in macro steps' words and
"Runs when you press") are named by `keycodeShortName` (`device/keycodes.ts`): the picture's short names, following
the layout chosen for key names, the plain legend of a two-legend key ("`", not "~ `"), modifiers in words.
An editor's header gives QMK's name for one entry (`KINDS[kind].qmkOne`: "Combo", "Key override"). Macros also show their shared space as a bar
("Room for about 863 more characters · 63 of 926 bytes used").

#### Editors for chords, replacements, multi-tap keys and repeat rules

Files: `shortcuts/EntryEditor.tsx` with `ChordEditor`, `OverrideEditor`, `TapDanceEditor`, `RepeatEditor`.

A title ("Key chord 3", "Combo"), saved or "Not saved yet" with Save to keyboard, Revert and
what stands in the way (`entryProblem`; "Unlock to save…" only when it holds QK_BOOT where the firmware checks,
and it saves by itself once the unlock completes;
`shortcuts/SaveBar.tsx`, shared with the macro editor; edits made while a save is on its way stay a draft),
a sentence or two on the idea and a "Try: …" button that fills in a ready example, then the fields, More
options, and "Clear this …". A key is keycaps, its name and "Change…" (the Keys page's palette with Ctrl, Shift,
Alt and Win to tick); optional ones can be removed. Modifiers are Ctrl, Shift, Alt and Win checkboxes meaning
either side; left and right apart only under More options. A saved entry holding something the keyboard won't
do (a replacement it can't send) shows the problem in red even unchanged, and can't be saved as it is.

#### What each picker offers

Files: `device/sendable.ts`, `KEY_USES`, `groupsFor`, `canSend`; each with the vial-qmk function it is read from.

What the firmware runs in that place and nothing else. A chord's output, a multi-tap
key's four keys, a repeat rule's "sends" and a macro's "Tap a key" step go through the firmware's whole key
handling, so they offer every group of the Keys page, the less common ones and "More keys" included (two-byte
keycodes travel in a macro as Vial's `VIAL_MACRO_EXT_*` steps on protocol 2 and later). Left out for sense,
not ability: multi-tap and repeat keys there, and macros too in a macro step. "Hold a key down" / "Let a key
go" offer the everyday groups, typing helpers and international keys (a swap or restart held does what a tap
does). A chord's own keys and the key a repeat rule follows are what keys on the keyboard send: the everyday
groups. A shortcut replacement's trigger and replacement are ordinary keys only (up to `0xFF`, the replacement
with modifiers up to `0x1FFF`): vial-qmk registers them with `register_code(uint8_t)`, so lighting, "This
keyboard", macro, layer and the less common keys are not offered, and `entryProblem` names one a saved entry
holds. The pickers ask the same `paletteFeatures` as the Keys page for the feature switches.
- *Key chord*: the keys are clicked on a small picture of the base layer (marked once in the chord, a click
  again takes one out), with each as a keycap and an × beside it; a chord holds what those keys send there (J,
  K), not their positions, so it follows a key that moves. Then what it sends. More options: a key from the
  palette, for one that isn't on the base layer. Works on its own once saved; the timing is a typing setting.
- *Shortcut replacement*: hold (modifiers), and press (key), to send instead (key), let go of while sending
  (modifiers), on / off. More options: the three modifier sets left and right apart (must be held, must not be
  held, let go of), the layers it works on, and the six option flags in words.
- *Multi-tap key*: tap, hold, tap twice; More options: tap then hold, and its own hold time (ms, with
  150 – 300 ms choices). "Runs when you press" lists the keys with its TD(n), as for macros.
- *Repeat rule*: after (key), the repeat key sends (key), on / off; More options: modifiers it still applies
  with, both ways, left and right the same, and fallback for every other key. "Runs when you press" lists where
  the alternate repeat key (QK_AREP) is.

#### The macro editor

Files: `shortcuts/MacroEditor.tsx`.

The name (an inline field; names live in the browser per keyboard,
`ui/layer-names.ts` `renameMacro`), whether it matches the keyboard or is "Not saved yet", and while it isn't:
"Save to keyboard" (or, locked, "Unlock to save…", which opens the unlock dialog and saves by itself once the
unlock completes; cancelled or not completed, nothing is saved and the draft stays), Revert,
what stands in the way (steps to fix, no room, locked). "Runs when you press": the keys and knob turns with this
macro, as layer and key ("Windows: the M1 key"); a click shows that key on the Keys page (`stage.showLayer`,
`stage.select`), then a quiet "Put it on another key…"; none: "Put it on a key…" and where else to find it.
Both open the Keys page armed with this keycode (`keys/arming.ts`, `armKey`; `shortcuts/Uses.tsx`, also for
multi-tap keys and the alternate repeat key): a card says "Click the key that should run Macro 1" (by its
name), on which layer, and with a hint when the shortcut is empty or has unsaved changes (allowed, as from the
palette: the key does nothing, or runs what the keyboard holds, until saved), with Cancel. The stage stops
following the keyboard's layer while it waits, and nothing is selected, so the next key or knob direction
clicked is selected and gets the keycode through `deviceStore.assign` (one undo step); the inspector then says
"Macro 1 is on it now. It was A; Undo, at the bottom, puts that back." Esc, Cancel or leaving the Keys page end
it without assigning. Then the steps
(`shortcuts/StepRow.tsx`), numbered, each edited in place, with move up, move down and remove: *Type text* (a
field), *Tap a key* (keycaps and the key in words; "Change key…" opens the Keys page's palette with Ctrl, Shift,
Alt and Win to tick, `shortcuts/KeyPicker.tsx`), *Wait* (seconds, with 0.05 – 1 s choices); under *More
options*, *Hold a key down* and *Let a key go*, with why. A step's problem shows under it in red
(`stepProblem`). *Record what I type* (`shortcuts/Recorder.tsx`) and the bytes this macro takes against the
room left close the card.

#### Drafts of shortcuts

Files: `shortcuts/drafts.ts`.

An edit is a draft per keyboard, kind and slot, kept outside React, so leaving
the page and coming back finds it; a draft equal to what is saved is dropped (two empty entries count as equal,
whatever their other fields; an empty slot is edited from the defaults: 200 ms, every layer). While any draft exists the browser
asks before the tab is closed or reloaded. Navigation inside the app is never blocked.

#### Recording a macro

While recording, key events in the window are captured (and kept from doing anything else) and
turned into steps by `stepsFromRecording`: a press and release is a tap, keys tapped with only modifiers held
become shortcuts (Ctrl + C), runs of printable keys become text (US layout, as the firmware types it), anything
else stays hold and let go; keys still held at the end are let go. "Keep the pauses as waits" keeps gaps over
150 ms. Esc stops it (and is never recorded: an Esc step is added with "Tap a key"), as do Stop recording and
leaving the window; the focus then goes back to "Record what I type". Fn and layer keys, and shortcuts Windows or the
browser keep (Alt + Tab, Ctrl + W, the Windows key), can't be recorded.
