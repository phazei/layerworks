// SPDX-License-Identifier: GPL-3.0-or-later
// Settings: the first-run tour again, and the way to the Help page.

import { BookOpen, Route } from 'lucide-react'
import { tour } from '../../help/tour'
import { Button } from '../../ui/controls'
import { Card } from '../../ui/layout'

export function TourCard() {
  return (
    <Card title="Getting to know Layerworks" description="The tour from the first visit, and every explanation in one place.">
      <div className="flex flex-wrap items-center gap-2">
        <Button icon={<Route size={16} aria-hidden />} onClick={() => tour.start(0)}>
          Take the tour
        </Button>
        <a href="#/help" className="inline-flex h-9 items-center gap-2 rounded-pill px-4 font-medium text-muted hover:bg-raised hover:text-content">
          <BookOpen size={16} aria-hidden />
          Open Help
        </a>
      </div>
    </Card>
  )
}
