// SPDX-License-Identifier: GPL-3.0-or-later
// Dark, light, or whatever the system uses. Applied as the `dark` class on <html>, which tokens.css keys off.
// index.html repeats the first step in a tiny script so the page doesn't flash the wrong theme while loading.

import { useEffect } from 'react'
import { usePref } from './prefs'

export type ThemeChoice = 'dark' | 'light' | 'system'

export const THEME_PREF = 'theme'
const DEFAULT: ThemeChoice = 'dark'

export function useThemeChoice(): [ThemeChoice, (choice: ThemeChoice) => void] {
  return usePref<ThemeChoice>(THEME_PREF, DEFAULT)
}

/** `?theme=dark` or `?theme=light` in the URL forces a theme without remembering it (for screenshots). */
export function themeOverride(search: string): 'dark' | 'light' | null {
  const forced = new URLSearchParams(search).get('theme')
  return forced === 'dark' || forced === 'light' ? forced : null
}

export function resolveTheme(choice: ThemeChoice, systemDark: boolean): 'dark' | 'light' {
  return choice === 'system' ? (systemDark ? 'dark' : 'light') : choice
}

const systemQuery = () => (typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null)

/** Keeps the `dark` class on <html> in step with the chosen theme (and the system's, when following it). */
export function useAppliedTheme(): void {
  const [choice] = useThemeChoice()
  useEffect(() => {
    const query = systemQuery()
    const apply = () => {
      const theme = themeOverride(location.search) ?? resolveTheme(choice, query?.matches ?? true)
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }
    apply()
    if (choice !== 'system' || !query) return
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [choice])
}
