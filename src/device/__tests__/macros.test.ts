// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeLink, fakeKeyboard, fakeKeyboardConfig, plainDefinition, type FakeKeyboardConfig } from '../fake-keyboard'
import {
  decodeMacro,
  encodeMacro,
  macroSize,
  macroSpace,
  macroUses,
  rawMacros,
  readMacros,
  replaceMacro,
  stepProblem,
  stepsFromRecording,
  untypable,
  MAX_WAIT_MS,
  type MacroStep,
  type RecordedKey,
} from '../macros'
import { createDeviceStore, MACRO_UNDO_LOCKED, type DeviceStore } from '../store'

const CTRL_C = 0x0106
const ENTER = 0x28

describe('encoding', () => {
  const every: MacroStep[] = [
    { kind: 'text', text: 'Hi there!' },
    { kind: 'tap', key: ENTER },
    { kind: 'tap', key: CTRL_C },
    { kind: 'down', key: 0xe1 },
    { kind: 'up', key: 0xe1 },
    { kind: 'wait', ms: 300 },
    { kind: 'wait', ms: MAX_WAIT_MS },
    { kind: 'tap', key: 0x7700 }, // low byte 0: QMK's 0xFF00 | high byte form
  ]

  it('round-trips every kind of step on Vial protocol 2 and later', () => {
    const bytes = encodeMacro(every, 6)
    expect(bytes).not.toContain(0)
    expect(decodeMacro(bytes, 6)).toEqual(every)
  })

  it('writes the bytes vial-gui does', () => {
    expect(encodeMacro([{ kind: 'text', text: 'ab' }], 6)).toEqual([0x61, 0x62])
    expect(encodeMacro([{ kind: 'tap', key: ENTER }], 6)).toEqual([1, 1, ENTER])
    expect(encodeMacro([{ kind: 'tap', key: CTRL_C }], 6)).toEqual([1, 5, 0x06, 0x01])
    expect(encodeMacro([{ kind: 'down', key: 0xe0 }, { kind: 'up', key: 0xe0 }], 6)).toEqual([1, 2, 0xe0, 1, 3, 0xe0])
    expect(encodeMacro([{ kind: 'wait', ms: 300 }], 6)).toEqual([1, 4, 300 % 255 + 1, 2])
  })

  it('round-trips the steps protocol 1 has: text and plain keys, without the prefix byte', () => {
    const steps: MacroStep[] = [{ kind: 'text', text: 'ok' }, { kind: 'tap', key: ENTER }, { kind: 'down', key: 0xe1 }, { kind: 'up', key: 0xe1 }]
    const bytes = encodeMacro(steps, 1)
    expect(bytes).toEqual([0x6f, 0x6b, 1, ENTER, 2, 0xe1, 3, 0xe1])
    expect(decodeMacro(bytes, 1)).toEqual(steps)
  })

  it('leaves out steps with a problem', () => {
    expect(encodeMacro([{ kind: 'text', text: 'é' }, { kind: 'tap', key: 0 }, { kind: 'text', text: 'x' }], 6)).toEqual([0x78])
  })
})

describe('step problems', () => {
  it('flags text a macro cannot type, naming the characters', () => {
    expect(untypable('Grüße\n')).toEqual(['ü', 'ß', '\n'])
    expect(stepProblem({ kind: 'text', text: 'Grüße' }, 6)).toMatch(/can’t type “ü”, “ß”/)
    expect(stepProblem({ kind: 'text', text: 'a\nb' }, 6)).toMatch(/line breaks/)
    expect(stepProblem({ kind: 'text', text: '' }, 6)).toMatch(/Type the text/)
    expect(stepProblem({ kind: 'text', text: 'All of ASCII: ~!@#$%^&*()_+{}|:"<>?' }, 6)).toBeNull()
  })

  it('flags keys not picked, waits out of range, and what protocol 1 lacks', () => {
    expect(stepProblem({ kind: 'tap', key: 0 }, 6)).toMatch(/Pick a key/)
    expect(stepProblem({ kind: 'wait', ms: MAX_WAIT_MS + 1 }, 6)).toMatch(/up to 65.024 seconds/)
    expect(stepProblem({ kind: 'wait', ms: 100 }, 1)).toMatch(/can’t wait/)
    expect(stepProblem({ kind: 'tap', key: CTRL_C }, 1)).toMatch(/plain keys/)
    expect(stepProblem({ kind: 'tap', key: CTRL_C }, 6)).toBeNull()
  })
})

