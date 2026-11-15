// SPDX-License-Identifier: GPL-3.0-or-later
// Screenshots of the app on the demo keyboard, in the dark and the light theme, with headless Edge.
//
//   node scripts/screenshot.mjs /keys /lighting      (or: pnpm shots /keys /lighting)
//
// Builds, serves the build on port 5198, saves <page>-<theme>.png per path into %TEMP%\opencode\layerworks-shots,
// and stops the server. Options (each adds to the file name when it changes what is shown):
//   --no-build        use the existing build
//   --port=5197       another port, with its own build folder (.vite/shots-<port>), so two runs can go side by side
//   --offline         without the demo keyboard (the not-connected state); files get an "-offline" suffix
//   --theme=dark      one theme only (dark or light)
//   --size=1000x700   window size (default 1280x800)
//   --query=help=layers  more URL options (see src/main.tsx), e.g. the help panel open at a topic
//   --wait=4000       virtual milliseconds the page gets before the picture is taken
// EDGE=<path> overrides where msedge.exe is looked for.

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_PORT = 5198

const args = process.argv.slice(2)
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
const PORT = Number(option('port') ?? DEFAULT_PORT)
// Another port gets its own build folder, so two runs can go side by side.
const buildDir = PORT === DEFAULT_PORT ? 'dist' : join('.vite', `shots-${PORT}`)
const flag = (name) => args.includes(`--${name}`)
const paths = args.filter((a) => !a.startsWith('--'))
if (paths.length === 0) paths.push('/home')
const themes = option('theme') ? [option('theme')] : ['dark', 'light']
const [width, height] = (option('size') ?? '1280x800').split('x').map(Number)
const wait = Number(option('wait') ?? 4000)
const offline = flag('offline')

const outDir = join(process.env.TEMP ?? tmpdir(), 'opencode', 'layerworks-shots')
mkdirSync(outDir, { recursive: true })

function findEdge() {
  const candidates = [
    process.env.EDGE,
    process.env['ProgramFiles(x86)'] && join(process.env['ProgramFiles(x86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env.ProgramFiles && join(process.env.ProgramFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ]
  const found = candidates.find((path) => path && existsSync(path))
  if (!found) throw new Error('msedge.exe not found; set EDGE to its path')
  return found
}

function run(command) {
  const result = spawnSync(command, { cwd: root, stdio: 'inherit', shell: true })
  if (result.status !== 0) throw new Error(`${command} failed`)
}

async function waitForServer(server) {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error('the preview server stopped')
    try {
      if ((await fetch(`http://localhost:${PORT}/`)).ok) return
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`the preview server didn't answer on port ${PORT}`)
}

// A fresh browser profile for every picture, in a temporary folder removed at the end, so nothing one page or an
// earlier run remembered (theme, "More options" open) can show in another shot.
const profiles = mkdtempSync(join(tmpdir(), 'layerworks-shots-'))
// A profile left beside the pictures by an earlier version of this script is removed.
rmSync(join(outDir, `.edge-profile-${PORT}`), { recursive: true, force: true })
let shots = 0

function shoot(edge, url, file) {
  const profile = join(profiles, String(shots++))
  const result = spawnSync(
    edge,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      `--user-data-dir=${profile}`,
      `--window-size=${width},${height}`,
      `--virtual-time-budget=${wait}`,
      `--screenshot=${file}`,
      url,
    ],
    { stdio: 'ignore', timeout: 60_000 },
  )
  if (!existsSync(file)) throw new Error(`no screenshot for ${url} (exit ${result.status})`)
}

const edge = findEdge()
if (!flag('no-build')) run(`pnpm vite build --outDir "${buildDir}" --emptyOutDir`)

// Vite's own entry point, run by node directly, so stopping it stops the server (no shell in between).
const server = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--outDir', buildDir, '--port', String(PORT), '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
})
try {
  await waitForServer(server)
  for (const path of paths) {
    const slug = path.replace(/^[#/]+/, '').replace(/[^\w-]+/g, '-') || 'home'
    for (const theme of themes) {
      const extra = option('query')
      const query = `?${offline ? '' : 'demo&'}theme=${theme}${extra ? `&${extra}` : ''}`
      const size = option('size') ? `-${width}x${height}` : ''
      const tag = extra ? `-${extra.replace(/[^\w-]+/g, '-')}` : ''
      const file = join(outDir, `${slug}${offline ? '-offline' : ''}${size}${tag}-${theme}.png`)
      shoot(edge, `http://localhost:${PORT}/${query}#/${path.replace(/^[#/]+/, '')}`, file)
      console.log(file)
    }
  }
} finally {
  server.kill()
  // Edge can hold its files for a moment after it exits.
  rmSync(profiles, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
}
