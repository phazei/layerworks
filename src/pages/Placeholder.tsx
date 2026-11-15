// SPDX-License-Identifier: GPL-3.0-or-later
// Stands in for a page that isn't built yet: a sentence or two saying what it will hold.

import type { ReactNode } from 'react'
import { Badge } from '../ui/controls'
import { Card } from '../ui/layout'

export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-2xl">
      <Card>
        <div className="mb-2">
          <Badge>Coming soon</Badge>
        </div>
        <div className="flex flex-col gap-2 leading-relaxed text-muted">{children}</div>
      </Card>
    </div>
  )
}
