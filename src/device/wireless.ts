// SPDX-License-Identifier: GPL-3.0-or-later
// Keychron's wireless timers: how long the keyboard waits, on Bluetooth or 2.4 GHz, before turning its lights off
// and before going to sleep. Read and written with `0xA7 0x0B/0x0C`; the firmware refuses a lights-off time under
// 5 s or a sleep time under 60 s, and saves what it accepts (../docs/research/k15-firmware-capabilities.md 3.2).

export interface WirelessTimers {
  /** Seconds without a key press before the lights go off. */
  backlitTime: number
  /** Seconds without a key press before the keyboard sleeps. */
  idleTime: number
}

export const MIN_BACKLIT_SECONDS = 5
export const MIN_IDLE_SECONDS = 60
/** Both are stored as 16-bit numbers of seconds. */
export const MAX_TIMER_SECONDS = 0xffff

/** The choices offered for each timer, in seconds. Any other value the keyboard holds is shown as it is. */
export const BACKLIT_CHOICES = [30, 60, 120, 300, 600, 1800]
export const IDLE_CHOICES = [300, 900, 1800, 3600, 7200, 14400]

/** Why the pair can't be written, or null when it can. */
export function timersProblem({ backlitTime, idleTime }: WirelessTimers): string | null {
  if (!Number.isInteger(backlitTime) || backlitTime < MIN_BACKLIT_SECONDS || backlitTime > MAX_TIMER_SECONDS) {
    return 'The lights need at least 5 seconds.'
  }
  if (!Number.isInteger(idleTime) || idleTime < MIN_IDLE_SECONDS || idleTime > MAX_TIMER_SECONDS) {
    return 'Sleep needs at least a minute.'
  }
  if (backlitTime >= idleTime) return 'The lights should go off before the keyboard sleeps.'
  return null
}

/** "30 s", "10 min", "2 h", "1 h 30 min". */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const min = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const parts = [h && `${h} h`, min && `${min} min`, s && `${s} s`].filter(Boolean)
  return parts.length ? parts.join(' ') : '0 s'
}
