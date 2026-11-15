// SPDX-License-Identifier: GPL-3.0-or-later
// Restoring from a file: read it, check it is for this keyboard, show what will change, confirm, write only the
// differences, and say what was written, skipped and failed. The one action in the app that overwrites a lot at
// once, so it says exactly what before anything happens.

import { useEffect, useRef, useState } from 'react'
import { CircleAlert, CircleCheck, FileUp, Lock, TriangleAlert } from 'lucide-react'
import {
  BACKUP_EXTENSION,
  backupText,
  checkFit,
  createBackup,
  countOf,
  describePlan,
  deviceStore,
  planRestore,
  readKeyboardFile,
  unlockNeeded,
  useDevice,
  VIL_EXTENSION,
  type KeyboardFile,
  type RestorePart,
  type RestorePlan,
  type RestoreReport,
} from '../../device'
import { setLayerNames, storedLayerNames, useConnectedLayerNames } from '../../shell/layer-names'
import { openUnlock } from '../../shell/unlock-dialog'
import { Button } from '../../ui/controls'
import { FileButton, readText } from '../../ui/files'
import { Dialog, Notice } from '../../ui/layout'
import { ProgressBar } from '../../ui/ProgressBar'

type Step =
  | { kind: 'idle' }
  | { kind: 'error'; fileName: string; message: string }
  | { kind: 'review'; fileName: string; file: KeyboardFile; warnings: string[]; plan: RestorePlan }
  | { kind: 'running'; fileName: string; done: number; total: number }
  | { kind: 'done'; fileName: string; report: RestoreReport; names: boolean }

const ICON = 15

function savedWhen(file: KeyboardFile): string {
  const kind = file.kind === 'vil' ? 'A Vial file' : 'A Layerworks backup'
  const date = file.savedAt ? new Date(file.savedAt) : null
  const when = date && !Number.isNaN(date.getTime()) ? ` saved ${date.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}` : ''
  const from = file.identity.name ? ` from ${file.identity.name}` : ''
  return `${kind}${when}${from}.`
}

/** "3 keys, 2 knob turns and lighting" */
function listParts(counts: Partial<Record<RestorePart, number>>): string {
  const parts = Object.entries(counts).map(([part, n]) =>
    ['macros', 'lighting', 'wireless', 'debounce', 'layerNames', 'layoutOptions'].includes(part)
      ? countOf(part as RestorePart, 1).replace(/^1 /, '')
      : countOf(part as RestorePart, n ?? 0),
  )
  return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
}

