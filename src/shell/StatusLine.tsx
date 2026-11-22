// SPDX-License-Identifier: GPL-3.0-or-later
// The bar at the bottom: whether every change has reached the keyboard, what is still being read, and undo / redo.

import { CircleAlert, CircleCheck, CircleDot, Redo2, TriangleAlert, Undo2 } from 'lucide-react'
import { deviceStore, useDevice, type LoadPart } from '../device'
import { Button, Spinner } from '../ui/controls'
import { HelpButton } from '../ui/layout'
import { describeUnsaved, useUnsaved } from './unsaved'

/** What each background part is, in words. */
export const PART_NAMES: Record<LoadPart, string> = {
  macros: 'macros',
  entries: 'multi-tap keys, chords and other shortcuts',
  settings: 'typing settings',
  lighting: 'lighting',
  unlock: 'lock state',
  keychron: 'Keychron settings',
}

const list = (parts: readonly LoadPart[]) => parts.map((part) => PART_NAMES[part]).join(', ')

function SaveState() {
  // Lighting waiting for its pause before it is saved counts as on its way: it isn't kept over a restart yet.
  const writing = useDevice((s) => s.writing + (s.savePending ? 1 : 0))
  const writeError = useDevice((s) => s.writeError)
  const uid = useDevice((s) => s.keyboard?.uid)
  const unsaved = useUnsaved()
  // Only this keyboard's: drafts for another keyboard wait for it.
  const pending = [...unsaved.values()].filter((item) => item.keyboard === undefined || item.keyboard === uid)

  if (writeError) {
    return (
      <span className="flex min-w-0 items-center gap-2 text-danger">
        <CircleAlert size={15} aria-hidden className="shrink-0" />
        <span className="truncate">The last change didn’t reach the keyboard: {writeError}</span>
      </span>
    )
  }
  if (writing > 0) {
    return (
      <span className="flex items-center gap-2 text-muted">
        <Spinner />
        Saving…
      </span>
    )
  }
  if (pending.length > 0) {
    // Leads to the first piece of work that says where it is.
    const href = pending.find((item) => item.href)?.href
    const content = (
      <>
        <CircleDot size={15} aria-hidden className="shrink-0" />
        <span className="truncate">{describeUnsaved(pending)}</span>
      </>
    )
    return href ? (
      <a href={href} className="flex min-w-0 items-center gap-2 rounded-control text-warning hover:underline">
        {content}
      </a>
    ) : (
      <span className="flex min-w-0 items-center gap-2 text-warning">{content}</span>
    )
  }
  return (
    <span className="flex items-center gap-2 text-muted">
      <CircleCheck size={15} aria-hidden className="text-success" />
      Saved on the keyboard
    </span>
  )
}

function LoadState() {
  const loading = useDevice((s) => s.loading)
  const failed = useDevice((s) => s.failed)

  if (failed.length > 0) {
    return (
      <span className="ml-3 flex min-w-0 items-center gap-2 border-l border-edge pl-4 text-warning">
        <TriangleAlert size={15} aria-hidden className="shrink-0" />
        <span className="truncate">Couldn’t read {list(failed)}. Everything else works.</span>
      </span>
    )
  }
  if (loading.length > 0) {
    return (
      <span className="ml-3 flex min-w-0 items-center gap-2 border-l border-edge pl-4 text-muted">
        <Spinner size={13} />
        <span className="truncate">Still reading {list(loading)}…</span>
      </span>
    )
  }
  return null
}

export function StatusLine() {
  const canUndo = useDevice((s) => s.canUndo)
  const canRedo = useDevice((s) => s.canRedo)

  return (
    <footer
      aria-label="Status"
      data-tour="status"
      className="flex h-12 shrink-0 items-center justify-between gap-4 border-t border-edge bg-card pr-4 pl-6 text-[13px]"
    >
      <div role="status" className="flex min-w-0 items-center gap-1">
        <SaveState />
        <HelpButton topic="saving" />
        <LoadState />
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" variant="quiet" icon={<Undo2 size={15} aria-hidden />} disabled={!canUndo} onClick={() => void deviceStore.undo()}>
          Undo
        </Button>
        <Button size="sm" variant="quiet" icon={<Redo2 size={15} aria-hidden />} disabled={!canRedo} onClick={() => void deviceStore.redo()}>
          Redo
        </Button>
        <HelpButton topic="undo" />
      </div>
    </footer>
  )
}
