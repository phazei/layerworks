// SPDX-License-Identifier: GPL-3.0-or-later
// The documents' headings, their contents lists and the map in docs/README.md, and checks that references to
// documents point at headings that exist. Used by scripts/docs-index.mjs (writes) and its test (compares).

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'

export const START = '<!-- contents:start -->'
export const END = '<!-- contents:end -->'
const rel = (root, file) => relative(root, file).split(sep).join('/')
const MAP_START = /^<!-- contents:start ([\w.-]+\.md) -->$/

/** A ### has its #### listed in its document's contents when it has at least this many. */
export const LIST_H4_FROM = 3

/** The anchor GitHub gives a heading: lowercase, punctuation dropped, each space a hyphen. */
export function slug(title) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-')
}

/** Headings outside code blocks, with GitHub's anchors (a repeated one gets -1, -2 …). */
export function headings(markdown) {
  const found = []
  const used = new Map()
  let fence = false
  for (const line of markdown.split('\n')) {
    if (/^\s*```/.test(line)) fence = !fence
    if (fence) continue
    const m = /^(#{1,6}) +(.+?) *#*$/.exec(line)
    if (!m) continue
    const base = slug(m[2])
    const n = used.get(base) ?? 0
    used.set(base, n + 1)
    found.push({ level: m[1].length, title: m[2], anchor: n ? `${base}-${n}` : base })
  }
  return found
}

/** The headings a list shows: ## and ###, and #### under a ### that has LIST_H4_FROM or more of them. */
function listed(markdown, withH4) {
  const all = headings(markdown).filter((h) => h.level >= 2 && h.level <= 4)
  return all.filter((h, i) => {
    if (h.level < 4) return true
    if (!withH4) return false
    let parent = i
    while (parent >= 0 && all[parent].level !== 3) parent--
    if (parent < 0) return true
    let count = 0
    for (let k = parent + 1; k < all.length && all[k].level > 3; k++) if (all[k].level === 4) count++
    return count >= LIST_H4_FROM
  })
}

const linkList = (items, prefix) =>
  items.map((h) => `${'  '.repeat(h.level - 2)}- [${h.title.replace(/[[\]]/g, '\\$&')}](${prefix}#${h.anchor})`)

/** A document with its contents list (between the markers, right before its first ## heading). */
export function withContents(markdown) {
  const block = [START, '**Contents**', '', ...linkList(listed(markdown, true), ''), END]
  const lines = markdown.split('\n')
  const start = lines.indexOf(START)
  if (start >= 0) {
    const end = lines.indexOf(END, start)
    if (end < 0) throw new Error(`${START} without ${END}`)
    lines.splice(start, end - start + 1, ...block)
    return lines.join('\n')
  }
  let fence = false
  const first = lines.findIndex((line) => {
    if (/^\s*```/.test(line)) fence = !fence
    return !fence && line.startsWith('## ')
  })
  if (first < 0) return markdown
  lines.splice(first, 0, ...block, '')
  return lines.join('\n')
}

/** docs/README.md with each `<!-- contents:start name.md -->` block listing that document's ## and ### headings. */
export function withMap(readme, read) {
  const lines = readme.split('\n')
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const m = MAP_START.exec(lines[i])
    if (!m) {
      out.push(lines[i])
      continue
    }
    const end = lines.indexOf(END, i)
    if (end < 0) throw new Error(`${lines[i]} without ${END}`)
    out.push(lines[i], ...linkList(listed(read(m[1]), false), m[1]), END)
    i = end
  }
  return out.join('\n')
}

/** The documents: docs/*.md, the index (docs/README.md) last. */
export function docFiles(root) {
  const dir = join(root, 'docs')
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .sort()
    .map((f) => join(dir, f))
}

/** Every file the indexes would rewrite, with what it should hold. */
export function expectedIndexes(root) {
  const result = new Map()
  for (const file of docFiles(root)) result.set(file, withContents(readFileSync(file, 'utf8')))
  const index = join(root, 'docs', 'README.md')
  result.set(index, withMap(readFileSync(index, 'utf8'), (name) => result.get(join(root, 'docs', name)) ?? ''))
  return result
}

/** Markdown and code with code blocks and inline code taken out, line breaks kept. */
function withoutCode(text) {
  return text.replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, ' ')).replace(/`[^`\n]*`/g, (c) => ' '.repeat(c.length))
}

const headingCache = new Map()
function headingsOf(file) {
  if (!headingCache.has(file)) headingCache.set(file, existsSync(file) ? headings(readFileSync(file, 'utf8')) : null)
  return headingCache.get(file)
}

/** Relative links in markdown files that point at a missing file or heading. */
export function brokenLinks(root, files) {
  headingCache.clear()
  const problems = []
  for (const file of files) {
    const text = withoutCode(readFileSync(file, 'utf8'))
    for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = m[1]
      if (/^[a-z]+:/i.test(target)) continue
      const [path, anchor] = target.split('#')
      const to = path ? resolve(dirname(file), path) : file
      const where = `${rel(root, file)}: (${target})`
      if (!existsSync(to)) problems.push(`${where}: no such file`)
      else if (anchor !== undefined && to.endsWith('.md') && !headingsOf(to).some((h) => h.anchor === anchor))
        problems.push(`${where}: no such heading`)
    }
  }
  return problems
}

/**
 * Quoted references to a document's sections that name a heading it doesn't have. Shapes checked:
 * the path docs/<name>.md, then a quoted title (backticks round the path optional; a line break and a comment's
 * // or * allowed before the title), and a link to <name>.md followed by a quoted title; each with more quoted
 * titles after commas.
 */
export function brokenQuotedRefs(root, files) {
  headingCache.clear()
  const problems = []
  const titles = /((?:\s*(?:\/\/|\*)?\s*)"[^"\n]+"(?:,\s*"[^"\n]+")*)/.source
  const shapes = [
    { re: new RegExp('`?(docs/[\\w-]+\\.md)`?' + titles, 'g'), base: () => root },
    { re: new RegExp('\\]\\(([\\w-]+\\.md)\\)' + titles, 'g'), base: (file) => dirname(file) },
  ]
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const { re, base } of shapes) {
      for (const m of text.matchAll(re)) {
        const doc = resolve(base(file), m[1])
        const known = headingsOf(doc)
        const where = `${rel(root, file)}: ${m[1]}`
        if (!known) {
          problems.push(`${where}: no such file`)
          continue
        }
        for (const t of m[2].matchAll(/"([^"\n]+)"/g))
          if (!known.some((h) => h.title === t[1])) problems.push(`${where} "${t[1]}": no such heading`)
      }
    }
  }
  return problems
}

/** Files under a folder, recursively, with one of the extensions, leaving out the folders named. */
export function filesUnder(dir, extensions, skip = []) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && extensions.some((x) => e.name.endsWith(x)))
    .map((e) => join(e.parentPath, e.name))
    .filter((f) => !skip.some((s) => f.startsWith(s)))
}
