// SPDX-License-Identifier: GPL-3.0-or-later
// Typing feel: the QMK settings the keyboard reports (tap or hold, key chords, Auto Shift, one-shot keys, mouse
// keys, swapped keys, the Esc / ` key), grouped by what a person wants, with Keychron's key bounce filter and Snap
// Click where the keyboard has them, and plugin panels for this section. Full height, no keyboard picture. A search
// narrows the cards; on a wide page a list of the groups stays beside them. Changes go to the keyboard as they are
// made, the newest first while a slider is dragged (ui/latest.ts); the keyboard keeps them itself.

import { useMemo, useState, type ReactNode } from 'react'
import { Gauge } from 'lucide-react'
import {
  deviceStore,
  isKnownSetting,
  SETTING_FIELDS,
  SETTING_GROUP_INFO,
  SETTING_GROUPS,
  settingValues,
  useDevice,
  type SettingGroupId,
  type SettingValues,
} from '../device'
import { activePanels, type PageDef } from '../plugins/api'
import { SearchField, Spinner } from '../ui/controls'
import { useLatestQueue } from '../ui/latest'
import { Card, Notice } from '../ui/layout'
import { Debounce, DEBOUNCE_SEARCH } from './typing/Debounce'
import { GroupCard, groupAnchor } from './typing/GroupCard'
import { OtherSettings } from './typing/OtherSettings'
import { ResetSettings } from './typing/ResetSettings'
import { fieldMatches, matches } from './typing/rules'
import { SnapClick, SNAP_CLICK_SEARCH } from './typing/SnapClick'
import { TryIt } from './typing/TryIt'

/** Plugin panels for this section; they depend on which keyboard is connected and what it can do. */
function usePanels() {
  const link = useDevice((s) => s.link)
  const uid = useDevice((s) => s.keyboard?.uid)
  const capabilities = useDevice((s) => s.capabilities)
  return useMemo(() => activePanels(deviceStore.getState(), 'typing'), [link, uid, capabilities])
}

/** Writes changed settings one after another; the store reports failures itself. */
async function sendSettings(change: Partial<Record<number, number>>): Promise<void> {
  for (const [qsid, value] of Object.entries(change)) {
    if (value !== undefined) await deviceStore.setSetting(Number(qsid), value)
  }
}

interface Section {
  id: string
  title: string
  card: ReactNode
}

/** The page's order: everyday feel first, then Keychron's own, then the rarely needed. */
const SECTION_ORDER: string[] = [
  'tapHold',
  'chords',
  'autoShift',
  'oneShot',
  'mouse',
  'magic',
  'debounce',
  'snap-click',
  'graveEsc',
  'other',
] satisfies (SettingGroupId | 'debounce' | 'snap-click' | 'other')[]

