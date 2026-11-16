// SPDX-License-Identifier: GPL-3.0-or-later
// "Reset all typing settings": Vial's settings reset, after a confirmation that says what goes back.

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { deviceStore, useDevice } from '../../device'
import { Button } from '../../ui/controls'
import { Dialog, HelpButton } from '../../ui/layout'

export function ResetSettings() {
  const [asking, setAsking] = useState(false)
  const writing = useDevice((s) => s.writing > 0)
  const keychron = useDevice((s) => s.keychron)
  const keeps = [keychron?.hasDebounce && 'the key bounce filter', keychron?.hasSnapClick && 'Snap Click'].filter(Boolean)

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-edge pt-4">
      <Button icon={<RotateCcw size={15} aria-hidden />} disabled={writing} onClick={() => setAsking(true)}>
        Reset all typing settings…
      </Button>
      <span className="flex items-center gap-1 text-[13px] text-muted">
        Back to how the firmware came.
        <HelpButton topic="typing-reset" />
      </span>
      <Dialog
        open={asking}
        title="Reset all typing settings?"
        confirmLabel="Reset"
        danger
        onCancel={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false)
          void deviceStore.resetSettings()
        }}
      >
        <p>
          Every timing on this page, Capitals by holding, the mouse keys, and the swapped and disabled keys go back to the
          firmware’s defaults. Undo can’t bring them back.
        </p>
        {keeps.length > 0 && <p className="mt-2">{capitalise(keeps.join(' and '))} stay as they are.</p>}
      </Dialog>
    </div>
  )
}

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
