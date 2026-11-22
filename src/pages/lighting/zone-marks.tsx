// SPDX-License-Identifier: GPL-3.0-or-later
// How each lighting zone is marked: an outline colour and a line pattern, so zones differ by more than colour (two of
// the colours look alike to someone who can't tell red from green), with the same mark beside the zone's name.

/**
 * Outline colours for the zones on the picture. Data colours, apart in hue and the same in both themes, except that
 * the light theme takes a darker shade of each (`light-dark()`, by the page's color-scheme) so the outline reaches
 * 3:1 against a white key; the dark theme's shades reach it against its dark keys.
 */
export const ZONE_COLOURS = [
  'light-dark(hsl(36 95% 42%), hsl(36 95% 55%))',
  'light-dark(hsl(188 85% 39%), hsl(188 85% 48%))',
  'light-dark(hsl(300 75% 60%), hsl(300 75% 62%))',
  'light-dark(hsl(120 60% 41%), hsl(120 60% 48%))',
]

/**
 * Each zone's line, in the order of the colours: solid, dashed, dotted, dash-dot. `key` is for the outline round a
 * key on the picture (a key is 54 units across), `mark` for the small mark beside the zone's name; dots are drawn
 * with round ends.
 */
const ZONE_LINES: readonly { key: string; mark: string; round: boolean; name: string }[] = [
  { key: '', mark: '', round: false, name: 'solid' },
  { key: '9 4', mark: '4 2', round: false, name: 'dashed' },
  { key: '0.5 6', mark: '0.1 3.4', round: true, name: 'dotted' },
  { key: '12 4 0.5 4', mark: '5 2 0.1 2', round: false, name: 'dash-dot' },
]

export interface ZoneOutline {
  colour: string
  /** An SVG stroke-dasharray; empty for a solid line. */
  dash: string
  /** Round line ends (the dotted line). */
  round: boolean
}

/** The outline round a key in this zone, on the picture. */
export function zoneOutline(zone: number): ZoneOutline {
  const line = ZONE_LINES[zone % ZONE_LINES.length]
  return { colour: ZONE_COLOURS[zone % ZONE_COLOURS.length], dash: line.key, round: line.round }
}

/** The line's name ("dashed"), for words that describe the zone. */
export const zoneLineName = (zone: number): string => ZONE_LINES[zone % ZONE_LINES.length].name

/** The zone's mark beside its name: a small key outline drawn with the zone's colour and line. */
export function ZoneMark({ zone, size = 14 }: { zone: number; size?: number }) {
  const line = ZONE_LINES[zone % ZONE_LINES.length]
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 14 14" className="shrink-0">
      <rect
        x={1.5}
        y={1.5}
        width={11}
        height={11}
        rx={2.5}
        fill="none"
        strokeWidth={2}
        strokeLinecap={line.round ? 'round' : 'butt'}
        style={{ stroke: ZONE_COLOURS[zone % ZONE_COLOURS.length], strokeDasharray: line.mark || undefined }}
      />
    </svg>
  )
}
