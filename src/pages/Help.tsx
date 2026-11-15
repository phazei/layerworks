// SPDX-License-Identifier: GPL-3.0-or-later
// Help: every explanation the "?" buttons open, in one list. Searchable how-tos and a glossary come later.

import { ChevronRight, CircleQuestionMark } from 'lucide-react'
import { openHelp } from '../help/help-store'
import { HELP_TOPICS, type HelpTopicId } from '../help/topics'
import type { PageDef } from '../plugins/api'
import { Card } from '../ui/layout'

const TOPIC_IDS = Object.keys(HELP_TOPICS) as HelpTopicId[]

function HelpPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Card title="Explanations" description="The same texts the “?” buttons show. Click one to open it beside the page.">
        <ul className="-mx-2 flex flex-col">
          {TOPIC_IDS.map((id) => {
            const topic = HELP_TOPICS[id]
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => openHelp(id)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-control px-2 py-2 text-left hover:bg-raised"
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{topic.title}</span>
                    {topic.qmkName && <span className="ml-2 text-[13px] text-muted">{topic.qmkName}</span>}
                  </span>
                  <ChevronRight size={16} aria-hidden className="shrink-0 text-muted" />
                </button>
              </li>
            )
          })}
        </ul>
      </Card>
      <p className="px-1 text-[13px] text-muted">How-to guides and a search across everything will be added here.</p>
    </div>
  )
}

export const helpPage: PageDef = {
  path: 'help',
  title: 'Help',
  icon: CircleQuestionMark,
  group: 'app',
  offline: true,
  component: HelpPage,
}
