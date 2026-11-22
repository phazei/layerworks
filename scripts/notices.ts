// SPDX-License-Identifier: GPL-3.0-or-later
// The licences file the build puts beside the page. The build strips the copyright comments of the libraries it
// bundles, and their licences (MIT, ISC) ask for their notices to travel with every copy, so this plugin writes
// them out from what really ended up in the bundle: the npm package of every bundled module, its name, version and
// licence file. Parts that come with no package (the vendored Pipette code and what it was ported from) are
// written by vite.config.ts as `sections`. A bundled package with no licence text found stops the build.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

export interface PackageNotice {
  name: string
  version: string
  /** The licence named in package.json (`license`). */
  licence: string
  homepage?: string
  /** The licence file's text, or what `noLicenceFile` gave for a package that has none. */
  text: string
}

/** A part of the notices written by hand: a title and the text under it. */
export interface Section {
  title: string
  body: string
}

export interface NoticesOptions {
  /** File name in the build's output folder. */
  fileName: string
  /** What the file says first: the app's own name, copyright and licence. */
  head: string
  /** Hand-written parts, after the head; `when` decides from the bundled module ids whether a part applies. */
  sections: (Section & { when?: (ids: readonly string[]) => boolean })[]
  /** Packages whose code reaches the output without being a module of the bundle (Tailwind's base CSS). */
  alsoPackages?: { name: string; when: (ids: readonly string[]) => boolean }[]
  /** Text for a bundled package that ships no licence file, by package name; given the package's folder. */
  noLicenceFile?: Record<string, (dir: string) => string>
  /** Other files to put beside it: output name → text. */
  copies?: Record<string, string>
}

const NODE_MODULES = '/node_modules/'

/**
 * The folder of the npm package a module id belongs to, or null for the app's own files. Handles scoped packages,
 * pnpm's nested node_modules (the last one counts), queries, and Rollup's `\0` prefix for generated modules.
 */
export function packageDirOf(id: string): string | null {
  const path = id.replace(/^\0/, '').replace(/\?.*$/, '').replaceAll('\\', '/')
  const at = path.lastIndexOf(NODE_MODULES)
  if (at < 0) return null
  const rest = path.slice(at + NODE_MODULES.length).split('/')
  const length = rest[0].startsWith('@') ? 2 : 1
  if (rest.length <= length) return null
  return path.slice(0, at + NODE_MODULES.length) + rest.slice(0, length).join('/')
}

/**
 * Code Vite writes into the bundle itself: its preload helper and polyfill, the CommonJS helpers it bundles, and the
 * empty stand-in for a Node module a package asks for in the browser (xz-decompress asks for `stream/web`).
 */
export function isViteHelper(id: string): boolean {
  return id.startsWith('\0vite/') || id === '\0commonjsHelpers.js' || id.startsWith('\0__vite-browser-external')
}

/** The licence file among a package's files: LICENSE, LICENCE or COPYING, with or without an extension. */
export function findLicenceFile(files: readonly string[]): string | undefined {
  const ranked = [/^licen[cs]e(\.(md|txt|markdown))?$/i, /^licen[cs]e[-._]/i, /^copying(\.|$)/i]
  for (const pattern of ranked) {
    const found = files.filter((file) => pattern.test(file)).sort()[0]
    if (found) return found
  }
  return undefined
}

/**
 * A licence file without the list some tools append of the licences of their own build-time dependencies (Vite's
 * LICENSE.md: those are in Vite's Node code, not in what it writes into the page).
 */
export function trimBundledSection(text: string): string {
  const cut = text.search(/^#+ Licenses of bundled dependencies/m)
  return (cut < 0 ? text : text.slice(0, cut)).trim()
}

/** One entry per name and version (a package reached through two paths), sorted by name. */
export function uniqueNotices(notices: readonly PackageNotice[]): PackageNotice[] {
  const seen = new Map<string, PackageNotice>()
  for (const notice of notices) {
    const key = `${notice.name}@${notice.version}`
    if (!seen.has(key)) seen.set(key, notice)
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))
}

const RULE = '='.repeat(78)
const THIN = '-'.repeat(78)

