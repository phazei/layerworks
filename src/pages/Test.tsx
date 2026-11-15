// SPDX-License-Identifier: GPL-3.0-or-later
// Test: press keys and watch them light up, to check every key works.

import { Activity } from 'lucide-react'
import type { PageDef } from '../plugins/api'
import { Placeholder } from './Placeholder'

function TestPage() {
  return (
    <Placeholder>
      <p>
        Press keys and watch them light up in the picture; each key stays marked once it has been seen, so you can
        check that every key works.
      </p>
    </Placeholder>
  )
}

export const testPage: PageDef = { path: 'test', title: 'Test', icon: Activity, stage: 'view', component: TestPage }
