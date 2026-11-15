// SPDX-License-Identifier: GPL-3.0-or-later
// Connecting and disconnecting, for every place in the shell that offers it.

import { useSyncExternalStore } from 'react'
import { chooseDevice, deviceStore, openLink } from '../device'
import { createDemoLink, type DemoLink } from '../demo/demo-link'

let demo: DemoLink | null = null
let error: string | null = null
const listeners = new Set<() => void>()

function setError(message: string | null): void {
  error = message
  for (const listener of [...listeners]) listener()
}

async function attempt(connect: () => Promise<void>): Promise<void> {
  setError(null)
  try {
    await connect()
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e))
  }
}

/** Connects to a device the browser already has permission for. */
export function connectTo(device: HIDDevice): Promise<void> {
  demo = null
  return attempt(async () => deviceStore.connect(await openLink(device)))
}

/** Shows the browser's device chooser and connects to what is picked. Must be called from a click. */
export function connectChosen(): Promise<void> {
  return attempt(async () => {
    const device = await chooseDevice()
    if (!device) return
    demo = null
    await deviceStore.connect(await openLink(device))
  })
}

/** Connects to the built-in demo keyboard. */
export function connectDemo(): Promise<void> {
  return attempt(async () => {
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

/** Why the last attempt to open a device failed (the store reports failures after that point). */
export function useConnectError(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => error,
  )
}
