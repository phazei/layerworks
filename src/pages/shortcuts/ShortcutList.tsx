// SPDX-License-Identifier: GPL-3.0-or-later
// The left column: one section per kind of shortcut. Macros first, with the space they share; then the other kinds
// that have something in use or are open; under "More options" the kinds not in use. Each section lists only the
// slots in use (or being edited), with "Add" opening the next free one, so 80 slots stay a short list. Macros and
// multi-tap keys go by QMK's numbers (M1 is Macro 1), slot 0 last.

import { useEffect, useRef, type ReactNode } from 'react'
import { CircleDot, Plus } from 'lucide-react'
import {
  ENTRY_KINDS,
  entryIsEmpty,
  keycodeUses,
  macroSpace,
  macroUses,
  numberedSlots,
  readMacros,
  entriesMatch,
  sameSteps,
  tapDanceKeycode,
  useDevice,
  type AnyEntry,
  type EntryKind,
  type KeyboardData,
} from '../../device'
import { navigate } from '../../shell/router'
import { defaultMacroName, useStoredMacroNames } from '../../ui/layer-names'
import { Badge, Button, cx } from '../../ui/controls'
import { Card, Disclosure, HelpButton } from '../../ui/layout'
import { ProgressBar } from '../../ui/ProgressBar'
import { KINDS, roomText, summarize, summarizeEntry } from './describe'
import { draftOf, entryDraftOf, useDrafts, type DraftKind } from './drafts'
import { shortcutHref, slotNumber, usesQmkNumber, type Opened } from './route'

interface Row {
  index: number
  title: string
  qmk: string
  summary: string
  empty: boolean
  unsaved: boolean
  uses: number
}

