// SPDX-License-Identifier: GPL-3.0-or-later
// The one path to the keyboard: a serialised request queue over a HidLink. Everything that talks to the
// keyboard (the vendored protocol code, the device store, plugins) goes through a Transport, so requests never
// overlap and unsolicited reports never get mistaken for replies.

import { REPORT_LEN, type HidLink } from './link'
import { FACTORY_RESET_PUSH, LAYER_PUSH, type PushShape } from './pushes'

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
  /**
   * After a request got no reply at all: the queue is held until nothing has arrived for this long (at most four
   * times as long in all), so replies that were only late are dropped instead of being taken by the next request.
   */
  drainMs?: number
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
  /** Requests in a row that got no reply; 0 once one is answered. */
  unanswered: number
}

export interface Transport {
  readonly link: HidLink
  readonly stats: Readonly<TransportStats>
  /** Sends a request and resolves with its reply (REPORT_LEN bytes, decoded). Queued behind earlier requests. */
  request(bytes: ArrayLike<number>, options?: RequestOptions): Promise<Uint8Array>
  /** Sends a report that has no reply. Queued like a request. */
  send(bytes: ArrayLike<number>): Promise<void>
  /**
   * Runs `job` with the queue to itself: requests made through the `request` it is given go straight out, and
   * every other request and send waits until the job has finished. For exchanges nothing may interrupt (unlock).
   */
  exclusive<T>(job: (request: Transport['request']) => Promise<T>): Promise<T>
  /** Listens for one kind of unsolicited report. Returns the unsubscribe function. */
  onPush(shape: PushShape, listener: (report: Uint8Array) => void): () => void
  /** Stops the transport: everything waiting or queued rejects. Does not close the link. */
  stop(): void
}

export class TransportError extends Error {
  constructor(
    /**
     * 'timeout': no reply. 'disconnected': the keyboard went away. 'busy': the keyboard sent the request back
     * unchanged, which it does to everything while an unlock is counting (via.c).
     */
    readonly reason: 'timeout' | 'disconnected' | 'busy',
    message: string,
  ) {
    super(message)
    this.name = 'TransportError'
  }
}

const DEFAULTS: Record<HidLink['kind'], Required<TransportOptions>> = {
  cable: { timeoutMs: 500, attempts: 2, settleMs: 50, drainMs: 300 },
  // Replies normally take 7-30 ms over 2.4 GHz, but a packet is lost now and then. A short wait and a resend
  // costs far less than one long wait.
  receiver: { timeoutMs: 300, attempts: 6, settleMs: 100, drainMs: 300 },
}

/**
 * VIA bytes after the command byte that the firmware leaves as they were sent (via.c writes its answer after
 * them): a reply must repeat them, so a late reply to another request with the same command isn't taken.
 */
const VIA_ECHOED: Record<number, number> = {
  0x02: 1, // get keyboard value: the value id
  0x03: 1, // set keyboard value
  0x04: 3, // get keycode: layer, row, column
  0x05: 5, // set keycode: layer, row, column, keycode
  0x07: 1, // lighting set: the value id
  0x08: 1, // lighting get
  0x0e: 3, // macro buffer get: offset, size
  0x0f: 3, // macro buffer set
  0x12: 3, // keymap buffer get: offset, size
  0x13: 3, // keymap buffer set
  0xa7: 1, // Keychron misc: the sub-command
  0xa8: 1, // Keychron lighting: the sub-command
}

/**
 * VIA and Keychron replies start with the request's command byte, or 0xFF when the firmware doesn't know the
 * command; for the commands in VIA_ECHOED the request's next bytes come back too. Vial replies (0xFE ...) carry
 * data from byte 0, so they can't be checked.
 */
export function echoesCommand(reply: Uint8Array, request: Uint8Array): boolean {
  if (request[0] === VIAL_PREFIX || reply[0] === UNHANDLED) return true
  if (reply[0] !== request[0]) return false
  const echoed = VIA_ECHOED[request[0]] ?? 0
  for (let i = 1; i <= echoed; i++) if (reply[i] !== request[i]) return false
  return true
}

/**
 * Vial commands whose real reply always differs from the request (a status byte in front). Sent back unchanged,
 * they weren't carried out: the keyboard is counting an unlock some other app or page started.
 */