describe('the shared buffer', () => {
  const steps = (text: string): MacroStep[] => [{ kind: 'text', text }]
  const buffer = [...encodeMacro(steps('one'), 6), 0, 0, ...encodeMacro(steps('three'), 6), 0, ...new Array<number>(20).fill(0)]

  it('reads every macro, empty ones too', () => {
    expect(readMacros(buffer, 6, 4)).toEqual([steps('one'), [], steps('three'), []])
  })

  it('counts the bytes each macro and all of them take', () => {
    expect(macroSize(steps('one'), 6)).toBe(4)
    expect(macroSize([], 6)).toBe(1)
    expect(macroSpace(buffer, 4, 30)).toEqual({ size: 30, used: 4 + 1 + 6 + 1, free: 18 })
  })

  it('replaces one macro and keeps the others byte for byte', () => {
    const next = replaceMacro(buffer, 4, 30, 1, encodeMacro(steps('two'), 6))
    expect(next.buffer).toHaveLength(30)
    expect(readMacros(next.buffer!, 6, 4)).toEqual([steps('one'), steps('two'), steps('three'), []])
    expect(rawMacros(next.buffer!, 4)[2]).toEqual(rawMacros(buffer, 4)[2])
  })

  it('says by how much a macro is too long', () => {
    expect(replaceMacro(buffer, 4, 30, 3, encodeMacro(steps('x'.repeat(30)), 6))).toEqual({ buffer: null, overflow: 12 })
  })
})

describe('recording', () => {
  let t = 0
  const press = (...keys: number[]): RecordedKey[] => keys.flatMap((key) => [{ type: 'down', key, time: (t += 10) }, { type: 'up', key, time: (t += 10) }])
  const down = (key: number): RecordedKey => ({ type: 'down', key, time: (t += 10) })
  const up = (key: number): RecordedKey => ({ type: 'up', key, time: (t += 10) })
  const LSHIFT = 0xe1
  const LCTRL = 0xe0
  const H = 0x0b
  const I = 0x0c
  const C = 0x06

  it('turns typing into text, with Shift for capitals', () => {
    const events = [down(LSHIFT), ...press(H), up(LSHIFT), ...press(I, 0x2c, 0x1e), down(LSHIFT), ...press(0x1e), up(LSHIFT)]
    expect(stepsFromRecording(events)).toEqual([{ kind: 'text', text: 'Hi 1!' }])
  })

  it('turns keys tapped with Ctrl held into shortcuts', () => {
    const events = [down(LCTRL), ...press(C), up(LCTRL), ...press(ENTER)]
    expect(stepsFromRecording(events)).toEqual([{ kind: 'tap', key: CTRL_C }, { kind: 'tap', key: ENTER }])
  })

  it('keeps keys held across others as hold and let go', () => {
    const events = [down(0xe2), ...press(0x2b, 0x2b), down(H), down(I), up(H), up(I), up(0xe2)]
    expect(stepsFromRecording(events)).toEqual([
      { kind: 'tap', key: 0x042b },
      { kind: 'tap', key: 0x042b },
      { kind: 'down', key: 0xe2 },
      { kind: 'down', key: H },
      { kind: 'down', key: I },
      { kind: 'up', key: H },
      { kind: 'up', key: I },
      { kind: 'up', key: 0xe2 },
    ])
  })

  it('taps a modifier pressed on its own, ignores repeats and keys let go from before', () => {
    const events: RecordedKey[] = [up(H), down(LCTRL), up(LCTRL), down(I), down(I), up(I)]
    expect(stepsFromRecording(events)).toEqual([{ kind: 'tap', key: LCTRL }, { kind: 'text', text: 'i' }])
  })

  it('lets go of keys still held when recording stops', () => {
    expect(stepsFromRecording([down(H), down(I)])).toEqual([
      { kind: 'down', key: H },
      { kind: 'down', key: I },
      { kind: 'up', key: H },
      { kind: 'up', key: I },
    ])
  })

  it('keeps long pauses as waits when asked', () => {
    const events: RecordedKey[] = [
      { type: 'down', key: H, time: 0 },
      { type: 'up', key: H, time: 50 },
      { type: 'down', key: I, time: 1234 },
      { type: 'up', key: I, time: 1300 },
    ]
    expect(stepsFromRecording(events, { keepPausesOver: 150 })).toEqual([
      { kind: 'text', text: 'h' },
      { kind: 'wait', ms: 1230 },
      { kind: 'text', text: 'i' },
    ])
    expect(stepsFromRecording(events)).toEqual([{ kind: 'text', text: 'hi' }])
  })
})

// --- On the fake keyboard -----------------------------------------------------------------------------------------

function loaded(store: DeviceStore): Promise<void> {
  return new Promise((resolve) => {
    const done = () => store.getState().status !== 'ready' || store.getState().loading.length === 0
    if (done()) return resolve()
    const off = store.subscribe(() => {
      if (!done()) return
      off()
      resolve()
    })
  })
}

