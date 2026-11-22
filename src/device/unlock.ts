// SPDX-License-Identifier: GPL-3.0-or-later
// Vial's unlock: the keyboard counts down while its unlock keys are held, one step per poll, and lets the app make
// protected changes once the count reaches 0. While it counts, the keyboard ignores its keys and almost every
// command, and nothing can cancel it; it only ends by finishing or by the keyboard restarting. So the flow holds
// the whole request queue, polls from one loop only, and never polls sooner than the firmware allows
// (../docs/research/spike-results.md finding 5; vial-qmk quantum/vial.c, vial_unlock_poll).

import type { UnlockStatus } from '../vendor/pipette/shared/types/protocol'
import type { LinkKind } from './link'
import { TransportError, type Transport } from './transport'

const VIAL = 0xfe
const GET_STATUS = 0x05
const START = 0x06
const POLL = 0x07

/** The firmware's count (VIAL_UNLOCK_COUNTER_MAX). */
export const UNLOCK_STEPS = 50

/**
 * Pause between one poll's reply and the next poll. The firmware takes a step only when more than 100 ms have
 * passed since the last one, and starts the count again otherwise, so there is margin for timing jitter; over
 * 2.4 GHz the radio adds more of it (the spike finished there at one poll per 150 ms).
 */
export const UNLOCK_POLL_MS: Record<LinkKind, number> = { cable: 120, receiver: 150 }

/** How often a start that the keyboard didn't take is sent again before giving up. */
const START_ATTEMPTS = 3

export interface UnlockProgress {
  /** Steps of the keyboard's own count still to go: UNLOCK_STEPS at the start, 0 when unlocked. */
  remaining: number
  total: number
  /** The keyboard didn't answer the last poll. The flow keeps asking. */
  silent: boolean
}

export const statusRequest = () => [VIAL, GET_STATUS]

/**
 * Compatibility: firmware built with VIAL_INSECURE never locks (vial_qmk quantum/vial.c: `vial_unlocked` starts at 1,
 * `vial_lock` and the unlock count do nothing, and "get unlock status" names no keys; in vial-qmk only
 * keyboards/vipad is built so). It reads as unlocked with no unlock keys, which a keyboard that can lock never does (it always names its
 * keys). There the app offers neither Lock nor Unlock and says the firmware doesn't lock.
 */
/** Said where the lock state would be, for firmware that never locks. */
export const NEVER_LOCKS = 'This firmware doesn’t lock: everything can be changed at any time, with no keys to hold first.'

export function neverLocks(status: UnlockStatus | null): boolean {
  return status !== null && status.unlocked && status.keys.length === 0
}

/**
 * Reads the reply to "get unlock status": unlocked, unlocking, then up to 15 (row, col) keys to hold. null for a
 * reply that isn't one (firmware without Vial answers 0xFF).
 */
export function parseUnlockStatus(reply: Uint8Array): UnlockStatus | null {
  if (reply[0] > 1 || reply[1] > 1) return null
  const keys: [number, number][] = []
  for (let i = 0; i < 15; i++) {
    const row = reply[2 + i * 2]
    const col = reply[3 + i * 2]
    if (row !== 0xff && col !== 0xff) keys.push([row, col])
  }
  return { unlocked: reply[0] === 1, inProgress: reply[1] === 1, keys }
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export interface UnlockRun {
  transport: Transport
  /** Called with the keyboard's count after every poll it answers, and when it stops answering. */
  onProgress: (progress: UnlockProgress) => void
  /** Asked between polls: true ends the loop with UnlockStopped (the keyboard itself goes on counting). */
  shouldStop?: () => boolean
}

/** The app stopped waiting (`shouldStop`). Nothing tells the keyboard: an unlock it started can't be cancelled. */
export class UnlockStopped extends Error {
  constructor() {
    super('Stopped waiting for the unlock')
    this.name = 'UnlockStopped'
  }
}

/**
 * Runs the whole unlock with the queue held: status, start (unless the keyboard is already counting), then polls
 * until it reports unlocked. Resolves with the final status. Rejects only when nothing was started (the keyboard
 * keeps working) or when the keyboard goes away (TransportError 'disconnected').
 */
export function runUnlock({ transport, onProgress, shouldStop = () => false }: UnlockRun): Promise<UnlockStatus> {
  const pause = UNLOCK_POLL_MS[transport.link.kind]

  return transport.exclusive(async (request) => {
    const checkStop = () => {
      if (shouldStop()) throw new UnlockStopped()
    }
    const status = parseUnlockStatus(await request(statusRequest()))
    if (!status) throw new Error('This keyboard’s firmware has no unlock.')
    if (status.unlocked) return status

    let starts = 0
    const start = async () => {
      if (++starts > START_ATTEMPTS) throw new Error('The keyboard didn’t start unlocking.')
      await request([VIAL, START])
      onProgress({ remaining: UNLOCK_STEPS, total: UNLOCK_STEPS, silent: false })
    }
    if (!status.inProgress) await start()

    for (;;) {
      checkStop()
      await delay(pause)
      checkStop()
      let reply: Uint8Array
      try {
        // One attempt: a resend is just another poll, and the loop decides when that is due.
        reply = await request([VIAL, POLL], { attempts: 1 })
      } catch (error) {
        if (error instanceof TransportError && error.reason === 'timeout') {
          onProgress({ remaining: UNLOCK_STEPS, total: UNLOCK_STEPS, silent: true })
          continue
        }
        throw error
      }
      const unlocked = reply[0] === 1
      const inProgress = reply[1] === 1
      if (unlocked) return { ...status, unlocked: true, inProgress: false }
      // Not counting and not unlocked: the start never arrived. Nothing is blocked, so it's safe to ask again.
      if (!inProgress) {
        await start()
        continue
      }
      onProgress({ remaining: Math.min(reply[2], UNLOCK_STEPS), total: UNLOCK_STEPS, silent: false })
    }
  })
}
