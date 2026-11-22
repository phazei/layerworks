// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { hsvCss } from '../../../ui/colour'
import { effectInfo } from '../effects'
import { CYCLE_MOMENT, pictureFills, pictureLayout, type KeyPlace } from '../picture'

/** Three keys in a row and one under the middle one. */
const KEYS: KeyPlace[] = [
  { pos: '0,0', x: 0.5, y: 0.5 },
  { pos: '0,1', x: 1.5, y: 0.5 },
  { pos: '0,2', x: 2.5, y: 0.5 },
  { pos: '1,1', x: 1.5, y: 1.5 },
]
const COLOUR = { hue: 170, sat: 255, val: 255 }

describe('the still picture', () => {
  it('lays out each effect from what effects.ts knows about it', () => {
    expect(pictureLayout(effectInfo(2), true)).toEqual({ kind: 'tint' })
    expect(pictureLayout(effectInfo(2), false)).toEqual({ kind: 'off' })
    expect(pictureLayout(effectInfo(14), true)).toEqual({ kind: 'rainbow', direction: 'across' })
    expect(pictureLayout(effectInfo(15), true)).toEqual({ kind: 'rainbow', direction: 'down' })
    expect(pictureLayout(effectInfo(17), true)).toEqual({ kind: 'rainbow', direction: 'rings' })
    expect(pictureLayout(effectInfo(22), true)).toEqual({ kind: 'rainbow', direction: 'around' })
    expect(pictureLayout(effectInfo(30), true)).toEqual({ kind: 'fixed', hue: 85 })
    expect(pictureLayout(effectInfo(25), true)).toEqual({ kind: 'scattered' })
    // Rainbow, all keys: every key shares one changing colour, so no rainbow across the keys.
    expect(pictureLayout(effectInfo(13), true)).toEqual({ kind: 'cycle' })
  })

  it('shows one moment of a colour-cycling effect: every key the same colour, whatever colour is chosen', () => {
    const fills = pictureFills(KEYS, { kind: 'cycle' }, { hue: 170, sat: 200, val: 255 })
    expect(new Set([...fills.values()].map((f) => f.colour))).toEqual(new Set([hsvCss(CYCLE_MOMENT, 200)]))
    expect(fills.size).toBe(4)
  })

  it('tints every key with the colour at the brightness set', () => {
    const fills = pictureFills(KEYS, { kind: 'tint' }, { ...COLOUR, val: 128 })
    expect(new Set([...fills.values()].map((f) => f.colour))).toEqual(new Set([hsvCss(170, 255, 128 / 255)]))
    expect(fills.size).toBe(4)
  })

  it('runs the rainbow the way the effect does, from the keys’ positions', () => {
    const across = pictureFills(KEYS, { kind: 'rainbow', direction: 'across' }, COLOUR)
    expect(across.get('0,0')!.colour).toBe(hsvCss(0, 255))
    expect(across.get('0,1')!.colour).toBe(across.get('1,1')!.colour)
    expect(across.get('0,2')!.colour).toBe(hsvCss(255, 255))
    const down = pictureFills(KEYS, { kind: 'rainbow', direction: 'down' }, COLOUR)
    expect(down.get('0,0')!.colour).toBe(down.get('0,2')!.colour)
    expect(down.get('0,0')!.colour).not.toBe(down.get('1,1')!.colour)
  })

  it('draws the keys dark with the lights off, with light labels', () => {
    const fills = pictureFills(KEYS, { kind: 'off' }, COLOUR)
    for (const fill of fills.values()) expect(fill).toEqual({ colour: hsvCss(170, 255, 0), light: false })
  })
})
