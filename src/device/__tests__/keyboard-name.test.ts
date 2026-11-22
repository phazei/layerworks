// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, describe, expect, it, vi } from 'vitest'
import { backupFileName, createBackup, deviceStore } from '..'
import { connectDemo, disconnect } from '../../shell/session'
import { keyboardName } from '../keyboard-name'

const cable = (productName: string) => ({ kind: 'cable' as const, productName })

afterEach(async () => {
  await disconnect()
  history.replaceState(null, '', '/')
})

describe('a keyboard whose definition has no name', () => {
  it('is called by the definition’s name where it has one', () => {
    expect(keyboardName('Keychron Q2', cable('Q2'))).toBe('Keychron Q2')
  })

  it('is called by the product name the browser reports', () => {
    expect(keyboardName(undefined, cable('Splinter'))).toBe('Splinter')
    expect(keyboardName('  ', cable(' Planck '))).toBe('Planck')
  })

  it('is called “Keyboard” when the browser has no name either, or names only the receiver', () => {
    expect(keyboardName(undefined, cable(''))).toBe('Keyboard')
    expect(keyboardName(undefined, { kind: 'receiver', productName: 'Keychron Link' })).toBe('Keyboard')
  })

  it('reads that way everywhere the name goes, backups included (the demo Splinter)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    history.replaceState(null, '', '/?demo-keyboard=splinter')
    await connectDemo()
    const state = deviceStore.getState()
    expect(state.keyboard!.definition.name).toBeUndefined()
    expect(state.keyboard!.name).toBe('Splinter')
    expect(createBackup(state, []).keyboard.name).toBe('Splinter')
    expect(backupFileName(state.keyboard!.name, new Date(2026, 10, 22))).toBe('splinter-2026-11-22.layerworks.json')
  })
})
