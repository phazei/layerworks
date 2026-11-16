// SPDX-License-Identifier: GPL-3.0-or-later
// Starts the app: registers the built-in pages, reads the URL's options and shows the shell.
//   ?demo           connects the demo keyboard
//   ?help=<topic>   opens the help panel at a topic (src/help/topics.ts)
//   ?theme=dark     forces a theme without remembering it (src/ui/theme.ts)
//   ?demo-effect=25 starts the demo keyboard on another lighting effect (read in src/demo/demo-link.ts)
//   ?select=3,2     selects a key (row,col) or knob direction (knob,0,1) once a keyboard is in; ?layer=3 shows a layer
//   ?unlock         opens the unlock dialog once the keyboard's lock state is in; ?unlock=start starts unlocking
//   ?demo-unlocked  starts the demo keyboard unlocked; ?demo-press=0,1;3,14 presses demo keys by itself;
//                   ?demo-turn=1;0 turns its knob (what it sends reaches the page as a browser event);
//                   ?demo-wireless connects the demo through the 2.4 GHz receiver, with a battery level
//                   (all read in src/demo/demo-link.ts)
//   ?tour, ?tour=3  opens the first-run tour (at the third step); without any option the tour starts by itself
//                   the first time a keyboard is in on Home (src/help/tour.ts)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { openHelp } from './help/help-store'
import { isHelpTopic } from './help/topics'
import { armTour } from './help/tour'
import './pages'
import { Shell } from './shell/Shell'
import { connectDemo } from './shell/session'
import { parseSelection, stage } from './shell/stage-store'
import { openUnlock, startUnlock } from './shell/unlock-dialog'
import { deviceStore } from './device'
import './styles.css'

const params = new URLSearchParams(location.search)
if (params.has('demo')) void connectDemo()
const help = params.get('help')
if (help && isHelpTopic(help)) openHelp(help)
armTour(params)
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

const unlock = params.get('unlock')
if (unlock !== null) {
  const stop = deviceStore.subscribe(() => {
    if (!deviceStore.getState().unlock) return
    stop()
    if (unlock === 'start') void startUnlock()
    else openUnlock()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
)
