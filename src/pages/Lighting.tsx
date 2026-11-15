// SPDX-License-Identifier: GPL-3.0-or-later
// Lighting: the effect the keys play, its brightness, speed and colour.

import { Lightbulb } from 'lucide-react'
import type { PageDef } from '../plugins/api'
import { Placeholder } from './Placeholder'

function LightingPage() {
  return (
    <Placeholder>
      <p>
        Pick a lighting effect and set its brightness, speed and colour. Changes show on the keyboard straight away
        and are kept on it.
      </p>
    </Placeholder>
  )
}

export const lightingPage: PageDef = {
  path: 'lighting',
  title: 'Lighting',
  icon: Lightbulb,
  stage: 'view',
  help: 'lighting-effect',
  component: LightingPage,
}
