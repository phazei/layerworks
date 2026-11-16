// SPDX-License-Identifier: GPL-3.0-or-later
// One typing setting: a slider with quick choices for a time or a number, a switch for anything on or off. The
// friendly name first, QMK's name small beside it, the plain explanation under it.

import { useId } from 'react'
import {
  fieldRange,
  flagOn,
  formatSetting,
  withFlag,
  type SettingField,
  type SettingValues,
} from '../../device'
import { OptionButton, Slider, Toggle } from '../../ui/controls'
import { HelpButton } from '../../ui/layout'
import { FIELD_HELP } from './help'
import { inactiveReason } from './rules'

interface Props {
  field: SettingField
  /** The whole setting's value (all its bits). */
  value: number
  values: SettingValues
  onChange: (value: number) => void
}

export function SettingName({ name, qmkName }: { name: string; qmkName: string }) {
  return (
    <span>
      {name} <span className="text-[13px] font-normal text-muted">· {qmkName}</span>
    </span>
  )
}

export function SettingRow({ field, value, values, onChange }: Props) {
  const hintId = useId()
  const topic = FIELD_HELP[field.key]
  const help = topic ? <HelpButton topic={topic} /> : undefined
  const reason = inactiveReason(field, values)
  const label = <SettingName name={field.name} qmkName={field.qmkName} />
  const hint = reason ?? field.hint
  const control = field.control

  if (control.kind !== 'number') {
    return (
      <Toggle
        label={label}
        help={help}
        hint={hint}
        disabled={reason !== null}
        checked={flagOn(field, value)}
        onChange={(on) => onChange(withFlag(field, value, on))}
      />
    )
  }

  const { min, max } = fieldRange(field, value)
  const described = reason ? undefined : field.describe?.(value, values)
  return (
    <div className="flex flex-col gap-2">
      <Slider
        label={label}
        help={help}
        value={value}
        min={min}
        max={max}
        step={control.step}
        format={(v) => formatSetting(field, v)}
        disabled={reason !== null}
        describedBy={hintId}
        onChange={onChange}
      />
      {control.presets && reason === null && (
        <div role="group" aria-label={`Quick choices: ${field.name}`} className="flex flex-wrap gap-1.5">
          {control.presets.map((preset) => (
            <OptionButton key={preset.value} shape="chip" selected={preset.value === value} onClick={() => onChange(preset.value)}>
              {preset.label}
              {preset.label !== formatSetting(field, preset.value) && (
                <span className="font-normal opacity-75">{formatSetting(field, preset.value)}</span>
              )}
            </OptionButton>
          ))}
        </div>
      )}
      <p id={hintId} className="text-[13px] text-muted">
        {hint}
        {described && <> {described}</>}
      </p>
    </div>
  )
}