function Review({ step, onRestore, onCancel }: { step: Extract<Step, { kind: 'review' }>; onRestore: () => void; onCancel: () => void }) {
  const names = useConnectedLayerNames()
  const unlocked = useDevice((s) => s.unlock?.unlocked === true)
  const name = useDevice((s) => s.keyboard?.name ?? 'the keyboard')
  const [confirming, setConfirming] = useState(false)
  const { plan, file, warnings } = step
  const lines = describePlan(plan, names)
  const locked = unlockNeeded(plan)

  return (
    <section aria-label="Restore" className="flex flex-col gap-4 rounded-control border border-edge p-4">
      <div>
        <h3 className="font-semibold break-all">{step.fileName}</h3>
        <p className="text-[13px] text-muted">{savedWhen(file)}</p>
      </div>
      {warnings.map((warning) => (
        <Notice key={warning}>
          <span className="flex gap-2">
            <TriangleAlert size={ICON} aria-hidden className="mt-0.5 shrink-0 text-warning" />
            {warning}
          </span>
        </Notice>
      ))}
      {lines.length === 0 ? (
        <p className="flex items-center gap-2">
          <CircleCheck size={ICON} aria-hidden className="text-success" />
          This keyboard already matches the file. There is nothing to restore.
        </p>
      ) : (
        <div>
          <p>Restoring overwrites these on {name}:</p>
          <ul aria-label="What will change" className="mt-2 flex flex-col gap-1.5">
            {lines.map((line) => (
              <li key={line.part} className="flex items-start gap-2">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-pill bg-danger" />
                <span>
                  {line.text}
                  {line.needsUnlock && !unlocked && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[13px] text-muted">
                      <Lock size={12} aria-hidden />
                      needs unlocking
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-muted">Everything else stays as it is.</p>
        </div>
      )}
      {locked > 0 && !unlocked && (
        <Notice>
          <span className="flex flex-col items-start gap-2">
            <span>
              {plan.macros ? 'Macros' : 'The firmware-update key'}
              {locked > 1 && ' and a few other changes'} can only be written while the keyboard is unlocked. Unlock
              it first, or restore without {locked === 1 ? 'it' : 'them'}.
            </span>
            <Button size="sm" icon={<Lock size={13} aria-hidden />} onClick={() => openUnlock('Restoring macros needs it.')}>
              Unlock first…
            </Button>
          </span>
        </Notice>
      )}
      {plan.ignored.length > 0 && (
        <div className="text-[13px] text-muted">
          <p>Not restored, because this keyboard can’t take it:</p>
          <ul className="mt-1 list-disc pl-5">
            {plan.ignored.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {lines.length > 0 && (
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Restore…
          </Button>
        )}
        <Button variant={lines.length > 0 ? 'quiet' : 'secondary'} onClick={onCancel}>
          {lines.length > 0 ? 'Cancel' : 'Done'}
        </Button>
      </div>
      <Dialog
        open={confirming}
        title="Overwrite the keyboard with this file?"
        confirmLabel="Restore"
        danger
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          onRestore()
        }}
      >
        <p>This replaces, on {name}:</p>
        <ul className="mt-2 list-disc pl-5">
          {lines.map((line) => (
            <li key={line.part}>{line.text}</li>
          ))}
        </ul>
        <p className="mt-3">
          Undo can take back the keys and knob afterwards; the rest can’t be undone.
          {locked > 0 && !unlocked && ' The keyboard is locked, so what needs unlocking is left out.'}
        </p>
      </Dialog>
    </section>
  )
}

function Report({ step, onDone }: { step: Extract<Step, { kind: 'done' }>; onDone: () => void }) {
  const { report } = step
  const written = { ...report.written, ...(step.names ? { layerNames: 1 } : {}) }
  const nothing = Object.keys(written).length === 0
  return (
    <section aria-label="Restore finished" className="flex flex-col gap-3 rounded-control border border-edge p-4">
      <p className="flex items-start gap-2 font-medium">
        {report.failed.length === 0 && !report.stopped ? (
          <CircleCheck size={ICON + 2} aria-hidden className="mt-0.5 shrink-0 text-success" />
        ) : (
          <CircleAlert size={ICON + 2} aria-hidden className="mt-0.5 shrink-0 text-danger" />
        )}
        {nothing ? 'Nothing was written.' : `Restored ${listParts(written)}.`}
      </p>
      {report.stopped && (
        <Notice tone="danger">
          The keyboard went away part-way. Connect it again and restore the same file: only what still differs is
          written.
        </Notice>
      )}
      {report.failed.length > 0 && (
        <Notice tone="danger">
          <p>
            {report.failed.length === 1 ? 'One change' : `${report.failed.length} changes`} didn’t reach the keyboard.
            Restoring the file again tries them once more.
          </p>
          <ul className="mt-1 list-disc pl-5">
            {report.failed.map((f) => (
              <li key={`${f.part}:${f.what}`}>
                {f.what}: {f.error}
              </li>
            ))}
          </ul>
        </Notice>
      )}
      {report.skipped.length > 0 && (
        <Notice>
          <span className="flex flex-col items-start gap-2">
            <span>
              Left out because the keyboard is locked: {report.skipped.map((s) => s.what).join(', ')}. Unlock it and
              restore the file again to write {report.skipped.length === 1 ? 'it' : 'them'}.
            </span>
            <Button size="sm" icon={<Lock size={13} aria-hidden />} onClick={() => openUnlock('Restoring macros needs it.')}>
              Unlock…
            </Button>
          </span>
        </Notice>
      )}
      {report.undoable && (
        <p className="text-[13px] text-muted">Undo, in the bar at the bottom, puts the keys and knob back as they were.</p>
      )}
      <div>
        <Button onClick={onDone}>Done</Button>
      </div>
    </section>
  )
}

/**
 * `?restore-sample` in the URL: a made-up backup of the connected keyboard with a few keys, a knob turn, a macro
 * and the lighting changed, opened as soon as the keyboard is read, for screenshots of the restore review.
 */
function sampleText(): string {
  const state = deviceStore.getState()
  const backup = createBackup(state, storedLayerNames(state.keyboard?.uid ?? ''))
  const flip = (code: number) => (code === 0x04 ? 0x05 : 0x04)
  backup.keymap.slice(1, 3).forEach((layer) => layer[1]?.forEach((code, c, row) => c < 4 && (row[c] = flip(code))))
  if (backup.knobs[0]?.[0]) backup.knobs[0][0] = [backup.knobs[0][0][1], backup.knobs[0][0][0]]
  if (backup.macros?.length) backup.macros.splice(0, 3, 0x68, 0x69, 0)
  if (backup.lighting) backup.lighting = { ...backup.lighting, hue: (backup.lighting.hue + 85) % 256 }
  return backupText(backup)
}

/** The restore half of the backup card: a file button, then the steps of the restore under it. */
export function Restore() {
  const [step, setStep] = useState<Step>({ kind: 'idle' })
  const ready = useDevice((s) => s.status === 'ready' && s.loading.length === 0)
  const busy = step.kind === 'running'
  const sampled = useRef(false)

  useEffect(() => {
    if (!ready || sampled.current || !new URLSearchParams(location.search).has('restore-sample')) return
    sampled.current = true
    void open('sample.layerworks.json', async () => sampleText())
  }, [ready])

  async function open(fileName: string, read: () => Promise<string>) {
    // The keyboard's own lighting keys change the lighting without telling the app; compare with what it has now.
    await deviceStore.refreshLighting()
    const state = deviceStore.getState()
    const kb = state.keyboard
    if (!kb) return
    try {
      const file = readKeyboardFile(await read(), kb.vialProtocol)
      const fit = checkFit(file.identity, state)
      if (!fit.fits) {
        setStep({ kind: 'error', fileName, message: fit.reason })
        return
      }
      const plan = planRestore(file.contents, state, storedLayerNames(kb.uid))
      setStep({ kind: 'review', fileName, file, warnings: fit.warnings, plan })
    } catch (error) {
      setStep({ kind: 'error', fileName, message: error instanceof Error ? error.message : String(error) })
    }
  }

  async function run(plan: RestorePlan, fileName: string) {
    const uid = deviceStore.getState().keyboard?.uid
    setStep({ kind: 'running', fileName, done: 0, total: 0 })
    const report = await deviceStore.restore(plan, ({ done, total }) => setStep({ kind: 'running', fileName, done, total }))
    // Layer names live in the browser, not on the keyboard: kept once the keyboard part went through.
    const names = plan.layerNames !== null && !report.stopped && uid !== undefined
    if (names && uid) setLayerNames(uid, plan.layerNames ?? [])
    setStep({ kind: 'done', fileName, report, names })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <FileButton
          accept={`${BACKUP_EXTENSION},.json,${VIL_EXTENSION}`}
          icon={<FileUp size={16} aria-hidden />}
          disabled={!ready || busy}
          onFile={(file) => void open(file.name, () => readText(file))}
        >
          Choose a backup file…
        </FileButton>
      </div>
      {step.kind === 'error' && (
        <Notice tone="danger">
          <span className="font-medium break-all">{step.fileName}</span>: {step.message}
        </Notice>
      )}
      {step.kind === 'review' && (
        <Review
          step={step}
          onCancel={() => setStep({ kind: 'idle' })}
          onRestore={() => void run(step.plan, step.fileName)}
        />
      )}
      {step.kind === 'running' && (
        <section aria-label="Restoring" className="flex flex-col gap-2 rounded-control border border-edge p-4">
          <p>Restoring {step.fileName}… Keep the keyboard connected.</p>
          <ProgressBar
            label="Restoring"
            value={step.done}
            max={step.total}
            valueText={`${step.done} of ${step.total} changes`}
          />
          <p className="text-[13px] text-muted tabular-nums">
            {step.done} of {step.total} changes written
          </p>
        </section>
      )}
      {step.kind === 'done' && <Report step={step} onDone={() => setStep({ kind: 'idle' })} />}
    </div>
  )
}
