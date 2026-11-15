import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // vendor/pipette/tauri-shim/keychron-protocol.ts reads debug flags from process.env.
  define: { 'process.env': {} },
  server: { port: 5199, strictPort: true },
  build: { target: 'esnext' },
  test: {
    // Node by default; component tests opt into jsdom with a `// @vitest-environment jsdom` line.
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
})
