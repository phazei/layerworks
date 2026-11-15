// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '../..'
import { backupText, createBackup, deviceStore, parseBackup, type DeviceState } from '../../../device'
import { connectDemo, disconnect } from '../../../shell/session'
import { Shell } from '../../../shell/Shell'
import { readFirmware } from '../firmware'

async function go(path: string): Promise<void> {
  await act(async () => {
    location.hash = path
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

/** Resolves once every background part has been read. */
function loaded(): Promise<void> {
  return waitFor(() => expect(deviceStore.getState().loading).toEqual([]))
}

/** Blobs handed to downloads, by object URL. */
let downloads: { name: string; blob: Blob }[]

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  downloads = []
  const blobs = new Map<string, Blob>()
  URL.createObjectURL = vi.fn((blob: Blob) => {
    const url = `blob:${blobs.size}`
    blobs.set(url, blob)
    return url
  })
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ name: this.download, blob: blobs.get(this.href)! })
  })
  // jsdom's <dialog> may lack showModal.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})

afterEach(async () => {
  await act(() => disconnect())
  location.hash = ''
})

async function showDevice(): Promise<void> {
  await connectDemo()
  await loaded()
  await go('#/device')
  render(<Shell />)
}

const card = (name: string) => screen.getByRole('heading', { name: new RegExp(`^${name}`) }).closest('section')!

describe('Device page', () => {
  it('describes the keyboard in words, the raw values folded away', async () => {
    await showDevice()
    const about = card('About this keyboard')

    expect(about).toHaveTextContent(deviceStore.getState().keyboard!.name)
    expect(within(about).getByLabelText('The keyboard')).toHaveTextContent('ConnectionCable')
    expect(within(about).getByLabelText('The keyboard')).toHaveTextContent('Layers5')
    expect(within(about).getByLabelText('The keyboard')).toHaveTextContent('Keys90and a knob')
    expect(within(about).getByLabelText('Room for')).toHaveTextContent('Multi-tap keys16Tap dance')
    expect(about).not.toHaveTextContent('Vial keyboard ID')

    const details = within(about).getByRole('button', { name: 'Technical details' })
    if (details.getAttribute('aria-expanded') !== 'true') fireEvent.click(details)
    expect(about).toHaveTextContent(`Vial keyboard ID${deviceStore.getState().keyboard!.uid}`)
    expect(about).toHaveTextContent(/Requests\d+ sent/)
  })

  it('has no wireless timers for a keyboard without them', async () => {
    await showDevice()
    expect(screen.queryByRole('heading', { name: 'Wireless and sleep' })).toBeNull()
  })

  it('saves a backup of everything to a file', async () => {
    await showDevice()

    fireEvent.click(screen.getByRole('button', { name: 'Save a backup' }))

    await waitFor(() => expect(downloads).toHaveLength(1))
    expect(downloads[0].name).toMatch(/^keychron-k15-max-ansi-knob-rgb-\d{4}-\d{2}-\d{2}\.layerworks\.json$/)
    const backup = parseBackup(await downloads[0].blob.text())
    expect(backup.keyboard.name).toBe(deviceStore.getState().keyboard!.name)
    expect(backup.keymap).toHaveLength(5)
    expect(backup.macros).toHaveLength(926)
    expect(card('Back up and restore')).toHaveTextContent(`Saved ${downloads[0].name} to your downloads.`)
  })

  it('saves a Vial file', async () => {
    await showDevice()
    const vial = within(card('Back up and restore')).getByRole('button', { name: 'Vial files' })
    if (vial.getAttribute('aria-expanded') !== 'true') fireEvent.click(vial)

    fireEvent.click(screen.getByRole('button', { name: 'Save a Vial file' }))

    expect(downloads[0].name).toMatch(/\.vil$/)
    expect(JSON.parse(await downloads[0].blob.text())).toMatchObject({ version: 1, vial_protocol: 6 })
  })

  it('shows what a restore changes, asks, writes it and says what it did', async () => {
    await showDevice()
    const text = backupText(createBackup(deviceStore.getState(), []))
    const slot = { kind: 'key', layer: 2, row: 3, col: 2 } as const
    const before = deviceStore.getState().keyboard!.keymap['2,3,2']
    await act(() => deviceStore.assign(slot, 0x29))

    const input = card('Back up and restore').querySelector<HTMLInputElement>('input[type=file]')!
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File([text], 'mine.layerworks.json')] } })
    })

    const review = await screen.findByRole('region', { name: 'Restore' })
    expect(review).toHaveTextContent('mine.layerworks.json')
    expect(within(review).getByRole('list', { name: 'What will change' })).toHaveTextContent('1 key on Windows')
    expect(deviceStore.getState().keyboard!.keymap['2,3,2']).toBe(0x29)

    fireEvent.click(within(review).getByRole('button', { name: 'Restore…' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Overwrite the keyboard with this file?')
    expect(dialog).toHaveTextContent('1 key on Windows')
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'Restore' })))

    const done = await screen.findByRole('region', { name: 'Restore finished' })
    expect(done).toHaveTextContent('Restored 1 key.')
    expect(done).toHaveTextContent('Undo')
    expect(deviceStore.getState().keyboard!.keymap['2,3,2']).toBe(before)
  })

  it('says a file matches already, and refuses a file for another keyboard', async () => {
    await showDevice()
    const state = deviceStore.getState()
    const input = () => card('Back up and restore').querySelector<HTMLInputElement>('input[type=file]')!
    const choose = (text: string, name: string) =>
      act(async () => fireEvent.change(input(), { target: { files: [new File([text], name)] } }))

    await choose(backupText(createBackup(state, [])), 'same.layerworks.json')
    expect(await screen.findByRole('region', { name: 'Restore' })).toHaveTextContent('already matches')

    const other: DeviceState = { ...state, keyboard: { ...state.keyboard!, name: 'Q1', rows: 5 } }
    await choose(backupText(createBackup(other, [])), 'q1.layerworks.json')
    expect(await screen.findByText(/wired differently/)).toBeInTheDocument()

    await choose('hello', 'notes.txt')
    expect(await screen.findByText(/neither a Layerworks backup nor a Vial file/)).toBeInTheDocument()
  })

  it('offers unlocking when the restore holds macros and the keyboard is locked', async () => {
    await showDevice()
    const backup = createBackup(deviceStore.getState(), [])
    backup.macros![0] = 0x61
    const input = card('Back up and restore').querySelector<HTMLInputElement>('input[type=file]')!

    await act(async () => fireEvent.change(input, { target: { files: [new File([backupText(backup)], 'm.json')] } }))

    const review = await screen.findByRole('region', { name: 'Restore' })
    expect(review).toHaveTextContent('Macros (all of them are replaced)needs unlocking')
    expect(within(review).getByRole('button', { name: 'Unlock first…' })).toBeInTheDocument()
  })
})

