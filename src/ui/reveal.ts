// SPDX-License-Identifier: GPL-3.0-or-later
// Taking the reader to a section of a long page (a side list's entry picked): the page scrolls there smoothly, the
// section takes the keyboard focus (so Tab goes on inside it), and once the scrolling has arrived it flashes briefly
// in the accent colour (`data-flash`, styles.css), so the eye finds it. With reduced motion: no smooth scrolling and
// no pulsing, a still ring for a moment instead. The section needs `tabIndex={-1}` (ui/layout `Section`).

/** How long a section stays marked: the two pulses (styles.css, --motion-flash), or the still ring. */
export const FLASH_MS = 700
export const FLASH_STILL_MS = 1000
/** No scroll event within this: the section was already in view, nothing scrolls. */
const QUIET_MS = 100
/** Where `scrollend` is missing: scrolling has stopped when no scroll event came for this long. */
const SETTLED_MS = 150
/** Flashes by then however the scrolling went. */
const LONGEST_MS = 1500

const reducedMotion = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)

const flashTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>()

/** Marks an element for a moment; again from the start if it is marked already. */
export function flash(element: HTMLElement): void {
  clearTimeout(flashTimers.get(element))
  element.removeAttribute('data-flash')
  // Read the layout, so the animation starts again when the attribute comes back.
  void element.offsetWidth
  element.setAttribute('data-flash', '')
  const still = reducedMotion()
  flashTimers.set(
    element,
    setTimeout(() => element.removeAttribute('data-flash'), still ? FLASH_STILL_MS : FLASH_MS),
  )
}

/**
 * The props of a section a side list goes to: its anchor, the focus it can take (no ring of its own: the flash marks
 * it), room above it when scrolled to, and corners for the flash's ring to follow.
 */
export const jumpTarget = (id: string) => ({ id, tabIndex: -1, className: 'scroll-mt-4 rounded-card outline-none' })

/** Stops waiting for the last reveal's scrolling (a new one is asked for). */
let cancelPending: (() => void) | null = null

/** Scrolls to a section, gives it the focus, and flashes it once the scrolling has arrived. */
export function revealSection(element: HTMLElement | null): void {
  if (!element) return
  cancelPending?.()
  element.focus({ preventScroll: true })

  let scrolled = false
  let settled: ReturnType<typeof setTimeout> | undefined
  const hasScrollEnd = typeof window !== 'undefined' && 'onscrollend' in window
  const arrived = () => {
    stop()
    flash(element)
  }
  const onScroll = () => {
    scrolled = true
    if (!hasScrollEnd) {
      clearTimeout(settled)
      settled = setTimeout(arrived, SETTLED_MS)
    }
  }
  const quiet = setTimeout(() => {
    if (!scrolled) arrived()
  }, QUIET_MS)
  const longest = setTimeout(arrived, LONGEST_MS)
  // Captured on the window: the page's own scrolling box may be what moves, and scroll events don't bubble.
  const options = { capture: true, passive: true } as const
  window.addEventListener('scroll', onScroll, options)
  if (hasScrollEnd) window.addEventListener('scrollend', arrived, options)
  function stop() {
    clearTimeout(quiet)
    clearTimeout(longest)
    clearTimeout(settled)
    window.removeEventListener('scroll', onScroll, options)
    window.removeEventListener('scrollend', arrived, options)
    if (cancelPending === stop) cancelPending = null
  }
  cancelPending = stop

  element.scrollIntoView?.({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
}
