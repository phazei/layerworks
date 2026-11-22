// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// The key colour and zone editors on the Lighting page, on a small fake keyboard with Keychron lighting: two rows
// of three keys, one of them without a light.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearPrefs } from '../../../ui/prefs'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '../..'
import { deviceStore } from '../../../device'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig, type FakeKeychronRgb, type FakeKeyboardConfig } from '../../../device/fake-keyboard'
import { Shell } from '../../../shell/Shell'

type Hsv = [number, number, number]
const RED: Hsv = [0, 255, 255]
const slot = (effect = 0) => ({ effect, hue: 0, sat: 255, speed: 128, time: effect ? 5000 : 0 })

function fakeRgb(): FakeKeychronRgb {
  return {
    ledAt: [
      [0, 1, 2],
      [3, 4, 0xff],
    ],
    colours: Array.from({ length: 5 }, () => [...RED] as Hsv),
    style: 0,
    regions: [0, 0, 0, 0, 1],
    effects: [
      [slot(2), slot(), slot()],
      [slot(3), slot(), slot()],
    ],
    // With effects 2, 6, 13, 48 and 49 listed, the keyboard numbers them 1 – 5; mixed is 5.
    mixedEffect: 5,
  }
}

let config: FakeKeyboardConfig
let link: FakeLink

async function open(mode: number, keychronRgb: FakeKeychronRgb | null = fakeRgb()): Promise<void> {
  config = fakeKeyboardConfig({
    rgbEffects: [2, 6, 13, 48, 49],
    rgb: { mode, speed: 100, hue: 10, sat: 255, val: 150 },
    keychron: { protocol: 2, features: 0x01 | (keychronRgb ? 0x80 : 0), firmware: 'v1', ...(keychronRgb ? { rgb: keychronRgb } : {}) },
  })
  link = new FakeLink('cable')
  link.responder = fakeKeyboard(config)
  await deviceStore.connect(link)
  await act(async () => {
    location.hash = '#/lighting'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  render(<Shell />)
  await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
}

const rgb = () => config.keychron!.rgb!
const settled = () => waitFor(() => expect(deviceStore.getState().writing).toBe(0))
const key = (pos: string) => document.querySelector(`[data-key-pos="${pos}"]`)!

/** Presses on one key and drags across the others, as a pointer would. */
function drag(...positions: string[]): void {
  const [first, ...rest] = positions
  fireEvent.pointerDown(key(first), { button: 0, buttons: 1 })
  for (const pos of rest) fireEvent.pointerMove(key(pos), { buttons: 1 })
  fireEvent.pointerUp(key(positions.at(-1)!))
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  localStorage.clear()
  clearPrefs()
})

afterEach(async () => {
  await act(() => deviceStore.disconnect())
  location.hash = ''
})

describe('key colours', () => {
  it('paints the keys a stroke goes over in the chosen colour, and undoes the stroke', async () => {
    await open(48)
    const editor = await screen.findByRole('region', { name: 'Key colours' })
    act(() => within(editor).getByRole('button', { name: 'Green' }).click())
    act(() => drag('0,1', '0,2', '1,1'))
    await waitFor(() => expect(rgb().colours[1]).toEqual([85, 255, 255]))
    await settled()
    expect(rgb().colours[2]).toEqual([85, 255, 255])
    expect(rgb().colours[4]).toEqual([85, 255, 255])
    expect(rgb().colours[0]).toEqual(RED)

    await act(() => deviceStore.undo())
    expect(rgb().colours.slice(1, 3)).toEqual([RED, RED])
  })

  it('paints every key, a group and a starting point', async () => {
    await open(48)
    const editor = await screen.findByRole('region', { name: 'Key colours' })
    act(() => within(editor).getByRole('button', { name: 'White' }).click())
    act(() => within(editor).getByRole('button', { name: 'Paint all keys' }).click())
    await waitFor(() => expect(rgb().colours.every((c) => c[1] === 0)).toBe(true))
    await settled()

    act(() => within(editor).getByRole('button', { name: /Rainbow across/ }).click())
    await waitFor(() => expect(new Set(rgb().colours.map((c) => c[0])).size).toBeGreaterThan(1))
    await settled()

    act(() => within(editor).getByRole('button', { name: 'Row 2' }).click())
    await waitFor(() => expect(rgb().colours[3][1]).toBe(0))
  })

  it('picks up a colour from a key', async () => {
    rgbOverride = fakeRgb()
    rgbOverride.colours[2] = [128, 200, 255]
    await open(48, rgbOverride)
    const editor = await screen.findByRole('region', { name: 'Key colours' })
    act(() => within(editor).getByRole('radio', { name: /Pick up a colour/ }).click())
    act(() => drag('0,2'))
    expect(within(editor).getByRole('slider', { name: /Colour/ })).toHaveValue('128')
    expect(within(editor).getByRole('radio', { name: /Paint/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('sets how the colours light up', async () => {
    await open(48)
    const editor = await screen.findByRole('region', { name: 'Key colours' })
    fireEvent.change(within(editor).getByRole('combobox', { name: /How the colours light up/ }), { target: { value: '1' } })
    await waitFor(() => expect(rgb().style).toBe(1))
  })
})

let rgbOverride: FakeKeychronRgb

describe('zones', () => {
  it('moves painted keys into the chosen zone and lists each zone’s effects', async () => {
    await open(49)
    const editor = await screen.findByRole('region', { name: 'Mixed zones' })
    expect(within(editor).getByRole('region', { name: 'Zone 1' })).toHaveTextContent('4 keys')
    act(() => within(editor).getByRole('radio', { name: /Zone 2/ }).click())
    act(() => drag('0,0', '0,1'))
    await waitFor(() => expect(rgb().regions).toEqual([1, 1, 0, 0, 1]))
    await settled()
    expect(within(editor).getByRole('region', { name: 'Zone 2' })).toHaveTextContent('3 keys')
  })

  it('changes, adds and removes a zone’s effects in the keyboard’s numbering', async () => {
    await open(49)
    const zone1 = within(await screen.findByRole('region', { name: 'Zone 1' }))
    // Effect 1 in zone 1 is the keyboard's number 2: Breathing (VialRGB 6).
    const select = zone1.getByRole('combobox', { name: 'Effect 1' })
    expect(select).toHaveValue('2')
    fireEvent.change(select, { target: { value: '3' } })
    await waitFor(() => expect(rgb().effects[0][0].effect).toBe(3))
    await settled()

    act(() => zone1.getByRole('button', { name: /Add an effect/ }).click())
    await waitFor(() => expect(rgb().effects[0][1].effect).not.toBe(0))
    await settled()
    act(() => zone1.getByRole('button', { name: 'Remove effect 1' }).click())
    await waitFor(() => expect(rgb().effects[0].map((e) => e.effect)).toEqual([1, 0, 0]))
  })
})

describe('without Keychron lighting', () => {
  it('offers neither effect, even when the firmware lists them', async () => {
    await open(2, null)
    await screen.findByRole('button', { name: 'One colour' })
    expect(screen.queryByRole('button', { name: 'Key by key' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Mixed zones' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Key colours' })).toBeNull()
  })
})
