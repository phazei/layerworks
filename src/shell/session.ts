// SPDX-License-Identifier: GPL-3.0-or-later
// Connecting and disconnecting, for every place in the shell that offers it. Also: one Layerworks tab per keyboard
// (a Web Locks claim), the browser asking before the page is left mid-write, and URL options meant for screenshots.

import { useSyncExternalStore } from 'react'
import { chooseDevice, deviceStore, openLink } from '../device'
import { createDemoLink, type DemoLink } from '../demo/demo-link'

let demo: DemoLink | null = null
let error: string | null = null

/**
 * Something the connect prompt should say besides an error: another Layerworks tab holds the keyboard (with the
 * device, to take it over), or this tab let go of it because another one took it over.
 */
export type SessionNotice = { kind: 'other-tab'; device: HIDDevice } | { kind: 'taken-over' } | null
let notice: SessionNotice = null

const listeners = new Set<() => void>()
const changed = () => {
  for (const listener of [...listeners]) listener()
}

function setError(message: string | null): void {
  error = message
  changed()
}

function setNotice(next: SessionNotice): void {
  notice = next
  changed()
}

async function attempt(connect: () => Promise<void>): Promise<void> {
  setError(null)
  try {
    await connect()
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e))
  }
}

// ---- One tab per keyboard -----------------------------------------------------------------------------------------
//
// WebHID lets every tab open the same keyboard, and every tab then gets every reply: each takes the other's replies
// for its own. Layerworks tabs claim the keyboard with a Web Lock (same origin only); a second tab is told and can
// take it over, which makes the first let go. WebHID gives no serial number, so the claim is per model (vendor and
// product ID). Where `navigator.locks` is missing, nothing is claimed.

/** The claim this tab holds: releasing it lets another tab connect. */
let claim: { name: string; release: () => void } | null = null

const lockName = (device: HIDDevice) => `layerworks:keyboard:${device.vendorId.toString(16)}:${device.productId.toString(16)}`
const locks = (): LockManager | null => (typeof navigator !== 'undefined' && navigator.locks ? navigator.locks : null)

/** Claims the keyboard for this tab. Resolves false when another tab holds it (`steal` takes it from that tab). */
function claimKeyboard(device: HIDDevice, steal = false): Promise<boolean> {
  const manager = locks()
  if (!manager) return Promise.resolve(true)
  const name = lockName(device)
  if (claim?.name === name) return Promise.resolve(true)
  releaseClaim()
  return new Promise((resolve) => {
    const held = manager.request(name, steal ? { steal: true } : { ifAvailable: true }, (lock) => {
      if (!lock) {
        resolve(false)
        return undefined
      }
      resolve(true)
      return new Promise<void>((release) => {
        claim = { name, release }
      })
    })
    // Another tab took it over: let go of the keyboard here.
    held.catch(() => {
      if (claim?.name !== name) return
      claim = null
      demo = null
      void deviceStore.disconnect()
      setNotice({ kind: 'taken-over' })
    })
  })
}

function releaseClaim(): void {
  claim?.release()
  claim = null
}

// The claim goes when the keyboard does (unplugged, an error, Disconnect).
deviceStore.subscribe(() => {
  const { status } = deviceStore.getState()
  if (claim && (status === 'disconnected' || status === 'error')) releaseClaim()
})

async function connectDevice(device: HIDDevice, steal = false): Promise<void> {
  if (!(await claimKeyboard(device, steal))) {
    setNotice({ kind: 'other-tab', device })
    return
  }
  setNotice(null)
  demo = null
  await deviceStore.connect(await openLink(device))
}

/** Connects to a device the browser already has permission for. */
export function connectTo(device: HIDDevice): Promise<void> {
  return attempt(() => connectDevice(device))
}

/** Takes the keyboard over from the other Layerworks tab that holds it, which lets go of it. */
export function takeOver(device: HIDDevice): Promise<void> {
  return attempt(() => connectDevice(device, true))
}

/** Shows the browser's device chooser and connects to what is picked. Must be called from a click. */
export function connectChosen(): Promise<void> {
  return attempt(async () => {
    const device = await chooseDevice()
    if (!device) return
    await connectDevice(device)
  })
}

/** Connects to the built-in demo keyboard. */
export function connectDemo(): Promise<void> {
  return attempt(async () => {
    releaseClaim()
    setNotice(null)
    demo = createDemoLink()
    await deviceStore.connect(demo)
  })
}

export function disconnect(): Promise<void> {
  demo = null
  return deviceStore.disconnect()
}

/** The demo keyboard, while it is the one connected. */
export const demoKeyboard = (): DemoLink | null => (deviceStore.getState().status === 'ready' ? demo : null)

/**
 * A URL option that exists for screenshots (`?put-on-key=`, `?restore-sample`, …): its value only while the demo
 * keyboard is connected, so a link can't make the app change a real keyboard or show made-up content on it. Options
 * that only navigate (`?help=`, `?select=`, `?open=`, `?tour=`) are read directly.
 */
export function screenshotOption(name: string): string | null {
  if (typeof location === 'undefined' || !demoKeyboard()) return null
  return new URLSearchParams(location.search).get(name)
}

function useSession<T>(read: () => T): T {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    read,
  )
}

/** Why the last attempt to open a device failed (the store reports failures after that point). */
export function useConnectError(): string | null {
  return useSession(() => error)
}

/** Another tab holds the keyboard, or took it over from this one. */
export const sessionNotice = (): SessionNotice => notice

export function useSessionNotice(): SessionNotice {
  return useSession(sessionNotice)
}

// ---- Leaving the page ---------------------------------------------------------------------------------------------

if (typeof window !== 'undefined') {
  // Lighting waiting for its pause is saved now; a change or a restore on its way makes the browser ask first.
  window.addEventListener('beforeunload', (event) => {
    const state = deviceStore.getState()
    if (state.savePending) void deviceStore.flushSaves()
    if (state.writing > 0 || state.restoring) event.preventDefault()
  })
  window.addEventListener('pagehide', () => {
    if (deviceStore.getState().savePending) void deviceStore.flushSaves()
  })
}
