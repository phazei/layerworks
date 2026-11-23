// SPDX-License-Identifier: GPL-3.0-or-later
// A small moving swatch hinting at what an effect looks like, in the chosen colour where the effect uses it and
// at the chosen speed where it uses that. A hint, not a simulation: the keyboard itself is the real preview.
//
// Each preview moves the way its effect moves on the keyboard, seen from above with the top row at the top. The
// direction is worked out from the effect's maths in vial-qmk quantum/rgb_matrix/animations/ (noted per case
// below), with these conventions:
// - LED coordinates: x grows to the right, y grows downwards (towards the typist); the centre is k_rgb_matrix_center.
// - atan2_8(dy, dx) (lib/lib8tion/trig8.h) grows from +x towards +y, which with y downwards is clockwise.
// - A pattern f(position) - time moves towards growing f; f(position) + time towards shrinking f.
// - The sin/cos runner (runners/effect_runner_sin_cos_i.h) passes cos8 - 128 as the effects' "sin" argument and
//   sin8 - 128 as "cos", so the beacons' direction is (cos t, sin t): it turns clockwise.
// - Runners differ in pace: effect_runner_i and the sin/cos runner scale time by speed / 4, the dx/dy runners by
//   speed / 2, so the first kind loops at half the rate (--lw-times: 2).

import type { CSSProperties, ReactNode } from 'react'
import { hsvCss, hsvCssAt } from './colour'
import type { EffectInfo } from './effects'
import './lighting.css'

/** Unlit keys. A colour of the preview, not of the app's theme. */
const DARK = 'hsl(0 0% 9%)'

/** Colour stops for hues `from` to `to` (QMK units, any range), evenly spaced. */
const hues = (from: number, to: number, sat: number, steps = 6) =>
  Array.from({ length: steps + 1 }, (_, i) => hsvCss((((from + ((to - from) * i) / steps) % 256) + 256) % 256, sat))

/**
 * Stops with positions in px, for repeating gradients: one rainbow every `period` px. `flowing`: the stops move
 * back by one period as --lw-shift goes from 0 to 1 (.lw-fx-flow), so the colours travel towards the start.
 */
const rainbowPx = (sat: number, period: number, flowing = false) =>
  hues(0, 256, sat)
    .map((colour, i) => {
      const at = `${((period * i) / 6).toFixed(2)}px`
      return `${colour} ${flowing ? `calc(${at} - var(--lw-shift) * ${period}px)` : at}`
    })
    .join(', ')

