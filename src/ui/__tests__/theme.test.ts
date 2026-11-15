// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { resolveTheme, themeOverride } from '../theme'

describe('theme', () => {
  it('follows the system only when asked to', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('takes ?theme=dark or ?theme=light from the URL and ignores anything else', () => {
    expect(themeOverride('?demo&theme=light')).toBe('light')
    expect(themeOverride('?theme=dark')).toBe('dark')
    expect(themeOverride('?theme=blue')).toBeNull()
    expect(themeOverride('')).toBeNull()
  })
})
