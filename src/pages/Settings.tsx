// SPDX-License-Identifier: GPL-3.0-or-later
// Settings for the app itself (not the keyboard): theme, the tour, key names, layer names, and about Layerworks.
// Works offline.

import type { ReactNode } from 'react'
import { Monitor, Moon, Settings, Sun } from 'lucide-react'
import type { PageDef } from '../plugins/api'
import { Segmented } from '../ui/controls'
import { Card } from '../ui/layout'
import { useThemeChoice, type ThemeChoice } from '../ui/theme'
import { About } from './settings/About'
import { KeyLegends } from './settings/KeyLegends'
import { LayerNames } from './settings/LayerNames'
import { TourCard } from './settings/TourCard'

const THEMES: { value: ThemeChoice; label: ReactNode }[] = [
  { value: 'dark', label: <span className="inline-flex items-center gap-1.5"><Moon size={14} aria-hidden />Dark</span> },
  { value: 'light', label: <span className="inline-flex items-center gap-1.5"><Sun size={14} aria-hidden />Light</span> },
  { value: 'system', label: <span className="inline-flex items-center gap-1.5"><Monitor size={14} aria-hidden />Like the system</span> },
]

function SettingsPage() {
  const [theme, setTheme] = useThemeChoice()
  return (
    // One column of readable width; side by side once there is room for two, About on the right.
    <div className="@container max-w-6xl">
      <div className="grid items-start gap-4 @4xl:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card title="Appearance" description="How Layerworks looks in this browser.">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <span>Theme</span>
              <Segmented label="Theme" value={theme} options={THEMES} onChange={setTheme} />
            </div>
          </Card>
          <TourCard />
          <KeyLegends />
          <LayerNames />
        </div>
        <About />
      </div>
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
