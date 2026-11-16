// SPDX-License-Identifier: GPL-3.0-or-later
// The first-run tour on screen (steps and state: help/tour.ts). It goes to each step's page and points at its
// marker with a coach mark (ui/Spotlight.tsx). With no keyboard it waits on Home at the connect prompt and carries
// on once one is in. It starts by itself once, on Home, when help/tour.ts was armed at start (main.tsx). Esc skips
// it, unless the Esc is for something else (the help panel, a dialog, a text field). When it closes, the focus goes
// back where it was.

import { useEffect, useLayoutEffect, useRef } from 'react'
import { useDevice } from '../device'
import { helpTopic } from '../help/help-store'
import { shownStep, tour, TOUR_STEPS, useTour } from '../help/tour'
import { Spotlight } from '../ui/Spotlight'
import { navigate, usePath } from './router'
import { demoKeyboard } from './session'

/** The page part of an address: "/keys/anything" → "keys", "/" → "home". */
const pageOf = (path: string) => path.replace(/^#?\/+/, '').split(/[/?]/)[0] || 'home'

export function Tour() {
  const state = useTour()
  const status = useDevice((s) => s.status)
  const keyboard = useDevice((s) => s.keyboard)
  const connected = status === 'ready' && keyboard !== null
  const path = usePath()

  // By itself, once: the first time a keyboard is in while Home is shown.
  useEffect(() => {
    if (connected && pageOf(path) === 'home') tour.startIfArmed()
  }, [connected, path])

  // The focus goes back to where it was before the tour.
  const returnTo = useRef<HTMLElement | null>(null)
  useLayoutEffect(() => {
    if (state.open) {
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      return
    }
    const element = returnTo.current
    returnTo.current = null
    if (element?.isConnected) element.focus()
  }, [state.open])

  const step = shownStep(state, connected)

  // Each step on its own page; the user may wander off meanwhile, and the next step brings them back.
  useEffect(() => {
    if (state.open && pageOf(location.hash.replace(/^#/, '')) !== pageOf(step.path)) navigate(step.path)
  }, [state.open, step.id])

  // Esc skips the tour, but not when it closes something else first. Listening before the others (capture), the
  // help panel is still open when its Esc arrives.
  useEffect(() => {
    if (!state.open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || helpTopic() !== null || document.querySelector('dialog[open]')) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable]')) return
      tour.skip()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [state.open])

  if (!state.open) return null

  const last = state.step === TOUR_STEPS.length - 1
  const body = (demoKeyboard() && step.demoBody) || step.body
  return (
    <Spotlight
      target={`[data-tour="${step.target}"]`}
      stepKey={step.id}
      stepLabel={connected ? `Step ${state.step + 1} of ${TOUR_STEPS.length}` : 'Before the tour'}
      title={step.title}
      onNext={tour.next}
      nextLabel={connected && last ? 'Done' : 'Next'}
      nextDisabled={!connected}
      nextHint={connected ? undefined : 'Waiting for a keyboard…'}
      onBack={connected && state.step > 0 ? tour.back : undefined}
      onSkip={tour.skip}
    >
      {body.map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
      {step.list && (
        <ul className="flex flex-col gap-1 text-[13px]">
          {step.list.map((line) => {
            const [name, what] = line.split(/:\s/, 2)
            return (
              <li key={line}>
                <span className="font-medium">{name}</span>
                {what && <span className="text-muted">: {what}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </Spotlight>
  )
}