describe('saving a macro', () => {
  let store: DeviceStore
  let config: FakeKeyboardConfig
  let link: FakeLink
  const HELLO: MacroStep[] = [{ kind: 'text', text: 'hello' }, { kind: 'tap', key: ENTER }]

  async function connect(unlocked: boolean, change: (c: FakeKeyboardConfig) => void = () => {}): Promise<void> {
    // Two macros (one, three) in a 40-byte buffer.
    config = fakeKeyboardConfig({ unlocked, macros: [0x6f, 0x6e, 0x65, 0, 0, 0x74, 0x77, 0x6f, 0, ...new Array<number>(31).fill(0)] })
    change(config)
    link = new FakeLink()
    link.responder = fakeKeyboard(config)
    await store.connect(link)
    await loaded(store)
  }
  const macroWrites = () => link.requests.filter((r) => r[0] === 0x0f)

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    store = createDeviceStore({ decompress: plainDefinition })
  })

  it('is not attempted while the keyboard is locked', async () => {
    await connect(false)
    expect(await store.saveMacro(1, HELLO)).toBe('locked')
    expect(macroWrites()).toHaveLength(0)
    expect(store.getState().canUndo).toBe(false)
  })

  it('writes the macro, leaving the others as they were', async () => {
    await connect(true)
    const before = rawMacros(config.macros, 4)

    expect(await store.saveMacro(1, HELLO)).toBe('saved')

    const after = rawMacros(config.macros, 4)
    expect(readMacros(config.macros, 6, 4)[1]).toEqual(HELLO)
    expect(after[0]).toEqual(before[0])
    expect(after[2]).toEqual(before[2])
    expect(store.getState().macros).toEqual(config.macros)
    // Only the 28-byte pieces that changed: everything sits in the first one here.
    expect(macroWrites()).toHaveLength(1)
    expect(store.getState()).toMatchObject({ writing: 0, writeError: null, canUndo: true })
  })

  it('carries two-byte keycodes to the keyboard and back (vial-qmk runs them through the whole key handling)', async () => {
    await connect(true)
    // Caps Word, swap Caps Lock and Ctrl (low byte 0: the 0xFF00 | high byte form), and Ctrl + C.
    const steps: MacroStep[] = [{ kind: 'tap', key: 0x7c73 }, { kind: 'tap', key: 0x7000 }, { kind: 'down', key: CTRL_C }, { kind: 'up', key: CTRL_C }]
    expect(steps.map((step) => stepProblem(step, 6))).toEqual([null, null, null, null])
    expect(await store.saveMacro(1, steps)).toBe('saved')
    // dynamic_keymap.c reads [1, VIAL_MACRO_EXT_TAP, low, high]: no 0 byte inside, or the macro would end there.
    expect(rawMacros(config.macros, 4)[1]).toEqual([1, 5, 0x73, 0x7c, 1, 5, 0x70, 0xff, 1, 6, 0x06, 0x01, 1, 7, 0x06, 0x01])
    expect(readMacros(config.macros, 6, 4)[1]).toEqual(steps)
    // On Vial protocol 1, which has no two-byte form, they are refused.
    expect(stepProblem(steps[0], 1)).toMatch(/plain keys/)
  })

  it('says when there is nothing to save, or no room', async () => {
    await connect(true)
    expect(await store.saveMacro(0, [{ kind: 'text', text: 'one' }])).toBe('unchanged')
    expect(await store.saveMacro(3, [{ kind: 'text', text: 'x'.repeat(40) }])).toBe('too-big')
    expect(await store.saveMacro(3, [{ kind: 'tap', key: 0 }])).toBe('invalid')
    expect(macroWrites()).toHaveLength(0)
  })

  it('is one undo step, which needs the keyboard unlocked', async () => {
    await connect(true)
    const before = [...config.macros]
    await store.saveMacro(1, HELLO)
    await store.lock()

    await store.undo()
    expect(store.getState().writeError).toBe(MACRO_UNDO_LOCKED)
    expect(readMacros(config.macros, 6, 4)[1]).toEqual(HELLO)

    // Unlocked again (without the 5-second unlock flow: the store reads its lock state from here).
    config.unlocked = true
    store.getState().unlock!.unlocked = true
    await store.undo()
    expect(config.macros).toEqual(before)
    expect(store.getState()).toMatchObject({ canUndo: false, canRedo: true, writeError: null })

    await store.redo()
    expect(readMacros(config.macros, 6, 4)[1]).toEqual(HELLO)
  })

  it('finds the keys that run a macro', async () => {
    await connect(true, (c) => {
      c.keymap[1][0][2] = 0x7701
      c.knob[2] = [0x7701, 0x80]
    })
    expect(macroUses(store.getState().keyboard!, 1)).toEqual([
      { kind: 'key', layer: 1, row: 0, col: 2 },
      { kind: 'knob', layer: 2, knob: 0, direction: 0 },
    ])
    expect(macroUses(store.getState().keyboard!, 0)).toEqual([])
  })
})
