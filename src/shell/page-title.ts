// SPDX-License-Identifier: GPL-3.0-or-later
// The window's title follows the page shown ("Keys · Layerworks"), so the browser's tabs, history and screen
// readers say where the user is. The keyboard's name stays out of it: the title is about the app's page.

import { useEffect } from 'react'

export const APP_NAME = 'Layerworks'

/** The title for a page's name; null (no such page) says so. */
export function pageTitle(page: string | null): string {
  return `${page ?? 'Page not found'} · ${APP_NAME}`
}

/** Keeps `document.title` on the page's title while it is shown; the title index.html gives comes back after. */
export function usePageTitle(page: string | null): void {
  useEffect(() => {
    const before = document.title
    document.title = pageTitle(page)
    return () => {
      document.title = before
    }
  }, [page])
}
