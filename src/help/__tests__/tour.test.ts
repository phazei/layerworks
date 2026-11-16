// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it } from 'vitest'
import { clearPrefs } from '../../ui/prefs'
import { armTour, CONNECT_STEP, shownStep, tour, TOUR_SEEN_PREF, TOUR_STEPS } from '../tour'
import { getPref } from '../../ui/prefs'

beforeEach(() => {
  clearPrefs()
  tour.reset()
})

describe('the tour', () => {
  it('has five to seven steps, each with a page and a marker', () => {
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(5)
    expect(TOUR_STEPS.length).toBeLessThanOrEqual(7)
    for (const step of TOUR_STEPS) {
      expect(step.path).toMatch(/^\//)
      expect(step.target).not.toBe('')
    }
  })

  it('goes forward and back, and finishes after the last step', () => {
    tour.start()
    expect(tour.get()).toEqual({ open: true, step: 0 })
    tour.back()
    expect(tour.get().step).toBe(0)
    tour.next()
    tour.next()
    expect(tour.get().step).toBe(2)
    tour.back()
    expect(tour.get().step).toBe(1)
    for (let i = 1; i < TOUR_STEPS.length - 1; i++) tour.next()
    expect(tour.get().step).toBe(TOUR_STEPS.length - 1)
    expect(tour.seen()).toBe(false)
    tour.next()
    expect(tour.get().open).toBe(false)
    expect(tour.seen()).toBe(true)
    expect(getPref(TOUR_SEEN_PREF, false)).toBe(true)
  })

  it('remembers a skip as seen', () => {
    tour.start(3)
    tour.skip()
    expect(tour.get().open).toBe(false)
    expect(tour.seen()).toBe(true)
  })

  it('keeps a step asked for inside the tour', () => {
    tour.start(99)
    expect(tour.get().step).toBe(TOUR_STEPS.length - 1)
    tour.start(-2)
    expect(tour.get().step).toBe(0)
  })

  it('shows the connect step while no keyboard is connected, and the step itself once one is', () => {
    tour.start(2)
    expect(shownStep(tour.get(), false)).toBe(CONNECT_STEP)
    expect(shownStep(tour.get(), true)).toBe(TOUR_STEPS[2])
  })
})

describe('starting by itself', () => {
  it('waits to start when the address has no options and it hasn’t been seen', () => {
    expect(armTour(new URLSearchParams(''))).toBe('armed')
    expect(tour.get().open).toBe(false)
    expect(tour.startIfArmed()).toBe(true)
    expect(tour.get()).toEqual({ open: true, step: 0 })
    tour.skip()
    // Once only.
    expect(tour.startIfArmed()).toBe(false)
  })

  it('stays away with any option, as screenshots and demo links have', () => {
    for (const query of ['demo', 'theme=dark', 'demo&theme=light', 'help=layers', 'select=3,2']) {
      expect(armTour(new URLSearchParams(query)), query).toBe('off')
      expect(tour.startIfArmed()).toBe(false)
      expect(tour.get().open).toBe(false)
    }
  })

  it('stays away once seen', () => {
    tour.start()
    tour.finish()
    expect(armTour(new URLSearchParams(''))).toBe('off')
  })

  it('opens at once with ?tour, at a step counted from 1 with ?tour=3, seen or not', () => {
    tour.start()
    tour.skip()
    expect(armTour(new URLSearchParams('demo&theme=dark&tour'))).toBe('forced')
    expect(tour.get()).toEqual({ open: true, step: 0 })
    expect(armTour(new URLSearchParams('tour=3'))).toBe('forced')
    expect(tour.get().step).toBe(2)
  })
})
