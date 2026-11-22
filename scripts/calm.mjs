// SPDX-License-Identifier: GPL-3.0-or-later
// Runs a command on a few cores at low priority, so checks, builds and screenshots never take the whole computer:
//   node scripts/calm.mjs <command> [arguments…]
// On Windows this process is held to the last few cores and to below-normal priority before it starts the command;
// child processes inherit both, so the command and everything it starts (test workers, the build's threads, headless
// Edge) can't use more. The number of cores is a quarter of the computer's, four at most; LAYERWORKS_CORES
// overrides it. Elsewhere, and in the publishing workflow (CI), the command runs as it is.

import { spawn, spawnSync } from 'node:child_process'
import { availableParallelism, constants, setPriority } from 'node:os'

/** How many cores a calm command may use. vite.config.ts gives the tests the same number of workers. */
export function calmCores(total = availableParallelism(), wanted = Number(process.env.LAYERWORKS_CORES)) {
  const quarter = Math.max(1, Math.min(4, Math.floor(total / 4)))
  return Number.isInteger(wanted) && wanted >= 1 ? Math.min(wanted, total) : quarter
}

/** The affinity mask, in hex, for the last `count` of `total` cores (Windows numbers them from bit 0). */
export function affinityMask(count, total = availableParallelism()) {
  return (((1n << BigInt(count)) - 1n) << BigInt(total - count)).toString(16)
}

const quote = (arg) => (/[\s"&|<>^]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg)

function run(args) {
  const cores = calmCores()
  if (process.platform === 'win32' && !process.env.CI) {
    // This process takes the limits first; the command then inherits them, and its exit code comes back as usual.
    // Node can lower its own priority but not set its affinity, so Windows PowerShell does that for it.
    setPriority(constants.priority.PRIORITY_BELOW_NORMAL)
    const set = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', `(Get-Process -Id ${process.pid}).ProcessorAffinity = 0x${affinityMask(cores)}`],
      { stdio: ['ignore', 'ignore', 'inherit'] },
    )
    if (set.status !== 0) {
      console.error('calm.mjs: could not limit the cores, so nothing was started.')
      process.exit(1)
    }
  }
  // Once held, the operating system reports only those cores, so the number is passed on for vite.config.ts.
  const env = { ...process.env, LAYERWORKS_CALM: String(cores) }
  return spawn(args.map(quote).join(' '), { stdio: 'inherit', shell: true, env })
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('usage: node scripts/calm.mjs <command> [arguments…]')
    process.exit(2)
  }
  run(args).on('exit', (code) => process.exit(code ?? 1))
}
