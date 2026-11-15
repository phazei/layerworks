// SPDX-License-Identifier: GPL-3.0-or-later
// Back up and restore: everything on the keyboard to one file, and back. A Vial file can be saved too.

import { useState } from 'react'
import { CircleCheck, FileDown, HardDriveDownload } from 'lucide-react'
import {
  backupFileName,
  backupText,
  createBackup,
  deviceStore,
  exportVil,
  missingParts,
  useDevice,
  VIL_EXTENSION,
} from '../../device'
import { storedLayerNames } from '../../shell/layer-names'
import { Button, Spinner } from '../../ui/controls'
import { downloadText } from '../../ui/files'
import { Card, Disclosure, HelpButton, Notice } from '../../ui/layout'
import { Restore } from './Restore'

/** Downloads a backup of the connected keyboard. Resolves with the file name. */
export function saveBackup(now = new Date()): string | null {
  const state = deviceStore.getState()
  const kb = state.keyboard
  if (!kb) return null
  const fileName = backupFileName(kb.name, now)
  downloadText(fileName, backupText(createBackup(state, storedLayerNames(kb.uid), now)))
  return fileName
}

function saveVil(): string | null {
  const state = deviceStore.getState()
  const kb = state.keyboard
  if (!kb) return null
  const fileName = backupFileName(kb.name, new Date(), VIL_EXTENSION)
  downloadText(fileName, exportVil(state))
  return fileName
}

function Saved({ fileName }: { fileName: string }) {
  return (
    <p role="status" className="flex items-start gap-2 text-[13px] text-muted">
      <CircleCheck size={15} aria-hidden className="mt-px shrink-0 text-success" />
      <span>
        Saved <span className="font-medium break-all text-content">{fileName}</span> to your downloads.
      </span>
    </p>
  )
}

export function Backup() {
  const loading = useDevice((s) => s.loading.length > 0)
  const failed = useDevice((s) => s.failed)
  const state = useDevice((s) => s)
  const [saved, setSaved] = useState<string | null>(null)
  const [savedVil, setSavedVil] = useState<string | null>(null)
  const missing = failed.length > 0 ? missingParts(state) : []

  return (
    <Card title="Back up and restore" help="backup" description="Keep a copy of everything on this keyboard, and put it back later.">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">Save everything on this keyboard to a file</h3>
          <p className="text-[13px] text-muted">
            Every key on every layer, the knob, macros, typing settings, lighting and your layer names. Saving only
            reads; nothing on the keyboard changes.
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              icon={<HardDriveDownload size={16} aria-hidden />}
              disabled={loading}
              onClick={() => setSaved(saveBackup())}
            >
              Save a backup
            </Button>
            {loading && (
              <span className="flex items-center gap-2 text-[13px] text-muted">
                <Spinner />
                Still reading the keyboard…
              </span>
            )}
          </div>
          {missing.length > 0 && (
            <Notice>
              Couldn’t read the {missing.join(', ')} from the keyboard, so the backup won’t have them.
            </Notice>
          )}
          {saved && <Saved fileName={saved} />}
        </div>

        <div className="flex flex-col gap-2 border-t border-edge pt-5">
          <h3 className="flex items-center gap-1 font-medium">
            Put a backup back on this keyboard
            <HelpButton topic="restore" />
          </h3>
          <p className="text-[13px] text-muted">
            Choose a backup file (or a Vial file). You’ll see what would change before anything is written.
          </p>
          <div className="mt-1">
            <Restore />
          </div>
        </div>
      </div>
      <Disclosure id="device-vial" label="Vial files">
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1 text-[13px] text-muted">
            A layout file for Vial, the app this firmware was made for. It has no lighting, wireless timers or layer
            names.
            <HelpButton topic="vial-file" />
          </p>
          <div>
            <Button icon={<FileDown size={16} aria-hidden />} disabled={loading} onClick={() => setSavedVil(saveVil())}>
              Save a Vial file
            </Button>
          </div>
          {savedVil && <Saved fileName={savedVil} />}
          <p className="text-[13px] text-muted">To load a Vial file here, choose it under “Put a backup back”.</p>
        </div>
      </Disclosure>
    </Card>
  )
}
