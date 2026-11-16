// SPDX-License-Identifier: GPL-3.0-or-later
// What the macro editor and the other editors share at the top of their card: whether the shortcut matches the
// keyboard, and while it doesn't, "Save to keyboard" (or "Unlock to save…", which opens the unlock dialog and saves
// once the keyboard is unlocked) with Revert and what stands in the way.

import type { ReactNode } from 'react'
import { CircleCheck, CircleDot, Lock } from 'lucide-react'
import { Button } from '../../ui/controls'
import { HelpButton } from '../../ui/layout'

/** "Not saved yet", or that it matches the keyboard ("Saved to the keyboard" just after saving). */
export function SaveState({ dirty, justSaved, savedText = 'As on the keyboard' }: { dirty: boolean; justSaved: boolean; savedText?: string }) {
  return (
    <span className="ml-auto flex items-center gap-1.5 text-[13px]" role="status">
      {dirty ? (
        <>
          <CircleDot size={14} aria-hidden className="text-warning" />
          <span>Not saved yet</span>
          <HelpButton topic="shortcut-drafts" />
        </>
      ) : (
        <>
          <CircleCheck size={14} aria-hidden className="text-success" />
          <span className="text-muted">{justSaved ? 'Saved to the keyboard' : savedText}</span>
        </>
      )}
    </span>
  )
}

interface SaveBarProps {
  dirty: boolean
  saving: boolean
  /** Saving first needs the keyboard unlocked: the button opens the unlock dialog, and the save follows it. */
  needsUnlock: boolean
  /** Something must be fixed first; the button is disabled. */
  blocked: boolean
  /** Beside the buttons: what to fix, or a word on undo. */
  hint: ReactNode
  onSave: () => void
  onRevert: () => void
  /** Notices under the buttons. */
  children?: ReactNode
}

/** Save and Revert, with what stands in the way of saving. At the top, so they are in view however long the editor. */
export function SaveBar({ dirty, saving, needsUnlock, blocked, hint, onSave, onRevert, children }: SaveBarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          icon={needsUnlock ? <Lock size={14} aria-hidden /> : undefined}
          disabled={!dirty || saving || blocked}
          onClick={onSave}
        >
          {needsUnlock ? 'Unlock to save…' : 'Save to keyboard'}
        </Button>
        <Button variant="quiet" disabled={!dirty || saving} onClick={onRevert}>
          Revert
        </Button>
        <span className="text-[13px] text-muted">{hint}</span>
      </div>
      {children}
    </div>
  )
}
