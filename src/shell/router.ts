// SPDX-License-Identifier: GPL-3.0-or-later
// Pages are addressed by the part of the URL after "#", e.g. "#/keys", so help can link straight to one.

import { useSyncExternalStore } from 'react'

const currentPath = () => location.hash.replace(/^#/, '') || '/'

function subscribe(listener: () => void): () => void {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, currentPath)
}

export function navigate(path: string): void {
  location.hash = path
}
