// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '../..'
import { createBackup, deviceStore, planRestore } from '../../../device'
import { backupContents } from '../../../device/backup'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig, type FakeKeyboardConfig } from '../../../device/fake-keyboard'
import { definePlugin } from '../../../plugins/api'
import { Shell } from '../../../shell/Shell'

const EFFECTS = [2, 6, 13, 25, 30, 41]

let config: FakeKeyboardConfig
let link: FakeLink

async function open(overrides: Partial<FakeKeyboardConfig> = {}): Promise<void> {
  config = fakeKeyboardConfig({ rgbEffects: EFFECTS, rgb: { mode: 2, speed: 100, hue: 10, sat: 255, val: 150 }, ...overrides })
  link = new FakeLink('cable')
  link.responder = fakeKeyboard(config)
  await deviceStore.connect(link)
  await act(async () => {
    location.hash = '#/lighting'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  render(<Shell />)
}

/** Lighting writes (VialRGB set mode) the keyboard received. */
const lightingWrites = () => link.requests.filter((r) => r[0] === 0x07 && r[1] === 0x41)
const settled = () => waitFor(() => expect(deviceStore.getState().writing).toBe(0))

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  localStorage.clear()
})

afterEach(async () => {
  await act(() => deviceStore.disconnect())
  location.hash = ''
})

describe('the Lighting page after a restore', () => {
  it('runs a picked effect at the speed it shows', async () => {
    await open({ rgbEffects: [12, 29], rgb: { mode: 29, speed: 128, hue: 10, sat: 255, val: 150 } })
    await screen.findByRole('button', { name: 'Bright spiral' })
    await settled()
    const backup = createBackup(deviceStore.getState(), [], new Date())

    // Bright spiral at full speed, saved on the keyboard.
    act(() => screen.getByRole('button', { name: 'Bright spiral' }).click())
    await settled()
    fireEvent.change(screen.getByRole('slider', { name: /Speed/ }), { target: { value: '255' } })
    await settled()
    config.rgbSaved = { ...config.rgb }

    // Restore the backup (heat map, half speed), then pick Bright spiral again.
    await act(() => deviceStore.restore(planRestore(backupContents(backup), deviceStore.getState(), [])))
    act(() => screen.getByRole('button', { name: 'Bright spiral' }).click())
    await settled()

    expect(config.rgb).toMatchObject({ mode: 12, speed: 128 })
    expect(deviceStore.getState().lighting).toMatchObject({ mode: 12, speed: 128 })
    expect(screen.getByRole('slider', { name: /Speed/ })).toHaveValue('128')
  })
})

describe('the Lighting page and the keyboard’s own lighting keys', () => {
  it('reads the lighting again when Fn is let go and when the window gets the focus', async () => {
    await open()
    const brightness = await screen.findByRole('slider', { name: /Brightness/ })
    await settled()

    // Fn + a brightness key on the keyboard: the layer push says Fn is held, then let go.
    config.rgb = { ...config.rgb, val: 60 }
    act(() => link.deliver([0xa3, 0, 1]))
    act(() => link.deliver([0xa3, 0, 0]))
    await waitFor(() => expect(brightness).toHaveValue('60'))

    config.rgb = { ...config.rgb, val: 90 }
    act(() => {
      window.dispatchEvent(new FocusEvent('focus'))
    })
    await waitFor(() => expect(brightness).toHaveValue('90'))
  })
})

