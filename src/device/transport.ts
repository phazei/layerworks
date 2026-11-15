// SPDX-License-Identifier: GPL-3.0-or-later
// The one path to the keyboard: a serialised request queue over a HidLink. Everything that talks to the
// keyboard (the vendored protocol code, the device store, plugins) goes through a Transport, so requests never
// overlap and unsolicited reports never get mistaken for replies.

import { REPORT_LEN, type HidLink } from './link'
import { LAYER_PUSH, type PushShape } from './pushes'

/** The 2.4 GHz receiver tunnels reports with every byte XOR-ed with this; its wireless module chokes on some values. */
const RECEIVER_XOR = 0x28
/** First byte of the receiver's own state notices, which it may send at any time. Never encoded. */
const RECEIVER_NOTICES = [0xbc, 0xe2]

const VIAL_PREFIX = 0xfe
const UNHANDLED = 0xff

export interface RequestOptions {
  /** How long to wait for the reply to one attempt. */
  timeoutMs?: number
  /** How many times to send before giving up. Only use more than 1 for requests that are safe to repeat. */
  attempts?: number
  /** Whether a report is this request's reply. Anything rejected is dropped as stray. */
  accept?: (reply: Uint8Array, request: Uint8Array) => boolean
}

export interface TransportOptions {
  timeoutMs?: number
  attempts?: number
  /** After a request that needed a resend, how long to hold the queue so late replies are not handed to the next request. */
  settleMs?: number
}

export interface TransportStats {
  requests: number
  /** Attempts beyond the first. */
  resends: number
  /** Requests that got no reply on any attempt. */
  failures: number
  pushes: number
  /** Reports that were neither a push nor an acceptable reply. */
  strays: number
  /** Receiver state notices skipped. */
  notices: number
}

export interface Transport {
  readonly link: HidLink
  readonly stats: Readonly<TransportStats>
  /** Sends a request and resolves with its reply (REPORT_LEN bytes, decoded). Queued behind earlier requests. */
  request(bytes: ArrayLike<number>, options?: RequestOptions): Promise<Uint8Array>
  /** Sends a report that has no reply. Queued like a request. */
  send(bytes: ArrayLike<number>): Promise<void>
  /** Listens for one kind of unsolicited report. Returns the unsubscribe function. */
  onPush(shape: PushShape, listener: (report: Uint8Array) => void): () => void
  /** Stops the transport: everything waiting or queued rejects. Does not close the link. */
  stop(): void
}

export class TransportError extends Error {
  constructor(
    readonly reason: 'timeout' | 'disconnected',
    message: string,
  ) {
    super(message)
    this.name = 'TransportError'
  }
}

const DEFAULTS: Record<HidLink['kind'], Required<TransportOptions>> = {
  cable: { timeoutMs: 500, attempts: 2, settleMs: 50 },
  // Replies normally take 7-30 ms over 2.4 GHz, but a packet is lost now and then. A short wait and a resend
  // costs far less than one long wait.
  receiver: { timeoutMs: 300, attempts: 6, settleMs: 100 },
}

/**
 * VIA and Keychron replies start with the request's command byte, or 0xFF when the firmware doesn't know the
 * command. Vial replies (0xFE ...) carry data from byte 0, so they can't be checked.
 */
export function echoesCommand(reply: Uint8Array, request: Uint8Array): boolean {
  return request[0] === VIAL_PREFIX || reply[0] === request[0] || reply[0] === UNHANDLED
}

function toReport(bytes: ArrayLike<number>): Uint8Array {
  const report = new Uint8Array(REPORT_LEN)
  report.set(Array.prototype.slice.call(bytes, 0, REPORT_LEN))
  return report
}

const hex = (bytes: Uint8Array) =>
  Array.from(bytes.subarray(0, 4), (b) => b.toString(16).padStart(2, '0')).join(' ')

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

interface Waiting {
  request: Uint8Array
  accept: (reply: Uint8Array, request: Uint8Array) => boolean
  resolve: (reply: Uint8Array) => void
  reject: (error: Error) => void
}

