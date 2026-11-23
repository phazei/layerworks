# Screen

The parts of the app's window: the shell around the pages, how pages and plugins are registered, the keyboard
stage with its selection, and the help panel and the tour.

<!-- contents:start -->
**Contents**

- [The screen](#the-screen)
  - [The sidebar](#the-sidebar)
  - [Connect prompt and status line](#connect-prompt-and-status-line)
  - [Skip link and headings](#skip-link-and-headings)
  - [Help panel, tour and errors on screen](#help-panel-tour-and-errors-on-screen)
  - [Theme and window sizes](#theme-and-window-sizes)
- [Pages and plugins](#pages-and-plugins)
- [The keyboard stage and selection](#the-keyboard-stage-and-selection)
  - [Layer shown and selection](#layer-shown-and-selection)
  - [The picture without a mouse](#the-picture-without-a-mouse)
  - [Stage reset, key labels and default layer names](#stage-reset-key-labels-and-default-layer-names)
  - [Stage height](#stage-height)
- [Help and the tour](#help-and-the-tour)
  - [Help topics and the guide](#help-topics-and-the-guide)
  - [The Help page](#the-help-page)
  - [The tour](#the-tour)
<!-- contents:end -->

## The screen

```
+------------+-----------------------------------------------+
| Layerworks |  Page title (?)                               |
| device card|  +-----------------------------------------+  |
|            |  | layer stack | keyboard picture          |  |  ← stage, on pages that ask for it
| Home       |  +-----------------------------------------+  |
| Keys       |  page (scrolls)                         help  |
| ...        |                                         panel |
| Help       |-----------------------------------------------|
| Settings   |  Saved on the keyboard (?)        Undo  Redo  |  ← status line, while connected
+------------+-----------------------------------------------+
```

### The sidebar

- **The sidebar** shows each page's icon and name, or the icons only (`shell/Sidebar.tsx`, `sidebar-collapse.ts`).
  A window narrower than 1024 px shows the icons only; the button beside the logo (under its mark with icons only;
  "Collapse sidebar" / "Expand sidebar") changes it by hand at any width. The hand choice is remembered in the browser (pref `sidebar`: the choice
  and which side of 1024 px the window was on) and holds, across reloads too, while the window stays on that side;
  when the window crosses 1024 px it is forgotten and the sidebar takes that width's shape. So it changes shape only
  when the button is pressed or the window crosses the threshold, and after a crossing it is always what that width
  calls for. `?sidebar=collapsed` / `expanded` shows it so without remembering it (screenshots). With icons only,
  each link keeps its page's name as its accessible name and `aria-current`; the name appears beside the icon on
  pointing and on keyboard focus (`ui/Tip.tsx`; Esc hides it). The logo is its mark, "Extras" is a line, Help and
  Settings stay at the bottom, and the width change is animated (none with reduced motion). The keyboard's card
  becomes one icon (`DeviceIcon`): a keyboard with a mark for how it is connected (cable, 2.4 GHz, demo) and one for
  locked or unlocked (none where the firmware never locks); its name says all of it ("Keychron K15 Max …, demo
  keyboard, locked"). It opens the full card beside it (`ui/Popover.tsx`), so Unlock… and Disconnect are two clicks
  away. Esc closes it and puts the focus back on the icon (Unlock… does the same before its dialog opens); a click
  outside or the focus leaving closes it. With no keyboard, the icon is a dashed plug that links to Home's connect prompt.

### Connect prompt and status line

- **Pages that need a keyboard** show the connect prompt instead while none is connected, and "Reading the
  keyboard…" while one connects. Pages with `offline: true` (Home, Help, Settings) always show.
- **The status line** says "Saved on the keyboard", "Saving…" while `DeviceState.writing` is above 0, or the
  `writeError`. While a page holds work not yet on the keyboard (a macro or another shortcut being edited), it says
  so instead ("Macro 3 has changes not yet saved to the keyboard", or the macro's own name when it has one, "2
  macros have unsaved changes"), as a link to
  the work: pages declare it with `setUnsaved(id, { label, group, href, keyboard })` (`shell/unsaved.ts`), the
  Shortcuts drafts for theirs. Beside it: the parts still being read in the background, or the ones that could not
  be read. Screen readers hear only what needs them: a failed change at once (`aria-live="assertive"`), work not
  saved and parts not read politely (`aria-live="polite"`), from hidden regions that stay in the page; the routine "Saving…" /
  "Saved on the keyboard", which flips on every change and every step of a slider, is left to the eye. Undo and redo
  call `deviceStore.undo` / `redo`; so do Ctrl + Z and Ctrl + Y or Ctrl + Shift + Z (Cmd on a Mac;
  `shell/undo-keys.ts`), shown on the buttons by a `Tip` and `aria-keyshortcuts`. The shortcuts do nothing while
  focus is in a field (its own undo), while a dialog is open, when the key press was already taken (`preventDefault`
  by "Press a key" or macro recording), and on the Test page, which holds them off (`holdUndoKeys`).

### Skip link and headings

- **The skip link** "Skip to the page" (`ui/SkipLink.tsx`) is the first Tab stop, seen only while focused; it moves
  the focus to the page area (`main#page`, `tabIndex={-1}`), past the sidebar.
- **Headings:** each page has one `h1`, its title, and sections under it that go down one level at a time; the
  sidebar's group titles are `h2` before it (`shell/__tests__/headings.test.tsx` walks every page). Text fields,
  search boxes and drop-downs show the focus ring every control has (`FIELD_FOCUS` in `ui/controls.tsx`).

### Help panel, tour and errors on screen

- **The help panel** slides in over the right edge of the page (not over the status line) when anything calls
  `openHelp(topic)`, usually a `HelpButton`. A `HelpButton` toggles (`toggleHelp`): pressed again while its topic
  is shown, it closes the panel; another "?" switches topic. It carries `aria-expanded` and `aria-controls`
  (`help-panel`). Opening it moves the focus into it (it is visible at once; only the slide is animated, as a hidden
  panel can't take the focus), and Esc or the close button hides it and gives the focus back to what opened it, the
  "?" usually; the page stays usable. A topic's link says where it goes ("Read
  more in the QMK documentation", "… the Vial manual", "… Keychron’s guide"; `help/docs-site.ts`). Under the text:
  related topics (they open in the panel) and "Open on the Help page".
- **The first-run tour** (see "Help and the tour") is mounted once in the shell (`shell/Tour.tsx`).
- **When something throws while drawing** (`shell/ErrorBoundary.tsx`): one boundary around the page area (the stage
  and the page, in `Shell.tsx`) and one around the whole app (`main.tsx`). The page one shows "Something went wrong
  on this page" in the page's place, with the sidebar and device card still working; another page or another keyboard
  starts afresh (`resetKey`). Both say nothing was sent to the keyboard because of it, link "report a problem" to the
  issues page (`ISSUES_URL`, `src/project.ts`), keep the error text behind "What went wrong", and offer Reload and
  "Try again". Since a section remembered as open ("More options", "Technical details", pref `open:<id>`) can make a
  page throw on every visit, "Try again" first closes every remembered section (`closeRememberedSections`).

### Theme and window sizes

- **Theme**: dark by default; Settings offers dark, light and "Like the system". Stored with `prefs.ts`
  (`theme`); a small script in `index.html` applies it before the app loads, and a `<style>` there gives the page its
  colour (`--surface`, each theme's) before the stylesheet arrives, so a reload doesn't flash white. Small text and
  control outlines meet WCAG's contrast in both themes (4.5:1 for text such as warnings on controls and red on its
  tint, 3:1 for `--control-edge`, the outline of text boxes, select boxes, checkboxes and an off switch); a test
  reads `tokens.css` and checks those pairs (`ui/__tests__/colour-contrast.test.ts`).
- Designed for 1280 × 800, usable down to 560 px wide with the sidebar's icons only (every page lays out without
  overlap; the K15's keys in the picture are about 24 px at 640 px and get smaller below). Narrower than that, the
  page area (title, stage, page and status line together) keeps 496 px (`min-w-124` in `Shell.tsx`) and scrolls
  sideways, so nothing overlaps or is cut off. The help panel waiting beyond the page's right edge doesn't count:
  `main` clips it (`overflow-clip`), so at or above the minimum nothing scrolls sideways, panel open or closed
  (`shell/__tests__/page-area.test.tsx` holds the classes; the widths were measured in a browser). The sidebar
  scrolls (thin scrollbar) only in a window too short for it. When the stage itself is narrower than 768 px (a
  container query; a window of about 1050 px), the layer stack becomes one row above the picture: the layers as
  chips (the dot marks the active one, the rename pencil appears on pointing or focus) and "Follow the keyboard" at
  its right end, wrapping under them only when the row is too narrow. However many layers there are, they stay one
  row, which scrolls sideways when it is longer than the stage (the layer shown is kept in view), so a keyboard with
  18 layers doesn't squeeze the picture. The stage takes at most half of the height it shares with the page (see "The keyboard stage and selection"), so the page
  under it always keeps the other half.

## Pages and plugins

A page is a `PageDef` (`src/plugins/api.ts`), registered through `definePlugin`. The built-in sections are the
`core` plugin in `src/pages/index.ts`, which lists one export per page file in sidebar order:

```ts
export const keysPage: PageDef = {
  path: 'keys',            // shown at #/keys; "#/" is home
  title: 'Keys',
  icon: Keyboard,          // lucide-react
  group: 'main',           // 'main' (default), 'plugins' (shown as "Extras") or 'app' (bottom of the sidebar)
  stage: 'select',         // 'view', 'select', or leave out for a full-height page
  offline: false,          // true: works without a keyboard
  help: 'assign-key',      // the "?" beside the page title
  component: KeysPage,
}
```

The shell picks the page from the first segment of the path (`#/keys/anything` is still Keys), so a page can use
the rest for its own addresses. To build out a section, replace its file in `src/pages/`; nothing else changes.
A plugin with `matches` or `requires` only appears while a matching keyboard is connected.

The window's title follows the page shown, from its `title`: "Keys · Layerworks", "Page not found · Layerworks"
(`shell/page-title.ts`, `usePageTitle`, called once in `Shell.tsx`), never the keyboard's name; `index.html`'s
title is the one before the app starts.

## The keyboard stage and selection

Pages with `stage` get the stage above them: the layer stack and the keyboard picture, with the keys held down
shown pressed (`usePressedKeys`). Its state lives in `src/shell/stage-store.ts`, outside React, so moving between
stage pages keeps the layer and selection:

### Layer shown and selection

- `useStage()` → `{ follow, layer, selection }`. `shownLayer(state, liveLayer, layerCount)` is the layer the
  picture shows: the keyboard's active layer while following, otherwise the one picked.
- Clicking a layer shows it and turns following off; the toggle turns it back on. The toggle is only there where the
  keyboard reports its layer (Keychron's `0xA3`); elsewhere the picture shows the layer picked, and keys typed light
  up as worked out on layer 0 (`NO_LAYER` in `pressed-keys.ts`, as on the Test page). A double click or the pencil
  renames a layer (`renameLayer`); the names live in the browser per keyboard (`layer-names.ts`).
- `stage: 'select'` makes keys and knob directions clickable. A click sets `selection` (a key's row and column,
  or a knob and direction, without the layer); Esc clears it.

### The picture without a mouse

- **Without a mouse** (`ui/usePictureKeys.tsx`, `ui/picture-keys.ts`): wherever the picture has an `onSelect` (the
  Keys stage, a key chord's picture, Lighting's key colours and zones) it is one Tab stop, a list box. The arrow keys
  move to the nearest key that lies that way by where the keys are drawn (each key's middle, rotation and the chosen
  layout options included; being off to the side counts twice as much as distance ahead, and a key must be at least
  0.4 of a key ahead, so slanted rows and split halves read as a person would point), Home / End go to the first and
  last in reading order, Enter or Space picks as a click would; Esc is left to the page. Knob directions are among
  the keys, except knobs the firmware keeps ("Fixed"), which are hidden from it. The widget is vendored, so after
  each render the hook puts `role="option"`, an id, a name ("Escape, row 1, column 2"; "Knob turned left: Volume
  Down"; the picture's words where the description is only QMK's name, "Macro 1") and `aria-selected` on its key
  groups, and the box carries `aria-activedescendant`. The key the arrows are on gets a ring of its own (an outline
  in `--content` with a `--card` halo, shown only after keyboard focus or an arrow), apart from the selected key's
  fill. `clickable={false}` leaves clicks to `PaintSurface` (painting), `picked` marks several keys (a chord),
  `describeKey` adds to a key's name (its colour, its zone). A picture without `onSelect` takes no Tab stop. A page reads `useStage().selection` and turns it
  into a slot with `toSlot(selection, shownLayer(...))` for `deviceStore.assign`. On `stage: 'view'` pages the
  picture is not clickable and no selection is drawn, but the selection is kept for when the user comes back.

### Stage reset, key labels and default layer names

- A different keyboard connecting (or none) resets the stage.
- **Labels**: the picture (`ui/KeyboardPicture.tsx`, everywhere it is drawn) uses the keycode tables' labels, except
  where those are only QMK's names (`ui/picture-labels.ts`): a macro reads "Macro 1" (M1), a multi-tap key
  "Multi-tap 1" (TD(1)), each on two lines; a layer key reads its kind's short word over the layer's name, as the
  Switch layer sentences say it ("Hold" over "Fn2" for MO, "Hold/tap" for TT, "Toggle", "Next key", "Switch to",
  "Base"; "Hold +Ctrl" for LM; "Base, kept" for QMK's PDF, which the app names but doesn't offer, as a
  Mac / Windows switch sets the base layer at every start; a long name on two lines); and a tap / hold key is split as the widget draws such
  keys, the hold above ("Ctrl", "Fn2") and the tap below ("Esc"); a knob direction gets the same text, tap above
  hold. Layer names are the connected keyboard's (`ui/layer-names.ts`; `KeyboardPicture`'s `layerNames` overrides
  them), "Layer 4" where there is none. Keys go to the widget's `labelOverrides`; for knobs, which have none, the
  text takes the keycode's place.
- **Default layer names** (`knownLayerNames`, `defaultLayerName` in `ui/layer-names.ts`): what the keyboard's
  keymap says each layer is for, where the app knows it, otherwise "Layer n". It knows Keychron's (and Lemokey's)
  Vial keymaps in vial-qmk, from the order of each keymap's `enum layers` (`MAC_BASE` "Mac", `WIN_FN` "Windows Fn",
  `_FN2` "Fn 2", `BASE` "Base"; an identifier like `L3` says nothing and stays "Layer 3"). The table,
  `device/keychron-layers.ts`, is generated by `node scripts/keychron-layers.mjs [path to vial-qmk]` (default
  a `vial_qmk` folder beside the repo); run it again after vial-qmk is updated. It is looked up by the Vial keyboard ID (exactly that
  keymap; the same on the cable and through a 2.4 GHz receiver, as it is read over Vial), then by the model in the
  keyboard's definition (`vendorId:productId`, also read over Vial: a keymap of the same model built elsewhere, such
  as the owner's own K15 Max keymap, has its own Vial ID), then, on the cable only, by the link's USB IDs (a few
  definitions, Keychron's R series, carry none; a receiver's IDs are its own). A model whose keymaps disagree is
  left out. Layers past the table's (the fifth of the owner's K15 Max keymap) are "Layer n". 313 keymaps, 310 models.

### Stage height

- **Height** (`stage-size.ts`, applied as CSS in `Stage.tsx`): the stage shares the main area between the page
  title and the status line with the page. Left alone it is as tall as the picture wants at this width (the picture
  shrinks with the width and never grows past its own drawing size), at most half of that shared space, but never
  so little that the keys get smaller than 24 px (`LEGIBLE_KEY`, worked out from the picture's own size and the
  widget's 1u, so it holds for any keyboard): in a small window half can be too little. The picture
  fits the box it is given, width and height, keeping its shape (`KeyboardPicture`'s `fit`). The handle on its
  bottom edge (`ui/ResizeHandle.tsx`) makes it shorter or taller by dragging (mouse or touch) or with the
  keyboard (arrows, Page Up / Down, Home / End; it is a focusable separator); double-click or Enter goes back to
  automatic. The chosen size is remembered in the browser as a share of the shared space (pref `stage-size`), so it
  follows the window. The handle can go below the legible size, but never below room for a 120 px picture (and, with the layers as a row above it, the
  row), and that minimum wins over the cap in a very short window. Beside the picture, the layer stack scrolls
  within itself when the stage is shorter than it; as a row above the picture it is always one line high. Pages under
  the stage, like the Keys inspector, take the rest and follow the handle as it moves.

## Help and the tour

### Help topics and the guide

**Topics** (`help/topics.ts`): each has a title, QMK's name, one to three paragraphs, an example, a documentation
link, `where` (the places in the app it is about, as addresses: `#/keys`, `#/shortcuts/chord/1`, `#/typing/tapHold`;
the Typing feel page scrolls to the group named after `#/typing/`) and `related` topics. A layer named in a text is
written `{layer:N|Generic name}` (`help/text.ts`): the connected keyboard's name for layer N, or the generic name
with none, so the Help page reads right offline.

**The guide** (`help/guide.ts`) puts every topic in exactly one group, in reading order: Getting started; Keys and
layers; Shortcuts & macros; Lighting; Typing feel; Testing; Device: backups and the keyboard; Firmware and QMK
words. `GUIDE_ONLY` names the few topics no "?" opens (Caps Word, Layer Lock, "Two names for everything"); the tests
check that every other topic is opened somewhere in the app and that every topic is in the guide. Every typing
setting has help: `FIELD_HELP` (`pages/typing/help.ts`) gives a setting its own "?" where a topic other than its
card's explains it (the tap-or-hold settings past the everyday one, `typing-hold-decision` and
`typing-tap-hold-more`); the rest are explained by their card's topic (`GROUP_HELP`), which a test checks. **The glossary**
(`help/glossary.ts`) maps the words other apps and guides use (QMK, Vial, VIA, keycode, tap dance, combo,
KC_TRNS, EEPROM, bootloader, N-key rollover …) to the app's name and topic.

### The Help page

**The Help page** (`pages/Help.tsx`, `pages/help/`), offline as well: a list at the left (search, "Start here",
the groups, the glossary; each group's title is a filled band (`bg-band`) that stays at the top of the list while
its topics, slightly indented, scroll under it, and the open topic is scrolled into the list's view) and the topic at the right, each column scrolling on its own; narrower than 42rem the
list and the topic take turns ("All topics" goes back), and the page opens at its top (marking the open item moves only
the list's own scrolling box). Addresses: `#/help` (the overview: "Take the tour", "Read
Getting started", the groups as tiles), `#/help/<topic>`, `#/help/glossary`, and `?q=…` after any of them to start
with a search. A topic shows its text, "Where this is in the app" as links, related topics, and the previous and
next topic in reading order; opening one moves the focus to its title. **The search** (`help/search.ts`) wants every
word of the query in a topic's title, QMK name, text, example or a glossary line pointing to it; titles and QMK names
weigh most, so "MO", "LT", "tap dance", "combo", "KC_TRNS" or "debounce" find the friendly topic first, and a query
that is one of a topic's names (its title, a part of its QMK name, a glossary term) puts that topic first. Variants
are handled there, in one place: US spellings ("color", "gray"); hyphen, space and joined forms ("mod-tap", "mod
tap", "modtap"); codes with any number ("TD(1)" finds "TD(0)"); and words of three letters or fewer match only whole
words, plurals included ("mac" finds "Mac", not "macro"). Each result shows its group and the passage where the words are, marked
(`help/Highlight.tsx`), and the topic opened from it is marked too. Nothing found: suggestions to click and the
glossary.

### The tour

**The tour** (`help/tour.ts`, `shell/Tour.tsx`, `ui/Spotlight.tsx`): six steps, each on a page and pointing at a
`data-tour` marker: the stage (`stage`, Home), the Keys page under it (`keys-page`), the status line (`status`), the
page title's "?" (`page-help`), the sidebar's pages (`nav`; its list shows each page's icon beside the name, so the pages can be found in the sidebar with icons only), the backup card (`backup`, Device). The coach mark
(`Spotlight`) draws an accent ring round the target and dims the rest lightly; clicks go through, so the app stays
usable. Its card has the step count, a sentence or two, Skip tour, Back and Next (Done on the last), and sits beside
the target where there is room (`ui/coach-placement.ts`); with no target found it is centred. It follows the target
as the page scrolls or resizes (measured every 250 ms and on resize and scroll), and a target in the lower half is
held by its distance from the bottom. Focus goes to Next at each step (to the card while Next waits); the arrow keys
move back and forth inside the card; Esc skips, unless it is closing the help panel, a dialog or a text field; when
the tour closes, the focus goes back where it was. There is no movement animation. With no keyboard connected
the tour shows "First, a keyboard" at the connect prompt on Home, with Next disabled, and carries on when one is in.
On the demo keyboard the first step says to click a layer instead of holding Fn.

- It starts by itself once: `main.tsx` calls `armTour(params)`; with no option at all in the address and the tour not
  yet seen, it waits until a keyboard is in while Home is shown. Taking it to the end or skipping it is remembered in
  the browser (pref `tour-seen`). Any address option (`?demo`, `?theme` …, as screenshots and demo links have) keeps
  it away, so screenshots of other pages never show it; `?tour` / `?tour=3` open it regardless.
- Again from the Help page's overview and from Settings ("Take the tour").
- Tests render `<Shell />` without `main.tsx`, so the tour never starts in them unless a test arms or starts it.