describe('the Lighting page', () => {
  it('lists the keyboard’s effects in groups and marks the current one', async () => {
    await open()
    const current = await screen.findByRole('button', { name: 'One colour' })
    expect(current).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Breathing' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(screen.getByRole('region', { name: 'Reacts to typing' })).getAllByRole('button', { name: /splash/ })).toHaveLength(1)
    // Shown under its standard name: core knows nothing of the ripple that replaces it on the K15.
    expect(screen.getByRole('button', { name: 'One-colour splash' })).toBeInTheDocument()
  })

  it('writes the effect that is picked', async () => {
    await open()
    act(() => screen.getByRole('button', { name: 'Breathing' }).click())
    await waitFor(() => expect(config.rgb.mode).toBe(6))
    await settled()
    expect(screen.getByRole('button', { name: 'Breathing' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('sends slider changes without flooding the keyboard, ending on the last value', async () => {
    await open()
    const brightness = await screen.findByRole('slider', { name: /Brightness/ })
    const before = lightingWrites().length
    act(() => {
      for (const value of [160, 170, 180, 190, 200]) fireEvent.change(brightness, { target: { value: String(value) } })
    })
    // Shown at once, before the keyboard has answered.
    expect(brightness).toHaveValue('200')
    await settled()
    await waitFor(() => expect(config.rgb.val).toBe(200))
    const sent = lightingWrites().slice(before)
    expect(sent.length).toBeLessThan(5)
    expect(sent.at(-1)?.[7]).toBe(200)
    expect(deviceStore.getState().lighting?.val).toBe(200)
  })

  it('shows brightness as a percentage of the keyboard’s maximum', async () => {
    await open({ rgbMaxBrightness: 200, rgb: { mode: 2, speed: 0, hue: 0, sat: 0, val: 100 } })
    const brightness = await screen.findByRole('slider', { name: /Brightness/ })
    expect(brightness).toHaveAttribute('max', '200')
    expect(brightness.closest('div')).toHaveTextContent('50 %')
  })

  it('disables the colour for an effect that makes its own, saying why', async () => {
    await open()
    act(() => screen.getByRole('button', { name: 'Rainbow, all keys' }).click())
    await settled()
    const colour = screen.getByRole('slider', { name: /Colour/ })
    expect(colour).toBeDisabled()
    expect(colour).toHaveAccessibleDescription('This effect cycles through all colours by itself.')
    expect(screen.getByRole('slider', { name: 'Vividness' })).toBeEnabled()
    expect(screen.getByRole('slider', { name: /Speed/ })).toBeEnabled()

    act(() => screen.getByRole('button', { name: 'Digital rain' }).click())
    await settled()
    expect(screen.getByRole('slider', { name: /Speed/ })).toHaveAccessibleDescription('This effect runs at its own pace.')
    // Both colour sliders are off for one reason, said once and describing both.
    const reason = 'Colour and vividness don’t apply: this effect picks its own colours.'
    expect(screen.getByRole('slider', { name: 'Vividness' })).toBeDisabled()
    expect(screen.getByRole('slider', { name: 'Vividness' })).toHaveAccessibleDescription(reason)
    expect(screen.getByRole('slider', { name: 'Colour' })).toHaveAccessibleDescription(reason)
    expect(screen.getAllByText(reason)).toHaveLength(1)
  })

  it('turns the lights off and back on to the same effect', async () => {
    await open()
    act(() => screen.getByRole('button', { name: 'Breathing' }).click())
    await settled()
    const lights = screen.getByRole('switch', { name: /Lights on/ })
    act(() => lights.click())
    await waitFor(() => expect(config.rgb.mode).toBe(0))
    await settled()
    expect(lights).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByRole('slider', { name: /Brightness/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Breathing' })).toHaveAttribute('aria-pressed', 'false')

    act(() => lights.click())
    await waitFor(() => expect(config.rgb.mode).toBe(6))
    await settled()
    expect(lights).toHaveAttribute('aria-checked', 'true')
  })

  it('says why when the keyboard’s lighting can’t be controlled', async () => {
    await open({ definition: { name: 'Plain', matrix: { rows: 2, cols: 3 }, layouts: { keymap: fakeKeyboardConfig().kle } } })
    expect(await screen.findByText('This keyboard has no lighting the app can control.')).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: /Lights on/ })).toBeNull()
  })

  it('shows plugin panels for this section, and a plugin’s names for effects', async () => {
    definePlugin({
      id: 'test-lighting',
      panels: [{ section: 'lighting', title: 'Extra glow', component: () => <p>Glow settings</p> }],
      lightingEffects: { 41: { name: 'Ripple' } },
    })
    await open()
    expect(await screen.findByRole('heading', { name: 'Extra glow' })).toBeInTheDocument()
    expect(screen.getByText('Glow settings')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ripple' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'One-colour splash' })).toBeNull()
  })
})
