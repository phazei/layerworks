// SPDX-License-Identifier: GPL-3.0-or-later
// What shows when part of the app throws while drawing, instead of a blank window.
//
// Compatibility: definitions from other keyboards hold what the K15 Max's doesn't (a `lighting` given as an object
// in Corne's and six others' vial.json, vial_qmk keyboards/crkbd/keymaps/vial/vial.json), and a page that meets
// something unexpected must not take the whole app down. The causes are fixed where they are found; this is the net.
//
// Two of them: one around the
// whole app (main.tsx), one around the page area (Shell.tsx), so the sidebar and the device card survive a page that
// throws and the person can go elsewhere. The page one starts afresh on another page (`resetKey`).
//
// A page can throw again every time it opens when the cause sits in a section the app remembers as open ("More
// options", "Technical details"): "Try again" closes every remembered section first.

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react'
import { ISSUES_URL } from '../project'
import { Button } from '../ui/controls'
import { ExternalLink } from '../ui/display'
import { Card, Disclosure } from '../ui/layout'
import { setPref } from '../ui/prefs'

/** ui/prefs.ts keeps its values in localStorage under this prefix; open sections are `open:<id>`. */
const OPEN_SECTIONS = 'layerworks:open:'

/** Forgets that any section was left open, so a page draws with them closed. */
export function closeRememberedSections(): void {
  let keys: string[] = []
  try {
    keys = Object.keys(localStorage).filter((key) => key.startsWith(OPEN_SECTIONS))
  } catch {
    // Blocked storage: nothing was remembered there.
  }
  for (const key of keys) setPref(key.slice('layerworks:'.length), false)
}

interface Props {
  children: ReactNode
  /** The whole app (no shell around it) rather than one page. */
  whole?: boolean
  /** A new value starts afresh: another page, another keyboard. */
  resetKey?: string
}

interface State {
  error: Error | null
  resetKey: string | undefined
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(`[shell] ${this.props.whole ? 'the app' : 'a page'} failed to draw:`, error, info.componentStack)
  }

  private retry = () => {
    closeRememberedSections()
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const message = (
      <div className="flex max-w-2xl flex-col gap-4">
        <p>
          {this.props.whole
            ? 'Layerworks ran into a problem it didn’t expect and can’t show this. Nothing was sent to the keyboard because of it.'
            : 'This page ran into a problem it didn’t expect. Nothing was sent to the keyboard because of it, and the other pages still work: pick one on the left.'}
        </p>
        <p className="text-muted">
          Try again (with every “More options” section closed), or reload the app. If it keeps happening,{' '}
          <ExternalLink href={ISSUES_URL}>report a problem</ExternalLink> and include what is under “What went wrong”.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={<RotateCcw size={15} aria-hidden />} onClick={this.retry}>
            Try again
          </Button>
          <Button icon={<RefreshCw size={15} aria-hidden />} onClick={() => location.reload()}>
            Reload
          </Button>
        </div>
        <Disclosure id="error-details" label="What went wrong">
          <pre className="max-h-64 overflow-auto rounded-control bg-surface p-3 font-mono text-xs whitespace-pre-wrap text-muted">
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ''}
          </pre>
        </Disclosure>
      </div>
    )
    const title = this.props.whole ? 'Something went wrong' : 'Something went wrong on this page'
    return this.props.whole ? (
      <div role="alert" className="flex h-screen items-start justify-center overflow-y-auto bg-surface p-10 text-content">
        <Card title={title}>{message}</Card>
      </div>
    ) : (
      // In the page's place, scrolling like a page.
      <div role="alert" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6">
        <Card
          className="max-w-3xl"
          title={
            <>
              <AlertTriangle size={17} aria-hidden className="mr-1 text-danger" />
              {title}
            </>
          }
        >
          {message}
        </Card>
      </div>
    )
  }
}
