// SPDX-License-Identifier: GPL-3.0-or-later
// The built-in sections, registered as the "core" plugin: the same path a plugin takes. Each page lives in its
// own file and is listed here in sidebar order. Importing this module registers them, once.

import { definePlugin } from '../plugins/api'
import { devicePage } from './Device'
import { helpPage } from './Help'
import { homePage } from './Home'
import { keysPage } from './Keys'
import { lightingPage } from './Lighting'
import { settingsPage } from './Settings'
import { shortcutsPage } from './Shortcuts'
import { testPage } from './Test'
import { typingPage } from './Typing'

export const corePlugin = definePlugin({
  id: 'core',
  pages: [homePage, keysPage, shortcutsPage, lightingPage, typingPage, testPage, devicePage, helpPage, settingsPage],
})
