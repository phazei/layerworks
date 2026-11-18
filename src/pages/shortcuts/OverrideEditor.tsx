// SPDX-License-Identifier: GPL-3.0-or-later
// A shortcut replacement (key override): a key pressed with certain modifiers held sends something else.

import { ALL_LAYERS, OVERRIDE_DEFAULT_OPTIONS, OVERRIDE_OPTIONS, useDevice, type KeyOverrideEntry } from '../../device'
import { useConnectedLayerNames } from '../../shell/layer-names'
import { Checkbox, Toggle } from '../../ui/controls'
import { Disclosure, HelpButton } from '../../ui/layout'
import { EntryFrame, KeyField, ModsField, useEntryDraft } from './EntryEditor'

const EXAMPLE: KeyOverrideEntry = {
  triggerKey: 0x2a, // Backspace
  replacementKey: 0x4c, // Delete
  layers: ALL_LAYERS,
  triggerMods: 0x22, // Shift, either side
  negativeMods: 0,
  suppressedMods: 0x22,
  options: OVERRIDE_DEFAULT_OPTIONS,
  enabled: true,
}

const OPTION_LABELS: { bit: number; label: string }[] = [
  { bit: OVERRIDE_OPTIONS.triggerDown, label: 'Start when the key is pressed with the modifiers held' },
  { bit: OVERRIDE_OPTIONS.requiredModDown, label: 'Start when a modifier is pressed while the key is held' },
  { bit: OVERRIDE_OPTIONS.negativeModUp, label: 'Start when a modifier it must not see is let go' },
  { bit: OVERRIDE_OPTIONS.oneMod, label: 'Any one of the modifiers is enough' },
  { bit: OVERRIDE_OPTIONS.noReregister, label: 'Don’t press the key again when the modifiers are let go' },
  { bit: OVERRIDE_OPTIONS.noUnregisterOnOther, label: 'Keep the replacement down when another key is pressed' },
]

export function OverrideEditor({ index }: { index: number }) {
  const draft = useEntryDraft('keyOverride', index)
  const layers = useDevice((s) => s.keyboard?.layers ?? 0)
  const layerNames = useConnectedLayerNames()
  if (!draft) return null
  const { entry, edit } = draft
  const set = (patch: Partial<KeyOverrideEntry>) => edit({ ...entry, ...patch })
  const allLayers = Array.from({ length: layers }, (_, i) => i).every((i) => entry.layers & (1 << i))

  return (
    <EntryFrame
      kind="keyOverride"
      index={index}
      draft={draft}
      intro={
        <p>
          When a key is pressed with certain modifiers held, the keyboard sends something else instead. It works on its
          own once saved, on the layers you pick.
        </p>
      }
      example={{ label: 'Shift + Backspace sends Delete', entry: EXAMPLE }}
    >
      <ModsField label="Hold" value={entry.triggerMods} onChange={(triggerMods) => set({ triggerMods })} />
      <KeyField label="And press" use="overrideTrigger" value={entry.triggerKey} onChange={(triggerKey) => set({ triggerKey })} />
      <KeyField label="To send instead" use="overrideSends" value={entry.replacementKey} shortcuts onChange={(replacementKey) => set({ replacementKey })} />
      <ModsField label="Let go of while sending" value={entry.suppressedMods} onChange={(suppressedMods) => set({ suppressedMods })} />
      <Toggle
        checked={entry.enabled}
        onChange={(enabled) => set({ enabled })}
        label="On"
        hint="Turned off, it stays saved but does nothing."
      />
      <Disclosure id="override-more" label="More options">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <h3 className="flex items-center gap-0.5 text-[13px] font-semibold">
              Modifiers, left and right apart
              <HelpButton topic="override-modifiers" />
            </h3>
            <ModsField sided label="Hold" value={entry.triggerMods} onChange={(triggerMods) => set({ triggerMods })} />
            <ModsField sided label="Must not be held" value={entry.negativeMods} onChange={(negativeMods) => set({ negativeMods })} />
            <ModsField sided label="Let go of while sending" value={entry.suppressedMods} onChange={(suppressedMods) => set({ suppressedMods })} />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] font-semibold">Works on these layers</legend>
            <Checkbox
              label="Every layer"
              checked={allLayers}
              onChange={(on) => set({ layers: on ? ALL_LAYERS : 0 })}
            />
            <div className="flex flex-wrap gap-x-4 gap-y-2 pl-6">
              {Array.from({ length: layers }, (_, i) => (
                <Checkbox
                  key={i}
                  label={layerNames[i] ?? `Layer ${i}`}
                  checked={(entry.layers & (1 << i)) !== 0}
                  onChange={(on) => set({ layers: on ? entry.layers | (1 << i) : entry.layers & ~(1 << i) & ALL_LAYERS })}
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 flex items-center gap-0.5 text-[13px] font-semibold">
              When it starts and ends
              <HelpButton topic="override-options" />
            </legend>
            {OPTION_LABELS.map(({ bit, label }) => (
              <Checkbox
                key={bit}
                label={label}
                checked={(entry.options & bit) !== 0}
                onChange={(on) => set({ options: on ? entry.options | bit : entry.options & ~bit })}
              />
            ))}
          </fieldset>
        </div>
      </Disclosure>
    </EntryFrame>
  )
}
