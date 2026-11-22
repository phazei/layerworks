// SPDX-License-Identifier: GPL-3.0-or-later
// Device, More options: reset the keys to the firmware's own (VIA's keymap reset, and its macro reset if asked),
// and restart into firmware update mode (Vial's bootloader jump). Both ask first, in a danger dialog that says what
// is lost and what stays; the reset offers a backup first.
//
// What the firmware does (vial-qmk):
// - quantum/via.c, id_dynamic_keymap_reset → dynamic_keymap_reset (quantum/dynamic_keymap.c): every layer's keys and
//   the knob from the keymap built into the firmware, qmk_settings_reset, and every tap dance, combo, key override and
//   alt repeat entry emptied. No unlock needed. Macros, lighting, Keychron's settings and layout options untouched.
// - id_dynamic_keymap_macro_reset: the macro memory filled with 0. No unlock needed either (only macro writes are).
// - id_bootloader_jump: only in Vial builds without VIAL_INSECURE, ignored until unlocked; answers, waits 100 ms
//   and jumps.
// - Keychron's own settings (key bounce filter, Snap Click, wireless timers) have no reset command; only the
//   keyboard's factory reset (factory_test.c) puts them back, with everything else.

import { useState, type ReactNode } from 'react'
import { CircleCheck, HardDriveDownload, RotateCcw, Zap } from 'lucide-react'
import { deviceStore, useDevice, type BootloaderResult } from '../../device'
import { closeUnlock, openUnlock } from '../../shell/unlock-dialog'
import { Button, Checkbox } from '../../ui/controls'
import { Card, Dialog, Disclosure, HelpButton, Notice } from '../../ui/layout'
import { saveBackup } from './Backup'

const UNLOCK_REASON = 'Restarting for a firmware update needs it.'

