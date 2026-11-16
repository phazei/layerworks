// SPDX-License-Identifier: GPL-3.0-or-later
// The size of an element as it changes (ResizeObserver). Zero until measured, and where there is no
// ResizeObserver (tests).

import { useLayoutEffect, useState, type RefObject } from 'react'

export interface Size {
  width: number
  height: number
}

const ZERO: Size = { width: 0, height: 0 }

export function useElementSize(ref: RefObject<HTMLElement | null>): Size {
  const [size, setSize] = useState<Size>(ZERO)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const measure = () =>
      setSize((old) =>
        old.width === element.clientWidth && old.height === element.clientHeight
          ? old
          : { width: element.clientWidth, height: element.clientHeight },
      )
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return size
}