/** The whole file: the head, the hand-written sections, then each package with its licence text. */
export function renderNotices(head: string, sections: readonly Section[], packages: readonly PackageNotice[]): string {
  const parts = [head.trim()]
  for (const section of sections) parts.push(`${RULE}\n${section.title}\n${RULE}\n\n${section.body.trim()}`)
  if (packages.length > 0) {
    parts.push(
      `${RULE}\nLibraries bundled into the page\n${RULE}\n\n` +
        packages.map((p) => `- ${p.name} ${p.version} (${p.licence})`).join('\n'),
    )
    for (const p of packages) {
      const link = p.homepage ? `\n${p.homepage}` : ''
      parts.push(`${THIN}\n${p.name} ${p.version}, ${p.licence}${link}\n${THIN}\n\n${p.text.trim()}`)
    }
  }
  return parts.join('\n\n\n') + '\n'
}

interface PackageJson {
  name?: string
  version?: string
  license?: string | { type?: string }
  homepage?: string
  repository?: string | { url?: string }
}

function homepageOf(pkg: PackageJson): string | undefined {
  if (pkg.homepage) return pkg.homepage
  const repo = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url
  return repo?.replace(/^git\+/, '').replace(/\.git$/, '')
}

/** Reads one package's notice from its folder; the text is undefined when there is no licence file. */
export function readPackage(dir: string): Omit<PackageNotice, 'text'> & { text?: string } {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as PackageJson
  const file = findLicenceFile(readdirSync(dir))
  const licence = typeof pkg.license === 'string' ? pkg.license : (pkg.license?.type ?? 'licence not named')
  return {
    name: pkg.name ?? dir.slice(dir.lastIndexOf('/') + 1),
    version: pkg.version ?? '?',
    licence,
    homepage: homepageOf(pkg),
    text: file ? trimBundledSection(readFileSync(join(dir, file), 'utf8')) : undefined,
  }
}

/** The folder of an installed package, found from this project's root. */
function installedDir(name: string, root: string): string {
  const dir = join(root, 'node_modules', name)
  if (!existsSync(join(dir, 'package.json'))) throw new Error(`package ${name} is not installed`)
  return dir.replaceAll('\\', '/')
}

export function licenceNotices(options: NoticesOptions): Plugin {
  let root = process.cwd()
  return {
    name: 'layerworks-licence-notices',
    configResolved(config) {
      root = config.root
    },
    // The dev server has no bundle to read: it serves the head with a note, and the copies as they are.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = decodeURIComponent((req.url ?? '').split('?')[0]).replace(/^\/+/, '')
        const body =
          name === options.fileName
            ? `${options.head.trim()}\n\n\n(The development server can't list the bundled parts; \`pnpm build\` writes them.)\n`
            : options.copies?.[name]
        if (body === undefined) return next()
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(body)
      })
    },
    // Runs for builds only.
    generateBundle(_output, bundle) {
      const ids = new Set<string>()
      for (const file of Object.values(bundle)) {
        if (file.type === 'chunk') for (const id of Object.keys(file.modules)) ids.add(id)
      }
      const all = [...ids]

      const dirs = new Set<string>()
      const unknown: string[] = []
      for (const id of all) {
        const dir = packageDirOf(id)
        if (dir) dirs.add(dir)
        else if (isViteHelper(id)) dirs.add(installedDir('vite', root))
        else if (id.startsWith('\0')) unknown.push(id)
      }
      for (const also of options.alsoPackages ?? []) if (also.when(all)) dirs.add(installedDir(also.name, root))
      if (unknown.length > 0) {
        this.warn(`licence notices: generated modules of unknown origin in the bundle: ${unknown.join(', ')}`)
      }

      const missing: string[] = []
      const packages: PackageNotice[] = []
      for (const dir of dirs) {
        const read = readPackage(dir)
        const text = read.text ?? options.noLicenceFile?.[read.name]?.(dir)
        if (!text) missing.push(`${read.name} ${read.version} (${dir})`)
        else packages.push({ ...read, text })
      }
      if (missing.length > 0) {
        this.error(
          `licence notices: no licence text found for ${missing.join(', ')}. ` +
            'Add the text to noLicenceFile in vite.config.ts.',
        )
      }

      const sections = options.sections.filter((section) => !section.when || section.when(all))
      // With a byte order mark, so a server that doesn't name the character set still shows "©" right.
      const source = '\uFEFF' + renderNotices(options.head, sections, uniqueNotices(packages))
      this.emitFile({ type: 'asset', fileName: options.fileName, source })
      for (const [fileName, source] of Object.entries(options.copies ?? {})) this.emitFile({ type: 'asset', fileName, source })
    },
  }
}
