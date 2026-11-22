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

/** Goes to a path in place of the current one, so Back skips it (an address that only redirects). */
export function replacePath(path: string): void {
  history.replaceState(history.state, '', `#${path}`)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}
