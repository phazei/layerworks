// SPDX-License-Identifier: GPL-3.0-or-later
// The first-run tour: a few stops round the shell, each pointing at one part of it (a `data-tour="…"` marker) with
// a sentence or two. Its state lives here, outside React: whether it is open and at which step, and whether it has
// been seen (remembered in the browser, so it appears once). The shell draws it (shell/Tour.tsx).
//
// It starts by itself once: the first time a keyboard (or the demo) is connected on Home, when the address has no
// options. Any option (?demo, ?theme … as screenshots use) keeps it away, except ?tour, which opens it at once
// (?tour=3 at the third step).

import { useSyncExternalStore } from 'react'
import { getPref, setPref } from '../ui/prefs'

export const TOUR_SEEN_PREF = 'tour-seen'

export interface TourStep {
  id: string
  /** The page the step is on; the tour goes there first. */
  path: string
  /** The `data-tour` marker it points at. */
  target: string
  title: string
  body: string[]
  /** Instead of `body` while the demo keyboard is connected. */
  demoBody?: string[]
  /** Short lines under the body. */
  list?: string[]
}

/** The steps, with a keyboard connected. */
export const TOUR_STEPS: TourStep[] = [
  {
    id: 'stage',
    path: '/home',
    target: 'stage',
    title: 'Your keyboard, live',
    body: [
      'This is your keyboard as it is set up right now. Beside it are its layers: complete sets of keys, one on top of another.',
      'Hold Fn on the keyboard and, on keyboards that report their layer, watch the picture switch to the Fn layer (while Follow the keyboard is on). Elsewhere, click a layer in the list to see its keys.',
    ],
    demoBody: [
      'This is the keyboard as it is set up right now. Beside it are its layers: complete sets of keys, one on top of another.',
      'On a real keyboard, holding Fn switches the picture to the Fn layer. On the demo, click a layer in the list to see its keys.',
    ],
  },
  {
    id: 'keys',
    path: '/keys',
    target: 'keys-page',
    title: 'Change what a key does',
    body: [
      'On the Keys page, click any key in the picture, or one side of the knob. This space then asks what it should do: another key, a shortcut, a layer switch, or one thing on a tap and another on a hold.',
    ],
  },
  {
    id: 'status',
    path: '/keys',
    target: 'status',
    title: 'Saved on the keyboard',
    body: [
      'Changes go into the keyboard itself, not this computer, and stay there without this app. This bar says “Saved on the keyboard” once they are in.',
      'Undo takes the last change back; Redo puts it back.',
    ],
  },
  {
    id: 'help',
    path: '/keys',
    target: 'page-help',
    title: 'Help beside everything',
    body: [
      'Every “?” explains the thing beside it, with an example, in a panel on the right; the page stays usable while it is open.',
      'The Help page has all of it, searchable, with the words other apps use.',
    ],
  },
  {
    id: 'pages',
    path: '/keys',
    target: 'nav',
    title: 'The other pages',
    body: ['Everything else the keyboard can do has a page here:'],
    list: [
      'Shortcuts & macros: text at a keypress, double taps, keys pressed together.',
      'Lighting: effects, colours, a colour for each key.',
      'Typing feel: how long counts as a hold, and other timings.',
      'Test: press every key and see that it works.',
      'Device: backups, and what the keyboard says about itself.',
    ],
  },
  {
    id: 'backup',
    path: '/device',
    target: 'backup',
    title: 'Back up before you experiment',
    body: [
      'Save a backup now: one file with everything the keyboard holds. If an experiment goes wrong, restoring it puts the keyboard back as it was.',
      'Saving only reads; nothing on the keyboard changes. Take this tour again any time from Settings or the Help page.',
    ],
  },
]

/** Shown instead of any step while no keyboard is connected: the tour waits for one. */
export const CONNECT_STEP: TourStep = {
  id: 'connect',
  path: '/home',
  target: 'connect',
  title: 'First, a keyboard',
  body: [
    'Plug in the keyboard with its cable (or, for a Keychron wireless keyboard, its 2.4 GHz receiver), and connect it here. Or try the demo keyboard, a pretend one inside this page.',
    'The tour carries on once one is in.',
  ],
}

export interface TourState {
  open: boolean
  /** The step shown, an index into TOUR_STEPS. */
  step: number
}

const CLOSED: TourState = { open: false, step: 0 }
let state: TourState = CLOSED
/** Set by the URL check: start by itself once a keyboard is in on Home. */
let armed = false
const listeners = new Set<() => void>()

function set(next: TourState): void {
  state = next
  for (const listener of [...listeners]) listener()
}

const clampStep = (step: number) => Math.max(0, Math.min(TOUR_STEPS.length - 1, Math.floor(step) || 0))

export const tour = {
  get: (): TourState => state,

  /** Opens the tour at a step (from 0); again from Help or Settings, or forced by the URL. */
  start(step = 0): void {
    armed = false
    set({ open: true, step: clampStep(step) })
  },

  next(): void {
    if (!state.open) return
    if (state.step >= TOUR_STEPS.length - 1) tour.finish()
    else set({ open: true, step: state.step + 1 })
  },

  back(): void {
    if (state.open && state.step > 0) set({ open: true, step: state.step - 1 })
  },

  /** Closed before the end. Remembered like finishing, so it doesn't come back by itself. */
  skip(): void {
    if (!state.open) return
    setPref(TOUR_SEEN_PREF, true)
    set(CLOSED)
  },

  /** Closed after the last step. */
  finish(): void {
    if (!state.open) return
    setPref(TOUR_SEEN_PREF, true)
    set(CLOSED)
  },

  /** Whether it has been taken or skipped in this browser. */
  seen: (): boolean => getPref(TOUR_SEEN_PREF, false),

  /** Whether it waits to start by itself (see armTour). */
  armed: (): boolean => armed,

  /** Starts it if it was waiting to start by itself; once only. */
  startIfArmed(): boolean {
    if (!armed || state.open) return false
    armed = false
    if (tour.seen()) return false
    set({ open: true, step: 0 })
    return true
  },

  /** For tests: closed, not waiting. */
  reset(): void {
    armed = false
    set(CLOSED)
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

/**
 * Reads the address's options at start: `?tour` opens the tour now (`?tour=3` at the third step); with no options
 * at all and the tour not yet seen, it waits to start by itself; any other option (a screenshot, a demo link)
 * keeps it away.
 */
export function armTour(params: URLSearchParams): 'forced' | 'armed' | 'off' {
  if (params.has('tour')) {
    const step = Number(params.get('tour'))
    tour.start(Number.isFinite(step) && step >= 1 ? step - 1 : 0)
    return 'forced'
  }
  armed = [...params.keys()].length === 0 && !tour.seen()
  return armed ? 'armed' : 'off'
}

export function useTour(): TourState {
  return useSyncExternalStore(tour.subscribe, tour.get)
}

/** The step to show: the connect step while no keyboard is connected, so the tour never points at nothing. */
export function shownStep(current: TourState, connected: boolean): TourStep {
  return connected ? TOUR_STEPS[clampStep(current.step)] : CONNECT_STEP
}