function Rows({ kind, rows, selected }: { kind: DraftKind; rows: Row[]; selected: Opened | null }) {
  if (rows.length === 0) return null
  return (
    <ul className="ml-1 flex flex-col border-l-2 border-edge pl-2">
      {rows.map((row) => {
        const current = selected?.kind === kind && selected.index === row.index
        return (
          <li key={row.index}>
            <a
              href={shortcutHref(kind, row.index)}
              aria-current={current ? 'page' : undefined}
              className={cx(
                'flex flex-col gap-0.5 rounded-control px-2 py-2 transition-colors duration-(--motion-fast)',
                current ? 'bg-accent-soft' : 'hover:bg-raised',
              )}
            >
              <span className="flex items-center gap-2">
                <span className={cx('min-w-0 truncate font-medium', current && 'text-accent')}>{row.title}</span>
                <span className="font-mono text-xs text-muted">{row.qmk}</span>
                {row.unsaved && (
                  <Badge tone="warning">
                    <CircleDot size={10} aria-hidden />
                    Not saved
                  </Badge>
                )}
                {row.uses > 0 && (
                  <span className="ml-auto shrink-0 text-xs text-muted">
                    on {row.uses} key{row.uses === 1 ? '' : 's'}
                  </span>
                )}
              </span>
              <span className={cx('truncate text-[13px] text-muted', row.empty && 'italic')}>{row.summary}</span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}

interface SectionProps {
  kind: DraftKind
  name: string
  qmk: string
  help: Parameters<typeof HelpButton>[0]['topic']
  used: number
  count: number
  /** The slot "Add" opens; null when all are used. */
  free: number | null
  addLabel: string
  children?: ReactNode
  /** Brought into view: a number-less address named this kind and none of its slots is free. */
  focused?: boolean
}

function Section({ kind, name, qmk, help, used, count, free, addLabel, children, focused = false }: SectionProps) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView?.({ block: 'start' })
  }, [focused])
  return (
    <section ref={ref} aria-label={name} className="flex flex-col gap-2 border-t border-edge pt-4 first:border-t-0 first:pt-0">
      <header className="flex items-start gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-0.5 text-[15px] font-semibold">
            {name}
            <HelpButton topic={help} />
          </h3>
          <p className="text-xs text-muted tabular-nums">
            {qmk === name ? '' : `${qmk} · `}
            {used} of {count} used
          </p>
        </div>
        <span className="ml-auto shrink-0">
          <Button
            size="sm"
            variant="quiet"
            icon={<Plus size={13} aria-hidden />}
            disabled={free === null}
            aria-label={addLabel}
            onClick={() => free !== null && navigate(shortcutHref(kind, free).slice(1))}
          >
            Add
          </Button>
        </span>
      </header>
      {children}
    </section>
  )
}

/**
 * Rows for one entry kind: slots in use, being edited, or open. Multi-tap keys go by QMK's number, slot 0 last, and
 * "Add" opens the lowest free number from 1 (numberedSlots); the other kinds count from 1 in slot order.
 */
function entryRows(kb: KeyboardData, kind: EntryKind, saved: AnyEntry[], drafts: ReadonlyMap<string, unknown>, selected: Opened | null) {
  const rows: Row[] = []
  const order = usesQmkNumber(kind) ? numberedSlots(saved.length) : saved.map((_, i) => i)
  let free: number | null = null
  for (const index of order) {
    const entry = saved[index]
    const draft = entryDraftOf(drafts, kb.uid, kind, index)
    const unsaved = draft !== undefined && !entriesMatch(kind, draft, entry)
    const shown = draft ?? entry
    const empty = entryIsEmpty(kind, shown)
    const open = selected?.kind === kind && selected.index === index
    if (entryIsEmpty(kind, entry) && !unsaved && !open) {
      free ??= index
      continue
    }
    const td = kind === 'tapDance' ? tapDanceKeycode(index) : null
    rows.push({
      index,
      title: `${KINDS[kind].one} ${slotNumber(kind, index)}`,
      qmk: kind === 'tapDance' ? `TD(${index})` : '',
      summary: empty ? 'Empty' : summarizeEntry(kind, shown),
      empty,
      unsaved,
      uses: td === null ? 0 : keycodeUses(kb, td).length,
    })
  }
  const used = saved.filter((e) => !entryIsEmpty(kind, e)).length
  return { rows, free, used }
}

export function ShortcutList({ selected, focus = null }: { selected: Opened | null; focus?: DraftKind | null }) {
  const kb = useDevice((s) => s.keyboard)
  const buffer = useDevice((s) => s.macros)
  const entries = useDevice((s) => s.entries)
  const counts = useDevice((s) => s.capabilities)
  const names = useStoredMacroNames()
  const drafts = useDrafts()
  if (!kb) return null

  // Macros.
  const macros = buffer ? readMacros(buffer, kb.vialProtocol, kb.macroCount) : null
  const space = buffer ? macroSpace(buffer, kb.macroCount, kb.macroBytes) : null
  const macroRows: Row[] = []
  let freeMacro: number | null = null
  // QMK's numbers, M0 last; "Add" takes the lowest free number from 1 (numberedSlots).
  for (const i of numberedSlots(kb.macroCount)) {
    const steps = macros?.[i] ?? []
    const draft = draftOf(drafts, kb.uid, i)
    const unsaved = draft !== undefined && !sameSteps(draft, steps)
    const open = selected?.kind === 'macro' && selected.index === i
    if (macros && steps.length === 0 && !unsaved && !open) {
      freeMacro ??= i
      continue
    }
    const shown = draft ?? steps
    macroRows.push({
      index: i,
      title: names[i]?.trim() || defaultMacroName(i),
      qmk: `M${i}`,
      summary: macros ? summarize(shown) : 'Reading…',
      empty: shown.length === 0,
      unsaved,
      uses: macroUses(kb, i).length,
    })
  }
  const macrosUsed = macros ? macros.filter((m) => m.length > 0).length : 0

  const sections = ENTRY_KINDS.map((kind) => {
    const count = counts ? { tapDance: counts.tapDances, combo: counts.combos, keyOverride: counts.keyOverrides, altRepeatKey: counts.altRepeatKeys }[kind] : 0
    const saved = (entries?.[kind] ?? []) as AnyEntry[]
    return { kind, count, ...entryRows(kb, kind, saved, drafts, selected) }
  }).filter((s) => s.count > 0)
  // Kinds with something in use, a draft, or the editor open come up under Macros; the rest wait under More options.
  // An unused kind moves up when its editor opens (from Add, or an address), not when its first entry is saved, so
  // the list doesn't shift under the pointer then.
  const inView = (s: (typeof sections)[number]) => s.rows.length > 0 || selected?.kind === s.kind || focus === s.kind
  const above = sections.filter(inView)
  const below = sections.filter((s) => !inView(s))
  const section = (s: (typeof sections)[number]) => (
    <Section
      key={s.kind}
      focused={focus === s.kind}
      kind={s.kind}
      name={KINDS[s.kind].name}
      qmk={KINDS[s.kind].qmk}
      help={KINDS[s.kind].help}
      used={s.used}
      count={s.count}
      free={s.free}
      addLabel={`Add a ${KINDS[s.kind].one.toLowerCase()}`}
    >
      <Rows kind={s.kind} rows={s.rows} selected={selected} />
    </Section>
  )

  return (
    <Card title="Shortcuts" description="What the keyboard can do beyond one key, one character.">
      <nav aria-label="Shortcuts">
        <div className="flex flex-col gap-5">
          {kb.macroCount === 0 ? (
            <p className="text-[13px] text-muted">This keyboard’s firmware has no macros.</p>
          ) : (
            <Section
              kind="macro"
              focused={focus === 'macro'}
              name="Macros"
              qmk="Macros"
              help="macros"
              used={macrosUsed}
              count={kb.macroCount}
              free={freeMacro}
              addLabel="Add a macro"
            >
              {space && (
                <div className="flex flex-col gap-1.5 pb-1">
                  <ProgressBar label="Macro space used" value={space.used} max={space.size} valueText={`${space.used} of ${space.size} bytes`} />
                  <p className="text-[13px] text-muted">
                    {roomText(space.free)} · {space.used} of {space.size} bytes used
                  </p>
                </div>
              )}
              <Rows kind="macro" rows={macroRows} selected={selected} />
            </Section>
          )}
          {entries !== null && above.map(section)}
        </div>
        {(entries === null ? sections.length > 0 : below.length > 0) && (
          <Disclosure id="shortcuts-more">
            {entries === null ? (
              <p className="text-[13px] text-muted">Reading them from the keyboard…</p>
            ) : (
              <div className="flex flex-col gap-5">{below.map(section)}</div>
            )}
          </Disclosure>
        )}
      </nav>
    </Card>
  )
}
