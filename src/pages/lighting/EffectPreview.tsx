// SPDX-License-Identifier: GPL-3.0-or-later
// A small moving swatch hinting at what an effect looks like, in the chosen colour where the effect uses it and
// at the chosen speed where it uses that. A hint, not a simulation: the keyboard itself is the real preview.

import type { CSSProperties, ReactNode } from 'react'
import { hsvCss } from './colour'
import type { EffectInfo } from './effects'
import './lighting.css'

/** Unlit keys. A colour of the preview, not of the app's theme. */
const DARK = 'hsl(0 0% 9%)'

const rainbow = (sat: number, steps = [0, 43, 85, 128, 170, 213, 256]) => steps.map((h) => hsvCss(h % 256, sat)).join(', ')

interface Props {
  effect: EffectInfo
  hue: number
  sat: number
  speed: number
}

export function EffectPreview({ effect, hue, sat, speed }: Props) {
  // Effects that pick their own colours are previewed in theirs; the rest in the chosen colour.
  const h = effect.hue === true ? hue : 0
  const s = effect.sat === true ? sat : 255
  const c = (offset = 0, value = 1) => hsvCss((h + offset + 256) % 256, s, value)
  // From 6 s at the slowest to 1 s at the fastest; still effects keep a calm pace.
  const duration = effect.speed === true ? 6 - (speed / 255) * 5 : 3
  const style = { '--lw-dur': `${duration.toFixed(2)}s` } as CSSProperties

  const box = 'lw-fx size-8 shrink-0 rounded-control'
  const drifts = `absolute inset-0 ${effect.hue === true ? '' : 'lw-fx-hue lw-fx-slow'}`
  // Gradients go in background-image, so the classes' background-size still applies.
  const paint = (background: string): CSSProperties =>
    background.includes('gradient(') ? { backgroundImage: background } : { backgroundColor: background }
  const bg = (background: string, className = '') => (
    <span aria-hidden className={`${box} ${className}`} style={{ ...style, ...paint(background) }} />
  )
  const on = (children: ReactNode, background = DARK) => (
    <span aria-hidden className={box} style={{ ...style, backgroundColor: background }}>
      {children}
    </span>
  )

  switch (effect.preview) {
    case 'solid':
      return bg(c())
    case 'two':
      return bg(`linear-gradient(to right, ${c()} 62%, ${c(64)} 62%)`)
    case 'gradient-v':
      return bg(`linear-gradient(to bottom, ${c()}, ${c(64)})`)
    case 'gradient-h':
      return bg(`linear-gradient(to right, ${c()}, ${c(64)})`)
    case 'breathe':
      return bg(c(), 'lw-fx-breathe')
    case 'band':
      return bg(`linear-gradient(to right, ${c(0, 0.2)}, ${c()} 50%, ${c(0, 0.2)})`, 'lw-fx-slide-h')
    case 'spin':
      return on(<span className="lw-fx-spin" style={{ background: `conic-gradient(${c()}, ${c(20, 0.25)}, ${c()})` }} />)
    case 'rainbow-all':
      return bg(hsvCss(0, s), 'lw-fx-hue')
    case 'rainbow-h':
      return bg(`linear-gradient(to right, ${rainbow(s)})`, 'lw-fx-slide-h')
    case 'rainbow-v':
      return bg(`linear-gradient(to top, ${rainbow(s)})`, 'lw-fx-slide-v')
    case 'rainbow-rings':
      return bg(`repeating-radial-gradient(circle, ${rainbow(s)} 22px)`, 'lw-fx-hue')
    case 'rainbow-spin':
      return on(<span className="lw-fx-spin" style={{ background: `conic-gradient(${rainbow(s)})` }} />)
    case 'shimmer':
      return bg(`linear-gradient(135deg, ${c()}, ${c(16)})`, 'lw-fx-shimmer')
    case 'rain':
    case 'rain-random': {
      const colours = effect.preview === 'rain' ? [c(), c(20), c(-20)] : [hsvCss(10, 230), hsvCss(95, 200), hsvCss(180, 240)]
      const spots = [
        { left: 4, top: 5 },
        { left: 19, top: 10 },
        { left: 9, top: 20 },
      ]
      return on(
        spots.map((spot, i) => (
          <span
            key={i}
            className="lw-fx-dot"
            style={{ ...spot, background: colours[i], animationDelay: `calc(var(--lw-dur) * ${-i / 3})` }}
          />
        )),
      )
    }
    case 'matrix': {
      const green = 'hsl(130 90% 50%)'
      return on(
        [5, 14, 23].map((left, i) => (
          <span
            key={left}
            className="lw-fx-drop"
            style={{ left, background: `linear-gradient(to bottom, transparent, ${green})`, animationDelay: `${-i * 0.9}s` }}
          />
        )),
      )
    }
    case 'heat':
      return bg(
        `radial-gradient(circle at 60% 55%, ${hsvCss(0, s)} 0 4px, ${hsvCss(43, s)} 7px, ${hsvCss(170, s, 0.8)} 13px, ${DARK} 17px)`,
      )
    // Effects that drift through the colours by themselves (effect.hue is a reason) turn round the rainbow.
    case 'react':
      return on(<span className={drifts} style={{ background: c(0, 0.45) }}><span className="lw-fx-pop" style={{ background: c() }} /></span>)
    case 'splash':
      return on(<span className={drifts} style={{ background: c(0, 0.45) }}><span className="lw-fx-ring" style={{ borderColor: c() }} /></span>)
    case 'per-key':
      return bg(
        `conic-gradient(${hsvCss(0, 220)} 0 25%, ${hsvCss(43, 220)} 0 50%, ${hsvCss(150, 220)} 0 75%, ${hsvCss(200, 220)} 0)`,
      )
    case 'zones':
      return bg(`linear-gradient(to bottom, ${hsvCss(170, 230)} 50%, ${hsvCss(0, 0)} 50%)`)
  }
}
