// SPDX-License-Identifier: GPL-3.0-or-later
// Opening a file to restore from: a Layerworks backup or a Vial file, told apart by what is inside.

import { BACKUP_FORMAT, backupContents, backupIdentity, parseBackup } from './backup'
import type { FileIdentity, KeyboardContents } from './restore'
import { parseVil } from './vil'

export interface KeyboardFile {
  kind: 'backup' | 'vil'
  /** When it was saved (ISO), if the file says. */
  savedAt: string | null
  /** Firmware version at the time, if the file says. */
  firmware: string | null
  identity: FileIdentity
  contents: KeyboardContents
}

/**
 * Reads a file's text. `vialProtocol` is the connected keyboard's (for the macros in a Vial file). Throws an
 * Error whose message says, for the user, why the file can't be used.
 */
export function readKeyboardFile(text: string, vialProtocol: number): KeyboardFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('This file is neither a Layerworks backup nor a Vial file: it can’t be read as either.')
  }
  if (typeof data === 'object' && data !== null && (data as Record<string, unknown>).format === BACKUP_FORMAT) {
    const backup = parseBackup(text)
    return {
      kind: 'backup',
      savedAt: backup.savedAt || null,
      firmware: backup.keyboard.firmware,
      identity: backupIdentity(backup),
      contents: backupContents(backup),
    }
  }
  if (typeof data === 'object' && data !== null && 'layout' in data) {
    const { identity, contents } = parseVil(text, vialProtocol)
    return { kind: 'vil', savedAt: null, firmware: null, identity, contents }
  }
  throw new Error('This file is neither a Layerworks backup nor a Vial file.')
}
