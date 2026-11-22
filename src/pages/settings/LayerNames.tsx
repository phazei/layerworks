// SPDX-License-Identifier: GPL-3.0-or-later
// Names for every layer of the connected keyboard: rename, or go back to the default. The same names the layer
// stack shows; they live in this browser (shell/layer-names).

import { RotateCcw } from 'lucide-react'
import { useDevice } from '../../device'
import { defaultLayerName, knownLayerNames, renameLayer, useLayerNames } from '../../shell/layer-names'
import { IconButton, TextInput } from '../../ui/controls'
import { Card } from '../../ui/layout'

interface RowProps {
  uid: string
  index: number
  name: string
  fallback: string
}

function LayerNameRow({ uid, index, name, fallback }: RowProps) {
  const custom = name !== fallback
  const commit = (value: string) => {
    if (value.trim() !== name) renameLayer(uid, index, value)
  }
  return (
    <li className="flex items-center gap-3">
      <span className="w-4 text-right text-xs text-muted tabular-nums">{index}</span>
      {/* Keyed on the name, so a rename elsewhere (the layer stack) shows here too. */}
      <TextInput
        key={name}
        aria-label={`Name of layer ${index}`}
        defaultValue={name}
        placeholder={fallback}
        maxLength={24}
        onBlur={(e) => commit(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            e.currentTarget.value = name
            e.currentTarget.blur()
          }
        }}
        className="w-full max-w-64 flex-1"
      />
      {custom && (
        <span className="flex min-w-0 items-center gap-1 text-[13px] text-muted">
          <IconButton label={`Reset layer ${index} to “${fallback}”`} className="size-7 shrink-0" onClick={() => renameLayer(uid, index, '')}>
            <RotateCcw size={14} />
          </IconButton>
          <span className="truncate">Default: {fallback}</span>
        </span>
      )}
    </li>
  )
}

export function LayerNames() {
  const status = useDevice((s) => s.status)
  const keyboard = useDevice((s) => s.keyboard)
  const link = useDevice((s) => s.link)
  const names = useLayerNames(keyboard, link)
  const known = knownLayerNames(keyboard, link)
  const connected = status === 'ready' && keyboard !== null

  return (
    <Card
      title="Layer names"
      help="layer-names"
      description={
        connected
          ? `What the layers of ${keyboard.name} are called here. The names are kept in this browser; leave one empty for the default.`
          : 'What the layers of your keyboard are called here.'
      }
    >
      {connected ? (
        <ul aria-label="Layer names" className="flex flex-col gap-2">
          {names.map((name, i) => (
            <LayerNameRow key={i} uid={keyboard.uid} index={i} name={name} fallback={defaultLayerName(i, known)} />
          ))}
        </ul>
      ) : (
        <p className="text-muted">Connect a keyboard to name its layers.</p>
      )}
    </Card>
  )
}
