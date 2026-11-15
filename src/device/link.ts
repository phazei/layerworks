// SPDX-License-Identifier: GPL-3.0-or-later

/** Every raw HID report, in either direction, is this long. */
export const REPORT_LEN = 32

/** How the keyboard is reached. A receiver tunnels reports to the keyboard over 2.4 GHz. */
export type LinkKind = 'cable' | 'receiver'

/**
 * A raw HID connection: reports out, reports in, nothing else. The transport (./transport) adds the request
 * queue on top. WebHID is one implementation (./webhid); tests use a fake, and a desktop shell would add its own.
 */
export interface HidLink {
  readonly kind: LinkKind
  readonly vendorId: number
  readonly productId: number
  readonly productName: string
  /** Sends one report of REPORT_LEN bytes. */
  send(report: Uint8Array): Promise<void>
  /** Every report received, exactly as it arrived. Returns the unsubscribe function. */
  onReport(listener: (report: Uint8Array) => void): () => void
  /** Called once when the device goes away (unplugged, powered off, closed). */
  onClose(listener: () => void): () => void
  close(): Promise<void>
}
