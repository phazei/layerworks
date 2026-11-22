// SPDX-License-Identifier: GPL-3.0-or-later
// Searching the help: every word of the query must appear in a topic's title, QMK name, text, example or a glossary
// entry that points to it. Titles and QMK names count most, so "combo" or "LT" finds the friendly topic first, and a
// query that is one of a topic's names puts that topic first. Each hit comes with a piece of the text where the words
// are, for the results to show.

import { GLOSSARY, type GlossaryEntry } from './glossary'
import { READING_ORDER } from './guide'
import { fillLayers } from './text'
import { HELP_TOPICS, type HelpTopicId } from './topics'

export interface SearchHit {
  id: HelpTopicId
  score: number
  /** A piece of the topic's text, showing the words where possible. */
  snippet: string
}

// The variants a query may use, all handled here rather than by extra words in the topics:
// - US spellings: "color", "gray" find "colour", "grey";
// - hyphen, space or joined: "mod-tap", "mod tap" and "modtap" all find "Mod-tap" (a hyphen splits a query word;
//   texts are compared with hyphens as spaces, and a word of five letters or more also matches two or three
//   neighbouring words of the text written together);
// - codes with a number: "TD(1)" finds "TD(0)", whatever the number;
// - short words: up to three letters only match whole words, plurals included ("mac" finds "Mac", not "macro").

const US_SPELLINGS: Record<string, string> = {
  color: 'colour',
  colors: 'colours',
  colored: 'coloured',
  coloring: 'colouring',
  gray: 'grey',
  grays: 'greys',
}

/** The words of a query, lower case, without surrounding quotes or punctuation, hyphens splitting words. */
export function queryWords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s\-–]+/)
    .map((word) => word.replace(/^[“”"'‘’.,;:!?]+|[“”"'‘’.,;:!?]+$/g, ''))
    .filter((word) => word.length > 0)
    .map((word) => US_SPELLINGS[word] ?? word)
}

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const NOT_WORD = '[\\p{L}\\p{N}_]'

/** A text lower case with hyphens as spaces, for comparing phrases. */
const flat = (text: string) => text.toLowerCase().replace(/[-–]/g, ' ')
/** A text lower case without spaces and hyphens, for joined forms ("autoshift"). */
const squash = (text: string) => text.toLowerCase().replace(/[\s\-–]+/g, '')

/** Where a word matches in a text (see above). */
function wordPattern(word: string): RegExp {
  const code = /^([a-z_]+)\(\d+\)$/.exec(word)
  if (code) return new RegExp(`(?<!${NOT_WORD})${escape(code[1])}\\(\\d+\\)`, 'giu')
  const body = escape(word)
  return word.length <= 3 ? new RegExp(`(?<!${NOT_WORD})${body}(?:e?s)?(?!${NOT_WORD})`, 'giu') : new RegExp(body, 'giu')
}

/** The places the words match in a text, merged and in order, for highlighting. */
export function matchRanges(text: string, words: readonly string[]): [number, number][] {
  const ranges: [number, number][] = []
  for (const word of words) {
    for (const match of text.matchAll(wordPattern(word))) ranges.push([match.index, match.index + match[0].length])
  }
  ranges.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const range of ranges) {
    const last = merged.at(-1)
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1])
    else merged.push([...range])
  }
  return merged
}

/** Whether a word is two or three neighbouring words of a text written together ("autoshift" for "Auto Shift"). */
function joined(text: string, word: string): boolean {
  if (word.length < 5) return false
  const tokens = text.toLowerCase().split(/[^\p{L}\p{N}_]+/u)
  for (let i = 0; i < tokens.length - 1; i++) {
    const two = tokens[i] + tokens[i + 1]
    if (two === word || `${two}s` === word || two + (tokens[i + 2] ?? '') === word) return true
  }
  return false
}

const has = (text: string | undefined, word: string) => text !== undefined && (wordPattern(word).test(text) || joined(text, word))

const glossaryLine = (entry: GlossaryEntry) =>
  `${entry.term}${entry.aka ? ` (${entry.aka})` : ''}${entry.friendly ? `, here “${entry.friendly}”` : ''}: ${entry.meaning}`

const GLOSSARY_BY_TOPIC = new Map<HelpTopicId, string[]>()
for (const entry of GLOSSARY) GLOSSARY_BY_TOPIC.set(entry.topic, [...(GLOSSARY_BY_TOPIC.get(entry.topic) ?? []), glossaryLine(entry)])

