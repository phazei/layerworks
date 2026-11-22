// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// The keyboard picture without a mouse: one Tab stop, the arrow keys move by where keys are drawn (staggered, split,
// rotated, several knobs, a number pad), Enter or Space picks, Esc lets go on the stage; named and selected for
// screen readers; no Tab stop where the picture is only a picture.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '../../pages'
import { deviceStore, keycodeTitle, visibleLayoutKeys, type KeyboardData } from '../../device'
import { connectDemo, disconnect } from '../../shell/session'
import { Shell } from '../../shell/Shell'
import { stage } from '../../shell/stage-store'
import { KeyboardPicture } from '../KeyboardPicture'
import { nextTarget, pictureTargets, targetName, type Direction, type PictureTarget } from '../picture-keys'

async function demo(board = ''): Promise<KeyboardData> {
  history.replaceState(null, '', board ? `/?demo-keyboard=${board}` : '/')
  await connectDemo()
  return deviceStore.getState().keyboard!
}

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(async () => {
  act(() => stage.reset())
  await act(() => disconnect())
  history.replaceState(null, '', '/')
  location.hash = ''
})

/** The target of the key that does `title` on `layer`. */
function keyDoing(keyboard: KeyboardData, targets: PictureTarget[], layer: number, title: string): string {
  const found = targets.find((t) => t.selection.kind === 'key' && keycodeTitle(keyboard.keymap[`${layer},${t.selection.row},${t.selection.col}`] ?? 0) === title)
  if (!found) throw new Error(`no key does ${title}`)
  return found.id
}

/** What the key an arrow leads to does. */
function walk(keyboard: KeyboardData, layer: number, from: string, ...steps: Direction[]): string {
  const targets = pictureTargets(keyboard, keyboard.knobCount > 0)
  let at: string | null = keyDoing(keyboard, targets, layer, from)
  for (const step of steps) at = at && nextTarget(targets, at, step)
  const t = targets.find((x) => x.id === at)
  if (!t) return 'nowhere'
  const s = t.selection
  return s.kind === 'key' ? keycodeTitle(keyboard.keymap[`${layer},${s.row},${s.col}`] ?? 0) : `knob ${s.knob} ${s.direction === 1 ? 'right' : 'left'}`
}

describe('moving with the arrow keys', () => {
  it('follows the K15’s slanted, split rows and its staggered columns', async () => {
    const k15 = await demo()
    expect(walk(k15, 2, 'Q', 'right')).toBe('W')
    expect(walk(k15, 2, 'Q', 'down')).toBe('A')
    expect(walk(k15, 2, 'A', 'up')).toBe('Q')
    expect(walk(k15, 2, 'T', 'right')).toBe('Y')
    expect(walk(k15, 2, 'Y', 'left')).toBe('T')
    // F10 sits a little above F9: moving down from it goes to the next row, not back along this one.
    expect(walk(k15, 2, 'F10', 'down')).not.toBe('F9')
    // The knob's two directions are keys in their own right.
    expect(walk(k15, 2, 'Delete', 'right')).toBe('knob 0 left')
    expect(walk(k15, 2, 'Delete', 'right', 'right')).toBe('knob 0 right')
  })

  it('crosses a split keyboard’s gap and runs along its rotated thumb keys (Corne)', async () => {
    const corne = await demo('corne')
    const targets = pictureTargets(corne, false)
    const left = targets.filter((t) => t.x < 400)
    const right = targets.filter((t) => t.x >= 400)
    expect(left.length).toBeGreaterThan(0)
    expect(right.length).toBeGreaterThan(0)
    // From the inner key of each left row, Right goes to the right half.
    const inner = left.filter((t) => t.y < 230).sort((a, b) => b.x - a.x)[0]
    expect(right.map((t) => t.id)).toContain(nextTarget(targets, inner.id, 'right'))
    // The rotated thumb keys: Right steps along them in order.
    const thumbs = targets.filter((t) => t.y > 240).sort((a, b) => a.x - b.x)
    for (let i = 0; i + 1 < thumbs.length; i++) expect(nextTarget(targets, thumbs[i].id, 'right')).toBe(thumbs[i + 1].id)
  })

  it('reaches every knob direction on a board with six knobs (Splinter)', async () => {
    const board = await demo('splinter')
    // Its knobs are layout options: take the layout that draws the most of them.
    const drawn = (layoutOptions: number) => visibleLayoutKeys({ ...board, layoutOptions }).filter((k) => k.encoderIdx >= 0).length
    const value = Array.from({ length: 256 }, (_, v) => v).sort((a, b) => drawn(b) - drawn(a))[0]
    const splinter = { ...board, layoutOptions: value }
    expect(drawn(value)).toBe(splinter.knobCount * 2)
    const targets = pictureTargets(splinter, true)
    const knobs = targets.filter((t) => t.selection.kind === 'knob')
    expect(knobs).toHaveLength(splinter.knobCount * 2)
    // Each is reached by the arrow keys from some key.
    const reached = new Set(targets.flatMap((t) => (['left', 'right', 'up', 'down'] as const).map((d) => nextTarget(targets, t.id, d))))
    for (const knob of knobs) expect(reached).toContain(knob.id)
  })

  it('moves in a grid on a number pad, and stops at its edges (Q0)', async () => {
    const q0 = await demo('q0')
    const targets = pictureTargets(q0, false)
    const topLeft = targets[0]
    expect(nextTarget(targets, topLeft.id, 'up')).toBeNull()
    expect(nextTarget(targets, topLeft.id, 'left')).toBeNull()
    const below = targets.find((t) => t.id === nextTarget(targets, topLeft.id, 'down'))!
    expect(Math.abs(below.x - topLeft.x)).toBeLessThan(5)
  })

  it('leaves out knobs the firmware keeps (Cloud)', async () => {
    const cloud = await demo('cloud')
    expect(cloud.fixedKnobs).toBeGreaterThan(0)
    expect(pictureTargets(cloud, cloud.knobCount > 0).some((t) => t.selection.kind === 'knob')).toBe(false)
  })
})

