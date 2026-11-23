// SPDX-License-Identifier: GPL-3.0-or-later
// Settings the keyboard reports that the app has no entry for (newer firmware): shown as sent, not changed, since
// without knowing a setting's size and meaning a written value could do anything.

import { Card } from '../../ui/layout'
import { jumpTarget } from '../../ui/reveal'
import { groupAnchor } from './GroupCard'

const hex = (byte: number) => byte.toString(16).padStart(2, '0')

export function OtherSettings({ settings }: { settings: [number, readonly number[]][] }) {
  if (settings.length === 0) return null
  return (
    <div {...jumpTarget(groupAnchor('other'))}>
      <Card
        title="Other settings"
        description="The keyboard has these too, but this app doesn’t know what they do yet, so it only shows them."
      >
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[13px]">
          {settings.map(([id, bytes]) => (
            <div key={id} className="contents">
              <dt className="text-muted">Setting {id}</dt>
              <dd className="font-mono">{bytes.slice(0, 4).map(hex).join(' ')}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  )
}