/** The names a topic goes by, squashed: its title (without "The"), each part of its QMK name, its glossary terms. */
const NAMES_BY_TOPIC = new Map<HelpTopicId, Set<string>>()
for (const id of READING_ORDER) {
  const topic = HELP_TOPICS[id]
  const names = [topic.title.replace(/^the\s+/i, ''), ...(topic.qmkName?.split(/[,;]/) ?? [])]
  NAMES_BY_TOPIC.set(id, new Set(names.map(squash).filter(Boolean)))
}
for (const entry of GLOSSARY) NAMES_BY_TOPIC.get(entry.topic)?.add(squash(entry.term))

const SNIPPET = 150

/** About SNIPPET characters of a text around its first match, cut at word boundaries. */
function clip(text: string, at: number): string {
  if (text.length <= SNIPPET) return text
  let start = Math.max(0, at - 40)
  if (start > 0) start = text.indexOf(' ', start) + 1 || start
  let end = Math.min(text.length, start + SNIPPET)
  if (end < text.length) end = text.lastIndexOf(' ', end) > start ? text.lastIndexOf(' ', end) : end
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`
}

/** Where a snippet should centre: on the whole phrase, else on the longest word (the most telling one). */
function snippetAnchor(text: string, words: readonly string[], phrase: string): number {
  const at = flat(text).indexOf(phrase)
  if (at >= 0) return at
  const longest = [...words].sort((a, b) => b.length - a.length).find((word) => has(text, word))
  return longest ? (matchRanges(text, [longest])[0]?.[0] ?? 0) : 0
}

/** The topics matching a query, best first; empty for an empty query. `names` fills in layer names. */
export function searchHelp(query: string, names: readonly string[] = []): SearchHit[] {
  const words = queryWords(query)
  if (words.length === 0) return []
  const phrase = words.join(' ')
  const hits: SearchHit[] = []

  READING_ORDER.forEach((id, order) => {
    const topic = HELP_TOPICS[id]
    const body = topic.body.map((paragraph) => fillLayers(paragraph, names))
    const example = topic.example ? fillLayers(topic.example, names) : undefined
    const glossary = GLOSSARY_BY_TOPIC.get(id) ?? []
    const fields: [string | undefined, number][] = [
      [topic.title, 8],
      [topic.qmkName, 6],
      ...glossary.map((line): [string, number] => [line, 4]),
      ...body.map((paragraph): [string, number] => [paragraph, 1]),
      [example, 1],
    ]

    let score = 0
    for (const word of words) {
      const best = Math.max(0, ...fields.filter(([text]) => has(text, word)).map(([, weight]) => weight))
      if (best === 0) return
      // A topic about the word says it more often: a little extra for each further mention in the text.
      const mentions = [...body, example ?? ''].reduce((n, text) => n + (text.match(wordPattern(word)) ?? []).length, 0)
      score += best + Math.min(Math.max(mentions - 1, 0), 3) * 0.5
    }
    if (words.length > 1 && fields.some(([text, weight]) => weight >= 6 && text !== undefined && flat(text).includes(phrase))) score += 10
    else if (words.length > 1 && fields.some(([text]) => text !== undefined && flat(text).includes(phrase))) score += 3
    // The query is one of the topic's names ("knob", "QMK settings", "modtap"): that topic first.
    if (NAMES_BY_TOPIC.get(id)?.has(squash(phrase))) score += 8
    // Earlier in reading order wins a tie: the more basic topic.
    score -= order / 1000

    // The snippet: the first passage with the whole phrase, else the one with the most words, else the start.
    const passages = [...body, ...(example ? [example] : []), ...glossary.map((line) => `Glossary: ${line}`)]
    const counted = passages.map((text) => ({ text, words: words.filter((word) => has(text, word)).length }))
    const pick =
      counted.find(({ text }) => flat(text).includes(phrase)) ??
      counted.reduce<(typeof counted)[number] | null>((best, next) => (next.words > (best?.words ?? 0) ? next : best), null)
    const snippet = pick ? clip(pick.text, snippetAnchor(pick.text, words, phrase)) : clip(body[0] ?? '', 0)
    hits.push({ id, score, snippet })
  })

  return hits.sort((a, b) => b.score - a.score)
}

/** Suggestions for a search that found nothing. */
export const SEARCH_SUGGESTIONS = ['layer', 'hold', 'colour', 'backup', 'MO', 'tap dance', 'combo']
