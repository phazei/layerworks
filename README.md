# Layerworks

A configurator for keyboards running Vial firmware, built to be usable without knowing QMK, with Keychron's extras
(key colours and zones, the Caps Lock light, sleep timers, key bounce filter, Snap Click) where the keyboard has
them. It is built and tested on a Keychron K15 Max with [tymon3310/vial-qmk](https://github.com/tymon3310/vial-qmk).
It runs in the browser (Chrome or Edge, over WebHID), on the cable or through Keychron's 2.4 GHz receiver.

Use it at https://layerworks.tybyfy.com/. It needs Chrome or Edge on a computer and a keyboard on Vial firmware;
a demo keyboard is built in, to try it with nothing plugged in.

## Run it locally

```
pnpm install
pnpm dev          # http://localhost:5199
```

## Documents

- `docs/README.md`: the index of the documents on how the app works and how to work on it
- `AGENTS.md`: the rules for working on the code
- `VENDOR.md`: the code copied from Pipette

## Problems

Report a problem in the GitHub issues: https://github.com/phazei/layerworks/issues

## Licence

GPL-3.0-or-later, see `LICENSE`.
