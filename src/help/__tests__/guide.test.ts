// SPDX-License-Identifier: GPL-3.0-or-later

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GLOSSARY } from '../glossary'
import { GUIDE, GUIDE_ONLY, groupOf, neighbours, READING_ORDER, relatedTopics } from '../guide'
import { fillLayers } from '../text'
import { HELP_TOPIC_IDS, HELP_TOPICS } from '../topics'
import { TOUR_STEPS } from '../tour'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Every source file of the app outside the help itself, the vendored code and the tests. */
function appSources(dir = SRC): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    const rel = relative(SRC, path).replaceAll('\\', '/')
    if (rel === 'help' || rel.startsWith('vendor') || name === '__tests__') return []
    if (statSync(path).isDirectory()) return appSources(path)
    return /\.tsx?$/.test(name) ? [path] : []
  })
}

describe('the guide', () => {
  it('puts every topic in exactly one group', () => {
    const counted = new Map<string, number>()
    for (const group of GUIDE) for (const id of group.topics) counted.set(id, (counted.get(id) ?? 0) + 1)
    for (const id of HELP_TOPIC_IDS) expect(counted.get(id), id).toBe(1)
    expect(READING_ORDER).toHaveLength(HELP_TOPIC_IDS.length)
  })

  it('has no empty group and starts with Getting started', () => {
    expect(GUIDE[0].title).toBe('Getting started')
    for (const group of GUIDE) expect(group.topics.length, group.id).toBeGreaterThan(0)
  })

  it('reads in order across groups', () => {
    expect(neighbours(READING_ORDER[0]).previous).toBeNull()
    expect(neighbours(READING_ORDER.at(-1)!).next).toBeNull()
    const last = GUIDE[0].topics.at(-1)!
    expect(neighbours(last).next).toBe(GUIDE[1].topics[0])
    expect(groupOf('combos').id).toBe('shortcuts')
  })

  it('relates topics only to topics that exist, never to themselves', () => {
    for (const id of HELP_TOPIC_IDS) {
      const listed = HELP_TOPICS[id].related ?? []
      expect(relatedTopics(id), id).toEqual(listed)
      expect(listed, id).not.toContain(id)
    }
  })

  it('gives every topic a body, and places in the app as addresses', () => {
    for (const id of HELP_TOPIC_IDS) {
      const topic = HELP_TOPICS[id]
      expect(topic.body.length, id).toBeGreaterThan(0)
      for (const place of topic.where ?? []) expect(place.href, id).toMatch(/^#\//)
    }
  })

  it('opens every topic from a "?" somewhere in the app, except the ones only the guide has', () => {
    const code = appSources().map((path) => readFileSync(path, 'utf8')).join('\n')
    const orphans = HELP_TOPIC_IDS.filter((id) => !GUIDE_ONLY.has(id) && !new RegExp(`['"]${id}['"]`).test(code))
    expect(orphans).toEqual([])
    // A guide-only topic that is opened from the app after all should lose the label.
    const opened = [...GUIDE_ONLY].filter((id) => new RegExp(`(topic|help)[=:]\\s*\\{?['"]${id}['"]`).test(code))
    expect(opened).toEqual([])
  })

  it('has a glossary of unique terms pointing at topics', () => {
    const terms = GLOSSARY.map((entry) => entry.term.toLowerCase())
    expect(new Set(terms).size).toBe(terms.length)
    for (const entry of GLOSSARY) expect(HELP_TOPICS[entry.topic], entry.term).toBeDefined()
    for (const word of ['tap dance', 'combo', 'key override', 'kc_trns', 'debounce', 'eeprom', 'bootloader', 'n-key rollover']) {
      expect(terms, word).toContain(word)
    }
  })

  it('fills layer names in, or the generic ones without a keyboard', () => {
    const text = 'Hold {layer:3|Windows Fn} or {layer:9|Layer 9}.'
    expect(fillLayers(text)).toBe('Hold Windows Fn or Layer 9.')
    expect(fillLayers(text, ['Mac', 'Mac Fn', 'Windows', 'My Fn'])).toBe('Hold My Fn or Layer 9.')
  })

  it('tours only places with a marker in the app', () => {
    const code = appSources().map((path) => readFileSync(path, 'utf8')).join('\n')
    for (const step of TOUR_STEPS) expect(code, step.target).toContain(`data-tour="${step.target}"`)
    expect(code).toContain('data-tour="connect"')
  })
})
