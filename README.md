# Layerworks

A configurator for Keychron keyboards running Vial firmware
([tymon3310/vial-qmk](https://github.com/tymon3310/vial-qmk)), built to be usable without knowing QMK. It runs in
the browser (Chrome or Edge, over WebHID), on the cable or through the 2.4 GHz receiver.

The design is in the Alice-Keyboard project: `../docs/spec/layerworks.md`. What exists so far is the foundation:
the connection layer and a bare page that shows the keyboard and follows its active layer.

## Run it

```
pnpm install
pnpm dev          # http://localhost:5199
```

Click **Connect a keyboard…** and pick the keyboard (cable) or the Keychron Link receiver (2.4 GHz). Only one
program can hold the keyboard at a time, so close Vial, Pipette or Launcher tabs first.

| Command | |
|---|---|
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | Must pass before every hand-over. `test` includes the vendored tests. |
| `pnpm build` | Production build into `dist/` |
| `pnpm hardware` | Loads the real keyboard through the device layer, without a browser, and prints what it read. Reads only. Set `LINK=receiver` to go through the 2.4 GHz receiver (`$env:LINK='receiver'; pnpm hardware`). |
| `pnpm vendor check` | Vendored files still match the recorded Pipette commit (see `VENDOR.md`) |

## Layout

```
src/
  device/            talking to the keyboard
    link.ts            HidLink: raw reports in and out (WebHID, node-hid and the test fake implement it)
    transport.ts       the request queue: one request at a time, timeouts, resends, 2.4 GHz encoding
    pushes.ts          reports the keyboard sends unasked (layer changes), recognised by shape
    webhid.ts          HidLink over WebHID
    store.ts           everything read from the keyboard, and the load sequence
    capabilities.ts    what this keyboard can do, with a reason for what it can't
    useDevice.ts       the app's store and its React hook
    index.ts           the public surface; pages and plugins import from here
  ui/                shared components (KeyboardPicture wraps the vendored keyboard widget)
  vendor/pipette/    code copied from Pipette, unmodified (VENDOR.md)
  App.tsx            the foundation's proof page
hardware/            checks against the real keyboard (pnpm hardware)
scripts/vendor.mjs   keeps src/vendor in step with the Pipette clone
```

## How it talks to the keyboard

```
pages / plugins → device store → vendored protocol code → transport (request queue) → HidLink
                      ↑ layer changes ←──────────────────── unsolicited reports
```

- **One queue.** Every request goes through `Transport.request`, one at a time. The vendored protocol functions
  use it too (the store injects it), so nothing can overlap.
- **Replies are checked.** VIA and Keychron replies start with the request's command byte (or `0xFF` for an
  unknown command); anything else is dropped as stray. Vial replies (`0xFE …`) carry data from the first byte and
  can't be checked.
- **Pushes are recognised by shape.** The keyboard reports every layer change as `[0xA3, base, held, 0 × 29]`
  without being asked. That exact shape goes to listeners, never to a waiting request, unless the request is
  `0xA3` itself on the cable. Plugins can register further shapes (`Transport.onPush`).
- **2.4 GHz.** Requests and replies are XOR-ed with `0x28`; pushes and the receiver's own notices (`0xBC`,
  `0xE2`) are not. Timeouts are short (300 ms) with up to 6 sends, because packets get lost now and then.
- **Loading is staged.** Definition, keymap and knob come first, so the picture appears quickly; macros, entries,
  settings, lighting, lock state and Keychron state follow in the background (`DeviceState.loading`). A part that
  fails is listed in `DeviceState.failed` and the rest still loads.
- **Capabilities** are rebuilt as parts arrive. `capabilities.check('macros')` returns whether it's available and,
  if not, a sentence saying why.

## Tests

Unit tests sit in `__tests__/` beside the code. `src/device/__tests__/fake-keyboard.ts` provides a `HidLink`
with no hardware behind it and a small Vial keyboard to answer it, on the cable or through a receiver.

## Licence

GPL-3.0-or-later. See `LICENSE`, and `VENDOR.md` for the code that comes from Pipette.
