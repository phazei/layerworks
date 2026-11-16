// SPDX-License-Identifier: GPL-3.0-or-later
// Searching the help: every word of the query must appear in a topic's title, QMK name, text, example or a glossary
// entry that points to it. Titles and QMK names count most, so "combo" or "LT" finds the friendly topic first. Each
// hit comes with a piece of the text where the words are, for the results to show.

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

/** The words of a query, lower case, without surrounding quotes or punctuation. */
export function queryWords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/^[“”"'‘’.,;:!?]+|[“”"'‘’.,;:!?]+$/g, ''))
    .filter((word) => word.length > 0)
}

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Where a word matches in a text. Words of one or two letters only match whole ("MO" is not in "more"); longer
 * ones match anywhere ("combo" in "Combos").
 */
function wordPattern(word: string): RegExp {
  const body = escape(word)
  return word.length <= 2 ? new RegExp(`(?<![\\p{L}\\p{N}_])${body}(?![\\p{L}\\p{N}_])`, 'giu') : new RegExp(body, 'giu')
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

const has = (text: string | undefined, word: string) => text !== undefined && wordPattern(word).test(text)

const glossaryLine = (entry: GlossaryEntry) =>
  `${entry.term}${entry.aka ? ` (${entry.aka})` : ''}${entry.friendly ? `, here “${entry.friendly}”` : ''}: ${entry.meaning}`

const GLOSSARY_BY_TOPIC = new Map<HelpTopicId, string[]>()
for (const entry of GLOSSARY) GLOSSARY_BY_TOPIC.set(entry.topic, [...(GLOSSARY_BY_TOPIC.get(entry.topic) ?? []), glossaryLine(entry)])

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
  const at = text.toLowerCase().indexOf(phrase)
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
    if (words.length > 1 && fields.some(([text, weight]) => weight >= 6 && text?.toLowerCase().includes(phrase))) score += 10
    else if (words.length > 1 && fields.some(([text]) => text?.toLowerCase().includes(phrase))) score += 3
    // Earlier in reading order wins a tie: the more basic topic.
    score -= order / 1000

    // The snippet: the first passage with the whole phrase, else the one with the most words, else the start.
    const passages = [...body, ...(example ? [example] : []), ...glossary.map((line) => `Glossary: ${line}`)]
    const counted = passages.map((text) => ({ text, words: words.filter((word) => has(text, word)).length }))
    const pick =
      counted.find(({ text }) => text.toLowerCase().includes(phrase)) ??
      counted.reduce<(typeof counted)[number] | null>((best, next) => (next.words > (best?.words ?? 0) ? next : best), null)
    const snippet = pick ? clip(pick.text, snippetAnchor(pick.text, words, phrase)) : clip(body[0] ?? '', 0)
    hits.push({ id, score, snippet })
  })

  return hits.sort((a, b) => b.score - a.score)
}

/** Suggestions for a search that found nothing. */
export const SEARCH_SUGGESTIONS = ['layer', 'hold', 'colour', 'backup', 'MO', 'tap dance', 'combo']
