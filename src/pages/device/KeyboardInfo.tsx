// SPDX-License-Identifier: GPL-3.0-or-later
// Everything known about the connected keyboard: in words first, the raw values behind "Technical details".

import { useEffect, useState, type ReactNode } from 'react'
import { Cable, Cpu, Keyboard, Layers, Lock, LockOpen, Radio } from 'lucide-react'
import { deviceStore, keyboardIdentity, lightingAsWritten, matrixKeys, NEVER_LOCKS, neverLocks, offeredEffectCount, receiverName, useDevice, type TransportStats } from '../../device'
import { Fact, Facts } from '../../ui/display'
import { Card, Disclosure, HelpButton } from '../../ui/layout'
import { readFirmware } from './firmware'

const ICON = 15
const KEYCHRON_VENDOR = 0x3434

const hex = (n: number, digits = 4) => `0x${n.toString(16).toUpperCase().padStart(digits, '0')}`

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(8rem,12rem)_1fr] gap-4 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 font-mono text-[13px] leading-relaxed break-words">{children}</dd>
    </div>
  )
}

/** The request counters of the connection, refreshed while shown. */
function Requests() {
  const [stats, setStats] = useState<TransportStats | null>(() => readStats())
  useEffect(() => {
    const timer = setInterval(() => setStats(readStats()), 1000)
    return () => clearInterval(timer)
  }, [])
  if (!stats) return <>Not connected</>
  return (
    <>
      {stats.requests} sent, {stats.resends} sent again, {stats.failures} unanswered; {stats.pushes} layer notices,{' '}
      {stats.strays} stray reports{stats.notices > 0 ? `, ${stats.notices} receiver notices` : ''}
    </>
  )
}

function readStats(): TransportStats | null {
  const stats = deviceStore.transport?.stats
  return stats ? { ...stats } : null
}

function TechnicalDetails() {
  const state = useDevice((s) => s)
  const { keyboard: kb, link, keychron, lighting, settings } = state
  if (!kb || !link) return null
  const identity = keyboardIdentity(state)
  const receiver = link.kind === 'receiver'
  return (
    <dl className="-my-2 divide-y divide-edge">
      <Row label="USB IDs">
        {identity?.vendorId != null && identity.productId != null
          ? `vendor ${hex(identity.vendorId)}, product ${hex(identity.productId)}`
          : 'not reported'}
        {receiver && <span className="block">receiver {hex(link.vendorId)}:{hex(link.productId)} ({link.productName})</span>}
      </Row>
      <Row label="Vial keyboard ID">{kb.uid}</Row>
      <Row label="Protocols">
        Vial {kb.vialProtocol}, VIA {kb.viaProtocol}
        {keychron && `, Keychron ${keychron.protocolVersion}${keychron.miscProtocolVersion ? ` (misc ${keychron.miscProtocolVersion})` : ''}`}
      </Row>
      {keychron && (
        <Row label="Keychron features">
          {hex(keychron.features)}, misc {hex(keychron.miscFeatures)}
        </Row>
      )}
      {keychron?.firmwareVersion && <Row label="Firmware string">{keychron.firmwareVersion}</Row>}
      {keychron?.mcuInfo && <Row label="Chip">{keychron.mcuInfo}</Row>}
      <Row label="Switch matrix">
        {kb.rows} rows × {kb.cols} columns
      </Row>
      <Row label="Layout options">{kb.layoutOptions}</Row>
      <Row label="Feature flags">{hex(kb.counts.featureFlags, 2)}</Row>
      <Row label="Macro memory">{kb.macroBytes} bytes</Row>
      {settings && <Row label="QMK setting IDs">{Object.keys(settings).join(', ') || 'none'}</Row>}
      {lighting && (
        <Row label="Lighting">
          {lighting.kind}
          {/* The firmware's VialRGB flag can beat the definition (device/lighting-kind.ts): say whose word it is. */}
          {kb.firmwareVialRgb && kb.definition.lighting !== 'vialrgb'
            ? ` (the firmware reports VialRGB; the definition says ${lightingAsWritten(kb.definition.lighting)})`
            : /* The definition may write it otherwise (an object, a list): shown as written, as text. */
              kb.definition.lighting === undefined
              ? ' (not given in the definition)'
              : typeof kb.definition.lighting !== 'string' && ` (written as ${lightingAsWritten(kb.definition.lighting)})`}
          {lighting.kind === 'vialrgb' && `, ${state.capabilities?.effectCount ?? offeredEffectCount(lighting.effects)} effects, brightness up to ${lighting.maxBrightness}`}
        </Row>
      )}
      <Row label="Requests">
        <Requests />
      </Row>
    </dl>
  )
}

