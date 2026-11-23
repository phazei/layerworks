// SPDX-License-Identifier: GPL-3.0-or-later
import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  brokenLinks,
  brokenQuotedRefs,
  docFiles,
  expectedIndexes,
  filesUnder,
  headings,
  slug,
  withContents,
  withMap,
} from '../docs-index-lib.mjs'

const root = join(__dirname, '../..')
const docs = [...docFiles(root), join(root, 'docs', 'README.md')]
const topLevel = ['README.md', 'AGENTS.md', 'VENDOR.md'].map((f) => join(root, f))

describe('docs indexes', () => {
  it('makes anchors as GitHub does', () => {
    expect(slug('Tap dance, combos, key overrides, alt repeat')).toBe('tap-dance-combos-key-overrides-alt-repeat')
    expect(slug("Key names and the computer's layout")).toBe('key-names-and-the-computers-layout')
    expect(slug('Shortcuts & macros')).toBe('shortcuts--macros')
    expect(slug('A definition whose `lighting` is an object')).toBe('a-definition-whose-lighting-is-an-object')
    expect(headings('# A\n## B\n```\n## not a heading\n```\n### B\n## B').map((h) => h.anchor)).toEqual(['a', 'b', 'b-1', 'b-2'])
  })

  it('lists ## and ###, and #### only under a ### with three or more', () => {
    const doc = '# T\n\nIntro.\n\n## One\n### Few\n#### a\n#### b\n### Many\n#### c\n#### d\n#### e\n'
    const out = withContents(doc)
    expect(out).toContain('- [One](#one)\n  - [Few](#few)\n  - [Many](#many)\n    - [c](#c)')
    expect(out).not.toContain('(#a)')
    expect(out.indexOf('<!-- contents:start -->')).toBeLessThan(out.indexOf('## One'))
    expect(withContents(out)).toBe(out)
    const map = withMap('<!-- contents:start x.md -->\n<!-- contents:end -->', () => doc)
    expect(map).toContain('- [One](x.md#one)\n  - [Few](x.md#few)')
    expect(map).not.toContain('x.md#c')
  })

  it('are up to date (run pnpm docs:index if not)', () => {
    const stale = [...expectedIndexes(root)]
      .filter(([file, text]) => readFileSync(file, 'utf8') !== text)
      .map(([file]) => relative(root, file))
    expect(stale, 'contents out of date: run pnpm docs:index').toEqual([])
  })
})

describe('references to the documents', () => {
  it('relative links point at files and headings that exist', () => {
    expect(brokenLinks(root, [...docs, ...topLevel])).toEqual([])
  })

  it('quoted section titles name headings that exist', () => {
    const code = [
      ...filesUnder(join(root, 'src'), ['.ts', '.tsx', '.css'], [join(root, 'src', 'vendor')]),
      ...filesUnder(join(root, 'scripts'), ['.ts', '.mjs', '.js']),
    ]
    expect(brokenQuotedRefs(root, [...docs, ...topLevel, ...code])).toEqual([])
  })

  it('catches a heading that is not there', () => {
    expect(brokenQuotedRefs(root, [join(__dirname, 'fixtures', 'bad-refs.md')])).toEqual([
      // (the path is split so this file doesn't hold the bad reference itself)
      `scripts/__tests__/fixtures/bad-refs.md: ${'docs'}/keyboard.md "No such section": no such heading`,
    ])
    expect(brokenLinks(root, [join(__dirname, 'fixtures', 'bad-refs.md')])).toEqual([
      'scripts/__tests__/fixtures/bad-refs.md: (../../../docs/keyboard.md#no-such-section): no such heading',
    ])
  })
})
