// SPDX-License-Identifier: GPL-3.0-or-later
// Lighting: the effect the keys play, its brightness, speed and colour, the lights on or off, a still picture of it
// (or Keychron's key colour and zone editors), the Caps Lock light, and panels that plugins add for this section.
// Changes go to the keyboard as they are made (latest value first while a slider is dragged; see lighting/latest.ts)
// and the device store saves them on the keyboard after a pause.

import { useEffect, useId, useMemo, useRef, type ReactNode } from 'react'
import { ArrowDown, Lightbulb } from 'lucide-react'
import { deviceStore, PER_KEY_EFFECT, useDevice, ZONES_EFFECT, type Lighting, type LightingChange } from '../device'
import { activePanels, activePlugins, type PageDef } from '../plugins/api'
import { Button, OptionButton, Slider, Spinner, Toggle } from '../ui/controls'
import { Card, HelpButton, Notice } from '../ui/layout'
import { usePref } from '../ui/prefs'
import { colourName, hsvCss, HUE_TRACK, percent, satTrack } from './lighting/colour'
import { EffectPreview } from './lighting/EffectPreview'
import { effectGroups, effectInfo, OFF, type EffectInfo, type EffectRename, type Use } from './lighting/effects'
import { useLatestQueue } from './lighting/latest'
import { EffectPicture } from './lighting/EffectPicture'
import { KeyColours } from './lighting/KeyColours'
import { LockLights } from './lighting/LockLights'
import { Zones } from './lighting/Zones'

/**
 * Keychron's own effects, on keyboards whose firmware lists them, only once the Keychron commands say the keyboard
 * can be painted (they are read last; until then the tiles stay, so they don't come and go on keyboards that have
 * them). A VialRGB keyboard without Keychron lighting never shows them.
 */
function useKeychronEffects(): { perKey: boolean; zones: boolean; hide: ReadonlySet<number> } {
  const capabilities = useDevice((s) => s.capabilities)
  const reading = useDevice((s) => s.loading.includes('keychron'))
  return useMemo(() => {
    const perKey = !!capabilities?.has('perKeyLighting')
    const zones = !!capabilities?.has('lightingZones')
    const hide = new Set<number>()
    if (!reading && !perKey) hide.add(PER_KEY_EFFECT)
    if (!reading && !zones) hide.add(ZONES_EFFECT)
    return { perKey, zones, hide }
  }, [capabilities, reading])
}

/** Plugins active for this keyboard: their panels for this page, and their names for effects. */
function usePlugins() {
  const link = useDevice((s) => s.link)
  const uid = useDevice((s) => s.keyboard?.uid)
  const capabilities = useDevice((s) => s.capabilities)
  return useMemo(() => {
    const state = deviceStore.getState()
    const renames: Record<number, EffectRename> = Object.assign(
      {},
      ...activePlugins(state).map((plugin) => plugin.lightingEffects ?? {}),
    )
    return { panels: activePanels(state, 'lighting'), renames }
    // Plugins depend on which keyboard is connected and what it can do, not on every change.
  }, [link, uid, capabilities])
}

/**
 * The keyboard's own lighting keys change the lighting without telling anyone, so it is read again (one request)
 * when the page opens, when the window gets the focus back, and when a held layer is let go: the lighting keys sit
 * on the Fn layers.
 */
function useLightingRefresh(): void {
  const held = useDevice((s) => s.layer?.held ?? 0)
  const wasHeld = useRef(held)
  useEffect(() => {
    const refresh = () => void deviceStore.refreshLighting()
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])
  useEffect(() => {
    if (wasHeld.current !== 0 && held === 0) void deviceStore.refreshLighting()
    wasHeld.current = held
  }, [held])
}

