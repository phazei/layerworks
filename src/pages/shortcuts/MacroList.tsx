// SPDX-License-Identifier: GPL-3.0-or-later
// The left column: the keyboard's macros with their names and what they do, the space they share, and under
// "More options" the other kinds of shortcut, each in its own section.

import { CircleDot } from 'lucide-react'
import { macroSpace, macroUses, readMacros, sameSteps, useDevice } from '../../device'
import { defaultMacroName, useStoredMacroNames } from '../../shell/layer-names'
import { Badge, cx } from '../../ui/controls'
import { Card, Disclosure } from '../../ui/layout'
import { ProgressBar } from '../../ui/ProgressBar'
import { summarize } from './describe'
import { draftOf, useDrafts } from './drafts'
import { macroHref } from './route'

/** The other kinds of shortcut, built next; each gets a section like the macros'. */
const OTHER_KINDS = [
  { id: 'tapDances', name: 'Multi-tap keys', qmk: 'Tap dance', what: 'One key, different things for one tap, two taps or a hold.' },
  { id: 'combos', name: 'Key chords', qmk: 'Combos', what: 'Press keys together to get another key.' },
  { id: 'keyOverrides', name: 'Shortcut replacements', qmk: 'Key overrides', what: 'Swap what a shortcut does, such as Shift + Backspace for Delete.' },
  { id: 'altRepeatKeys', name: 'Repeat rules', qmk: 'Alt repeat', what: 'A key that does the opposite of the last one, such as Undo after Redo.' },
] as const

/** "Room for about 820 more characters" */
export const roomText = (free: number): string =>
  free <= 0 ? 'No room left' : `Room for about ${free} more character${free === 1 ? '' : 's'}`

export function MacroList({ selected }: { selected: number | null }) {
  const kb = useDevice((s) => s.keyboard)
  const buffer = useDevice((s) => s.macros)
  const caps = useDevice((s) => s.capabilities)
  const names = useStoredMacroNames()
  const drafts = useDrafts()
  if (!kb) return null
  const macros = buffer ? readMacros(buffer, kb.vialProtocol, kb.macroCount) : null
  const space = buffer ? macroSpace(buffer, kb.macroCount, kb.macroBytes) : null

  return (
    <Card title="Macros" help="macros" description="Type text or press a series of keys with one key.">
      {kb.macroCount === 0 ? (
        <p className="text-[13px] text-muted">This keyboard’s firmware has no macros.</p>
      ) : (
        <>
          {space && (
            <div className="mb-3 flex flex-col gap-1.5">
              <ProgressBar label="Macro space used" value={space.used} max={space.size} valueText={`${space.used} of ${space.size} bytes`} />
              <p className="text-[13px] text-muted">
                {roomText(space.free)} · {space.used} of {space.size} bytes used
              </p>
            </div>
          )}
          <nav aria-label="Macros">
            <ul className="-mx-2 flex flex-col">
              {Array.from({ length: kb.macroCount }, (_, i) => {
                const steps = macros?.[i] ?? []
                const draft = draftOf(drafts, kb.uid, i)
                const unsaved = draft !== undefined && !sameSteps(draft, steps)
                const uses = macroUses(kb, i).length
                const current = selected === i
                return (
                  <li key={i}>
                    <a
                      href={macroHref(i)}
                      aria-current={current ? 'page' : undefined}
                      className={cx(
                        'flex flex-col gap-0.5 rounded-control px-2 py-2 transition-colors duration-(--motion-fast)',
                        current ? 'bg-accent-soft' : 'hover:bg-raised',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className={cx('min-w-0 truncate font-medium', current && 'text-accent')}>
                          {names[i]?.trim() || defaultMacroName(i)}
                        </span>
                        <span className="font-mono text-xs text-muted">M{i}</span>
                        {unsaved && (
                          <Badge tone="warning">
                            <CircleDot size={10} aria-hidden />
                            Not saved
                          </Badge>
                        )}
                        {uses > 0 && <span className="ml-auto shrink-0 text-xs text-muted">on {uses} key{uses === 1 ? '' : 's'}</span>}
                      </span>
                      <span className={cx('truncate text-[13px]', steps.length ? 'text-muted' : 'text-muted italic')}>
                        {macros ? summarize(steps) : 'Reading…'}
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>
        </>
      )}
      <Disclosure id="shortcuts-more" label="More options">
        <ul aria-label="Other kinds of shortcut" className="flex flex-col gap-3">
          {OTHER_KINDS.map((kind) => (
            <li key={kind.id} className="flex flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <span className="font-medium">{kind.name}</span>
                <span className="text-xs text-muted">{kind.qmk}</span>
                <span className="ml-auto">
                  <Badge>Coming soon</Badge>
                </span>
              </span>
              <span className="text-[13px] text-muted">
                {kind.what} {caps ? `This keyboard has room for ${caps[kind.id]}.` : ''}
              </span>
            </li>
          ))}
        </ul>
      </Disclosure>
    </Card>
  )
}
