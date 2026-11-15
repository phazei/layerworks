// SPDX-License-Identifier: GPL-3.0-or-later
// Files in and out of the browser: a button that opens the file picker, and saving text as a download.

import { useRef, type ComponentProps } from 'react'
import { Button } from './controls'

interface FileButtonProps extends Omit<ComponentProps<typeof Button>, 'onClick'> {
  /** File types the picker offers, e.g. ".json,.vil". */
  accept?: string
  onFile: (file: File) => void
}

/** A button that opens the browser's file picker; `onFile` gets the file chosen. */
export function FileButton({ accept, onFile, disabled, ...rest }: FileButtonProps) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <Button disabled={disabled} onClick={() => input.current?.click()} {...rest} />
      <input
        ref={input}
        type="file"
        accept={accept}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          // Cleared, so choosing the same file again still counts as a choice.
          e.target.value = ''
          if (file) onFile(file)
        }}
      />
    </>
  )
}

/** Saves text as a file in the browser's downloads. */
export function downloadText(fileName: string, text: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Some browsers start the download after the click returns.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** A chosen file's text. */
export function readText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('The file could not be read.'))
    reader.readAsText(file)
  })
}
