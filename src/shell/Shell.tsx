// SPDX-License-Identifier: GPL-3.0-or-later
// The frame around every page: sidebar on the left (names or icons only, Sidebar.tsx); on the right the page's title,
// the keyboard stage when the page asks for it, the page itself, and the status line; the help panel slides in over
// the right edge of the page (not over the status line, so undo stays in reach).

import { useEffect, useMemo, useRef } from 'react'
import { deviceStore, useDevice } from '../device'
import { useLegendRevision } from '../device/layout'
import { activePages, type PageDef } from '../plugins/api'
import { Card, HelpButton } from '../ui/layout'
import { useAppliedTheme } from '../ui/theme'
import { useElementSize } from '../ui/useElementSize'
import { Connecting, ConnectPrompt } from './ConnectPrompt'
import { ErrorBoundary } from './ErrorBoundary'
import { HelpPanel } from './HelpPanel'
import { usePageTitle } from './page-title'
import { usePath } from './router'
import { Sidebar } from './Sidebar'
import { Stage } from './Stage'
import { stage } from './stage-store'
import { StatusLine } from './StatusLine'
import { Tour } from './Tour'
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
  // Key legends follow the computer's layout (device/layout.ts): a change of layout redraws every name of a key.
  useLegendRevision()
  const path = usePath()
  const status = useDevice((s) => s.status)
  const link = useDevice((s) => s.link)
  const keyboard = useDevice((s) => s.keyboard)
  const capabilities = useDevice((s) => s.capabilities)

  // Plugins depend on which keyboard is connected and what it can do; not on every key change.
  const pages = useMemo(() => activePages(deviceStore.getState()), [link, keyboard?.uid, capabilities])
  const page = findPage(pages, path)
  usePageTitle(page?.title ?? null)

  // A different keyboard (or none) starts the stage afresh: its selection would point at the wrong keys.
  const uid = keyboard?.uid
  useEffect(() => stage.reset(), [uid])

  const ready = status === 'ready' && keyboard !== null
  const needsKeyboard = page !== null && !page.offline && !ready
  const Page = page?.component
  // The height the stage and the page share: everything between the page title and the status line.
  const shared = useRef<HTMLDivElement>(null)
  const space = useElementSize(shared).height

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-content">
      <Sidebar pages={pages} current={page} />
      {/* Narrower than the pages can be laid out (31rem, 496 px: a window of 560 px beside the sidebar's icons),
          the page area keeps that width and scrolls sideways as a whole, status line included, so nothing overlaps or
          is cut off. */}
      <div className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-w-124 flex-col">
          {/* Clipped, not scrollable: the help panel waits beyond its right edge, and must not count as width to
              scroll to (it would give the page area a sideways scrollbar as wide as the panel). */}
          <main data-page-area="" className="relative flex min-h-0 flex-1 flex-col overflow-clip">
            {page && (
              <header className="flex shrink-0 items-center gap-1 px-6 pt-5 pb-4">
                <h1 className="text-xl font-semibold tracking-tight">{page.title}</h1>
                {page.help && (
                  <span data-tour="page-help" className="flex">
                    <HelpButton topic={page.help} />
                  </span>
                )}
              </header>
            )}
            <div ref={shared} className="flex min-h-0 flex-1 flex-col">
              {/* A page (or its stage) that throws shows what happened here; the sidebar stays, and another page or
                  another keyboard starts afresh. */}
              <ErrorBoundary resetKey={`${page?.path ?? ''}:${uid ?? ''}`}>
                {/* The stage ends in its resize handle, which takes the place of the gap under it. */}
                {page?.stage && ready && <Stage keyboard={keyboard} selectable={page.stage === 'select'} space={space} />}
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6">
                  {!page ? (
                    <NotFound />
                  ) : needsKeyboard ? (
                    status === 'connecting' ? <Connecting /> : <ConnectPrompt />
                  ) : (
                    Page && <Page />
                  )}
                </div>
              </ErrorBoundary>
            </div>
            <HelpPanel />
          </main>
          {ready && <StatusLine />}
        </div>
      </div>
      <UnlockDialog />
      <Tour />
    </div>
  )
}
