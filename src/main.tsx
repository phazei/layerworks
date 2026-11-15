// SPDX-License-Identifier: GPL-3.0-or-later
// Starts the app: registers the built-in pages, reads the URL's options and shows the shell.
//   ?demo           connects the demo keyboard
//   ?help=<topic>   opens the help panel at a topic (src/help/topics.ts)
//   ?theme=dark     forces a theme without remembering it (src/ui/theme.ts)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { openHelp } from './help/help-store'
import { HELP_TOPICS, type HelpTopicId } from './help/topics'
import './pages'
import { Shell } from './shell/Shell'
import { connectDemo } from './shell/session'
import './styles.css'

const params = new URLSearchParams(location.search)
if (params.has('demo')) void connectDemo()
const help = params.get('help')
if (help && help in HELP_TOPICS) openHelp(help as HelpTopicId)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
)
