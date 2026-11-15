// SPDX-License-Identifier: GPL-3.0-or-later
// The frame around every page: sidebar on the left; on the right the page's title, the keyboard stage when the
// page asks for it, the page itself, and the status line; the help panel slides in over the right edge of the
// page (not over the status line, so undo stays in reach).

import { useEffect, useMemo } from 'react'
import { deviceStore, useDevice } from '../device'
import { activePages, type PageDef } from '../plugins/api'
import { Card, HelpButton } from '../ui/layout'
import { useAppliedTheme } from '../ui/theme'
import { Connecting, ConnectPrompt } from './ConnectPrompt'
import { HelpPanel } from './HelpPanel'
import { usePath } from './router'
import { Sidebar } from './Sidebar'
import { Stage } from './Stage'
import { stage } from './stage-store'
import { StatusLine } from './StatusLine'
import { UnlockDialog } from './UnlockDialog'

const HOME = 'home'

/** The page a path shows: "/keys" → keys, "/" → home. Anything after the first segment is the page's own. */
export function findPage(pages: PageDef[], path: string): PageDef | null {
  const slug = path.replace(/^\/+/, '').split(/[/?]/)[0] || HOME
  return pages.find((page) => page.path === slug) ?? null
}

function NotFound() {
  return (
    <div className="max-w-2xl">
      <Card title="This page isn’t here">
        <p className="text-muted">
          It may belong to an extra that only works with another keyboard.{' '}
          <a href={`#/${HOME}`} className="font-medium text-accent hover:underline">
            Go to Home
          </a>
        </p>
      </Card>
    </div>
  )
}

export function Shell() {
  useAppliedTheme()
  const path = usePath()
  const status = useDevice((s) => s.status)
  const link = useDevice((s) => s.link)
  const keyboard = useDevice((s) => s.keyboard)
  const capabilities = useDevice((s) => s.capabilities)

  // Plugins depend on which keyboard is connected and what it can do; not on every key change.
  const pages = useMemo(() => activePages(deviceStore.getState()), [link, keyboard?.uid, capabilities])
  const page = findPage(pages, path)

  // A different keyboard (or none) starts the stage afresh: its selection would point at the wrong keys.
  const uid = keyboard?.uid
  useEffect(() => stage.reset(), [uid])

  const ready = status === 'ready' && keyboard !== null
  const needsKeyboard = page !== null && !page.offline && !ready
  const Page = page?.component

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-content">
      <Sidebar pages={pages} current={page} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="relative flex min-h-0 flex-1 flex-col">
          {page && (
            <header className="flex shrink-0 items-center gap-1 px-6 pt-5 pb-4">
              <h1 className="text-xl font-semibold tracking-tight">{page.title}</h1>
              {page.help && <HelpButton topic={page.help} />}
            </header>
          )}
          {page?.stage && ready && (
            <div className="shrink-0 px-6 pb-4">
              <Stage keyboard={keyboard} selectable={page.stage === 'select'} />
            </div>
          )}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6">
            {!page ? (
              <NotFound />
            ) : needsKeyboard ? (
              status === 'connecting' ? <Connecting /> : <ConnectPrompt />
            ) : (
              Page && <Page />
            )}
          </div>
          <HelpPanel />
        </main>
        {ready && <StatusLine />}
      </div>
      <UnlockDialog />
    </div>
  )
}
