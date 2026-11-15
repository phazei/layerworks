// SPDX-License-Identifier: GPL-3.0-or-later
// HidLink over node-hid, so the device layer can be run against the real keyboard without a browser.

import HID from 'node-hid'
import { REPORT_LEN, type HidLink, type LinkKind } from '../src/device/link'
import { linkKindOf, RECEIVER_SETUP, RECEIVER_SETUP_GAP_MS } from '../src/device/webhid'

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Opens the first Keychron raw HID interface of the wanted kind, or returns null when there is none. */
export async function openNodeHidLink(kind: LinkKind): Promise<HidLink | null> {
  const info = (await HID.devicesAsync()).find(
    (d) => d.vendorId === 0x3434 && d.usagePage === 0xff60 && d.usage === 0x61 && linkKindOf(d.vendorId, d.productId) === kind,
  )
  if (!info?.path) return null
  const device = await HID.HIDAsync.open(info.path)
  const closeListeners = new Set<() => void>()
  device.on('error', () => closeListeners.forEach((listener) => listener()))

  const send = async (report: Uint8Array) => {
    const padded = new Uint8Array(REPORT_LEN + 1) // leading report ID 0
    padded.set(report.subarray(0, REPORT_LEN), 1)
    await device.write(Buffer.from(padded))
  }

  if (kind === 'receiver') {
    for (const command of RECEIVER_SETUP) {
      await send(Uint8Array.from(command))
      await delay(RECEIVER_SETUP_GAP_MS)
    }
  }

  return {
    kind,
    vendorId: info.vendorId,
    productId: info.productId,
    productName: info.product ?? '',
    send,
    onReport(listener) {
      const onData = (data: Buffer) => listener(new Uint8Array(data))
      device.on('data', onData)
      return () => device.off('data', onData)
    },
    onClose(listener) {
      closeListeners.add(listener)
      return () => closeListeners.delete(listener)
    },
    async close() {
      await device.close()
    },
  }
}