function isUnlockingEcho(reply: Uint8Array, request: Uint8Array): boolean {
  if (request[0] !== VIAL_PREFIX) return false
  const changes = request[1] === 0x0a || request[1] === 0x0b || (request[1] === 0x0d && request[2] >= 1 && request[2] <= 8)
  return changes && reply.every((b, i) => b === request[i])
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
  const stats: TransportStats = { requests: 0, resends: 0, failures: 0, pushes: 0, strays: 0, notices: 0, unanswered: 0 }
  // A shape stays known once registered, so its reports are kept away from replies even with nobody listening.
  const listeners = new Map<PushShape, Set<(report: Uint8Array) => void>>([
    [LAYER_PUSH, new Set()],
    [FACTORY_RESET_PUSH, new Set()],
  ])

  let waiting: Waiting | null = null
  let queue: Promise<unknown> = Promise.resolve()
  let stopped = false
  /** When the last report of any kind arrived (for draining after a request got no reply). */
  let lastReport = 0
  /** The drain after a request got no reply; the next queued job waits for it. */
  let draining: Promise<void> | null = null

  const code = (bytes: Uint8Array) => (encoded ? bytes.map((b) => b ^ RECEIVER_XOR) : bytes)

  /**
   * A layer push and a knob read's reply can look alike ([0xA3, n, n, 0 …] is also "left 0xA3nn, right 0x00nn"). On
   * the cable, while a knob read waits, such a report is taken as its reply: knob reads are short and rare.
   */
  const knobRead = (request: Uint8Array) => request[0] === VIAL_PREFIX && request[1] === 0x03

  const offReport = link.onReport((received) => {
    const raw = toReport(received)
    lastReport = Date.now()

    // Only the first byte identifies a notice, so an encoded reply starting with one of these values would be
    // dropped too. No reply of this firmware does; Pipette and vial-gui make the same assumption.
    if (encoded && RECEIVER_NOTICES.includes(raw[0])) {
      stats.notices++
      return
    }

    for (const [shape, subscribers] of listeners) {
      if (!shape.matches(raw)) continue
      const isReply =
        !encoded && waiting !== null && (shape.replyTo === waiting.request[0] || (shape === LAYER_PUSH && knobRead(waiting.request)))
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
    const entry = waiting
    waiting = null
    stats.unanswered = 0
    if (isUnlockingEcho(reply, entry.request)) {
      entry.reject(new TransportError('busy', 'The keyboard sent the request back unchanged: an unlock is counting'))
      return
    }
    entry.resolve(reply)
  })

  /** Holds the queue until no report has arrived for drainMs (at most 4 × drainMs), dropping whatever comes. */
  async function drain(): Promise<void> {
    const start = Date.now()
    lastReport = start
    while (!stopped && Date.now() - start < defaults.drainMs * 4) {
      const quietFor = Date.now() - lastReport
      if (quietFor >= defaults.drainMs) return
      await delay(defaults.drainMs - quietFor)
    }
  }

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
    const result = queue.then(async () => {
      if (draining) {
        await draining
        draining = null
      }
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

  /** One request with its resends, sent now: the caller holds the queue. */
  async function exchange(bytes: ArrayLike<number>, requestOptions: RequestOptions = {}): Promise<Uint8Array> {
    if (stopped) throw disconnected()
    const request = toReport(bytes)
    const timeoutMs = requestOptions.timeoutMs ?? defaults.timeoutMs
    const attempts = Math.max(1, requestOptions.attempts ?? defaults.attempts)
    const accept = requestOptions.accept ?? echoesCommand

    stats.requests++
    for (let sent = 1; ; sent++) {
      try {
        const reply = await attempt(request, accept, timeoutMs)
        if (sent > 1) await delay(defaults.settleMs)
        return reply
      } catch (error) {
        const timedOut = error instanceof TransportError && error.reason === 'timeout'
        const retry = timedOut && sent < attempts
        if (!retry || stopped) {
          if (!stopped) stats.failures++
          if (timedOut && !stopped) {
            stats.unanswered++
            // Replies that were only late would otherwise be taken by whatever is sent next: the queue waits.
            draining = drain()
          }
          throw stopped ? disconnected() : error
        }
        stats.resends++
      }
    }
  }

  return {
    link,
    stats,
    stop,

    request(bytes, requestOptions = {}) {
      const request = toReport(bytes) // copied now: the caller may reuse its buffer while this waits
      return enqueue(() => exchange(request, requestOptions))
    },

    exclusive(job) {
      return enqueue(() => job(exchange))
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
