// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { matchRanges, queryWords, searchHelp } from '../search'

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
