// SPDX-License-Identifier: GPL-3.0-or-later
// A box to type in while changing the tap-or-hold timing, to feel the difference straight away.

import { useId, useState } from 'react'
import { Button, TextInput } from '../../ui/controls'

export function TryIt() {
  const [text, setText] = useState('')
  const id = useId()
  return (
    <div className="mt-5 flex flex-col gap-1.5">
      <label htmlFor={id}>Try it here</label>
      <div className="flex gap-2">
        <TextInput
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tap and hold your tap-or-hold keys, then see what came out"
          className="flex-1"
        />
        {text && (
          <Button size="sm" variant="quiet" className="mt-0.5" onClick={() => setText('')}>
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
