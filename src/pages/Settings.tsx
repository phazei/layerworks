// SPDX-License-Identifier: GPL-3.0-or-later
// Settings for the app itself (not the keyboard): theme, layer names, and about Layerworks. Works offline.

import type { ReactNode } from 'react'
import { Monitor, Moon, Settings, Sun } from 'lucide-react'
import type { PageDef } from '../plugins/api'
import { Segmented } from '../ui/controls'
import { Card } from '../ui/layout'
import { useThemeChoice, type ThemeChoice } from '../ui/theme'
import { About } from './settings/About'
import { LayerNames } from './settings/LayerNames'

const THEMES: { value: ThemeChoice; label: ReactNode }[] = [
  { value: 'dark', label: <span className="inline-flex items-center gap-1.5"><Moon size={14} aria-hidden />Dark</span> },
  { value: 'light', label: <span className="inline-flex items-center gap-1.5"><Sun size={14} aria-hidden />Light</span> },
  { value: 'system', label: <span className="inline-flex items-center gap-1.5"><Monitor size={14} aria-hidden />Like the system</span> },
]

function SettingsPage() {
  const [theme, setTheme] = useThemeChoice()
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Card title="Appearance" description="How Layerworks looks in this browser.">
        <div className="flex items-center justify-between gap-4">
          <span>Theme</span>
          <Segmented label="Theme" value={theme} options={THEMES} onChange={setTheme} />
        </div>
      </Card>
      <LayerNames />
      <About />
    </div>
  )
}

export const settingsPage: PageDef = {
  path: 'settings',
  title: 'Settings',
  icon: Settings,
  group: 'app',
  offline: true,
  component: SettingsPage,
}
