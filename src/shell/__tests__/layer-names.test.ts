// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { KeyboardData } from '../../device'
import { defaultLayerName, isKeychron, renameLayer, useLayerNames } from '../layer-names'

const keyboard = (uid: string, layers: number) => ({ uid, layers }) as KeyboardData

describe('defaultLayerName', () => {
  it('names Keychron’s Mac and Windows pairs', () => {
    expect([0, 1, 2, 3, 4].map((i) => defaultLayerName(i, true, 5))).toEqual([
      'Mac',
      'Mac Fn',
      'Windows',
      'Windows Fn',
      'Layer 4',
    ])
  })

  it('numbers the layers of other keyboards, and Keychron keyboards with too few layers for the pairs', () => {
    expect(defaultLayerName(0, false, 5)).toBe('Layer 0')
    expect(defaultLayerName(1, true, 3)).toBe('Layer 1')
  })
})

describe('isKeychron', () => {
  it('goes by the vendor ID', () => {
    expect(isKeychron({ vendorId: 0x3434, productId: 0x0af0, kind: 'cable', productName: '' })).toBe(true)
    expect(isKeychron({ vendorId: 0x1234, productId: 0x0af0, kind: 'cable', productName: '' })).toBe(false)
    expect(isKeychron(null)).toBe(false)
  })
})

describe('layer names', () => {
  it('uses the names given, the defaults elsewhere, and keeps them per keyboard', () => {
    const { result } = renderHook(() => useLayerNames(keyboard('kb-1', 5), true))
    expect(result.current).toEqual(['Mac', 'Mac Fn', 'Windows', 'Windows Fn', 'Layer 4'])

    act(() => renameLayer('kb-1', 4, '  Fn2 '))
    expect(result.current[4]).toBe('Fn2')
    expect(localStorage.getItem('layerworks:layer-names:kb-1')).toBe('["","","","","Fn2"]')

    const other = renderHook(() => useLayerNames(keyboard('kb-2', 5), true))
    expect(other.result.current[4]).toBe('Layer 4')
  })

  it('goes back to the default when a name is cleared', () => {
    const { result } = renderHook(() => useLayerNames(keyboard('kb-3', 5), true))
    act(() => renameLayer('kb-3', 2, 'Work'))
    expect(result.current[2]).toBe('Work')
    act(() => renameLayer('kb-3', 2, '   '))
    expect(result.current[2]).toBe('Windows')
  })

  it('has no names without a keyboard', () => {
    const { result } = renderHook(() => useLayerNames(null, true))
    expect(result.current).toEqual([])
  })
})
