// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { deviceStore, layoutChoices, visibleLayoutKeys, type KeyboardData } from '..'
import { connectDemo, disconnect } from '../../shell/session'
import { KeyboardPicture } from '../../ui/KeyboardPicture'

async function demo(name: string): Promise<KeyboardData> {
  history.replaceState(null, '', `/?demo-keyboard=${name}`)
  await connectDemo()
  await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
  return deviceStore.getState().keyboard!
}

/** The keys drawn, each matrix position counted once per drawing (alternatives drawn twice would count twice). */
const drawnKeys = (container: HTMLElement) => container.querySelectorAll('[data-key-pos]').length

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(async () => {
  await disconnect()
  history.replaceState(null, '', '/')
})

describe('a keyboard whose definition has layout options', () => {
  it('draws only the chosen layout, not every alternative at once (GH80-3000, nine groups)', async () => {
    const kb = await demo('gh80')
    const groups = new Set(kb.layout!.keys.filter((k) => k.layoutIndex >= 0).map((k) => k.layoutIndex))
    expect([...layoutChoices(kb).keys()].sort((a, b) => a - b)).toEqual([...groups].sort((a, b) => a - b))
    const visible = visibleLayoutKeys(kb)
    expect(visible.length).toBeLessThan(kb.layout!.keys.length)
    // No two keys of the chosen layout share a place in a group: every alternative but the chosen one is gone.
    expect(visible.every((k) => k.layoutIndex < 0 || k.layoutOption === layoutChoices(kb).get(k.layoutIndex))).toBe(true)

    const { container } = render(<KeyboardPicture keyboard={kb} layer={0} />)
    expect(drawnKeys(container)).toBe(visible.filter((k) => k.encoderIdx < 0).length)
  })

  it('draws another choice in the first one’s place when the keyboard holds it', async () => {
    const kb = await demo('gh80')
    // A group that has a second choice, and the stored value that picks it alone.
    const last = Math.max(...kb.layout!.keys.filter((k) => k.layoutOption === 1).map((k) => k.layoutIndex))
    let value = 1
    while (layoutChoices({ ...kb, layoutOptions: value }).get(last) !== 1) value <<= 1
    const other = { ...kb, layoutOptions: value }
    expect([...layoutChoices(other)].filter(([group, choice]) => group !== last && choice !== 0)).toEqual([])
    // The first choice as the definition draws it (decals included: some draw "nothing here" as one).
    const first = kb.layout!.keys.filter((k) => k.layoutIndex === last && k.layoutOption === 0)
    const second = visibleLayoutKeys(other).filter((k) => k.layoutIndex === last)
    expect(second.every((k) => k.layoutOption === 1)).toBe(true)
    // Moved into the first choice's place: the same top-left corner.
    const corner = (keys: typeof first) => [Math.min(...keys.map((k) => k.x)), Math.min(...keys.map((k) => k.y))]
    expect(corner(second)).toEqual(corner(first))
  })

  it('draws a whole keyboard from a stored value out of range for its labels', async () => {
    const kb = await demo('gh80')
    const broken = { ...kb, layoutOptions: 0xffffffff }
    const choices = layoutChoices(broken)
    for (const [group, choice] of choices) {
      expect(kb.layout!.keys.some((k) => k.layoutIndex === group && k.layoutOption === choice)).toBe(true)
    }
    expect(visibleLayoutKeys(broken).length).toBeGreaterThanOrEqual(visibleLayoutKeys(kb).length - 10)
  })

  it('draws every key of a keyboard without options, as before', async () => {
    const kb = await demo('corne')
    expect(layoutChoices(kb).size).toBe(0)
    expect(visibleLayoutKeys(kb)).toHaveLength(kb.layout!.keys.filter((k) => !k.decal).length)
  })
})