describe('names', () => {
  it('say what the key does and where it is; a knob direction says which way', async () => {
    const k15 = await demo()
    const targets = pictureTargets(k15, true)
    const esc = targets.find((t) => t.id === keyDoing(k15, targets, 2, 'Escape'))!
    expect(targetName(k15, 2, esc)).toMatch(/^Escape, row \d+, column \d+$/)
    expect(targetName(k15, 2, esc, 'red')).toMatch(/, red$/)
    const knob = targets.find((t) => t.id === 'knob:0,0')!
    expect(targetName(k15, 2, knob)).toMatch(/^Knob turned left: /)
    // A macro by the picture's words, not QMK's name.
    const names = targets.map((t) => targetName(k15, 2, t))
    expect(names.some((name) => name.startsWith('Macro 1, row'))).toBe(true)
    expect(names.filter((name) => /^M\d+,|^MO\(/.test(name))).toEqual([])
  })
})

describe('the picture on the Keys page', () => {
  const picture = () => screen.getByRole('listbox', { name: /^Keys on / })
  const active = () => document.getElementById(picture().getAttribute('aria-activedescendant')!)!

  it('is one Tab stop; arrows move, Enter picks, Esc lets go', async () => {
    await demo()
    await go('#/keys')
    render(<Shell />)
    const box = picture()
    expect(box).toHaveAttribute('tabindex', '0')
    expect(box.querySelectorAll('[tabindex]')).toHaveLength(0)
    act(() => box.focus())

    const first = active()
    expect(first).toHaveAttribute('role', 'option')
    expect(first.getAttribute('aria-label')).toMatch(/, row \d+, column \d+$/)
    fireEvent.keyDown(box, { key: 'ArrowRight' })
    const second = active()
    expect(second).not.toBe(first)
    expect(second.getAttribute('aria-selected')).toBe('false')

    fireEvent.keyDown(box, { key: 'Enter' })
    expect(stage.get().selection).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'What should this key do?' })).toBeInTheDocument()
    expect(active()).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(box, { key: 'Escape' })
    expect(stage.get().selection).toBeNull()

    fireEvent.keyDown(box, { key: 'End' })
    fireEvent.keyDown(box, { key: ' ' })
    expect(stage.get().selection).not.toBeNull()
  })

  it('picks a knob direction from the keyboard', async () => {
    await demo()
    await go('#/keys')
    render(<Shell />)
    const box = picture()
    act(() => box.focus())
    for (let i = 0; i < 30 && !active().id.includes('knob'); i++) fireEvent.keyDown(box, { key: 'ArrowRight' })
    expect(active().getAttribute('aria-label')).toMatch(/^Knob turned (left|right): /)
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(stage.get().selection?.kind).toBe('knob')
  })

  it('carries on from a key picked with the mouse', async () => {
    await demo()
    await go('#/keys')
    render(<Shell />)
    act(() => stage.select({ kind: 'key', row: 2, col: 2 }))
    await waitFor(() => expect(active().id).toMatch(/key-2-2$/))
  })

  it('leaves keys alone that the page doesn’t handle (letters reach the page as usual)', async () => {
    await demo()
    await go('#/keys')
    render(<Shell />)
    const box = picture()
    act(() => box.focus())
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true })
    box.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})

describe('a picture that is only a picture', () => {
  it('takes no Tab stop and is no list (Home’s stage, the Test page)', async () => {
    await demo()
    await go('#/home')
    const { unmount } = render(<Shell />)
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(document.querySelector('[data-picture][tabindex]')).toBeNull()
    unmount()
    await go('#/test')
    render(<Shell />)
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('takes its marks off again when the stage stops being clickable', async () => {
    await demo()
    await go('#/keys')
    render(<Shell />)
    expect(document.querySelectorAll('[role="option"]').length).toBeGreaterThan(0)
    await go('#/home')
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(0)
  })
})

describe('a picture whose clicks are handled around it (painting)', () => {
  it('picks from the keyboard only', async () => {
    const k15 = await demo()
    const onSelect = vi.fn()
    render(<KeyboardPicture keyboard={k15} layer={2} clickable={false} label="Keys: Enter paints the key" onSelect={onSelect} />)
    const box = screen.getByRole('listbox', { name: 'Keys: Enter paints the key' })
    fireEvent.click(box.querySelector('[data-key-pos]')!)
    expect(onSelect).not.toHaveBeenCalled()
    act(() => box.focus())
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledTimes(1)
    // No selected state where nothing stays selected.
    expect(box.querySelector('[aria-selected]')).toBeNull()
  })

  it('marks the picked keys where several can be (a key chord)', async () => {
    const k15 = await demo()
    render(<KeyboardPicture keyboard={k15} layer={2} picked={new Set(['2,2'])} onSelect={() => {}} />)
    const box = screen.getByRole('listbox')
    expect(box).toHaveAttribute('aria-multiselectable', 'true')
    expect(box.querySelector('[data-key-pos="2,2"]')).toHaveAttribute('aria-selected', 'true')
  })
})
