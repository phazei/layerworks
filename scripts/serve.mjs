// SPDX-License-Identifier: GPL-3.0-or-later
// Serves a build the way GitHub Pages will, from a folder under a sub-path, with no fallback page: a file that
// isn't there is a 404 and is printed as "missing <address>", so a wrong asset address shows up.
//
//   node scripts/serve.mjs --sub-path=/layerworks/      http://localhost:5198/layerworks/ serves dist/
//   options: --dir=dist  --port=5198  --sub-path=/
// Used by scripts/screenshot.mjs (--sub-path there).

import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'

const args = process.argv.slice(2)
const option = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback
const dir = resolve(option('dir', 'dist'))
const port = Number(option('port', 5198))
const subPath = `/${option('sub-path', '/').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/')

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
}

function fileFor(urlPath) {
  if (!urlPath.startsWith(subPath)) return null
  const relative = decodeURIComponent(urlPath.slice(subPath.length)) || 'index.html'
  const file = normalize(join(dir, relative))
  if (file !== dir && !file.startsWith(dir + sep)) return null
  try {
    return statSync(file).isFile() ? file : null
  } catch {
    return null
  }
}

createServer((req, res) => {
  const urlPath = (req.url ?? '/').split('?')[0]
  const file = fileFor(urlPath)
  if (!file) {
    console.log(`missing ${urlPath}`)
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found')
    return
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' })
  createReadStream(file).pipe(res)
}).listen(port, () => console.log(`serving ${dir} at http://localhost:${port}${subPath}`))
