// SPDX-License-Identifier: GPL-3.0-or-later
// Picking keys in the keyboard picture without a mouse. The picture is one stop in the Tab order, a list box: the
// arrow keys move between keys by where they are drawn (picture-keys.ts), Home and End go to the first and last,
// Enter or Space picks the key, as a click would; Esc is left to the page (on the stage it lets go of the key). The
// key the arrows are on is the list's active option, named for screen readers by what it does and where it is,
// and shown by a ring of its own (in the text colour, with a halo), apart from the selected key's fill.
//
// The widget is vendored and draws plain SVG, so the names, roles and ids are put on its key groups after each
// render; it doesn't touch those attributes itself.

import { useEffect, useLayoutEffect, useMemo, useState, type FocusEvent, type KeyboardEvent, type RefObject } from 'react'
import type { KeyboardData } from '../device/api'
import type { PictureSelection } from './KeyboardPicture'
import { nextTarget, pictureTargets, targetId, targetName, type Direction, type PictureTarget } from './picture-keys'

const ARROWS: Record<string, Direction> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }

/** The attributes this hook puts on the widget's key groups, so they can be taken off again. */
const ADDED = ['id', 'role', 'aria-label', 'aria-selected', 'aria-hidden', 'data-picture-active'] as const

interface Options {
  box: RefObject<HTMLDivElement | null>
  ring: RefObject<HTMLDivElement | null>
  /** Unique per picture: the start of the keys' ids. */
  scope: string
  keyboard: KeyboardData
  layer: number
  /** Picking is on (the picture has an onSelect). */
  enabled: boolean
  /** Knob directions can be picked (the app can change them). */
  knobs: boolean
  onPick: (selection: PictureSelection) => void
  /** The selected key, exposed as selected. */
  selection: PictureSelection | null | undefined
  /** Keys shown as picked where several can be ("row,col"). */
  picked: ReadonlySet<string> | undefined
  /** The list's name for screen readers. */
  label: string
  /** The layers' names, for layer keys' names. */
  layerNames: readonly string[]
  /** A note added to a key's name ("red", "zone 2"). */
  describe?: (selection: PictureSelection) => string | undefined
}

/** The props for the picture's box: nothing when picking is off, so a picture that is only a picture takes no Tab stop. */
export function usePictureKeys({ box, ring, scope, keyboard, layer, enabled, knobs, onPick, selection, picked, label, describe, layerNames }: Options) {
  const targets = useMemo(() => (enabled ? pictureTargets(keyboard, knobs) : []), [enabled, keyboard, knobs])
  const byId = useMemo(() => new Map(targets.map((t) => [t.id, t])), [targets])
  const selectedId = selection ? targetId(selection) : null
  const [active, setActive] = useState<string | null>(null)
  const [ringShown, setRingShown] = useState(false)

  // A key picked by a click (or from elsewhere) is where the arrows carry on from.
  useEffect(() => {
    if (selectedId) setActive(selectedId)
  }, [selectedId])

  const current = active && byId.has(active) ? active : selectedId && byId.has(selectedId) ? selectedId : (targets[0]?.id ?? null)
  const domId = (id: string) => `${scope}-${id.replace(/[:,]/g, '-')}`
  const selectable = selection !== undefined || picked !== undefined
  const isPicked = (t: PictureTarget) =>
    t.id === selectedId || (t.selection.kind === 'key' && picked?.has(`${t.selection.row},${t.selection.col}`) === true)

  // Names, roles and ids on the widget's key groups, after every render (the widget redraws the selected key last,
  // as a new element).
  useLayoutEffect(() => {
    const root = box.current
    if (!root) return
    const groups = root.querySelectorAll<SVGGElement>('[data-key-pos], [data-encoder-pos]')
    const svg = root.querySelector('svg')
    if (!enabled) {
      for (const g of groups) if (g.hasAttribute('data-picture-key')) for (const name of [...ADDED, 'data-picture-key']) g.removeAttribute(name)
      svg?.removeAttribute('role')
      return
    }
    // The svg itself adds nothing between the list box and its options.
    svg?.setAttribute('role', 'presentation')
    for (const g of groups) {
      const pos = g.getAttribute('data-key-pos')
      const id = pos !== null ? `key:${pos}` : `knob:${g.getAttribute('data-encoder-pos')}`
      const target = byId.get(id)
      g.setAttribute('data-picture-key', '')
      if (!target) {
        // A knob the firmware keeps ("Fixed"): not one of the choices.
        for (const name of ADDED) g.removeAttribute(name)
        g.setAttribute('aria-hidden', 'true')
        continue
      }
      g.removeAttribute('aria-hidden')
      g.id = domId(id)
      g.setAttribute('role', 'option')
      g.setAttribute('aria-label', targetName(keyboard, layer, target, describe?.(target.selection), layerNames))
      if (selectable) g.setAttribute('aria-selected', String(isPicked(target)))
      else g.removeAttribute('aria-selected')
      g.toggleAttribute('data-picture-active', id === current)
    }
  })

  // The ring follows the active key, wherever the picture is drawn and however big.
  useLayoutEffect(() => {
    const place = () => {
      const root = box.current
      const mark = ring.current
      if (!root || !mark) return
      const group = current ? document.getElementById(domId(current)) : null
      const key = group && root.contains(group) ? group.firstElementChild : null
      if (!enabled || !ringShown || !key) {
        mark.hidden = true
        return
      }
      const outer = root.getBoundingClientRect()
      const rect = key.getBoundingClientRect()
      mark.hidden = false
      mark.style.left = `${rect.left - outer.left}px`
      mark.style.top = `${rect.top - outer.top}px`
      mark.style.width = `${rect.width}px`
      mark.style.height = `${rect.height}px`
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  })

  if (!enabled) return { boxProps: {} }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    let to: string | null | undefined
    const arrow = ARROWS[event.key]
    if (arrow) to = current ? nextTarget(targets, current, arrow) : (targets[0]?.id ?? null)
    else if (event.key === 'Home') to = targets[0]?.id ?? null
    else if (event.key === 'End') to = targets.at(-1)?.id ?? null
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setRingShown(true)
      const target = current ? byId.get(current) : undefined
      if (target) onPick(target.selection)
      return
    } else return
    event.preventDefault()
    setRingShown(true)
    if (to) setActive(to)
  }

  return {
    boxProps: {
      role: 'listbox',
      tabIndex: 0,
      'aria-label': label,
      'aria-multiselectable': picked !== undefined ? true : undefined,
      'aria-activedescendant': current ? domId(current) : undefined,
      onKeyDown,
      onFocus: (event: FocusEvent<HTMLDivElement>) => {
        // The ring shows when the picture is reached from the keyboard, not when it is clicked.
        let keyboardFocus = true
        try {
          keyboardFocus = event.currentTarget.matches(':focus-visible')
        } catch {
          // An engine without :focus-visible: show it.
        }
        setRingShown(keyboardFocus)
      },
      onBlur: () => setRingShown(false),
      onPointerDown: () => setRingShown(false),
    },
  }
}
