// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { matchRanges, queryWords, searchHelp } from '../search'
import { HELP_TOPICS } from '../topics'

const first = (query: string) => searchHelp(query)[0]?.id

describe('searching the help', () => {
  it('finds the friendly topic for a QMK word seen elsewhere', () => {
    expect(first('MO')).toBe('layer-key')
    expect(first('tap dance')).toBe('tap-dance')
    expect(first('combo')).toBe('combos')
    expect(first('LT')).toBe('layer-tap')
    expect(first('KC_TRNS')).toBe('transparent')
    expect(first('debounce')).toBe('typing-debounce')
    expect(first('EEPROM')).toBe('saving')
    expect(first('NKRO')).toBe('typing-magic')
    expect(first('key override')).toBe('key-overrides')
  })

  it('finds "magic" where it is in the app: the keys and the Typing feel switches', () => {
    const hits = searchHelp('magic').slice(0, 2).map((hit) => hit.id)
    expect(hits).toEqual(expect.arrayContaining(['typing-magic', 'magic-keys']))
    for (const id of hits) {
      const places = (HELP_TOPICS[id].where ?? []).map((place) => place.href)
      expect(places, id).toEqual(expect.arrayContaining(['#/keys', '#/typing/magic']))
    }
  })

  // Hidden on keyboards that do it by themselves, N-key rollover stays findable in the help, with why.
  it('finds N-key rollover by every name, with the note that it is hidden where the keyboard does it', () => {
    for (const query of ['nkro', 'n-key rollover', 'rollover', '6kro']) {
      const ids = searchHelp(query).slice(0, 3).map((hit) => hit.id)
      expect(ids, query).toContain('typing-magic')
    }
    expect(HELP_TOPICS['typing-magic'].body.join(' ')).toMatch(/doesn’t show the switch/)
  })

  it('finds the new key groups by the names other apps use', () => {
    expect(first('space cadet')).toBe('helper-keys')
    expect(first('programmable button')).toBe('left-out-keys')
    expect(first('joystick')).toBe('left-out-keys')
    expect(first('ISO')).toBe('international-keys')
    expect(first('QK_BOOT')).toBe('restart-keys')
  })

  it('finds friendly words too, case and quotes aside', () => {
    expect(searchHelp('“Backup”').slice(0, 2).map((hit) => hit.id)).toContain('backup')
    expect(searchHelp('colour').map((hit) => hit.id)).toContain('lighting-colour')
  })

  it('matches short words only whole', () => {
    expect(matchRanges('more MO(1)', ['mo'])).toEqual([[5, 7]])
    expect(searchHelp('mo').every((hit) => hit.id !== 'welcome')).toBe(true)
  })

  it('needs every word somewhere in a topic', () => {
    expect(searchHelp('combo xyzzy')).toEqual([])
    expect(searchHelp('   ')).toEqual([])
  })

  it('shows where the words are', () => {
    const hit = searchHelp('tap dance')[0]
    expect(hit.snippet.toLowerCase()).toContain('tap')
    const debounce = searchHelp('chatter')[0]
    expect(debounce.id).toBe('typing-debounce')
    expect(debounce.snippet.toLowerCase()).toContain('chatter')
  })

  it('splits a query into plain lower-case words', () => {
    expect(queryWords('  “Tap  Dance”, ')).toEqual(['tap', 'dance'])
  })

  it('merges overlapping matches', () => {
    expect(matchRanges('tapping', ['tap', 'tapp'])).toEqual([[0, 4]])
  })
})

describe('variants of a word', () => {
  const ids = (query: string) => searchHelp(query).map((hit) => hit.id)

  it('understands US spellings', () => {
    expect(queryWords('Color gray colors')).toEqual(['colour', 'grey', 'colours'])
    expect(first('color')).toBe('lighting-colour')
    expect(ids('per key color')).toContain('key-colours')
  })

  it('treats hyphen, space and joined forms alike', () => {
    for (const query of ['mod-tap', 'mod tap', 'modtap']) expect(first(query), query).toBe('mod-tap')
    for (const query of ['auto-shift', 'auto shift', 'autoshift']) expect(first(query), query).toBe('typing-auto-shift')
    for (const query of ['one-shot', 'one shot', 'oneshot']) expect(['one-shot-mod', 'typing-one-shot'], query).toContain(first(query))
    expect(first('tap-hold')).toBe('typing-tap-hold')
  })

  it('finds a code with any number', () => {
    expect(first('TD(1)')).toBe('tap-dance')
    expect(first('td(7)')).toBe('tap-dance')
    expect(matchRanges('TD(0), TD(1) …', ['td(5)'])).toEqual([
      [0, 5],
      [7, 12],
    ])
  })

  it('matches words of three letters or fewer only whole, plurals included', () => {
    expect(first('mac')).toBe('layers')
    expect(ids('mac')).not.toContain('macros')
    expect(first('mac windows')).toBe('layers')
    expect(first('fn')).toBe('layers')
    expect(matchRanges('keys and keyboards', ['key'])).toEqual([[0, 4]])
  })
})

describe('ranking', () => {
  it('puts each topic first for its own word', () => {
    expect(first('backup')).toBe('backup')
    expect(first('restore')).toBe('restore')
    expect(first('knob')).toBe('knob')
    expect(first('qmk settings')).toBe('typing-feel')
    expect(first('default layer')).toBe('layer-key')
    expect(first('swap esc caps')).toBe('magic-keys')
    expect(first('scroll speed')).toBe('typing-mouse-keys')
  })

  it('finds what the audit found missing', () => {
    expect(first('retro tapping')).toBe('typing-tap-hold-more')
    expect(first('flow tap')).toBe('typing-tap-hold-more')
    expect(first('quick tap')).toBe('typing-tap-hold-more')
    expect(first('factory reset')).toBe('keymap-reset')
    expect(first('tour')).toBe('app-settings')
    expect(first('theme')).toBe('app-settings')
    expect(first('dark mode')).toBe('app-settings')
    expect(first('qwertz')).toBe('key-legends')
    expect(first('repeat key')).toBe('alt-repeat')
    expect(first('leader')).toBe('left-out-keys')
    expect(first('dongle')).toBe('connecting')
    expect(first('numlock')).toBe('lock-lights')
    expect(first('adaptive nkro')).toBe('typing-magic')
    for (const query of ['numpad', 'copy paste', 'emoji', 'hyper', 'meh', 'cmd', 'super', 'bootmagic', 'autocorrect', 'fn2']) {
      expect(searchHelp(query).length, query).toBeGreaterThan(0)
    }
  })

  it('finds one-tap modifiers by their name and by their description', () => {
    expect(first('one-tap modifier')).toBe('one-shot-mod')
    expect(first('one tap')).toMatch(/^(one-shot-mod|typing-one-shot)$/)
    expect(searchHelp('next key only').slice(0, 2).map((hit) => hit.id)).toContain('one-shot-mod')
  })
})
