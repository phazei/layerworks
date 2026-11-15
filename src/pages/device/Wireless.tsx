// SPDX-License-Identifier: GPL-3.0-or-later
// Keychron's wireless timers: lights off and sleep, on Bluetooth and 2.4 GHz. Only on keyboards that have them.

import { BatteryFull, BatteryLow, BatteryMedium } from 'lucide-react'
import {
  BACKLIT_CHOICES,
  deviceStore,
  formatDuration,
  IDLE_CHOICES,
  timersProblem,
  useDevice,
  type WirelessTimers,
} from '../../device'
import { OptionButton } from '../../ui/controls'
import { Card, HelpButton } from '../../ui/layout'
import type { HelpTopicId } from '../../help/topics'

interface TimerProps {
  label: string
  help: HelpTopicId
  value: number
  choices: number[]
  /** The pair that picking `seconds` would make. */
  pair: (seconds: number) => WirelessTimers
}

function Timer({ label, help, value, choices, pair }: TimerProps) {
  const writing = useDevice((s) => s.writing > 0)
  const shown = choices.includes(value) ? choices : [...choices, value].sort((a, b) => a - b)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <span id={`timer-${help}`}>{label}</span>
        <HelpButton topic={help} />
      </div>
      <div role="group" aria-labelledby={`timer-${help}`} className="flex flex-wrap gap-1.5">
        {shown.map((seconds) => {
          const problem = seconds === value ? null : timersProblem(pair(seconds))
          return (
            <OptionButton
              key={seconds}
              shape="chip"
              selected={seconds === value}
              // Not allowed with the other timer as it is: shown, but not offered.
              disabled={problem !== null || writing}
              onClick={() => void deviceStore.setWirelessTimers(pair(seconds))}
            >
              {formatDuration(seconds)}
            </OptionButton>
          )
        })}
      </div>
    </div>
  )
}

export function Wireless() {
  const keychron = useDevice((s) => s.keychron)
  const link = useDevice((s) => s.link)
  if (!keychron?.hasWireless) return null
  const backlitTime = keychron.wirelessBacklitTime
  const idleTime = keychron.wirelessIdleTime
  const battery = link?.kind === 'receiver' && keychron.batteryLevel > 0 ? keychron.batteryLevel : null
  const BatteryIcon = battery === null || battery > 60 ? BatteryFull : battery > 25 ? BatteryMedium : BatteryLow

  return (
    <Card
      title="Wireless and sleep"
      description="How soon the keyboard saves its battery when it isn’t plugged in. The keyboard keeps these itself."
    >
      <div className="flex flex-col gap-5">
        {battery !== null && (
          <div className="flex items-center gap-2 text-[13px] text-muted">
            <BatteryIcon size={15} aria-hidden />
            Battery <span className="font-medium text-content tabular-nums">{battery} %</span>
          </div>
        )}
        <Timer
          label="Lights off after"
          help="lights-off-timer"
          value={backlitTime}
          choices={BACKLIT_CHOICES}
          pair={(seconds) => ({ backlitTime: seconds, idleTime })}
        />
        <Timer
          label="Sleep after"
          help="sleep-timer"
          value={idleTime}
          choices={IDLE_CHOICES}
          pair={(seconds) => ({ backlitTime, idleTime: seconds })}
        />
        <p className="text-[13px] text-muted">
          Times without a key press. The lights always go off before the keyboard sleeps, so a choice that would
          turn that around is greyed out. Changing a timer over 2.4 GHz makes the mouse pointer twitch once.
        </p>
      </div>
    </Card>
  )
}
