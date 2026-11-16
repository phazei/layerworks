// SPDX-License-Identifier: GPL-3.0-or-later
// The layers beside the keyboard picture: pick one to look at, rename it in place, and see which one is active
// on the keyboard. A column beside the picture when there is room, a row of chips above it when not.

import { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import type { KeyboardData, LayerState } from '../device'
import { cx, IconButton, TextInput, Toggle } from '../ui/controls'
import { HelpButton } from '../ui/layout'
import { renameLayer } from './layer-names'
import { stage, type StageState } from './stage-store'

interface RowProps {
  index: number
  name: string
  uid: string
  shown: boolean
  active: boolean
}

function LayerRow({ index, name, uid, shown, active }: RowProps) {
  const [editing, setEditing] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  // Renaming finishes once: the blur that can follow Enter or Esc doesn't count again (after Esc it would rename).
  const renaming = useRef(false)
  // Finished with Enter or Esc: focus goes back to the layer, not to the top of the page.
  const refocus = useRef(false)
  useEffect(() => {
    if (!editing && refocus.current) {
      refocus.current = false
      button.current?.focus()
    }
  }, [editing])
  const startEditing = () => {
    renaming.current = true
    setEditing(true)
  }

  if (editing) {
    const finish = (value: string | null, byKey = false) => {
      if (!renaming.current) return
      renaming.current = false
      refocus.current = byKey
      if (value !== null && value.trim() !== name) renameLayer(uid, index, value)
      setEditing(false)
    }
    return (
      <li className="@3xl:w-full">
        <TextInput
          autoFocus
          aria-label={`New name for ${name}`}
          defaultValue={name}
          maxLength={24}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={(e) => finish(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') finish(e.currentTarget.value, true)
            if (e.key === 'Escape') finish(null, true)
          }}
          className="w-36 @3xl:w-full"
        />
      </li>
    )
  }

  return (
    <li
      className={cx(
        'group flex h-8 items-center rounded-control transition-colors duration-(--motion-fast)',
        shown ? 'bg-accent-soft text-accent' : 'hover:bg-raised',
      )}
    >
      <button
        type="button"
        aria-pressed={shown}
        aria-label={active ? `${name}, active on the keyboard` : name}
        onClick={() => stage.showLayer(index)}
        ref={button}
        onDoubleClick={startEditing}
        className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-2 text-left @3xl:gap-2.5 @3xl:pr-0 @3xl:pl-2.5"
      >
        <span className={cx('text-xs tabular-nums @3xl:w-3', shown ? 'text-accent' : 'text-muted')}>{index}</span>
        <span className={cx('truncate', shown ? 'font-medium' : 'text-content')}>{name}</span>
        {active && (
          <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-success">
            <span aria-hidden className="size-1.5 rounded-pill bg-success" />
            {/* In the row of chips the dot alone marks it (the button's name says it in words). */}
            <span className="hidden @3xl:inline">Active</span>
          </span>
        )}
      </button>
      <IconButton
        label={`Rename ${name}`}
        onClick={startEditing}
        // In the row of chips it takes no room until the chip is pointed at or focused, so the row stays short.
        className="h-7 w-0 shrink-0 overflow-hidden opacity-0 group-focus-within:w-7 group-hover:w-7 group-hover:opacity-100 focus-visible:opacity-100 @3xl:w-7"
      >
        <Pencil size={13} />
      </IconButton>
    </li>
  )
}

interface Props {
  keyboard: KeyboardData
  names: string[]
  live: LayerState | null
  state: StageState
  shown: number
}

export function LayerStack({ keyboard, names, live, state, shown }: Props) {
  return (
    // Beside the picture: the toggle above a column of layers. Above it: one row, the layers and the toggle at its
    // right end, wrapping under them only when the row is too narrow.
    <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-2 @3xl:w-54 @3xl:flex-col @3xl:flex-nowrap @3xl:items-stretch @3xl:gap-3">
      <div className="order-last ml-auto text-[13px] @3xl:order-first @3xl:ml-0">
        <Toggle
          checked={state.follow && live !== null}
          disabled={live === null}
          onChange={(follow) => stage.setFollow(follow, shown)}
          label="Follow the keyboard"
          help={<HelpButton topic="live-layer" />}
          hint={live === null ? 'This keyboard doesn’t say which layer is on.' : undefined}
        />
      </div>
      <ul aria-label="Layers" className="flex flex-wrap gap-0.5 @3xl:flex-col @3xl:flex-nowrap @3xl:gap-1">
        {names.map((name, i) => (
          <LayerRow
            key={i}
            index={i}
            name={name}
            uid={keyboard.uid}
            shown={i === shown}
            active={live !== null && live.active === i}
          />
        ))}
      </ul>
    </div>
  )
}
