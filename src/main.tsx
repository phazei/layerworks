// SPDX-License-Identifier: GPL-3.0-or-later
// Starts the app: registers the built-in pages, reads the URL's options and shows the shell.
//   ?demo           connects the demo keyboard
//   ?help=<topic>   opens the help panel at a topic (src/help/topics.ts)
//   ?theme=dark     forces a theme without remembering it (src/ui/theme.ts)
//   ?demo-effect=25 starts the demo keyboard on another lighting effect (read in src/demo/demo-link.ts)
//   ?select=3,2     selects a key (row,col) or knob direction (knob,0,1) once a keyboard is in; ?layer=3 shows a layer

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { openHelp } from './help/help-store'
import { HELP_TOPICS, type HelpTopicId } from './help/topics'
import './pages'
import { Shell } from './shell/Shell'
import { connectDemo } from './shell/session'
import { parseSelection, stage } from './shell/stage-store'
import { deviceStore } from './device'
import './styles.css'

const params = new URLSearchParams(location.search)
if (params.has('demo')) void connectDemo()
const help = params.get('help')
if (help && help in HELP_TOPICS) openHelp(help as HelpTopicId)
const select = parseSelection(params.get('select') ?? '')
const layer = params.get('layer')
if (select || layer) {
  // Once the keyboard is in and the shell has reset the stage for it.
  const stop = deviceStore.subscribe(() => {
    if (!deviceStore.getState().keyboard) return
    stop()
    setTimeout(() => {
      if (layer && /^\d+$/.test(layer)) stage.showLayer(Number(layer))
      if (select) stage.select(select)
    }, 100)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
)
