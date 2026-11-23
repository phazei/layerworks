// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { readFirmware } from '../firmware'

describe('readFirmware', () => {
  it('reads the version and leaves out the date builds without one carry', () => {
    expect(readFirmware('v1.1.2 1970-01-01-00:00:00')).toEqual({ version: '1.1.2', built: null })
    expect(readFirmware('v1.2.0 2026-03-01-12:00:00')).toEqual({ version: '1.2.0', built: new Date(2026, 2, 1) })
    expect(readFirmware('demo')).toEqual({ version: 'demo', built: null })
    expect(readFirmware('')).toBeNull()
  })
})
