// SPDX-License-Identifier: GPL-3.0-or-later
// Keychron's firmware version string, e.g. "v1.1.2 2026-03-01-12:00:00", in words.

export interface FirmwareVersion {
  /** "1.1.2", or the whole string when it doesn't look like a version. */
  version: string
  /** When it was built; null when unknown or left out (builds with SKIP_VERSION say 1970-01-01). */
  built: Date | null
}

export function readFirmware(text: string): FirmwareVersion | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const match = /^v?(\d+(?:\.\d+)+)\s*(.*)$/.exec(trimmed)
  if (!match) return { version: trimmed, built: null }
  const date = /^(\d{4})-(\d{2})-(\d{2})/.exec(match[2])
  const built = date && date[1] !== '1970' ? new Date(Number(date[1]), Number(date[2]) - 1, Number(date[3])) : null
  return { version: match[1], built: built && !Number.isNaN(built.getTime()) ? built : null }
}
