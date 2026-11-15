// SPDX-License-Identifier: GPL-3.0-or-later
// The foundation's proof page: connect, show the keyboard and follow its layer. The real shell replaces it.

import { useEffect, useState, type ReactNode } from 'react'
import {
  chooseDevice,
  deviceStore,
  grantedDevices,
  isWebHidSupported,
  openLink,
  useDevice,
  type Feature,
  type TransportStats,
} from './device'
import { KeyboardPicture } from './ui/KeyboardPicture'

const FEATURES: Feature[] = [
  'macros', 'tapDance', 'combos', 'keyOverrides', 'altRepeat', 'capsWord', 'layerLock', 'knob', 'qmkSettings',
  'lighting', 'perKeyLighting', 'liveLayer', 'battery', 'wirelessTimers', 'debounce', 'nkro', 'snapClick',
]

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-card px-4 py-3">
      <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}

const buttonClass =
  'cursor-pointer rounded-md border border-edge bg-card px-3 py-1.5 text-left hover:border-accent disabled:cursor-default disabled:opacity-40'

async function connect(device: HIDDevice | null): Promise<void> {
  if (device) await deviceStore.connect(await openLink(device))
}

/** The request queue's counters, refreshed twice a second; they are not part of the store's state. */
function useTransportStats(): TransportStats | null {
  const [stats, setStats] = useState<TransportStats | null>(null)
  useEffect(() => {
    const timer = setInterval(() => {
      const current = deviceStore.transport?.stats
      setStats(current ? { ...current } : null)
    }, 500)
    return () => clearInterval(timer)
  }, [])
  return stats
}