function LightingPage() {
  useLightingRefresh()
  const lighting = useDevice((s) => s.lighting)
  const capabilities = useDevice((s) => s.capabilities)
  const failed = useDevice((s) => s.failed)
  const { panels, renames } = usePlugins()

  let body: ReactNode
  if (failed.includes('lighting')) {
    body = (
      <Card title="Lighting">
        <Notice tone="danger">The lighting couldn’t be read from the keyboard. Unplugging it and connecting again may help.</Notice>
      </Card>
    )
  } else if (!lighting || !capabilities) {
    body = (
      <Card>
        <p className="flex items-center gap-2 text-muted">
          <Spinner /> Reading the lighting from the keyboard…
        </p>
      </Card>
    )
  } else {
    const availability = capabilities.check('lighting')
    body = availability.available ? (
      <LightingControls lighting={lighting} renames={renames} />
    ) : (
      <Card title="Lighting">
        <Notice>{availability.reason}</Notice>
      </Card>
    )
  }

  // Keychron's lock lights are their own setting, apart from the effect: shown whenever the keyboard has them.
  const lockLights = !!capabilities?.has('lockLights')

  return (
    <div className="@container flex flex-col gap-4">
      {body}
      {(lockLights || panels.length > 0) && (
        <div className="grid items-start gap-4 @3xl:grid-cols-2">
          {lockLights && <LockLights />}
          {panels.map((panel) => (
            <Card key={panel.title} title={panel.title}>
              <panel.component />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

const sendLighting = (change: LightingChange) => deviceStore.setLighting(change)

function LightingControls({ lighting, renames }: { lighting: Lighting; renames: Record<number, EffectRename> }) {
  const uid = useDevice((s) => s.keyboard?.uid ?? '')
  const [pending, change] = useLatestQueue<LightingChange>(sendLighting)
  // What the keyboard is showing (or about to): the store's values with the changes still on their way.
  const now = { ...lighting, ...pending }
  const on = now.mode !== OFF
  const keychron = useKeychronEffects()
  const groups = useMemo(
    () => effectGroups([...lighting.effects].filter((id) => !keychron.hide.has(id)), renames),
    [lighting.effects, renames, keychron.hide],
  )
  const offered = groups.flatMap((group) => group.effects)

  // The effect to come back to when the lights are turned on again, kept per keyboard.
  const [lastEffect, setLastEffect] = usePref<number | null>(`lighting-last-effect:${uid}`, null)
  useEffect(() => {
    if (lighting.mode !== OFF && lighting.mode !== lastEffect) setLastEffect(lighting.mode)
  }, [lighting.mode, lastEffect, setLastEffect])

  function turnOn(value: boolean): void {
    if (!value) return change({ mode: OFF })
    const back = lastEffect !== null && lighting.effects.has(lastEffect) ? lastEffect : offered[0]?.id
    if (back !== undefined) change({ mode: back })
  }

  const effect = effectInfo(on ? now.mode : (lastEffect ?? OFF), renames)

  // Keychron's own effects bring their editor: the keyboard to paint on.
  const openedOn = useRef(lighting.mode)
  const editor =
    on && now.mode === PER_KEY_EFFECT && keychron.perKey ? (
      <KeyColours />
    ) : on && now.mode === ZONES_EFFECT && keychron.zones ? (
      <Zones renames={renames} />
    ) : null

  return (
    <>
      {/* Side by side down to narrow windows, the settings staying in view while the effects scroll. */}
      <div className="grid items-start gap-4 @2xl:grid-cols-[minmax(0,1fr)_18rem] @4xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card title="Effect" help="lighting-effect">
          <div className="-mt-1 flex flex-col gap-3">
            {groups.map((group) => (
              <section key={group.id} aria-label={group.title}>
                <h3 className="mb-1.5 text-[13px] font-medium text-muted">{group.title}</h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2">
                  {group.effects.map((fx) => (
                    <OptionButton
                      key={fx.id}
                      selected={on && now.mode === fx.id}
                      onClick={() => change({ mode: fx.id })}
                      className="py-1! pl-1!"
                    >
                      <EffectPreview effect={fx} hue={now.hue} sat={now.sat} speed={now.speed} />
                      <span className="text-[13px] leading-tight">{fx.name}</span>
                    </OptionButton>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Card>

        <Card className="@2xl:sticky @2xl:top-0">
          <Toggle
            checked={on}
            onChange={turnOn}
            label={<span className="font-medium">Lights on</span>}
            help={<HelpButton topic="lighting-on" />}
            hint={on ? undefined : 'Off for now. Turning them on brings back your effect.'}
          />
          <div className="mt-4 border-t border-edge pt-4">
            <CurrentEffect effect={effect} hue={now.hue} sat={now.sat} speed={now.speed} on={on} />
            {on && <EffectSettings effect={effect} now={now} change={change} />}
            {editor && (
              <Button size="sm" className="mt-4" icon={<ArrowDown size={14} aria-hidden />} onClick={showEditor}>
                {now.mode === ZONES_EFFECT ? 'Set up the zones' : 'Paint the keys'}
              </Button>
            )}
          </div>
        </Card>
      </div>
      {/* The editor follows the effect that brings it: pick the tile, paint below. Every other effect gets a still
          picture in the same place, so the page keeps its shape when switching. */}
      {editor ? (
        <EditorPlace key={now.mode} picked={now.mode !== openedOn.current}>
          {editor}
        </EditorPlace>
      ) : (
        <EffectPicture effect={effect} on={on} hue={now.hue} sat={now.sat} val={now.val} />
      )}
    </>
  )
}

const EDITOR_ID = 'lighting-editor'

const showEditor = () => document.getElementById(EDITOR_ID)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })

/** Brings the editor into view when it appears for an effect just picked (`picked`), not when the page opens on one. */
function EditorPlace({ picked, children }: { picked: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (picked) ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    // Once, as it appears.
  }, [])
  return (
    <div ref={ref} id={EDITOR_ID}>
      {children}
    </div>
  )
}

function CurrentEffect({ effect, hue, sat, speed, on }: { effect: EffectInfo; hue: number; sat: number; speed: number; on: boolean }) {
  if (effect.id === OFF) return null
  return (
    <div className="flex items-start gap-3">
      <EffectPreview effect={effect} hue={hue} sat={sat} speed={speed} />
      <div className="min-w-0">
        <div className="font-medium">
          {effect.name} <span className="text-[13px] font-normal text-muted">· {effect.qmkName}</span>
        </div>
        <p className="text-[13px] text-muted">{on ? effect.description : 'Comes back when the lights are turned on.'}</p>
      </div>
    </div>
  )
}


/** "This effect …" as "this effect …", to follow a colon. */
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)

/** The hint under a slider: the reason when the effect ignores it, otherwise what it does here, if special. */
const reason = (use: Use, otherwise?: string) => (use === true ? otherwise : use)

interface SettingsProps {
  effect: EffectInfo
  now: Lighting
  change: (change: LightingChange) => void
}

function EffectSettings({ effect, now, change }: SettingsProps) {
  const max = now.maxBrightness || 255
  const swatch = (
    <span aria-hidden className="size-3.5 rounded-pill border border-edge-strong" style={{ backgroundColor: hsvCss(now.hue, now.sat) }} />
  )
  // When colour and vividness are off for the same reason, it is said once, under both, and describes both.
  const sharedReason = effect.hue !== true && effect.hue === effect.sat ? effect.hue : null
  const sharedReasonId = useId()
  return (
    <div className="mt-5 flex flex-col gap-4">
      <Slider
        label="Brightness"
        help={<HelpButton topic="lighting-brightness" />}
        value={Math.min(now.val, max)}
        max={max}
        format={(v) => percent(v, max)}
        onChange={(val) => change({ val })}
      />
      <Slider
        label="Speed"
        help={<HelpButton topic="lighting-speed" />}
        value={now.speed}
        max={255}
        format={(v) => percent(v, 255)}
        disabled={effect.speed !== true}
        hint={reason(effect.speed, effect.speedHint)}
        onChange={(speed) => change({ speed })}
      />
      <Slider
        label={<>{swatch}Colour</>}
        help={<HelpButton topic="lighting-colour" />}
        value={now.hue}
        max={255}
        format={() => colourName(now.hue, now.sat)}
        track={HUE_TRACK}
        disabled={effect.hue !== true}
        hint={sharedReason ? undefined : reason(effect.hue)}
        describedBy={sharedReason ? sharedReasonId : undefined}
        onChange={(hue) => change({ hue })}
      />
      <Slider
        label="Vividness"
        help={<HelpButton topic="lighting-colour" />}
        value={now.sat}
        max={255}
        format={(v) => percent(v, 255)}
        track={satTrack(now.hue)}
        disabled={effect.sat !== true}
        hint={sharedReason ? undefined : reason(effect.sat)}
        describedBy={sharedReason ? sharedReasonId : undefined}
        onChange={(sat) => change({ sat })}
      />
      {sharedReason && (
        <p id={sharedReasonId} className="-mt-2.5 text-[13px] text-muted">
          Colour and vividness don’t apply: {lowerFirst(sharedReason)}
        </p>
      )}
    </div>
  )
}

export const lightingPage: PageDef = {
  path: 'lighting',
  title: 'Lighting',
  icon: Lightbulb,
  help: 'lighting-effect',
  component: LightingPage,
}