/** "a, b and c" */
function listWords(words: string[]): string {
  return words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`
}

/** "Keys and the knob" */
const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export function StartOver({ forceOpen = false, asking = null }: { forceOpen?: boolean; asking?: string | null }) {
  return (
    <Card
      title="Start over or update"
      description="Rarely needed: put the keys back as the firmware came, or get the keyboard ready for new firmware."
    >
      <Disclosure id="device-more" forceOpen={forceOpen}>
        <div className="flex flex-col gap-5">
          <ResetKeys asking={asking === 'reset'} />
          <div className="border-t border-edge pt-5">
            <Bootloader asking={asking === 'bootloader'} />
          </div>
        </div>
      </Disclosure>
    </Card>
  )
}

function Heading({ children, qmkName, help }: { children: ReactNode; qmkName: string; help: 'keymap-reset' | 'bootloader' }) {
  return (
    <h3 className="flex items-center gap-1 font-medium">
      {children} <span className="text-[13px] font-normal text-muted">· {qmkName}</span>
      <HelpButton topic={help} />
    </h3>
  )
}

/** What the reset clears and what it leaves, from what this keyboard has. */
function useResetScope() {
  const kb = useDevice((s) => s.keyboard)
  const keychron = useDevice((s) => s.keychron)
  const settings = useDevice((s) => s.settings)
  const lighting = useDevice((s) => s.lighting)
  if (!kb) return null
  const { counts } = kb
  const lost = [
    `every key on all ${kb.layers} layers`,
    kb.knobCount > 0 && (kb.knobCount === 1 ? 'the knob' : 'the knobs'),
    settings && Object.keys(settings).length > 0 && 'the typing settings, swapped and disabled keys included',
    counts.tapDance > 0 && 'multi-tap keys',
    counts.combo > 0 && 'key chords',
    counts.keyOverride > 0 && 'shortcut replacements',
    counts.altRepeatKey > 0 && 'repeat rules',
  ].filter((w): w is string => !!w)
  const stays = [
    lighting && lighting.kind !== 'none' && 'the lighting',
    keychron?.hasRgb && 'key colours, mixed zones and the Caps Lock light',
    'layer and macro names',
    keychron?.hasDebounce && 'the key bounce filter',
    keychron?.hasSnapClick && 'Snap Click',
    keychron?.hasWireless && 'the wireless timers',
  ].filter((w): w is string => !!w)
  return { lost, stays, macros: kb.macroCount > 0 && kb.macroBytes > 0 }
}

/** `asking`: open with the confirmation shown (screenshots). */
function ResetKeys({ asking: askFirst = false }: { asking?: boolean }) {
  const scope = useResetScope()
  const writing = useDevice((s) => s.writing > 0)
  const loading = useDevice((s) => s.loading.length > 0)
  const [asking, setAsking] = useState(askFirst)
  const [macrosToo, setMacrosToo] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [result, setResult] = useState<'done' | 'failed' | null>(null)
  if (!scope) return null

  const open = () => {
    setMacrosToo(false)
    setSaved(null)
    setResult(null)
    setAsking(true)
  }
  const reset = () => {
    setAsking(false)
    void deviceStore.resetKeymap({ macros: macrosToo }).then((ok) => setResult(ok ? 'done' : 'failed'))
  }

  return (
    <div className="flex flex-col gap-2">
      <Heading qmkName="keymap reset" help="keymap-reset">
        Reset to defaults
      </Heading>
      <p className="text-[13px] text-muted">
        Puts back the keys the firmware came with and clears what you set up. Lighting and names stay. Save a backup first if
        you might want your setup back.
      </p>
      <div className="mt-1">
        <Button icon={<RotateCcw size={15} aria-hidden />} disabled={writing} onClick={open}>
          Reset to defaults…
        </Button>
      </div>
      {result === 'done' && (
        <p role="status" className="flex items-start gap-2 text-[13px] text-muted">
          <CircleCheck size={15} aria-hidden className="mt-px shrink-0 text-success" />
          The keys are the firmware’s own again.
        </p>
      )}
      {result === 'failed' && (
        <Notice tone="danger">
          The reset didn’t go through completely, or the keys couldn’t be read back afterwards. Disconnect the keyboard
          and connect it again to see what it holds now.
        </Notice>
      )}
      <Dialog
        open={asking}
        title="Reset the keyboard to its defaults?"
        confirmLabel="Reset"
        danger
        onCancel={() => setAsking(false)}
        onConfirm={reset}
      >
        <p>Back to what the firmware came with, and lost:</p>
        <ul className="mt-1 list-disc pl-5">
          {scope.lost.map((line) => (
            <li key={line}>{capitalise(line)}</li>
          ))}
          {scope.macros && macrosToo && <li>Every macro</li>}
        </ul>
        {scope.macros && (
          <div className="mt-3">
            <Checkbox checked={macrosToo} onChange={setMacrosToo} label="Empty the macros too" />
            {!macrosToo && <p className="mt-1 text-[13px]">Unticked, the macros stay as they are.</p>}
          </div>
        )}
        <p className="mt-3">Stays as it is: {listWords(scope.stays)}.</p>
        <p className="mt-3 font-medium text-content">Undo can’t bring it back; a backup can.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            icon={<HardDriveDownload size={14} aria-hidden />}
            disabled={loading}
            onClick={() => void deviceStore.refreshLighting().then(() => setSaved(saveBackup()))}
          >
            Save a backup first
          </Button>
          {saved && (
            <span role="status" className="flex items-center gap-1 text-[13px]">
              <CircleCheck size={14} aria-hidden className="text-success" />
              Saved {saved}
            </span>
          )}
        </div>
      </Dialog>
    </div>
  )
}

const BOOTLOADER_PROBLEMS: Partial<Record<BootloaderResult, string>> = {
  unsupported: 'This keyboard’s firmware doesn’t take this command. Hold its update key while plugging it in instead (Esc on most Keychron keyboards).',
  failed: 'The keyboard didn’t answer. Try again, or hold its update key while plugging it in.',
  locked: 'The keyboard needs to be unlocked first.',
  'cable-only': 'Connect the keyboard with its cable first.',
}

function Bootloader({ asking: askFirst = false }: { asking?: boolean }) {
  const link = useDevice((s) => s.link)
  const unlocked = useDevice((s) => s.unlock?.unlocked === true)
  const writing = useDevice((s) => s.writing > 0)
  const [asking, setAsking] = useState(askFirst)
  const [problem, setProblem] = useState<string | null>(null)
  const cable = link?.kind === 'cable'

  const restart = async () => {
    setAsking(false)
    setProblem(null)
    if (!unlocked) {
      if (!(await openUnlock(UNLOCK_REASON))) return
      // Done with the unlock dialog: the keyboard is about to go away.
      closeUnlock()
    }
    const result = await deviceStore.restartToBootloader()
    if (result !== 'restarting') setProblem(BOOTLOADER_PROBLEMS[result] ?? null)
  }

  return (
    <div className="flex flex-col gap-2">
      <Heading qmkName="bootloader" help="bootloader">
        Restart for a firmware update
      </Heading>
      <p className="text-[13px] text-muted">
        Saves holding a key while plugging the keyboard in. Then put the new firmware on with your flashing tool; this app
        doesn’t do that part.
      </p>
      <div className="mt-1">
        <Button icon={<Zap size={15} aria-hidden />} disabled={!cable || writing} onClick={() => setAsking(true)}>
          Restart for a firmware update…
        </Button>
      </div>
      {!cable && (
        <p className="text-[13px] text-muted">
          Only on the cable: new firmware goes onto the keyboard through its cable, not through the 2.4 GHz receiver.
        </p>
      )}
      {cable && !unlocked && <p className="text-[13px] text-muted">The keyboard asks to be unlocked first.</p>}
      {problem && <Notice tone="danger">{problem}</Notice>}
      <Dialog
        open={asking}
        title="Restart for a firmware update?"
        confirmLabel={unlocked ? 'Restart' : 'Unlock and restart…'}
        danger
        onCancel={() => setAsking(false)}
        onConfirm={() => void restart()}
      >
        <p>
          The keyboard stops typing until new firmware is put on it, or until you unplug it and plug it back in. Nothing it
          holds is lost by this.
        </p>
        <p className="mt-2">This app loses the connection to it. Connect again once it is a keyboard again.</p>
        {!unlocked && <p className="mt-2">First you’ll unlock it: the keyboard only takes this command once unlocked.</p>}
      </Dialog>
    </div>
  )
}