export function App() {
  const status = useDevice((s) => s.status)
  const error = useDevice((s) => s.error)
  const link = useDevice((s) => s.link)
  const keyboard = useDevice((s) => s.keyboard)
  const layer = useDevice((s) => s.layer)
  const caps = useDevice((s) => s.capabilities)
  const loading = useDevice((s) => s.loading)
  const failed = useDevice((s) => s.failed)
  const keychron = useDevice((s) => s.keychron)
  const unlock = useDevice((s) => s.unlock)
  const lighting = useDevice((s) => s.lighting)
  const stats = useTransportStats()

  const [granted, setGranted] = useState<HIDDevice[]>([])
  const [connectError, setConnectError] = useState<string | null>(null)
  const [follow, setFollow] = useState(true)
  const [chosenLayer, setChosenLayer] = useState(0)

  useEffect(() => {
    if (status === 'disconnected' || status === 'error') void grantedDevices().then(setGranted)
  }, [status])

  const run = (device: Promise<HIDDevice | null> | HIDDevice) => {
    setConnectError(null)
    Promise.resolve(device)
      .then(connect)
      .catch((e: unknown) => setConnectError(e instanceof Error ? e.message : String(e)))
  }

  const liveLayer = layer?.active ?? 0
  const shownLayer = follow && layer ? liveLayer : chosenLayer
  const connected = status === 'ready' && keyboard !== null

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] gap-4 p-4">
      <aside className="flex flex-col gap-4">
        <Card title="Layerworks">
          {!isWebHidSupported() ? (
            <p className="text-danger">This browser has no WebHID. Use Chrome or Edge.</p>
          ) : connected || status === 'connecting' ? (
            <div className="flex flex-col gap-2">
              <div>
                <div className="font-semibold">{keyboard?.name ?? link?.productName}</div>
                <div className="text-muted">
                  {status === 'connecting' ? 'Reading the keyboard…' : link?.kind === 'receiver' ? '2.4 GHz receiver' : 'Cable'}
                </div>
              </div>
              <button className={buttonClass} onClick={() => void deviceStore.disconnect()}>
                Disconnect
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {granted.map((device, i) => (
                <button key={i} className={buttonClass} onClick={() => run(device)}>
                  Connect to {device.productName}
                </button>
              ))}
              <button className={buttonClass} onClick={() => run(chooseDevice())}>
                {granted.length ? 'Choose another device…' : 'Connect a keyboard…'}
              </button>
              <p className="text-muted">Pick the keyboard on the cable, or the Keychron Link receiver for 2.4 GHz.</p>
            </div>
          )}
          {(error ?? connectError) && <p className="mt-2 text-danger">{error ?? connectError}</p>}
        </Card>

        {connected && (
          <Card title="Layer">
            <div className="flex flex-col gap-1.5">
              <label className={layer ? '' : 'text-muted'}>
                <input type="checkbox" checked={follow && layer !== null} disabled={!layer} onChange={(e) => setFollow(e.target.checked)} />{' '}
                Follow the keyboard
              </label>
              {Array.from({ length: keyboard.layers }, (_, i) => (
                <button
                  key={i}
                  className={`${buttonClass} ${i === shownLayer ? 'border-accent' : ''}`}
                  onClick={() => {
                    setFollow(false)
                    setChosenLayer(i)
                  }}
                >
                  Layer {i}
                  {layer && i === liveLayer && <span className="text-success"> ● active</span>}
                  {layer && i === layer.base && i !== liveLayer && <span className="text-muted"> base</span>}
                </button>
              ))}
              {!layer && <p className="text-muted">This firmware doesn’t report its layer.</p>}
            </div>
          </Card>
        )}
      </aside>

      <main className="flex flex-col gap-4">
        <section className="flex min-h-64 justify-center rounded-xl bg-card px-4 py-3">
          {connected ? (
            <KeyboardPicture keyboard={keyboard} layer={shownLayer} />
          ) : (
            <p className="self-center text-muted">
              {status === 'connecting' ? 'Reading the keyboard…' : 'No keyboard connected.'}
            </p>
          )}
        </section>

        {connected && caps && (
          <div className="grid grid-cols-3 gap-4">
            <Card title="Keyboard">
              <Row label="ID">{keyboard.uid}</Row>
              <Row label="VIA / Vial / Keychron protocol">
                {caps.viaProtocol} / {caps.vialProtocol} / {caps.keychronProtocol ?? '–'}
              </Row>
              <Row label="Firmware">{keychron?.firmwareVersion || '–'}</Row>
              <Row label="Matrix, layers, knobs">
                {keyboard.rows}×{keyboard.cols}, {caps.layers}, {caps.knobs}
              </Row>
              <Row label="Keys">{keyboard.layout?.keys.length ?? 0}</Row>
              <Row label="Macros">
                {caps.macros.count} in {caps.macros.bytes} bytes
              </Row>
              <Row label="Tap dance / combo / override / alt repeat">
                {caps.tapDances} / {caps.combos} / {caps.keyOverrides} / {caps.altRepeatKeys}
              </Row>
              <Row label="Settings">{caps.qmkSettings?.size ?? '…'}</Row>
              <Row label="Lighting">{lighting ? `${lighting.kind}, ${lighting.effects.size} effects, mode ${lighting.mode}` : '…'}</Row>
              <Row label="Battery">
                {keychron ? (link?.kind === 'cable' ? 'on the cable' : `${keychron.batteryLevel} %`) : '–'}
              </Row>
              <Row label="Lock">{unlock ? (unlock.unlocked ? 'unlocked' : 'locked') : '…'}</Row>
            </Card>

            <Card title="Can do">
              <div className="flex flex-wrap gap-1.5">
                {FEATURES.map((feature) => {
                  const availability = caps.check(feature)
                  return (
                    <span
                      key={feature}
                      className={`rounded-full border px-2 py-0.5 ${availability.available ? 'border-success' : 'border-edge text-muted line-through'}`}
                      aria-label={availability.available ? feature : `${feature}: ${availability.reason}`}
                    >
                      {feature}
                    </span>
                  )
                })}
              </div>
            </Card>

            <Card title="Connection">
              <Row label="Still reading">{loading.length ? loading.join(', ') : 'nothing, all loaded'}</Row>
              <Row label="Could not read">
                <span className={failed.length ? 'text-danger' : ''}>{failed.length ? failed.join(', ') : 'nothing'}</span>
              </Row>
              <Row label="Layer (base / held)">{layer ? `${layer.base} / ${layer.held}` : '–'}</Row>
              {stats && (
                <>
                  <Row label="Requests">{stats.requests}</Row>
                  <Row label="Sent again">{stats.resends}</Row>
                  <Row label="Failed">
                    <span className={stats.failures ? 'text-danger' : ''}>{stats.failures}</span>
                  </Row>
                  <Row label="Layer reports">{stats.pushes}</Row>
                  <Row label="Stray reports">{stats.strays}</Row>
                  <Row label="Receiver notices">{stats.notices}</Row>
                </>
              )}
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