export function KeyboardInfo() {
  const state = useDevice((s) => s)
  const { keyboard: kb, link, keychron, capabilities: caps, unlock, settings, loading } = state
  if (!kb || !link) return null

  const wireless = link.kind === 'receiver'
  const firmware = keychron ? readFirmware(keychron.firmwareVersion) : null
  const keys = matrixKeys(kb).length
  const maker = keyboardIdentity(state)?.vendorId === KEYCHRON_VENDOR ? 'Keychron' : null
  const pending = (part: (typeof loading)[number]) => (loading.includes(part) ? 'Reading…' : 'Not reported')

  return (
    <Card title="About this keyboard" help="keyboard-info" description={maker ? `${kb.name}, made by ${maker}` : kb.name}>
      <div className="flex flex-col gap-6">
        <Facts label="The keyboard">
          <Fact
            label="Connection"
            icon={wireless ? <Radio size={ICON} aria-hidden /> : <Cable size={ICON} aria-hidden />}
            hint={wireless ? `Through ${receiverName(link.productName)}` : 'Plugged in with the cable'}
          >
            {wireless ? '2.4 GHz' : 'Cable'}
          </Fact>
          <Fact
            label="Firmware"
            icon={<Cpu size={ICON} aria-hidden />}
            help={<HelpButton topic="firmware" />}
            hint={firmware?.built ? `Built ${firmware.built.toLocaleDateString(undefined, { dateStyle: 'long' })}` : 'QMK with Vial'}
          >
            {firmware ? firmware.version : pending('keychron')}
          </Fact>
          <Fact label="Layers" icon={<Layers size={ICON} aria-hidden />} help={<HelpButton topic="layers" />}>
            {kb.layers}
          </Fact>
          <Fact label="Keys" icon={<Keyboard size={ICON} aria-hidden />} hint={
              kb.knobCount
                ? `and ${kb.knobCount === 1 ? 'a knob' : `${kb.knobCount} knobs`}`
                : kb.fixedKnobs
                  ? `and ${kb.fixedKnobs === 1 ? 'a knob' : `${kb.fixedKnobs} knobs`} the firmware doesn’t let apps change`
                  : undefined
            }>
            {keys}
          </Fact>
          <Fact
            label="Protection"
            icon={unlock?.unlocked ? <LockOpen size={ICON} aria-hidden /> : <Lock size={ICON} aria-hidden />}
            help={<HelpButton topic="unlock" />}
            hint={neverLocks(unlock) ? NEVER_LOCKS : undefined}
          >
            {unlock === null ? pending('unlock') : neverLocks(unlock) ? 'Never locks' : unlock.unlocked ? 'Unlocked' : 'Locked'}
          </Fact>
        </Facts>

        <div>
          <h3 className="mb-3 text-[13px] font-semibold text-muted">Room for</h3>
          <Facts label="Room for">
            <Fact label="Macros" hint={kb.macroBytes ? `${kb.macroBytes} bytes shared` : undefined}>
              {kb.macroCount}
            </Fact>
            <Fact label="Multi-tap keys" hint="Tap dance">
              {caps?.tapDances ?? 0}
            </Fact>
            <Fact label="Key chords" hint="Combos">
              {caps?.combos ?? 0}
            </Fact>
            <Fact label="Shortcut replacements" hint="Key overrides">
              {caps?.keyOverrides ?? 0}
            </Fact>
            <Fact label="Repeat rules" hint="Alt repeat">
              {caps?.altRepeatKeys ?? 0}
            </Fact>
            <Fact label="Typing settings" hint="QMK settings">
              {settings ? Object.keys(settings).length : pending('settings')}
            </Fact>
          </Facts>
        </div>
      </div>
      <Disclosure id="device-technical" label="Technical details">
        <TechnicalDetails />
      </Disclosure>
    </Card>
  )
}