function TypingPage() {
  const settings = useDevice((s) => s.settings)
  const failed = useDevice((s) => s.failed)
  const capabilities = useDevice((s) => s.capabilities)
  const keychron = useDevice((s) => s.keychron)
  const panels = usePanels()
  const [query, setQuery] = useState('')
  const [pending, change] = useLatestQueue<Partial<Record<number, number>>>(sendSettings)
  const stored = useMemo(() => settingValues(settings), [settings])
  // What the keyboard has, or is about to: the values still on their way win.
  const values = { ...stored, ...pending } as SettingValues
  const searching = query.trim() !== ''
  const onChange = (qsid: number, value: number) => change({ [qsid]: value })

  let sections: Section[] = []
  const reported = (qsid: number) => settings !== null && settings[qsid] !== undefined
  for (const group of SETTING_GROUPS) {
    const fields = SETTING_FIELDS.filter((f) => f.group === group && reported(f.qsid) && (!searching || fieldMatches(query, f)))
    if (fields.length === 0) continue
    sections.push({
      id: group,
      title: SETTING_GROUP_INFO[group].title,
      card: (
        <GroupCard
          key={group}
          group={group}
          fields={fields}
          values={values}
          onChange={onChange}
          flat={searching}
          extra={extraFor(group, searching)}
        />
      ),
    })
  }
  if (keychron?.hasDebounce && (!searching || matches(query, DEBOUNCE_SEARCH))) {
    sections.push({ id: 'debounce', title: 'Key bounce filter', card: <Debounce key="debounce" /> })
  }
  if (keychron?.hasSnapClick && keychron.snapClickCount > 0 && (!searching || matches(query, SNAP_CLICK_SEARCH))) {
    sections.push({ id: 'snap-click', title: 'Snap Click', card: <SnapClick key="snap-click" /> })
  }
  const unknown = Object.entries(settings ?? {})
    .map(([id, bytes]): [number, number[]] => [Number(id), bytes])
    .filter(([id]) => !isKnownSetting(id))
  if (unknown.length > 0 && (!searching || matches(query, 'other settings unknown'))) {
    sections.push({ id: 'other', title: 'Other settings', card: <OtherSettings key="other" settings={unknown} /> })
  }
  sections = SECTION_ORDER.flatMap((id) => sections.filter((section) => section.id === id))

  let status: ReactNode = null
  if (failed.includes('settings')) {
    status = <Notice tone="danger">The typing settings couldn’t be read from the keyboard. Unplugging it and connecting again may help.</Notice>
  } else if (settings === null) {
    status = (
      <p className="flex items-center gap-2 text-[13px] text-muted">
        <Spinner /> Reading the typing settings from the keyboard…
      </p>
    )
  } else if (capabilities && !capabilities.has('qmkSettings')) {
    const availability = capabilities.check('qmkSettings')
    status = <Notice>{availability.available ? null : `Typing settings: ${availability.reason}`}</Notice>
  }

  return (
    <div className="@container">
      <div className="grid items-start gap-6 @4xl:grid-cols-[12rem_minmax(0,1fr)]">
        <nav aria-label="Typing settings" className="hidden flex-col gap-0.5 @4xl:sticky @4xl:top-0 @4xl:flex">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => document.getElementById(groupAnchor(section.id))?.scrollIntoView({ behavior: 'smooth' })}
              className="cursor-pointer rounded-control px-2.5 py-1.5 text-left text-[13px] text-muted transition-colors duration-(--motion-fast) hover:bg-raised hover:text-content"
            >
              {section.title}
            </button>
          ))}
        </nav>

        <div className="flex max-w-3xl min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3">
            <p className="text-muted">
              How the keyboard reads your typing: when a press counts as held, how keys pressed together behave, how the
              mouse keys move. Changes go to the keyboard at once and stay there; Undo takes them back.
            </p>
            <SearchField
              value={query}
              onChange={setQuery}
              aria-label="Search the typing settings"
              placeholder="Search settings: “hold”, “mouse”, “Caps Lock”…"
              className="max-w-md"
            />
          </div>

          {status}
          {sections.map((section) => section.card)}
          {searching && sections.length === 0 && <Notice>No setting matches “{query.trim()}”.</Notice>}

          {!searching && panels.map((panel) => (
            <Card key={panel.title} title={panel.title}>
              <panel.component />
            </Card>
          ))}

          {!searching && settings !== null && Object.keys(settings).length > 0 && <ResetSettings />}
        </div>
      </div>
    </div>
  )
}

/** Something a group shows after its everyday settings. */
function extraFor(group: SettingGroupId, searching: boolean): ReactNode {
  if (group === 'tapHold' && !searching) return <TryIt />
  if (group === 'chords' && !searching) {
    return (
      <p className="mt-4 text-[13px] text-muted">
        The chords themselves are on{' '}
        <a className="font-medium text-accent hover:underline" href="#/shortcuts/chord/1">
          Shortcuts &amp; macros
        </a>
        . Multi-tap keys each have their own time there.
      </p>
    )
  }
  return null
}

export const typingPage: PageDef = {
  path: 'typing',
  title: 'Typing feel',
  icon: Gauge,
  help: 'typing-feel',
  component: TypingPage,
}
