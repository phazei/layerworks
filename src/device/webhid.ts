// SPDX-License-Identifier: GPL-3.0-or-later
// HidLink over the browser's WebHID (Chrome, Edge). WebHID gives no serial number, so a keyboard and a 2.4 GHz
// receiver are told apart by product ID and usage page only.

import { REPORT_LEN, type HidLink, type LinkKind } from './link'

const RAW_USAGE_PAGE = 0xff60
const RAW_USAGE = 0x61
const KEYCHRON_VENDOR = 0x3434

export const RECEIVER_SETUP_GAP_MS = 60
// The receiver's own commands, sent as they are (not XOR-encoded) before any tunnelled traffic.
export const RECEIVER_SETUP = [[0xb1], [0xb2], [0xb5, 0x00]] // protocol version, state, gamepad reports off

export function isWebHidSupported(): boolean {
  return typeof navigator !== 'undefined' && 'hid' in navigator
}

/** Keychron's receivers have product IDs 0xD000-0xDFFF and expose the same raw HID interface as a keyboard. */
export function linkKindOf(vendorId: number, productId: number): LinkKind {
  return vendorId === KEYCHRON_VENDOR && productId >= 0xd000 && productId <= 0xdfff ? 'receiver' : 'cable'
}

function linkKind(device: HIDDevice): LinkKind | null {
  const raw = device.collections.some((c) => c.usagePage === RAW_USAGE_PAGE && c.usage === RAW_USAGE)
  return raw ? linkKindOf(device.vendorId, device.productId) : null
}

/** Devices the user has already allowed that look like a keyboard or receiver we can talk to. */
export async function grantedDevices(): Promise<HIDDevice[]> {
  if (!isWebHidSupported()) return []
  return (await navigator.hid.getDevices()).filter((device) => linkKind(device) !== null)
}

/** Shows the browser's device chooser. Must be called from a click. Resolves with null when cancelled. */
export async function chooseDevice(): Promise<HIDDevice | null> {
  const chosen = await navigator.hid.requestDevice({
    filters: [{ usagePage: RAW_USAGE_PAGE, usage: RAW_USAGE }],
  })
  return chosen.find((device) => linkKind(device) !== null) ?? null
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Opens the device and, for a receiver, prepares it to tunnel reports to the keyboard. */
export async function openLink(device: HIDDevice): Promise<HidLink> {
  const kind = linkKind(device)
  if (!kind) throw new Error(`${device.productName || 'This device'} has no raw HID interface`)
  if (!device.opened) await device.open()

  const reportListeners = new Set<(report: Uint8Array) => void>()
  const closeListeners = new Set<() => void>()
  let closed = false

  const onInputReport = (event: HIDInputReportEvent) => {
    const { buffer, byteOffset, byteLength } = event.data
    const report = new Uint8Array(buffer, byteOffset, byteLength)
    for (const listener of [...reportListeners]) listener(report)
  }
  const onDisconnect = (event: HIDConnectionEvent) => {
    if (event.device === device) finish()
  }
  function finish(): void {
    if (closed) return
    closed = true
    device.removeEventListener('inputreport', onInputReport)
    navigator.hid.removeEventListener('disconnect', onDisconnect)
    for (const listener of [...closeListeners]) listener()
  }

  device.addEventListener('inputreport', onInputReport)
  navigator.hid.addEventListener('disconnect', onDisconnect)

  const send = async (report: Uint8Array) => {
    const padded = new Uint8Array(REPORT_LEN)
    padded.set(report.subarray(0, REPORT_LEN))
    await device.sendReport(0, padded)
  }

  if (kind === 'receiver') {
    try {
      for (const command of RECEIVER_SETUP) {
        await send(Uint8Array.from(command))
        await delay(RECEIVER_SETUP_GAP_MS)
      }
    } catch (error) {
      finish()
      await device.close().catch(() => {})
      throw error
    }
  }

  return {
    kind,
    vendorId: device.vendorId,
    productId: device.productId,
    productName: device.productName,
    send,
    onReport(listener) {
      reportListeners.add(listener)
      return () => reportListeners.delete(listener)
    },
    onClose(listener) {
      closeListeners.add(listener)
      return () => closeListeners.delete(listener)
    },
    async close() {
      finish()
      if (device.opened) await device.close()
    },
  }
}
