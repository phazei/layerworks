// SPDX-License-Identifier: GPL-3.0-or-later
// What a page that needs a keyboard shows while none is connected: the keyboards the browser already knows,
// the browser's own chooser, and the demo keyboard. Also the "reading the keyboard" state while one connects.

import { useEffect, useState } from 'react'
import { Keyboard, Plug, Sparkles } from 'lucide-react'
import { grantedDevices, isWebHidSupported, useDevice } from '../device'
import { Button, Spinner } from '../ui/controls'
import { Notice } from '../ui/layout'
import { connectChosen, connectDemo, connectTo, useConnectError } from './session'

/** Devices the browser has already been allowed to open; looked up again whenever the connection changes. */
function useGrantedDevices(): HIDDevice[] {
  const status = useDevice((s) => s.status)
  const [granted, setGranted] = useState<HIDDevice[]>([])
  useEffect(() => {
    if (status !== 'disconnected' && status !== 'error') return
    let current = true
    const refresh = () => void grantedDevices().then((devices) => current && setGranted(devices))
    refresh()
    window.addEventListener('focus', refresh)
    return () => {
      current = false
      window.removeEventListener('focus', refresh)
    }
  }, [status])
  return granted
}

export function Connecting() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div role="status" className="flex items-center gap-2.5 text-muted">
        <Spinner size={18} />
        Reading the keyboard…
      </div>
    </div>
  )
}

export function ConnectPrompt() {
  const supported = isWebHidSupported()
  const granted = useGrantedDevices()
  const storeError = useDevice((s) => s.error)
  const connectError = useConnectError()
  const error = connectError ?? storeError

  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <section aria-labelledby="connect-title" className="flex w-full max-w-md flex-col gap-5 rounded-card bg-card p-7 shadow-card">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-pill bg-accent-soft text-accent">
            <Keyboard size={24} aria-hidden />
          </span>
          <h2 id="connect-title" className="text-lg font-semibold">
            Connect your keyboard
          </h2>
          <p className="text-muted">
            Plug the keyboard in with its cable, or plug in its Keychron Link receiver to use 2.4 GHz. Close Vial,
            Launcher and other keyboard apps first: only one can use the keyboard at a time.
          </p>
        </div>

        {!supported && (
          <Notice tone="danger">
            This browser can’t talk to keyboards. Open Layerworks in Chrome or Edge on a computer. You can still try
            the demo keyboard.
          </Notice>
        )}
        {error && <Notice tone="danger">Couldn’t connect: {error}</Notice>}

        <div className="flex flex-col gap-2">
          {granted.map((device, i) => (
            <Button key={i} variant="primary" icon={<Plug size={16} aria-hidden />} onClick={() => void connectTo(device)}>
              Connect to {device.productName || 'this keyboard'}
            </Button>
          ))}
          <Button
            variant={granted.length > 0 ? 'secondary' : 'primary'}
            icon={granted.length > 0 ? undefined : <Plug size={16} aria-hidden />}
            disabled={!supported}
            onClick={() => void connectChosen()}
          >
            {granted.length > 0 ? 'Choose another keyboard…' : 'Connect a keyboard…'}
          </Button>
          <Button variant="quiet" icon={<Sparkles size={15} aria-hidden />} onClick={() => void connectDemo()}>
            Try the demo keyboard
          </Button>
        </div>

        {supported && (
          <p className="text-center text-[13px] text-muted">
            In the list the browser shows, pick the keyboard, or “Keychron Link” for the receiver.
          </p>
        )}
      </section>
    </div>
  )
}
