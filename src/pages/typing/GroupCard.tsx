// SPDX-License-Identifier: GPL-3.0-or-later
// One group of QMK settings as a card: the everyday ones visible, the rest under "More options". While searching,
// only the settings that match, all of them visible.

import type { ReactNode } from 'react'
import { SETTING_GROUP_INFO, type SettingField, type SettingGroupId, type SettingValues } from '../../device'
import { Card, Disclosure } from '../../ui/layout'
import { GROUP_HELP } from './help'
import { SettingName, SettingRow } from './SettingRow'

interface Props {
  group: SettingGroupId
  /** The group's fields the keyboard reports (or, while searching, the ones that match). */
  fields: SettingField[]
  values: SettingValues
  onChange: (qsid: number, value: number) => void
  /** Show every field, without "More options": while searching. */
  flat: boolean
  /** Shown after the everyday settings: the try-it box, a link. */
  extra?: ReactNode
}

export const groupAnchor = (id: string) => `typing-${id}`

export function GroupCard({ group, fields, values, onChange, flat, extra }: Props) {
  const info = SETTING_GROUP_INFO[group]
  const rows = (list: SettingField[]) => (
    <div className="flex flex-col gap-5">
      {list.map((f) => (
        <SettingRow key={f.key} field={f} value={values[f.qsid] ?? 0} values={values} onChange={(v) => onChange(f.qsid, v)} />
      ))}
    </div>
  )
  const everyday = flat ? fields : fields.filter((f) => !f.advanced)
  const advanced = flat ? [] : fields.filter((f) => f.advanced)

  return (
    <div id={groupAnchor(group)} className="scroll-mt-4">
      <Card title={<SettingName name={info.title} qmkName={info.qmkName} />} description={info.description} help={GROUP_HELP[group]}>
        {everyday.length > 0 ? rows(everyday) : rows(advanced)}
        {extra}
        {everyday.length > 0 && advanced.length > 0 && <Disclosure id={groupAnchor(group)}>{rows(advanced)}</Disclosure>}
      </Card>
    </div>
  )
}
