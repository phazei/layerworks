// SPDX-License-Identifier: GPL-3.0-or-later
// A coach mark: a ring around one part of the screen, the rest lightly dimmed, and a small card beside it with a
// few sentences and Back / Next / Skip. It doesn't block anything: clicks go through the dimming to the app, so
// the user can try what the card describes. What it points at is found by a CSS selector (usually a
// `data-tour="…"` attribute) and followed as the page moves; with nothing found, the card sits in the middle. It
// moves from step to step at once rather than gliding, so there is no motion to reduce.

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { placeCard, visiblePart, type Box, type Placement } from './coach-placement'
import { Button, cx } from './controls'

interface SpotlightProps {
  /** What to point at: a CSS selector, e.g. `[data-tour="stage"]`. */
  target: string
  title: string
  children: ReactNode
  /** "Step 2 of 6", above the title. */
  stepLabel?: string
  onNext: () => void
  nextLabel?: string
  /** Next can't be used yet; `nextHint` says why, beside the buttons. */
  nextDisabled?: boolean
  nextHint?: string
  /** Leave out on the first step. */
  onBack?: () => void
  onSkip: () => void
  skipLabel?: string
  /** Changes when the step changes, so focus moves to the new step's card. */
  stepKey: string
}

const RING = 6
const POLL_MS = 250

const sameBox = (a: Box | null, b: Box | null) =>
  a === b || (a !== null && b !== null && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height)

function viewSize() {
  return { width: window.innerWidth, height: window.innerHeight }
}

/** The target's box in the window, followed as the page scrolls, resizes or changes; null while it isn't there. */
interface Target {
  found: boolean
  box: Box | null
  /** The window's height when the box was measured. */
  viewHeight: number
}

function useTargetBox(selector: string, stepKey: string): Target {
  const [state, setState] = useState<Target>({ found: false, box: null, viewHeight: 0 })
  useLayoutEffect(() => {
    let scrolled = false
    const measure = () => {
      const element = document.querySelector<HTMLElement>(selector)
      if (element && !scrolled) {
        // Brought into view once per step, then left where the user scrolls it.
        scrolled = true
        element.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
      }
      const rect = element?.getBoundingClientRect()
      const view = viewSize()
      const box = rect && (rect.width > 0 || rect.height > 0) ? visiblePart({ top: rect.top, left: rect.left, width: rect.width, height: rect.height }, view) : null
      setState((now) =>
        now.found === Boolean(element) && sameBox(now.box, box) && now.viewHeight === view.height
          ? now
          : { found: Boolean(element), box, viewHeight: view.height },
      )
    }
    measure()
    const timer = setInterval(measure, POLL_MS)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearInterval(timer)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [selector, stepKey])
  return state
}

export function Spotlight({
  target,
  title,
  children,
  stepLabel,
  onNext,
  nextLabel = 'Next',
  nextDisabled = false,
  nextHint,
  onBack,
  onSkip,
  skipLabel = 'Skip tour',
  stepKey,
}: SpotlightProps) {
  const { found, box, viewHeight } = useTargetBox(target, stepKey)
  const card = useRef<HTMLDivElement>(null)
  const next = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const bodyId = useId()
  const [placement, setPlacement] = useState<(Placement & { height: number }) | null>(null)

  // Where the card goes, once its own size is known.
  useLayoutEffect(() => {
    const element = card.current
    if (!element) return
    const size = { width: element.offsetWidth, height: element.offsetHeight }
    const ring = box && { top: box.top - RING, left: box.left - RING, width: box.width + 2 * RING, height: box.height + 2 * RING }
    const spot = { ...placeCard(ring, size, viewSize()), height: size.height }
    setPlacement((now) =>
      now && now.top === spot.top && now.left === spot.left && now.side === spot.side && now.height === spot.height ? now : spot,
    )
  })

  // Each step starts with the focus on its card: on Next, or on the card itself while Next waits.
  useEffect(() => {
    if (nextDisabled) card.current?.focus()
    else next.current?.focus()
  }, [stepKey, nextDisabled])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('input, textarea, select')) return
    if (event.key === 'ArrowRight' && !nextDisabled) {
      event.preventDefault()
      onNext()
    } else if (event.key === 'ArrowLeft' && onBack) {
      event.preventDefault()
      onBack()
    }
  }

  // Something in the lower half of the window (the status line) is held by its distance from the bottom, the rest
  // by the top, so both stay put when the window's height changes before the next measurement.
  const low = box !== null && box.top + box.height / 2 > viewHeight / 2
  const vertical = (top: number, height: number) => (low ? { bottom: viewHeight - top - height } : { top })

  return (
    <>
      {box && (
        <div
          aria-hidden
          data-spotlight-ring=""
          className="pointer-events-none fixed z-40 rounded-card border-2 border-accent shadow-spotlight"
          style={{ ...vertical(box.top - RING, box.height + 2 * RING), left: box.left - RING, width: box.width + 2 * RING, height: box.height + 2 * RING }}
        />
      )}
      <div
        ref={card}
        role="dialog"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        data-target-found={found ? 'true' : 'false'}
        onKeyDown={onKeyDown}
        className={cx(
          'fixed z-50 flex w-80 max-w-[calc(100vw-1.5rem)] flex-col gap-3 rounded-card border border-edge bg-card p-5 text-content shadow-pop outline-none',
          // Until it has been measured, it is laid out but not seen.
          !placement && 'invisible',
        )}
        style={placement ? { ...vertical(placement.top, placement.height), left: placement.left } : { top: 0, left: 0 }}
      >
        <div>
          {stepLabel && <div className="mb-1 text-xs font-medium text-muted">{stepLabel}</div>}
          <h2 id={titleId} className="text-[15px] leading-snug font-semibold">
            {title}
          </h2>
        </div>
        <div id={bodyId} className="flex flex-col gap-2 leading-relaxed">
          {children}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="quiet" className="-ml-3" onClick={onSkip}>
            {skipLabel}
          </Button>
          <span className="ml-auto flex items-center gap-2">
            {nextHint && <span className="text-[13px] text-muted">{nextHint}</span>}
            {onBack && (
              <Button size="sm" onClick={onBack}>
                Back
              </Button>
            )}
            <Button ref={next} size="sm" variant="primary" disabled={nextDisabled} onClick={onNext}>
              {nextLabel}
            </Button>
          </span>
        </div>
      </div>
    </>
  )
}
