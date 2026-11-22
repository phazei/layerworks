// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import '../..'
import { backupContents } from '../../../device/backup'
import {
  backupText,
  createBackup,
  describePlan,
  deviceStore,
  matrixKeys,
  parseBackup,
  planRestore,
  withLayoutChoice,
} from '../../../device'
import { connectDemo, demoKeyboard, disconnect } from '../../../shell/session'
import { Shell } from '../../../shell/Shell'
import { stage } from '../../../shell/stage-store'
import { clearPrefs } from '../../../ui/prefs'

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

const keyboard = () => deviceStore.getState().keyboard!
/** A key only the second choice of a group has ("Split Backspace" on: the second half of Backspace). */
function keyOnlyIn(group: number, choice: number): string {
  const keys = keyboard().layout!.keys.filter((k) => k.layoutIndex === group && !k.decal)
  const other = new Set(keys.filter((k) => k.layoutOption !== choice).map((k) => `${k.row},${k.col}`))
  return keys.filter((k) => k.layoutOption === choice).map((k) => `${k.row},${k.col}`).find((pos) => !other.has(pos))!
}

describe('the Layout card on a keyboard with layout options (the demo GH80-3000)', () => {
  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    clearPrefs()
    history.replaceState(null, '', '/?demo-keyboard=gh80')
    await connectDemo()
    await waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
    await go('#/keys')
  })
  afterEach(async () => {
    await act(() => disconnect())
    history.replaceState(null, '', '/')
    location.hash = ''
  })

  it('names each option in the definition’s words', () => {
    render(<Shell />)
    const card = screen.getByRole('list', { name: 'Layout options' })
    expect(within(card).getByRole('switch', { name: 'Split Backspace' })).toHaveAttribute('aria-checked', 'false')
    const bottom = within(card).getByRole('combobox', { name: 'Bottom Row' })
    expect([...bottom.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['Default', '7U Space', '7U Space WKL', 'Split Space'])
  })

  it('writes a change to the keyboard at once, redraws the picture, and Undo takes it back', async () => {
    const { container } = render(<Shell />)
    const split = keyOnlyIn(0, 1)
    expect(container.querySelector(`[data-key-pos="${split}"]`)).toBeNull()
    const before = keyboard().layoutOptions

    await act(async () => screen.getByRole('switch', { name: 'Split Backspace' }).click())
    await waitFor(() => expect(keyboard().layoutOptions).toBe(withLayoutChoice(before, keyboard().definition.layouts.labels!, 0, 1)))
    expect(container.querySelector(`[data-key-pos="${split}"]`)).not.toBeNull()
    expect(matrixKeys(keyboard())).toContain(split)
    // Written to the keyboard: VIA's set layout options (0x03 0x02) with the new value.
    const sent = (demoKeyboard() as unknown as { requests: Uint8Array[] }).requests.filter((r) => r[0] === 0x03 && r[1] === 0x02)
    expect(sent).toHaveLength(1)

    await act(() => deviceStore.undo())
    expect(keyboard().layoutOptions).toBe(before)
    expect(container.querySelector(`[data-key-pos="${split}"]`)).toBeNull()
  })

  it('lets go of a selected key the new layout doesn’t have', async () => {
    render(<Shell />)
    await act(() => deviceStore.setLayoutChoice(0, 1))
    const [row, col] = keyOnlyIn(0, 1).split(',').map(Number)
    act(() => stage.select({ kind: 'key', row, col }))
    expect(screen.getByRole('heading', { name: 'What should this key do?' })).toBeInTheDocument()
    await act(() => deviceStore.setLayoutChoice(0, 0))
    await waitFor(() => expect(stage.get().selection).toBeNull())
  })

  it('goes into a backup, and a restore puts it back, named in words in the review', async () => {
    const backup = parseBackup(backupText(createBackup(deviceStore.getState(), [])))
    await act(() => deviceStore.setLayoutChoice(7, 2))
    const plan = planRestore(backupContents(backup), deviceStore.getState())
    expect(describePlan(plan, []).find((line) => line.part === 'layoutOptions')?.text).toBe('Layout: Bottom Row: Default')
    await act(() => deviceStore.restore(plan))
    expect(keyboard().layoutOptions).toBe(backup.layoutOptions)
  })

  it('isn’t there on a keyboard without layout options', async () => {
    await act(() => disconnect())
    history.replaceState(null, '', '/?demo-keyboard=corne')
    await connectDemo()
    render(<Shell />)
    expect(screen.queryByRole('list', { name: 'Layout options' })).toBeNull()
  })
})
