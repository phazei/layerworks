// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Keyboard } from 'lucide-react'
import { createDeviceStore, type DeviceState } from '../../device/store'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig, plainDefinition } from '../../device/fake-keyboard'
import { activePages, activePanels, activePlugins, definePlugin, resetPlugins, type PageDef } from '../api'

const Empty = () => null
const page = (path: string, extra: Partial<PageDef> = {}): PageDef => ({
  path,
  title: path,
  icon: Keyboard,
  component: Empty,
  ...extra,
})

async function connectedState(): Promise<DeviceState> {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const store = createDeviceStore({ decompress: plainDefinition })
  const link = new FakeLink('cable')
  link.responder = fakeKeyboard(fakeKeyboardConfig())
  await store.connect(link)
  return store.getState()
}

const disconnected = createDeviceStore({ decompress: plainDefinition }).getState()

beforeEach(() => resetPlugins())

describe('definePlugin', () => {
  it('registers a plugin once and refuses the same id again', () => {
    definePlugin({ id: 'core', pages: [page('home')] })
    expect(() => definePlugin({ id: 'core' })).toThrow(/already defined/)
  })

  it('lists pages in registration order, plugin by plugin', () => {
    definePlugin({ id: 'core', pages: [page('home'), page('keys', { stage: 'select' })] })
    definePlugin({ id: 'extra', pages: [page('ripple', { group: 'plugins' })] })
    expect(activePages(disconnected).map((p) => p.path)).toEqual(['home', 'keys', 'ripple'])
  })
})

describe('which plugins apply', () => {
  it('a plugin with no conditions applies with or without a keyboard', async () => {
    definePlugin({ id: 'core', pages: [page('home')] })
    expect(activePlugins(disconnected).map((p) => p.id)).toEqual(['core'])
    expect(activePlugins(await connectedState()).map((p) => p.id)).toEqual(['core'])
  })

  it('a plugin with conditions needs a connected keyboard that meets them', async () => {
    definePlugin({ id: 'mine', matches: ({ link }) => link.productId === 0x0af0, pages: [page('mine')] })
    definePlugin({ id: 'other', matches: ({ link }) => link.productId === 0x1234, pages: [page('other')] })
    definePlugin({ id: 'knob', requires: (caps) => caps.has('knob'), pages: [page('knob')] })
    definePlugin({ id: 'ripple', requires: (caps) => caps.hasCommand('ripple'), pages: [page('ripple')] })

    expect(activePages(disconnected)).toEqual([])
    expect(activePages(await connectedState()).map((p) => p.path)).toEqual(['mine', 'knob'])
  })

  it('panels are picked by section', () => {
    definePlugin({
      id: 'core',
      panels: [
        { section: 'lighting', title: 'Ripple', component: Empty },
        { section: 'typing', title: 'Timing', component: Empty },
      ],
    })
    expect(activePanels(disconnected, 'lighting').map((p) => p.title)).toEqual(['Ripple'])
    expect(activePanels(disconnected, 'device')).toEqual([])
  })
})
