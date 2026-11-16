// SPDX-License-Identifier: GPL-3.0-or-later
// The Help page's own addresses: #/help (the overview), #/help/<topic>, #/help/glossary; ?q=… after any of them
// starts with that search (for links and screenshots).

import { isHelpTopic, type HelpTopicId } from '../../help/topics'

export type HelpView = { kind: 'overview' } | { kind: 'topic'; id: HelpTopicId } | { kind: 'glossary' } | { kind: 'missing'; slug: string }

export function readHelpPath(path: string): { view: HelpView; query: string } {
  const [route, search = ''] = path.split('?')
  const slug = route.replace(/^\/+/, '').split('/')[1] ?? ''
  const query = new URLSearchParams(search).get('q') ?? ''
  if (slug === '') return { view: { kind: 'overview' }, query }
  if (slug === 'glossary') return { view: { kind: 'glossary' }, query }
  const id = decodeURIComponent(slug)
  return { view: isHelpTopic(id) ? { kind: 'topic', id } : { kind: 'missing', slug: id }, query }
}

/** A key that changes whenever the view does, for scrolling back to the top. */
export const viewKey = (view: HelpView): string => (view.kind === 'topic' ? `topic:${view.id}` : view.kind === 'missing' ? `missing:${view.slug}` : view.kind)
