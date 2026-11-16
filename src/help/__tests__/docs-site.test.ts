// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { docsSite } from '../docs-site'
import { HELP_TOPICS } from '../topics'

describe('docsSite', () => {
  it('names the site a link goes to', () => {
    expect(docsSite('https://docs.qmk.fm/tap_hold')).toBe('the QMK documentation')
    expect(docsSite('https://get.vial.today/manual/macros.html')).toBe('the Vial manual')
    expect(docsSite('https://www.keychron.com/blogs/news/how-to-set-snap-click-on-launcher')).toBe('Keychron’s guide')
    expect(docsSite('https://example.org/page')).toBe('example.org')
  })

  it('knows every site the help topics link to', () => {
    for (const topic of Object.values(HELP_TOPICS)) {
      if (topic.docs) expect(docsSite(topic.docs)).toMatch(/^(the |Keychron)/)
    }
  })
})
