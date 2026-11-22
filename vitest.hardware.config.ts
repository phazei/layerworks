// SPDX-License-Identifier: GPL-3.0-or-later
import { defineConfig } from 'vitest/config'

// Checks that need the real keyboard plugged in. Not part of `pnpm test`.
export default defineConfig({
  test: {
    include: ['hardware/**/*.check.ts'],
    testTimeout: 120_000,
  },
})
