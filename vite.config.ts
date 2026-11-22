// SPDX-License-Identifier: GPL-3.0-or-later
import { execFileSync } from 'node:child_process'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { layerworksNotices } from './scripts/layerworks-notices'

/** A made-up commit for tests, so what they show doesn't depend on the checkout. */
const TEST_COMMIT = '0123456789abcdef0123456789abcdef01234567'

/** The commit being built: GITHUB_SHA in the publishing workflow, else the checkout's HEAD, else "unknown". */
function buildCommit(): string {
  const fromCi = process.env.GITHUB_SHA
  if (fromCi && /^[0-9a-f]{40}$/.test(fromCi)) return fromCi
  try {
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    if (/^[0-9a-f]{40}$/.test(head)) return head
  } catch {
    // No git, or not a checkout.
  }
  return 'unknown'
}

export default defineConfig(({ mode }) => {
  const commit = mode === 'test' ? TEST_COMMIT : buildCommit()
  return {
    // Relative addresses, so one build works wherever it is served from: https://layerworks.tybyfy.com/, a
    // fork under another name, a local preview at /. The app's routes are after the # and never touch the path.
    base: './',
    plugins: [react(), tailwindcss(), layerworksNotices(commit)],
    define: {
      // vendor/pipette/tauri-shim/keychron-protocol.ts reads debug flags from process.env.
      'process.env': {},
      // src/build-info.ts
      __LAYERWORKS_COMMIT__: JSON.stringify(commit),
    },
    server: { port: 5199, strictPort: true },
    build: { target: 'esnext' },
    test: {
      // Node by default; component tests opt into jsdom with a `// @vitest-environment jsdom` line.
      include: ['src/**/__tests__/**/*.test.{ts,tsx}', 'scripts/**/__tests__/**/*.test.ts'],
      setupFiles: ['src/test-setup.ts'],
      clearMocks: true,
      restoreMocks: true,
    },
  }
})
