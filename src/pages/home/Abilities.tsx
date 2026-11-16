// SPDX-License-Identifier: GPL-3.0-or-later
// What the keyboard can do, from its capabilities: the features it has in view, the ones it lacks folded away
// with the reason for each.

import { Check, Minus } from 'lucide-react'
import { useMemo } from 'react'
import { useDevice } from '../../device'
import { Card, Disclosure } from '../../ui/layout'
import { describeCapabilities, type FeatureLine } from './features'

function Line({ line }: { line: FeatureLine }) {
  const note = [line.qmkName, line.detail].filter(Boolean).join(' · ')
  return (
    <li className="flex items-start gap-2.5">
      {line.available ? (
        <Check size={16} aria-hidden className="mt-0.5 shrink-0 text-success" />
      ) : (
        <Minus size={16} aria-hidden className="mt-0.5 shrink-0 text-muted" />
      )}
      <span className="min-w-0">
        <span>{line.name}</span>
        {line.available
          ? note && <span className="ml-2 text-[13px] text-muted">{note}</span>
          : <span className="block text-[13px] text-muted">{line.reason}</span>}
      </span>
    </li>
  )
}

export function Abilities() {
  const capabilities = useDevice((s) => s.capabilities)
  const lines = useMemo(() => (capabilities ? describeCapabilities(capabilities) : []), [capabilities])
  if (!capabilities) return null

  const has = lines.filter((line) => line.available)
  const lacks = lines.filter((line) => !line.available)

  return (
    <Card title="What this keyboard can do" help="keyboard-features" description="Read from the keyboard when it connected.">
      <ul aria-label="Features" className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {has.map((line) => (
          <Line key={line.id} line={line} />
        ))}
      </ul>
      {lacks.length > 0 && (
        <Disclosure id="home-unavailable" label={`Not available on this keyboard (${lacks.length})`}>
          <ul aria-label="Not available" className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {lacks.map((line) => (
              <Line key={line.id} line={line} />
            ))}
          </ul>
        </Disclosure>
      )}
    </Card>
  )
}
