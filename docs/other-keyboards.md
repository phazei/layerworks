# Compatibility

The index of compatibility items: every place where the app adapts to a keyboard that differs from the K15 Max.

<!-- contents:start -->
**Contents**

- [Other keyboards](#other-keyboards)
  - [Definition, layout and layer differences](#definition-layout-and-layer-differences)
    - [A page that throws on another keyboard's data](#a-page-that-throws-on-another-keyboards-data)
    - [A definition without a name](#a-definition-without-a-name)
    - [Layout options](#layout-options)
    - [A switch matrix too big for the switch-matrix read](#a-switch-matrix-too-big-for-the-switch-matrix-read)
    - [Keychron layer orders, and boards without a Mac / Windows switch](#keychron-layer-orders-and-boards-without-a-mac--windows-switch)
    - [Keyboards that don't report their layer](#keyboards-that-dont-report-their-layer)
  - [Firmware differences](#firmware-differences)
    - [Firmware without Vial](#firmware-without-vial)
    - [Firmware without any shortcut slots](#firmware-without-any-shortcut-slots)
    - [Backups made on firmware that numbers keys differently](#backups-made-on-firmware-that-numbers-keys-differently)
    - [The firmware update key on keyboards not made by Keychron](#the-firmware-update-key-on-keyboards-not-made-by-keychron)
  - [Knob differences](#knob-differences)
    - [A knob the firmware doesn't let apps change](#a-knob-the-firmware-doesnt-let-apps-change)
    - [Knobs numbered other than 0, 1, 2](#knobs-numbered-other-than-0-1-2)
    - [No knob, or several: Test and Keys page words](#no-knob-or-several-test-and-keys-page-words)
    - [No knob, or several: Device page words](#no-knob-or-several-device-page-words)
  - [Lighting differences](#lighting-differences)
    - [Lighting keys for backlight, underglow, an RGB matrix, or none](#lighting-keys-for-backlight-underglow-an-rgb-matrix-or-none)
    - [A definition whose `lighting` is an object or a list](#a-definition-whose-lighting-is-an-object-or-a-list)
    - [VialRGB the firmware reports but the definition doesn't name](#vialrgb-the-firmware-reports-but-the-definition-doesnt-name)
    - [Keychron per-key lighting with more than 8 matrix rows](#keychron-per-key-lighting-with-more-than-8-matrix-rows)
    - [Lighting the app can't change](#lighting-the-app-cant-change)
  - [Lock and unlock differences](#lock-and-unlock-differences)
    - [Firmware that never locks](#firmware-that-never-locks)
    - [Unlock keys other than Esc and Enter](#unlock-keys-other-than-esc-and-enter)
    - [One unlock key, or three or more](#one-unlock-key-or-three-or-more)
<!-- contents:end -->

## Other keyboards

The app is built on a Keychron K15 Max; these are the places where it adapts to keyboards that differ from it. Each
item names the difference, what the app does, where that is decided (one place, marked "Compatibility:" in the
code) and the test that covers it. Keep this list complete: an adaptation without an entry here is a bug.

### Definition, layout and layer differences

#### A page that throws on another keyboard's data

Definitions hold what the K15's doesn't (Corne's `lighting` is an
object). A page that throws shows "Something went wrong on this page" in its place, the rest of the app keeps
working, and "Try again" closes remembered sections first. Decided in `shell/ErrorBoundary.tsx` (around the page
area in `Shell.tsx`, around the app in `main.tsx`). Test: `shell/__tests__/ErrorBoundary.test.tsx`.

#### A definition without a name

A definition without a name (130 of vial-qmk's 857, e.g. kiserdesigns/splinter). The keyboard is called by the
product name the browser reports (the firmware's USB descriptor; not through a 2.4 GHz receiver, whose name is its
own), else "Keyboard", in the device card, Home, Device and the backup's name and file name. Decided in
`keyboardName` (`device/keyboard-name.ts`), used by the store's load. Test: `device/__tests__/keyboard-name.test.ts`
(on the demo Splinter too).

#### Layout options

Layout options (278 of vial-qmk's 857 definitions draw alternatives: split Backspace or not, ISO Enter, bottom
rows …, a group per label in `layouts.labels`). The keyboard keeps which choice it has as one number (VIA's layout
options, read at load into `KeyboardData.layoutOptions`). Every picture (Keys and the stage, Home, Lighting's
still picture and its painting, the unlock highlight) draws only the chosen layout: the vendored widget moves the
chosen alternatives into the first one's place and leaves the others out, given the choices (`layoutOptions`).
A stored value out of range for the labels, or a choice without keys, counts as the first choice, so a whole
keyboard is always drawn. Counts follow the same keys (`matrixKeys`): the Test page's "N of M keys seen" (so it can
reach "Every key works"), Device's "Keys", and Lighting's groups for colouring keys (no LED under an unchosen
alternative counts, and "Rainbow across" spreads over the keys drawn). The **Layout** card on Keys, under the
first card while no key is selected (beside the picture it changes), sets them in the definition's own words: a
switch for a plain label, a list for a title and its choices (`layoutOptionList`). A change is written to the
keyboard at once (VIA's `0x03 0x02`, read back if the write fails; `setLayoutChoice` in the store, the one group's
bits changed, `withLayoutChoice`) and is one undo step per group; a selected key the new layout doesn't have is let
go of. Backups keep the value as before; the restore review names what changes ("Layout: Bottom Row: Default",
`layoutChangeWords`). Help topic `layout-options`. Decided in `layoutChoices` and `visibleLayoutKeys`
(`device/layout-options.ts`). Tests: `device/__tests__/layout-options.test.tsx`,
`pages/__tests__/layout-counts.test.tsx`, `pages/keys/__tests__/LayoutCard.test.tsx` (on the demo GH80-3000).

#### A switch matrix too big for the switch-matrix read

A switch matrix too big for the switch-matrix read (`(cols / 8 + 1) × rows` over 28: era/sirind/klein_hs and
klein_sd 10 × 16, bpiphany/frosty_flake 18 × 8, converter/adb_usb 16 × 8). VIA's read then answers with nothing.
The app never reads it: the Test page and "Press a key" go by the browser, unlocked or not, say why, and offer no
unlock for it; the `keyMatrix` capability gives the reason and the `test-keys` help topic says so. Decided in
`matrixReadable` (`device/matrix.ts`), used by the capability, the store's poll and `useMatrix`. Test:
`pages/__tests__/matrix-too-big.test.tsx` (on the demo Klein).

#### Keychron layer orders, and boards without a Mac / Windows switch

Keychron's keymaps order their
layers four ways (Mac pair first, Windows pair first, Mac and Windows bases first, number pads with Base and Fn).
Default layer names come from each keymap's own order, "Layer n" where it says nothing and on every other keyboard.
Decided in `knownLayerNames` (`ui/layer-names.ts`) from `device/keychron-layers.ts`, generated by
`scripts/keychron-layers.mjs`. Tests: `ui/__tests__/layer-names.test.ts` ("a Keychron board whose Windows layer
is 1", "with the Windows pair first", "a Keychron number pad …", unknown keyboards).

#### Keyboards that don't report their layer

Keyboards that don't report their layer (every one without Keychron's `0xA3`). The stage lights typed keys as
worked out on layer 0, and "Follow the keyboard" isn't offered. Decided in `reportsLayer` and `NO_LAYER`
(`shell/pressed-keys.ts`). Test: `shell/__tests__/Stage.test.tsx` ("the stage on a keyboard that doesn't report its
layer").

### Firmware differences

#### Firmware without Vial

Firmware without Vial (VIA, Keychron's stock firmware). Such keyboards offer the same raw HID interface, so the
browser lists them, but answer Vial's commands "unknown command" (0xFF) or send them back. The app asks for the
Vial keyboard ID first and, without a Vial answer, says plainly that the keyboard runs VIA firmware, not Vial, with
a link to Vial's site (never "Failed to decompress keyboard definition"); the `connecting` help topic says so too.
Decided in `answersVial` (`device/vial-firmware.ts`), called first in the store's load. Tests:
`device/__tests__/vial-firmware.test.ts`, `shell/__tests__/ConnectPrompt.test.tsx`.

#### Firmware without any shortcut slots

Firmware without any shortcut slots (no tap dance, combos, key overrides or alt repeat). The Shortcuts page
says there is nothing to set up instead of pointing at sections that don't exist. Decided in `hasEntrySlots`
(`pages/Shortcuts.tsx`). Test: `pages/shortcuts/__tests__/Shortcuts.test.tsx` ("doesn't point at multi-tap keys
and the rest where the firmware has none of them either").

#### Backups made on firmware that numbers keys differently

A backup keeps raw keycode numbers; vial-qmk renumbered
them with Vial protocol 6 (2023), and protocol 1 stores macros differently, so such a backup is refused with a
pointer to a Vial file from that time (which names keys). Decided in `sameKeyNumbering`, used by `checkFit`
(`device/restore.ts`). Test: `device/__tests__/file-checks.test.ts` ("a backup from firmware that numbers keys
differently").

#### The firmware update key on keyboards not made by Keychron

When the firmware lacks the restart command, the
Device page says to hold Esc on Keychron keyboards, and elsewhere the top-left key (QMK's bootmagic position) or
the keyboard's instructions. Decided in `updateKeyHint` (`pages/device/StartOver.tsx`). Test:
`pages/device/__tests__/update-key.test.ts` ("the key that reaches firmware update mode, by maker").

### Knob differences

#### A knob the firmware doesn't let apps change

A knob the firmware doesn't let apps change (built without `ENCODER_MAP_ENABLE`, e.g. lazydesigners/cloud,
planck/rev7). Vial's knob commands then come back unchanged, which would read as made-up keys (0xFE03 and
`layer << 8 | knob`). Such knobs are left out of `knobs` and `knobCount` (so nothing about them is shown, tested,
undone, backed up or restored) and counted in `fixedKnobs`; the picture marks them "Fixed" and doesn't let them be
picked, Keys and Device say why, and the `knob` capability's reason and help topic say so. Decided in
`firmwareKeepsKnobs` (`device/knob-map.ts`), at the store's load. Test: `pages/__tests__/fixed-knob.test.tsx` (on
the demo Cloud).

#### Knobs numbered other than 0, 1, 2

Knobs numbered other than 0, 1, 2 … (mechlovin/adelais/rgb_led/rev3 draws its only knob as 3,
argo_works/ishi/80/mk0_avr_extra as 8). Vial's knob commands carry the definition's number (vial.c, get / set
encoder), and the app sends it as written, as Vial does: `KeyboardData.knobIndices` lists the numbers, and the
picture, the Test page, undo, the read-back, backups and Vial files go by them, never by 0 … `knobCount` − 1. People
see knobs by place in order ("Knob" for the only one, "Knob 2" for the second). Backups and Vial files lay knobs out
by number, 0 to the highest, a number no knob has left at Nothing and passed over by a restore, so files from
keyboards numbered 0, 1, 2 … read as before. On those two keyboards the number is the definition's mistake (their
firmware has one knob, 0), so their knob reads Nothing and ignores writes, in Vial too. Decided in `knobIndices`,
`knobSlots` and `knobName` (`device/knob-map.ts`). Test: `device/__tests__/odd-knob-number.test.ts` ("a keyboard
whose only knob is numbered 1", "… numbered 0 and 2").

#### No knob, or several: Test and Keys page words

The Test page says "the knob" or "each knob", "it" or "them", decided in `severalKnobs`
(`pages/test/knob.ts`); Keys says "one side of a knob", which reads right with any number. Tests:
`pages/test/__tests__/knob.test.ts`, `pages/keys/__tests__/knob-words.test.tsx`.

#### No knob, or several: Device page words

Backup and Restore texts say "the knob", "the knobs" or nothing.
Decided in `theKnobs` / `keysAndKnobs` (`pages/device/knob-words.tsx`). Test:
`pages/device/__tests__/knob-words.test.ts` ("the knob in Backup and Restore texts").

### Lighting differences

#### Lighting keys for backlight, underglow, an RGB matrix, or none

The palette's Lighting controls offer the keys that
keyboard's lighting answers to, and none without lighting. Decided in `lightingKeysFor` (`device/keycodes.ts`), from
the definition's `lighting` and the firmware's VialRGB flag (read as one kind by `lightingKind`). Test:
`device/__tests__/lighting-keys.test.ts`.

#### A definition whose `lighting` is an object or a list

A definition whose `lighting` is an object or a list (Corne and six others write `{ "extends": "qmk_rgblight" }`,
two `["qmk_rgblight"]`; 89 leave it out). The store reads it as one of a few known kinds, the name it holds (none
when it names none, "other" for a name the app doesn't know), so nothing else meets the object; Technical details
shows the kind with what was written beside it. Decided in `lightingKind` (`device/lighting-kind.ts`), which the
palette's lighting keys use too. Tests: `device/__tests__/lighting-kind.test.ts`,
`pages/device/__tests__/lighting-object.test.tsx` (on the demo Corne).

#### VialRGB the firmware reports but the definition doesn't name

VialRGB the firmware reports but the definition doesn't name (keyboards/vipad writes `{ "extends":
"qmk_rgb_matrix" }`, rgbkb/mun2 "none", both built with `VIALRGB_ENABLE`). Firmware with VialRGB says so in byte 12
of its keyboard ID reply; there the lighting is read and changed as VialRGB whatever the definition names, the
palette offers its lighting keys, and Technical details says the firmware's word beat the definition's. Where
neither names any lighting, Lighting says "no lighting the app can change" (its own lighting keys may still work).
Decided in `firmwareHasVialRgb` and `lightingKind` (`device/lighting-kind.ts`; `KeyboardData.firmwareVialRgb`).
Test: `pages/__tests__/firmware-vialrgb.test.tsx` (on the demo Vipad).

#### Keychron per-key lighting with more than 8 matrix rows

Keychron per-key lighting on a board with more than 8 matrix rows (keychron/c100_8k, 10 rows). The vendored
Keychron reload reads the LED map for rows 0 – 7 only, so keys below had no LED: they couldn't be painted in Key by
key or put in a zone. Where the matrix has more rows, the store reads the LED map again for every row (at load and
in the read-back after a failed Keychron write). Decided in `ledRowsMissed` (`device/keychron-rgb.ts`), used by the
store's `readKeychron`. Test: `device/__tests__/keychron-led-rows.test.ts` (on the demo C100 8K).

#### Lighting the app can't change

Lighting the app can't change (backlight, underglow, none). Home says "Keys change freely", not "Keys and
lighting", and its second shortcut tile is "Make a macro or shortcut" instead of "Pick a lighting effect".
Decided by the `lighting` capability (`device/capabilities.ts`), read in `pages/home/Status.tsx` and
`pages/Home.tsx`. Test:
`pages/__tests__/Home.test.tsx` ("Home on a keyboard whose lighting the app can't change").

### Lock and unlock differences

#### Firmware that never locks

Firmware that never locks (built with `VIAL_INSECURE`; in vial-qmk, vipad). It starts unlocked, ignores Lock and
names no unlock keys. The device card, Home and Device say "Never locks" (with why) and offer neither Lock nor
Unlock, and the store sends no lock, so nothing is ever refused as "locked"; the `unlock` help topic says so.
Decided in `neverLocks` (`device/unlock.ts`): unlocked with no unlock keys. Test:
`pages/__tests__/never-locks.test.tsx` (on the demo Vipad).

#### Unlock keys other than Esc and Enter

The unlock dialog names the keyboard's own keys; the `unlock` help topic
gives the K15's Esc and Enter only as an example. Text only (`help/topics.ts`, `unlock`).

#### One unlock key, or three or more

The unlock dialog says "Hold A" for one key, "Hold A and B together" and
"both keys" for two, "all of them" for more (a firmware names up to 15). Decided in `holdUnlockKeys`
(`shell/UnlockDialog.tsx`). Test: `shell/__tests__/unlock-keys.test.ts`.