/** Twist of the spirals: hue (or brightness) grows by 1 per LED unit of distance, 7 units per preview px. */
const SPIRAL_TWIST = (7 * 360) / 256

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
  const c = (offset = 0, value = 1) => hsvCss((((h + offset) % 256) + 256) % 256, s, value)
  const white = hsvCss(h, 0)
  // From 6 s at the slowest to 1 s at the fastest; still effects keep a calm pace.
  const duration = effect.speed === true ? 6 - (speed / 255) * 5 : 3
  const style = { '--lw-dur': `${duration.toFixed(2)}s` } as CSSProperties
  const times = (n: number) => ({ '--lw-times': n }) as CSSProperties

  const box = 'lw-fx size-8 shrink-0 rounded-control'
  const drifts = `absolute inset-0 ${effect.hue === true ? '' : 'lw-fx-hue lw-fx-slow'}`
  // Gradients go in background-image, so the classes' background-size still applies.
  const paint = (background: string): CSSProperties =>
    background.includes('gradient(') ? { backgroundImage: background } : { backgroundColor: background }
  const bg = (background: string, className = '', extra?: CSSProperties) => (
    <span aria-hidden className={`${box} ${className}`} style={{ ...style, ...extra, ...paint(background) }} />
  )
  const on = (children: ReactNode, background = DARK) => (
    <span aria-hidden className={box} style={{ ...style, backgroundColor: background }}>
      {children}
    </span>
  )
  /** Where the pressed keys are: one, or two for the effects that answer every key. */
  const keys = effect.many
    ? [
        { left: 10, top: 11, delay: 0 },
        { left: 22, top: 21, delay: -0.5 },
      ]
    : [{ left: 16, top: 16, delay: 0 }]
  const at = (key: (typeof keys)[number]): CSSProperties => ({
    left: key.left,
    top: key.top,
    animationDelay: `calc(var(--lw-dur) * ${key.delay})`,
  })

  /**
   * A spiral: rings of a conic gradient, each outer one turned further clockwise, so the blades curve. `paint`
   * draws one ring from a start angle; the whole turns anticlockwise (both spirals: dist - time - atan2).
   */
  const spiral = (draw: (fromDeg: number) => string) => {
    // One ring per px out to the preview's corners (23 px); beyond that the square behind them shows.
    const radii = Array.from({ length: 23 }, (_, i) => 23 - i)
    return on(
      <span className="lw-fx-spin lw-fx-ccw" style={{ backgroundImage: draw(SPIRAL_TWIST * 24) }}>
        {radii.map((r) => (
          <span
            key={r}
            className="absolute"
            style={{ inset: 32 - r, borderRadius: '50%', backgroundImage: draw(SPIRAL_TWIST * (r - 0.5)) }}
          />
        ))}
      </span>,
    )
  }

  switch (effect.preview) {
    case 'solid':
      return bg(c())
    case 'two':
      return bg(`linear-gradient(to right, ${c()} 62%, ${c(64)} 62%)`)
    // gradient_up_down_anim.h: hue grows downwards. gradient_left_right_anim.h: hue grows to the right. Still.
    case 'gradient-v':
      return bg(`linear-gradient(to bottom, ${c()}, ${c(64)})`)
    case 'gradient-h':
      return bg(`linear-gradient(to right, ${c()}, ${c(64)})`)
    case 'breathe':
      return bg(c(), 'lw-fx-breathe')

    // colorband_sat_anim.h / colorband_val_anim.h: one band where scale8(x, 228) + 28 = time, so it moves left to
    // right; away from it saturation (sat) or brightness (val) falls to 0: white keys, or dark ones.
    case 'band-sat':
    case 'band-val': {
      const off = effect.preview === 'band-sat' ? white : DARK
      return bg(`linear-gradient(to right, ${off} 22%, ${c()} 36%, ${off} 50%, ${off})`, 'lw-fx-slide-h', times(2))
    }
    // colorband_pinwheel_{sat,val}_anim.h: value - time - 3·atan2: three blades, fading clockwise, turning
    // anticlockwise a third of a turn per loop.
    case 'pinwheel-sat':
    case 'pinwheel-val': {
      const end = effect.preview === 'pinwheel-sat' ? white : c(0, 0.08)
      return on(
        <span
          className="lw-fx-spin lw-fx-ccw"
          style={{ ...times(3), backgroundImage: `repeating-conic-gradient(${c()} 0deg, ${end} 120deg)` }}
        />,
      )
    }
    // colorband_spiral_{sat,val}_anim.h: value + dist - time - atan2: one curved blade fading clockwise, turning
    // anticlockwise (the same as moving outwards).
    case 'spiral-sat':
    case 'spiral-val': {
      const end = effect.preview === 'spiral-sat' ? white : c(0, 0.08)
      return spiral((from) => `conic-gradient(from ${from.toFixed(1)}deg, ${c()}, ${end})`)
    }
    // cycle_all_anim.h: hue = time, all keys together.
    case 'rainbow-all':
      return bg(hsvCssAt('var(--lw-turn)', s), 'lw-fx-cycle', times(2))
    // cycle_left_right_anim.h: hue = x - time: hue grows to the right and the rainbow moves right.
    case 'rainbow-h':
      return on(
        <span className="lw-fx-shift-x" style={{ ...times(2), backgroundImage: `repeating-linear-gradient(to right, ${rainbowPx(s, 32)})` }} />,
      )
    // cycle_up_down_anim.h: hue = y - time: hue grows downwards and the rainbow moves down, top row to bottom.
    case 'rainbow-v':
      return on(
        <span className="lw-fx-shift-y" style={{ ...times(2), backgroundImage: `repeating-linear-gradient(to bottom, ${rainbowPx(s, 32)})` }} />,
      )
    // rainbow_moving_chevron_anim.h: hue += |y - centre.y| + x - time: stripes bent into a ">" (rows away from the
    // middle lag behind), moving right. Top half: hue grows towards the top right; bottom half: the bottom right.
    // One period across is 32 px, so the stripes run at 45° with a period of 32 / √2 px.
    case 'chevron': {
      const period = 32 / Math.SQRT2
      return on(
        <>
          <span className="lw-fx-shift-x" style={{ ...times(2), bottom: '50%', backgroundImage: `repeating-linear-gradient(45deg, ${rainbowPx(s, period)})` }} />
          <span className="lw-fx-shift-x" style={{ ...times(2), top: '50%', backgroundImage: `repeating-linear-gradient(135deg, ${rainbowPx(s, period)})` }} />
        </>,
      )
    }
    // cycle_out_in_anim.h: hue = 1.5·dist + time: hue grows outwards and the rings move in towards the middle.
    case 'rainbow-rings':
      return bg(`repeating-radial-gradient(circle, ${rainbowPx(s, 24, true)})`, 'lw-fx-flow')
    // cycle_out_in_dual_anim.h: the same with dist measured from the middle of each half, 3·dist: twice as many
    // rings, moving in towards two centres side by side.
    case 'rainbow-rings-dual':
      return bg(
        `repeating-radial-gradient(circle, ${rainbowPx(s, 12, true)}), repeating-radial-gradient(circle, ${rainbowPx(s, 12, true)})`,
        'lw-fx-flow',
        { backgroundSize: '50% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'left, right' },
      )
    // cycle_pinwheel_anim.h: hue = atan2 + time: the rainbow round the centre grows clockwise, with straight
    // blades, and turns anticlockwise.
    case 'rainbow-pinwheel':
      return on(<span className="lw-fx-spin lw-fx-ccw" style={{ backgroundImage: `conic-gradient(${hues(0, 256, s).join(', ')})` }} />)
    // cycle_spiral_anim.h: hue = dist - time - atan2: hue falls clockwise and grows outwards, so the blades curve;
    // turns anticlockwise.
    case 'rainbow-spiral':
      return spiral((from) => `conic-gradient(from ${from.toFixed(1)}deg, ${hues(0, -256, s).join(', ')})`)
    // dual_beacon_anim.h: hue += (dy·sin t + dx·cos t) / 128 (see the runner note): a straight gradient through the
    // centre, about ±110 around the chosen hue across the keys, turning clockwise.
    case 'beacon':
      return on(
        <span
          className="lw-fx-spin"
          style={{ ...times(2), backgroundImage: `linear-gradient(to right, ${Array.from({ length: 9 }, (_, i) => c(-220 + i * 55)).join(', ')})` }}
        />,
      )
    // rainbow_beacon_anim.h: the same at twice the spread, nearly two rainbows across the keys; turns clockwise.
    case 'rainbow-beacon':
      return on(
        <span className="lw-fx-spin" style={{ ...times(2), backgroundImage: `repeating-linear-gradient(to right, ${rainbowPx(s, 18)})` }} />,
      )
    // rainbow_pinwheels_anim.h: hue += 3·(dy·sin t + (56 - |dx|)·cos t) / 128: a beacon in each half, about the
    // middle of that half, mirrored: the left one turns clockwise, the right one anticlockwise.
    case 'rainbow-pinwheels': {
      const half = (side: 'left' | 'right') => (
        <span
          className="absolute top-0 h-full w-1/2 overflow-hidden"
          style={side === 'left' ? { left: 0 } : { right: 0, transform: 'scaleX(-1)' }}
        >
          <span
            className="lw-fx-turn"
            style={{ ...times(2), left: -12, top: -4, width: 40, height: 40, backgroundImage: `repeating-linear-gradient(to right, ${rainbowPx(s, 12)})` }}
          />
        </span>
      )
      return on(
        <>
          {half('left')}
          {half('right')}
        </>,
      )
    }
    // hue_breathing_anim.h: every key's hue rises by up to 12 and back, together.
    case 'hue-breathe':
      return bg(c(), 'lw-fx-shimmer')
    // hue_pendulum_anim.h: hue + up to 12 by |sin(time) + x - 128|: the shift swings left and right.
    case 'hue-pendulum':
      return on(<span className="lw-fx-swing" style={{ backgroundImage: `linear-gradient(to right, ${c()}, ${c(12)}, ${c()})` }} />)
    // hue_wave_anim.h: hue + up to 24 by |x - time|: the shift moves left to right.
    case 'hue-wave':
      return on(
        <span className="lw-fx-shift-x" style={{ ...times(2), backgroundImage: `repeating-linear-gradient(to right, ${c()} 0px, ${c(17)} 16px, ${c()} 32px)` }} />,
      )
    // raindrops, jellybean_raindrops, pixel_rain, pixel_fractal: keys at random, no direction.
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
    // digital_rain_anim.h: drops move from row 0 to the last row: downwards.
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
    // solid_reactive_simple_anim.h: the pressed key lights and fades; the rest stays dark.
    case 'react':
      return on(
        <span className={drifts} style={{ background: c(0, 0.45) }}>
          <span className="lw-fx-pop" style={{ background: c() }} />
        </span>,
      )
    // solid_reactive_anim.h: all keys lit; the pressed one shifts by up to 64 in hue and drifts back.
    case 'react-shift':
      return on(
        <span className={drifts} style={{ background: c() }}>
          <span className="lw-fx-pop" style={{ background: c(64) }} />
        </span>,
      )
    // solid_reactive_wide.h: brightness 255 - (tick + 5·dist): brightest at the key, shrinking back into it.
    case 'glow':
      return on(
        <span className={drifts} style={{ background: c(0, 0.3) }}>
          {keys.map((key, i) => (
            <span key={i} className="lw-fx-shrink" style={{ ...at(key), backgroundImage: `radial-gradient(circle, ${c()} 0 3px, transparent 15px)` }} />
          ))}
        </span>,
      )
    // solid_reactive_cross.h: tick + dist + min(|dx|, |dy|)·16: the key's row and column, shrinking back into it.
    case 'cross':
      return on(
        <span className={drifts} style={{ background: c(0, 0.3) }}>
          {keys.map((key, i) => (
            <span
              key={i}
              className="lw-fx-shrink"
              style={{
                ...at(key),
                backgroundImage: `linear-gradient(${c()}, ${c()}), linear-gradient(${c()}, ${c()})`,
                backgroundSize: '100% 4px, 4px 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
          ))}
        </span>,
      )
    // solid_reactive_nexus.h: tick - dist, only within 8 units of the key's row or column: sparks running out
    // along them, away from the key.
    case 'nexus':
      return on(
        <span className="absolute inset-0" style={{ background: c(0, 0.3) }}>
          {keys.flatMap((key, i) =>
            [
              ['14px', '0px'],
              ['-14px', '0px'],
              ['0px', '14px'],
              ['0px', '-14px'],
            ].map(([x, y]) => (
              <span
                key={`${i}${x}${y}`}
                className="lw-fx-fly"
                style={{ ...at(key), background: c(), '--lw-to-x': x, '--lw-to-y': y } as CSSProperties}
              />
            )),
          )}
        </span>,
      )
    // splash_anim.h / solid_splash_anim.h: tick - dist: a ring moving outwards from the key. Splash adds the same
    // amount to the hue, so behind the front the colour moves on round the rainbow.
    case 'splash':
    case 'splash-colours':
      return on(
        <span className="absolute inset-0" style={{ background: c(0, 0.3) }}>
          {keys.map((key, i) => (
            <span key={i} className="lw-fx-ring" style={{ ...at(key), borderColor: c() }} />
          ))}
          {effect.preview === 'splash-colours' &&
            keys.map((key, i) => (
              <span
                key={`b${i}`}
                className="lw-fx-ring"
                style={{ ...at(key), borderColor: c(70), animationDelay: `calc(var(--lw-dur) * ${key.delay - 0.8})` }}
              />
            ))}
        </span>,
      )
    case 'per-key':
      return bg(
        `conic-gradient(${hsvCss(0, 220)} 0 25%, ${hsvCss(43, 220)} 0 50%, ${hsvCss(150, 220)} 0 75%, ${hsvCss(200, 220)} 0)`,
      )
    case 'zones':
      return bg(`linear-gradient(to bottom, ${hsvCss(170, 230)} 50%, ${hsvCss(0, 0)} 50%)`)
  }
}
