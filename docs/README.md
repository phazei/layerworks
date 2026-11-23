# Documents

How Layerworks works inside, for people working on its code.

To find something, look for its heading in this map (or search `docs/` for `^#{2,4} `), then read only that
section, down to the next heading. The lists of headings here and the contents at the top of each document are
written by `pnpm docs:index`.

Outside this folder: `AGENTS.md` (the rules for working on the code) and `VENDOR.md` (the code copied from
Pipette).

## [development.md](development.md)

Running, checking and screenshotting the app, the URL options, the source tree, the tests, the demo keyboard (and
the other keyboards it can be), hosting and the licence.

<!-- contents:start development.md -->
- [Run it](development.md#run-it)
  - [URL options](development.md#url-options)
  - [Commands](development.md#commands)
- [Layout](development.md#layout)
  - [src/device](development.md#srcdevice)
  - [src/demo and src/ui](development.md#srcdemo-and-srcui)
  - [src/shell](development.md#srcshell)
  - [src/pages, src/plugins and src/help](development.md#srcpages-srcplugins-and-srchelp)
  - [hardware and scripts](development.md#hardware-and-scripts)
  - [vial-qmk, the firmware source](development.md#vial-qmk-the-firmware-source)
- [Tests](development.md#tests)
- [Screenshots](development.md#screenshots)
- [Demo keyboard](development.md#demo-keyboard)
  - [Typing on the demo, and what it answers](development.md#typing-on-the-demo-and-what-it-answers)
  - [The demo's example macros and shortcuts](development.md#the-demos-example-macros-and-shortcuts)
  - [Other keyboards in the demo](development.md#other-keyboards-in-the-demo)
- [Hosting](development.md#hosting)
- [Licence](development.md#licence)
<!-- contents:end -->

## [screen.md](screen.md)

The app's window, how pages and plugins are registered, the keyboard stage and its selection, the help panel and
the first-run tour.

<!-- contents:start screen.md -->
- [The screen](screen.md#the-screen)
  - [The sidebar](screen.md#the-sidebar)
  - [Connect prompt and status line](screen.md#connect-prompt-and-status-line)
  - [Skip link and headings](screen.md#skip-link-and-headings)
  - [Help panel, tour and errors on screen](screen.md#help-panel-tour-and-errors-on-screen)
  - [Theme and window sizes](screen.md#theme-and-window-sizes)
- [Pages and plugins](screen.md#pages-and-plugins)
- [The keyboard stage and selection](screen.md#the-keyboard-stage-and-selection)
  - [Layer shown and selection](screen.md#layer-shown-and-selection)
  - [The picture without a mouse](screen.md#the-picture-without-a-mouse)
  - [Stage reset, key labels and default layer names](screen.md#stage-reset-key-labels-and-default-layer-names)
  - [Stage height](screen.md#stage-height)
- [Help and the tour](screen.md#help-and-the-tour)
  - [Help topics and the guide](screen.md#help-topics-and-the-guide)
  - [The Help page](screen.md#the-help-page)
  - [The tour](screen.md#the-tour)
<!-- contents:end -->

## [pages.md](pages.md)

Each built page, what it shows and does, and its files.

<!-- contents:start pages.md -->
- [The built pages](pages.md#the-built-pages)
  - [Home](pages.md#home)
  - [Keys](pages.md#keys)
  - [Settings](pages.md#settings)
  - [Help](pages.md#help)
  - [Lighting](pages.md#lighting)
  - [Typing feel](pages.md#typing-feel)
  - [Test](pages.md#test)
  - [Device](pages.md#device)
  - [Shortcuts & macros](pages.md#shortcuts--macros)
<!-- contents:end -->

## [keyboard.md](keyboard.md)

How the app talks to the keyboard, unlocking, how changes are written and undone, key colours and zones, typing
settings, key names and the computer's layout, macros, tap dance and the other entries, and backups.

<!-- contents:start keyboard.md -->
- [How it talks to the keyboard](keyboard.md#how-it-talks-to-the-keyboard)
  - [Requests, replies and pushes](keyboard.md#requests-replies-and-pushes)
  - [2.4 GHz, one tab per keyboard, browser storage](keyboard.md#24-ghz-one-tab-per-keyboard-browser-storage)
  - [Staged loading and capabilities](keyboard.md#staged-loading-and-capabilities)
- [Unlocking](keyboard.md#unlocking)
  - [The unlock flow in the store](keyboard.md#the-unlock-flow-in-the-store)
  - [The unlock dialog](keyboard.md#the-unlock-dialog)
- [Changing things on the keyboard](keyboard.md#changing-things-on-the-keyboard)
  - [Assign, undo and failed writes](keyboard.md#assign-undo-and-failed-writes)
  - [Factory reset, a lost keyboard, lighting saves](keyboard.md#factory-reset-a-lost-keyboard-lighting-saves)
  - [The store's other changes](keyboard.md#the-stores-other-changes)
  - [Keymap reset and the restart for a firmware update](keyboard.md#keymap-reset-and-the-restart-for-a-firmware-update)
- [Key colours and zones](keyboard.md#key-colours-and-zones)
  - [Writing key colours and zones](keyboard.md#writing-key-colours-and-zones)
  - [The colour and zone editors](keyboard.md#the-colour-and-zone-editors)
  - [Lock lights, and restoring Keychron lighting](keyboard.md#lock-lights-and-restoring-keychron-lighting)
- [Typing settings](keyboard.md#typing-settings)
  - [Settings catalogue, values, writing and reset](keyboard.md#settings-catalogue-values-writing-and-reset)
  - [Key bounce filter and Snap Click commands](keyboard.md#key-bounce-filter-and-snap-click-commands)
  - [N-key rollover](keyboard.md#n-key-rollover)
- [Key names and the computer's layout](keyboard.md#key-names-and-the-computers-layout)
- [Macros](keyboard.md#macros)
  - [Macro steps, saving and problems](keyboard.md#macro-steps-saving-and-problems)
  - [Write order, uses and macro names](keyboard.md#write-order-uses-and-macro-names)
- [Tap dance, combos, key overrides, alt repeat](keyboard.md#tap-dance-combos-key-overrides-alt-repeat)
- [Backups](keyboard.md#backups)
  - [The backup file](keyboard.md#the-backup-file)
  - [Restore: checks and the plan](keyboard.md#restore-checks-and-the-plan)
  - [Restore: the review before writing](keyboard.md#restore-the-review-before-writing)
  - [Restore: writing the plan](keyboard.md#restore-writing-the-plan)
  - [Vial files (.vil)](keyboard.md#vial-files-vil)
<!-- contents:end -->

## [other-keyboards.md](other-keyboards.md)

The index of compatibility items, every place where the app adapts to a keyboard that differs from the K15 Max.

<!-- contents:start other-keyboards.md -->
- [Other keyboards](other-keyboards.md#other-keyboards)
  - [Definition, layout and layer differences](other-keyboards.md#definition-layout-and-layer-differences)
  - [Firmware differences](other-keyboards.md#firmware-differences)
  - [Knob differences](other-keyboards.md#knob-differences)
  - [Lighting differences](other-keyboards.md#lighting-differences)
  - [Lock and unlock differences](other-keyboards.md#lock-and-unlock-differences)
<!-- contents:end -->

## [spec.md](spec.md)

The design the app is built to, with its decisions.

<!-- contents:start spec.md -->
- [1. Goal](spec.md#1-goal)
- [2. Non-goals](spec.md#2-non-goals)
- [3. Decisions already made](spec.md#3-decisions-already-made)
- [4. Repository](spec.md#4-repository)
- [5. Structure of the screen](spec.md#5-structure-of-the-screen)
- [6. Architecture](spec.md#6-architecture)
- [7. Sections](spec.md#7-sections)
  - [Home](spec.md#home)
  - [Keys](spec.md#keys)
  - [Shortcuts & macros](spec.md#shortcuts--macros)
  - [Lighting](spec.md#lighting)
  - [Typing feel](spec.md#typing-feel)
  - [Test](spec.md#test)
  - [Device](spec.md#device)
  - [Help](spec.md#help)
  - [Settings (app)](spec.md#settings-app)
- [8. Live display](spec.md#8-live-display)
- [9. Plugins](spec.md#9-plugins)
- [10. Firmware extensions (separate work, in the owner's own K15 Max firmware)](spec.md#10-firmware-extensions-separate-work-in-the-owners-own-k15-max-firmware)
- [11. Look](spec.md#11-look)
- [12. Phases](spec.md#12-phases)
- [13. Verification](spec.md#13-verification)
- [14. Open questions](spec.md#14-open-questions)
<!-- contents:end -->
