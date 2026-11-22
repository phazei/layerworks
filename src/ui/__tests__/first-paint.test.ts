// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const html = readFileSync(join(__dirname, '../../../index.html'), 'utf8')
const tokens = readFileSync(join(__dirname, '../tokens.css'), 'utf8')

describe('the page before the stylesheet arrives', () => {
  it('has the page colour of each theme, as tokens.css gives it', () => {
    const [light, dark] = [...tokens.matchAll(/--surface:\s*(#[0-9a-f]{6})/g)].map((m) => m[1])
    expect(light).toBeDefined()
    expect(dark).toBeDefined()
    expect(html).toMatch(new RegExp(`html \\{\\s*background: ${light};`))
    expect(html).toMatch(new RegExp(`html\\.dark \\{\\s*background: ${dark};`))
  })
})
