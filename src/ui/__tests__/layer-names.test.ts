// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { KeyboardData, LinkInfo } from '../../device'
import demo from '../../demo/k15-max.json'
import { defaultLayerName, knownLayerNames, renameLayer, useLayerNames } from '../layer-names'

const keyboard = (uid: string, layers: number, definition: object = {}) => ({ uid, layers, definition }) as KeyboardData
const cable = (vendorId: number, productId: number): LinkInfo => ({ kind: 'cable', vendorId, productId, productName: '' })
const RECEIVER: LinkInfo = { kind: 'receiver', vendorId: 0x3434, productId: 0xd030, productName: 'Keychron Link' }
const names = (kb: KeyboardData, link: LinkInfo | null = null) =>
  Array.from({ length: kb.layers }, (_, i) => defaultLayerName(i, knownLayerNames(kb, link)))

/** The owner's K15 Max: the ripple keymap (its own Vial ID), five layers, the stock definition's IDs. */
const K15_RIPPLE = keyboard('0xeba84cf7f703566c', 5, { vendorId: '0x3434', productId: '0x0AF0' })

describe('default layer names', () => {
  it('names the K15 Max’s Mac and Windows pairs, and its fifth layer by number (the demo and the ripple keymap)', () => {
    const expected = ['Mac', 'Mac Fn', 'Windows', 'Windows Fn', 'Layer 4']
    expect(names(K15_RIPPLE)).toEqual(expected)
    expect(names(K15_RIPPLE, RECEIVER)).toEqual(expected)
    expect(names(keyboard('0x0807060504030201', demo.keymap.length, demo.definition))).toEqual(expected)
  })

  it('finds a stock Vial keymap by its Vial ID, through the receiver too', () => {
    // vial-qmk keyboards/keychron/k15_max/ansi_encoder/rgb/keymaps/vial: VIAL_KEYBOARD_UID {0x70, 0x16, …, 0x6A}
    expect(names(keyboard('0x6a48b0e335111670', 4), RECEIVER)).toEqual(['Mac', 'Mac Fn', 'Windows', 'Windows Fn'])
  })

  it('names a Keychron board whose Windows layer is 1 (Q2: MAC_BASE, WIN_BASE, _FN1, _FN2, _FN3)', () => {
    expect(names(keyboard('0x1', 5, { vendorId: '0x3434', productId: '0x0111' }))).toEqual(['Mac', 'Windows', 'Fn', 'Fn 2', 'Fn 3'])
  })

  it('names a Keychron board with the Windows pair first (R3, R5: WIN_BASE, WIN_FN, MAC_BASE, MAC_FN)', () => {
    // R5's definition has no IDs: found by its Vial ID …
    expect(names(keyboard('0x05b05b0d8eaefda2', 4))).toEqual(['Windows', 'Windows Fn', 'Mac', 'Mac Fn'])
    // … or, on the cable, by the USB IDs (R3 ANSI: 3434:1430).
    expect(names(keyboard('0x2', 4), cable(0x3434, 0x1430))).toEqual(['Windows', 'Windows Fn', 'Mac', 'Mac Fn'])
  })

  it('names a Keychron number pad without a Mac / Windows switch (Q0: _BASE, _FN1), the rest by number', () => {
    expect(names(keyboard('0x3', 4, { vendorId: '0x3434', productId: '0x0130' }))).toEqual(['Base', 'Fn', 'Layer 2', 'Layer 3'])
  })

  it('numbers the layers a Keychron keymap gives no meaning to (Q60: MAC_BASE, WIN_BASE, FN, L3, L4, L5)', () => {
    expect(names(keyboard('0x4', 6, { vendorId: '0x3434', productId: '0x01c0' }))).toEqual(['Mac', 'Windows', 'Fn', 'Layer 3', 'Layer 4', 'Layer 5'])
  })

  it('numbers the layers of keyboards it doesn’t know, Keychron or not', () => {
    expect(names(keyboard('0x5', 4, { vendorId: '0x3434', productId: '0xfffe' }))).toEqual(['Layer 0', 'Layer 1', 'Layer 2', 'Layer 3'])
    expect(names(keyboard('0x6', 3), cable(0x3434, 0xfffe))).toEqual(['Layer 0', 'Layer 1', 'Layer 2'])
    expect(names(keyboard('0x7', 2), cable(0x4653, 0x0001))).toEqual(['Layer 0', 'Layer 1'])
    // Through a receiver the link's IDs are the receiver's: they say nothing about the keyboard.
    expect(names(keyboard('0x8', 2), RECEIVER)).toEqual(['Layer 0', 'Layer 1'])
  })
})

describe('layer names', () => {
  it('uses the names given, the defaults elsewhere, and keeps them per keyboard', () => {
    const { result } = renderHook(() => useLayerNames({ ...K15_RIPPLE, uid: 'kb-1' }, null))
    expect(result.current).toEqual(['Mac', 'Mac Fn', 'Windows', 'Windows Fn', 'Layer 4'])

    act(() => renameLayer('kb-1', 4, '  Fn2 '))
    expect(result.current[4]).toBe('Fn2')
    expect(localStorage.getItem('layerworks:layer-names:kb-1')).toBe('["","","","","Fn2"]')

    const other = renderHook(() => useLayerNames({ ...K15_RIPPLE, uid: 'kb-2' }, null))
    expect(other.result.current[4]).toBe('Layer 4')
  })

  it('goes back to the default when a name is cleared', () => {
    const { result } = renderHook(() => useLayerNames({ ...K15_RIPPLE, uid: 'kb-3' }, null))
    act(() => renameLayer('kb-3', 2, 'Work'))
    expect(result.current[2]).toBe('Work')
    act(() => renameLayer('kb-3', 2, '   '))
    expect(result.current[2]).toBe('Windows')
  })

  it('has no names without a keyboard', () => {
    const { result } = renderHook(() => useLayerNames(null, null))
    expect(result.current).toEqual([])
  })
})
