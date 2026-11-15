// SPDX-License-Identifier: GPL-3.0-or-later
// The layers beside the keyboard picture: pick one to look at, rename it in place, and see which one is active
// on the keyboard. A column beside the picture when there is room, a row of chips above it when not.

import { useState } from 'react'
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

  if (editing) {
    const finish = (value: string | null) => {
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
            if (e.key === 'Enter') finish(e.currentTarget.value)
            if (e.key === 'Escape') finish(null)
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
        onDoubleClick={() => setEditing(true)}
        className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2.5 pl-2.5 text-left"
      >
        <span className={cx('w-3 text-xs tabular-nums', shown ? 'text-accent' : 'text-muted')}>{index}</span>
        <span className={cx('truncate', shown ? 'font-medium' : 'text-content')}>{name}</span>
        {active && (
          <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-success">
            <span aria-hidden className="size-1.5 rounded-pill bg-success" />
            Active
          </span>
        )}
      </button>
      <IconButton
        label={`Rename ${name}`}
        onClick={() => setEditing(true)}
        className="size-7 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
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
    <div className="flex shrink-0 flex-col gap-3 @3xl:w-54">
      <div className="self-start text-[13px] @3xl:self-stretch">
        <Toggle
          checked={state.follow && live !== null}
          disabled={live === null}
          onChange={(follow) => stage.setFollow(follow, shown)}
          label={
            <span className="inline-flex items-center gap-0.5">
              Follow the keyboard
              <HelpButton topic="live-layer" />
            </span>
          }
          hint={live === null ? 'This keyboard doesn’t say which layer is on.' : undefined}
        />
      </div>
      <ul aria-label="Layers" className="flex flex-wrap gap-1 @3xl:flex-col @3xl:flex-nowrap">
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
