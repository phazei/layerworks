// SPDX-License-Identifier: GPL-3.0-or-later

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  findLicenceFile,
  isViteHelper,
  licenceNotices,
  packageDirOf,
  readPackage,
  renderNotices,
  trimBundledSection,
  uniqueNotices,
  type NoticesOptions,
  type PackageNotice,
} from '../notices'

describe('packageDirOf', () => {
  it('finds the package folder of a module, through pnpm’s nested node_modules', () => {
    expect(packageDirOf('E:/p/node_modules/.pnpm/react@19.3.1/node_modules/react/cjs/react.production.js')).toBe(
      'E:/p/node_modules/.pnpm/react@19.3.1/node_modules/react',
    )
  })

  it('keeps the scope of a scoped package', () => {
    expect(packageDirOf('/p/node_modules/@scope/name/dist/index.js')).toBe('/p/node_modules/@scope/name')
  })

  it('reads Windows paths, queries and Rollup’s generated-module prefix', () => {
    expect(packageDirOf('\0E:\\p\\node_modules\\react\\index.js?commonjs-module')).toBe('E:/p/node_modules/react')
  })

  it('gives null for the app’s own files and for Vite’s helpers', () => {
    expect(packageDirOf('E:/p/src/main.tsx')).toBeNull()
    expect(packageDirOf('\0vite/preload-helper.js')).toBeNull()
    expect(isViteHelper('\0vite/preload-helper.js')).toBe(true)
    expect(isViteHelper('\0commonjsHelpers.js')).toBe(true)
    expect(isViteHelper('\0__vite-browser-external?commonjs-proxy')).toBe(true)
    expect(isViteHelper('\0something-else')).toBe(false)
  })
})

describe('findLicenceFile', () => {
  it('prefers LICENSE or LICENCE, with or without an extension, over COPYING', () => {
    expect(findLicenceFile(['README.md', 'COPYING', 'LICENSE.md', 'package.json'])).toBe('LICENSE.md')
    expect(findLicenceFile(['licence.txt'])).toBe('licence.txt')
    expect(findLicenceFile(['LICENSE-MIT', 'index.js'])).toBe('LICENSE-MIT')
    expect(findLicenceFile(['COPYING'])).toBe('COPYING')
  })

  it('finds nothing when there is no licence file', () => {
    expect(findLicenceFile(['README.md', 'package.json', 'dist'])).toBeUndefined()
  })
})

describe('trimBundledSection', () => {
  it('drops the list of build-time dependencies some tools append', () => {
    const text = '# Vite core license\nMIT…\n\n# Licenses of bundled dependencies\nlots more'
    expect(trimBundledSection(text)).toBe('# Vite core license\nMIT…')
    expect(trimBundledSection('MIT License\n\nCopyright x\n')).toBe('MIT License\n\nCopyright x')
  })
})

const notice = (name: string, version = '1.0.0'): PackageNotice => ({ name, version, licence: 'MIT', text: `${name} text` })

describe('uniqueNotices and renderNotices', () => {
  it('lists each name and version once, sorted', () => {
    const list = uniqueNotices([notice('react'), notice('lucide-react'), notice('react'), notice('react', '2.0.0')])
    expect(list.map((n) => `${n.name}@${n.version}`)).toEqual(['lucide-react@1.0.0', 'react@1.0.0', 'react@2.0.0'])
  })

  it('writes the head, the sections, the list and every licence text', () => {
    const text = renderNotices('Head', [{ title: 'Vendored', body: 'Vendored body' }], [notice('react')])
    expect(text.indexOf('Head')).toBe(0)
    expect(text).toContain('Vendored\n')
    expect(text).toContain('- react 1.0.0 (MIT)')
    expect(text).toContain('react text')
    expect(text.indexOf('Vendored body')).toBeLessThan(text.indexOf('react text'))
  })
})

describe('readPackage', () => {
  let dir = ''
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it('reads name, version, licence, home page and the licence text', () => {
    dir = mkdtempSync(join(tmpdir(), 'notices-'))
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'lib', version: '2.1.0', license: 'ISC', repository: { url: 'git+https://github.com/x/lib.git' } }))
    writeFileSync(join(dir, 'LICENSE'), 'ISC License\n\nCopyright (c) x\n')
    expect(readPackage(dir)).toEqual({ name: 'lib', version: '2.1.0', licence: 'ISC', homepage: 'https://github.com/x/lib', text: 'ISC License\n\nCopyright (c) x' })
  })

  it('leaves the text out when the package has no licence file', () => {
    dir = mkdtempSync(join(tmpdir(), 'notices-'))
    mkdirSync(join(dir, 'dist'))
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'bare', version: '0.1.0', license: 'MIT' }))
    expect(readPackage(dir).text).toBeUndefined()
  })
})

describe('the plugin', () => {
  let dir = ''
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  /** Runs the plugin's generateBundle on a bundle of one chunk holding these module ids. */
  function run(options: Partial<NoticesOptions>, ids: string[]) {
    const plugin = licenceNotices({ fileName: 'licences.txt', head: 'Head', sections: [], ...options })
    const emitted: Record<string, string> = {}
    const context = {
      error: (message: string) => {
        throw new Error(message)
      },
      warn: () => {},
      emitFile: (file: { fileName: string; source: string }) => {
        emitted[file.fileName] = file.source
      },
    }
    const bundle = { 'index.js': { type: 'chunk', modules: Object.fromEntries(ids.map((id) => [id, {}])) } }
    ;(plugin.generateBundle as (this: unknown, ...args: unknown[]) => void).call(context, {}, bundle)
    return emitted
  }

  function fakePackage(name: string, licence?: string): string {
    const pkg = join(dir, 'node_modules', name)
    mkdirSync(pkg, { recursive: true })
    writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name, version: '1.0.0', license: 'MIT' }))
    if (licence) writeFileSync(join(pkg, 'LICENSE'), licence)
    return join(pkg, 'index.js').replaceAll('\\', '/')
  }

  it('writes the licence of every package in the bundle, and the sections that apply', () => {
    dir = mkdtempSync(join(tmpdir(), 'notices-'))
    const ids = [fakePackage('lib', 'MIT License\n\nCopyright (c) lib people'), 'E:/p/src/main.tsx']
    const sections = [
      { title: 'Applies', body: 'yes', when: (all: readonly string[]) => all.includes('E:/p/src/main.tsx') },
      { title: 'Does not apply', body: 'no', when: () => false },
    ]
    const out = run({ sections, copies: { 'LICENSE.txt': 'GPL' } }, ids)
    expect(out['licences.txt']).toContain('Copyright (c) lib people')
    expect(out['licences.txt']).toContain('Applies')
    expect(out['licences.txt']).not.toContain('Does not apply')
    expect(out['LICENSE.txt']).toBe('GPL')
  })

  it('stops the build when a bundled package has no licence text', () => {
    dir = mkdtempSync(join(tmpdir(), 'notices-'))
    expect(() => run({}, [fakePackage('bare')])).toThrow(/no licence text found for bare 1\.0\.0/)
  })

  it('takes the text for a package without a licence file from noLicenceFile', () => {
    dir = mkdtempSync(join(tmpdir(), 'notices-'))
    const out = run({ noLicenceFile: { bare: () => 'Written by hand' } }, [fakePackage('bare')])
    expect(out['licences.txt']).toContain('Written by hand')
  })
})