describe('Device page on 2.4 GHz', () => {
  beforeEach(() => history.replaceState(null, '', '/?demo-wireless'))
  afterEach(() => history.replaceState(null, '', '/'))

  it('shows the battery and the wireless timers, and changes them', async () => {
    await showDevice()
    const wireless = card('Wireless and sleep')

    expect(wireless).toHaveTextContent('Battery 76 %')
    const lightsOff = within(wireless).getByRole('group', { name: 'Lights off after' })
    expect(within(lightsOff).getByRole('button', { name: '10 min' })).toHaveAttribute('aria-pressed', 'true')
    // Sleep can't come before the lights go off.
    expect(within(within(wireless).getByRole('group', { name: 'Sleep after' })).getByRole('button', { name: '5 min' })).toBeDisabled()

    await act(async () => fireEvent.click(within(lightsOff).getByRole('button', { name: '30 s' })))

    await waitFor(() => expect(deviceStore.getState().keychron?.wirelessBacklitTime).toBe(30))
    expect(within(lightsOff).getByRole('button', { name: '30 s' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('readFirmware', () => {
  it('reads the version and leaves out the date builds without one carry', () => {
    expect(readFirmware('v1.1.2 1970-01-01-00:00:00')).toEqual({ version: '1.1.2', built: null })
    expect(readFirmware('v1.2.0 2026-03-01-12:00:00')).toEqual({ version: '1.2.0', built: new Date(2026, 2, 1) })
    expect(readFirmware('demo')).toEqual({ version: 'demo', built: null })
    expect(readFirmware('')).toBeNull()
  })
})