export function createTransport(link: HidLink, options: TransportOptions = {}): Transport {
  const defaults = { ...DEFAULTS[link.kind], ...options }
  const encoded = link.kind === 'receiver'
  const stats: TransportStats = { requests: 0, resends: 0, failures: 0, pushes: 0, strays: 0, notices: 0 }
  // A shape stays known once registered, so its reports are kept away from replies even with nobody listening.
  const listeners = new Map<PushShape, Set<(report: Uint8Array) => void>>([[LAYER_PUSH, new Set()]])

  let waiting: Waiting | null = null
  let queue: Promise<unknown> = Promise.resolve()
  let stopped = false

  const code = (bytes: Uint8Array) => (encoded ? bytes.map((b) => b ^ RECEIVER_XOR) : bytes)

  const offReport = link.onReport((received) => {
    const raw = toReport(received)

    // Only the first byte identifies a notice, so an encoded reply starting with one of these values would be
    // dropped too. No reply of this firmware does; Pipette and vial-gui make the same assumption.
    if (encoded && RECEIVER_NOTICES.includes(raw[0])) {
      stats.notices++
      return
    }

    for (const [shape, subscribers] of listeners) {
      if (!shape.matches(raw)) continue
      const isReply = !encoded && waiting !== null && shape.replyTo === waiting.request[0]
      if (isReply) break
      stats.pushes++
      for (const listener of [...subscribers]) listener(raw)
      return
    }

    const reply = code(raw)
    if (!waiting || !waiting.accept(reply, waiting.request)) {
      stats.strays++
      return
    }
    const { resolve } = waiting
    waiting = null
    resolve(reply)
  })

  const disconnected = () => new TransportError('disconnected', 'The keyboard is not connected')

  function stop(): void {
    if (stopped) return
    stopped = true
    offReport()
    offClose()
    waiting?.reject(disconnected())
    waiting = null
  }
  const offClose = link.onClose(stop)

  /** Runs jobs one at a time, in the order they were queued; a failed job doesn't block the next. */
  function enqueue<T>(job: () => Promise<T>): Promise<T> {
    const result = queue.then(() => {
      if (stopped) throw disconnected()
      return job()
    })
    queue = result.catch(() => {})
    return result
  }

  function attempt(request: Uint8Array, accept: Waiting['accept'], timeoutMs: number): Promise<Uint8Array> {
    return new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (waiting === entry) waiting = null
        reject(new TransportError('timeout', `No reply to ${hex(request)} within ${timeoutMs} ms`))
      }, timeoutMs)
      const entry: Waiting = {
        request,
        accept,
        resolve: (reply) => {
          clearTimeout(timer)
          resolve(reply)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        },
      }
      waiting = entry
      link.send(code(request)).catch((error: unknown) => {
        if (waiting === entry) waiting = null
        entry.reject(error instanceof Error ? error : new Error(String(error)))
      })
    })
  }

  return {
    link,
    stats,
    stop,

    request(bytes, requestOptions = {}) {
      const request = toReport(bytes)
      const timeoutMs = requestOptions.timeoutMs ?? defaults.timeoutMs
      const attempts = Math.max(1, requestOptions.attempts ?? defaults.attempts)
      const accept = requestOptions.accept ?? echoesCommand

      return enqueue(async () => {
        stats.requests++
        for (let sent = 1; ; sent++) {
          try {
            const reply = await attempt(request, accept, timeoutMs)
            if (sent > 1) await delay(defaults.settleMs)
            return reply
          } catch (error) {
            const retry = error instanceof TransportError && error.reason === 'timeout' && sent < attempts
            if (!retry || stopped) {
              if (!stopped) stats.failures++
              throw stopped ? disconnected() : error
            }
            stats.resends++
          }
        }
      })
    },

    send(bytes) {
      const report = toReport(bytes)
      return enqueue(() => link.send(code(report)))
    },

    onPush(shape, listener) {
      let subscribers = listeners.get(shape)
      if (!subscribers) listeners.set(shape, (subscribers = new Set()))
      subscribers.add(listener)
      return () => {
        subscribers.delete(listener)
      }
    },
  }
}
