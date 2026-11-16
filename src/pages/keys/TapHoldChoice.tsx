// SPDX-License-Identifier: GPL-3.0-or-later
// "Tap or hold": one thing when the key is tapped, another while it is held. Held, it is a modifier (QMK's
// mod-tap, LCTL_T(kc) …) or a layer (layer-tap, LT(layer, kc)); tapped, a plain key from the palette. Nothing is
// written until the button, which names the result, so trying combinations doesn't fill the undo history.

import { useState } from 'react'
import {
  canBeTapped,
  keycodeName,
  layerTapKeycode,
  MAX_TAP_LAYER,
  modTapKeycode,
  readTapHold,
  RIGHT_HAND,
  type PaletteGroup,
} from '../../device'
import { Button, OptionButton } from '../../ui/controls'
import { KeyCap } from '../../ui/KeyTile'
import { Disclosure, HelpButton } from '../../ui/layout'
import { PageLink } from '../../ui/PageLink'
import { describeKeycode } from './describe'
import { KeyPalette } from './KeyPalette'
import { HandChoice, ModifierBoxes } from './Modifiers'

interface Props {
  current: number
  names: string[]
  /** The layer the key being edited is on. */
  ownLayer: number
  /** The keys a tap can send. */
  groups: PaletteGroup[]
  onAssign: (code: number) => void
}

type Hold = 'mods' | 'layer'

export function TapHoldChoice({ current, names, ownLayer, groups, onAssign }: Props) {
  const now = readTapHold(current)
  // The layers a layer-tap key can reach: its keycode has room for 0-15.
  const layers = names.slice(0, MAX_TAP_LAYER + 1)
  const [hold, setHold] = useState<Hold>(now?.hold ?? 'mods')
  const [mods, setMods] = useState(now?.hold === 'mods' ? now.mods : 0x01)
  const [layer, setLayer] = useState(now?.hold === 'layer' ? now.layer : ownLayer + 1 < layers.length ? ownLayer + 1 : 0)
  const [key, setKey] = useState<number | null>(now && canBeTapped(now.key) ? now.key : null)

  const code = key === null ? null : hold === 'mods' ? modTapKeycode(mods, key) : layerTapKeycode(layer, key)
  const label =
    code !== null
      ? code === current
        ? 'This is what it does now'
        : `Use ${describeKeycode(code, names)}`
      : hold === 'mods' && (mods & 0x0f) === 0
        ? 'Tick a modifier'
        : 'Pick a key to tap'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div role="group" aria-label="When held" className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1.5 text-muted">When held</span>
        <OptionButton shape="chip" selected={hold === 'mods'} onClick={() => setHold('mods')}>
          a modifier
        </OptionButton>
        <OptionButton shape="chip" selected={hold === 'layer'} onClick={() => setHold('layer')}>
          a layer
        </OptionButton>
        <HelpButton topic={hold === 'mods' ? 'mod-tap' : 'layer-tap'} />
      </div>

      {hold === 'mods' ? (
        <div role="group" aria-label="Modifiers while held" className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-muted">Hold for</span>
          <ModifierBoxes mods={mods} onChange={setMods} />
        </div>
      ) : (
        <div role="group" aria-label="Layer while held" className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1.5 text-muted">Hold for</span>
          {layers.map((name, n) => (
            <OptionButton key={n} shape="chip" selected={n === layer} onClick={() => setLayer(n)}>
              {name}
            </OptionButton>
          ))}
          {names.length > layers.length && (
            <span className="text-[13px] text-muted">Only the first {layers.length} layers can be held this way.</span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-muted">Tap for</span>
        {key !== null ? <KeyCap label={keycodeName(key)} /> : <span className="text-muted italic">a key from below</span>}
        <Button variant="primary" size="sm" className="ml-auto" disabled={code === null || code === current} onClick={() => code !== null && onAssign(code)}>
          {label}
        </Button>
      </div>

      {/* At least room for a few rows of keys; in a short window the column scrolls instead. The notes go under it,
          so in a small window the palette starts as high as it can. */}
      <div className="flex min-h-52 flex-1 flex-col">
        <KeyPalette
          groups={groups}
          current={-1}
          picked={key}
          onPick={(picked) => setKey(picked.code)}
          hint="Pick the key a tap sends (plain keys only), then use it."
          label="Key for a tap"
        />
      </div>
      <p className="text-[13px] text-muted">
        Only plain keys can be tapped; for a media key or a shortcut, use a{' '}
        <PageLink href="#/shortcuts">multi-tap key</PageLink>. How long counts as a hold is set on the{' '}
        <PageLink href="#/typing">Typing feel page</PageLink>.
      </p>

      {hold === 'mods' && (
        <div className="[&>div]:mt-1">
          <Disclosure id="keys-tap-hold-side" label="Left- or right-hand modifier" forceOpen={(mods & RIGHT_HAND) !== 0}>
            <HandChoice mods={mods} onChange={setMods} />
          </Disclosure>
        </div>
      )}
    </div>
  )
}
