// SPDX-License-Identifier: GPL-3.0-or-later
// The connected keyboard at the top of the sidebar: its name, how it is connected, battery and lock state. With the
// sidebar showing icons only, the card is one icon (DeviceIcon) that says connected or not, how, and locked or
// unlocked, and opens the full card beside it; with no keyboard, the icon leads to the connect prompt on Home.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Cable,
  Keyboard,
  Lock,
  LockOpen,
  Plug,
  Radio,
  Sparkles,
  Unplug,
} from 'lucide-react'
import { deviceStore, neverLocks, useDevice } from '../device'
import { Badge, Button, cx, Spinner } from '../ui/controls'
import { HelpButton } from '../ui/layout'
import { PopoverButton } from '../ui/Popover'
import { Tip } from '../ui/Tip'
import { demoKeyboard, disconnect } from './session'
import { openUnlock } from './unlock-dialog'

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-6 items-center gap-2 text-[13px] text-muted">
      <span className="flex w-4 justify-center">{icon}</span>
      {children}
    </div>
  )
}

function Battery({ level }: { level: number }) {
  const Icon = level > 60 ? BatteryFull : level > 25 ? BatteryMedium : BatteryLow
  return (
    <Fact icon={<Icon size={15} aria-hidden />}>
      <span>
        Battery <span className="tabular-nums">{level} %</span>
      </span>
    </Fact>
  )
}

interface DeviceCardProps {
  /** In the popover: called before Unlock… and Disconnect, which take the focus elsewhere. */
  onLeave?: (why: 'unlock' | 'disconnect') => void
}

export function DeviceCard({ onLeave }: DeviceCardProps = {}) {
  const status = useDevice((s) => s.status)
  const link = useDevice((s) => s.link)
  const keyboard = useDevice((s) => s.keyboard)
  const keychron = useDevice((s) => s.keychron)
  const unlock = useDevice((s) => s.unlock)
  const unlocking = useDevice((s) => s.unlocking)

  if (status === 'connecting') {
    return (
      <div className="rounded-card bg-raised p-3.5">
        <div className="flex items-center gap-2 text-[13px] text-muted">
          <Spinner />
          Reading the keyboard…
        </div>
      </div>
    )
  }

  if (status !== 'ready' || !link) {
    return (
      <div className="flex items-center gap-2.5 rounded-card bg-raised p-3.5 text-[13px] text-muted">
        <Keyboard size={16} aria-hidden className="shrink-0" />
        No keyboard connected
      </div>
    )
  }

  const wireless = link.kind === 'receiver'
  const battery = wireless && keychron?.hasWireless && keychron.batteryLevel > 0 ? keychron.batteryLevel : null

  return (
    <section aria-label="Connected keyboard" className="flex flex-col gap-3 rounded-card bg-raised p-3.5">
      <div>
        <div className="leading-snug font-semibold">{keyboard?.name ?? link.productName}</div>
        {demoKeyboard() && (
          <div className="mt-1.5 flex items-center gap-0.5">
            <Badge tone="accent">Demo keyboard</Badge>
            <HelpButton topic="demo" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Fact icon={wireless ? <Radio size={15} aria-hidden /> : <Cable size={15} aria-hidden />}>
          {wireless ? '2.4 GHz receiver' : 'Cable'}
        </Fact>
        {battery !== null && <Battery level={battery} />}
        {unlock && (
          <Fact icon={unlock.unlocked ? <LockOpen size={15} aria-hidden /> : <Lock size={15} aria-hidden />}>
            <span className="flex flex-1 items-center gap-0.5">
              {/* Compatibility: firmware that never locks (device/unlock.ts, neverLocks) offers neither Lock nor Unlock. */}
              {neverLocks(unlock) ? 'Never locks' : unlocking ? 'Unlocking…' : unlock.unlocked ? 'Unlocked' : 'Locked'}
              <HelpButton topic="unlock" />
              {!unlocking && !neverLocks(unlock) && (
                <Button
                  size="sm"
                  variant="quiet"
                  className="ml-auto -mr-1 h-6 px-2"
                  onClick={() => {
                    if (unlock.unlocked) return void deviceStore.lock()
                    onLeave?.('unlock')
                    void openUnlock()
                  }}
                >
                  {unlock.unlocked ? 'Lock' : 'Unlock…'}
                </Button>
              )}
            </span>
          </Fact>
        )}
      </div>
      <Button
        size="sm"
        variant="quiet"
        icon={<Unplug size={14} aria-hidden />}
        onClick={() => {
          onLeave?.('disconnect')
          void disconnect()
        }}
        className="self-start -ml-1"
      >
        Disconnect
      </Button>
    </section>
  )
}

/** A small mark on the icon's corner. */
function Corner({ at, className, children }: { at: 'top' | 'bottom'; className?: string; children: ReactNode }) {
  return (
    <span
      aria-hidden
      className={cx(
        'absolute -right-1 flex size-4.5 items-center justify-center rounded-pill border border-edge bg-card',
        at === 'top' ? '-top-1' : '-bottom-1',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** The keyboard's card as one icon, for the sidebar with icons only. */
export function DeviceIcon() {
  const status = useDevice((s) => s.status)
  const link = useDevice((s) => s.link)
  const keyboard = useDevice((s) => s.keyboard)
  const unlock = useDevice((s) => s.unlock)
  const unlocking = useDevice((s) => s.unlocking)
  const [open, setOpen] = useState(false)
  const connectLink = useRef<HTMLAnchorElement>(null)
  // Disconnect from the card takes the focus to where connecting starts, as the card it was in has gone.
  const focusConnect = useRef(false)
  const connected = (status === 'ready' && link !== null) || status === 'connecting'
  useEffect(() => {
    if (connected || !focusConnect.current) return
    focusConnect.current = false
    connectLink.current?.focus()
  }, [connected])

  const box = 'relative flex size-10 items-center justify-center rounded-card'
  if (!connected) {
    const label = 'No keyboard connected: connect one'
    return (
      <Tip label={label}>
        <a
          ref={connectLink}
          href="#/home"
          aria-label={label}
          className={cx(box, 'border border-dashed border-edge-strong text-muted hover:bg-raised hover:text-content')}
        >
          <Plug size={18} aria-hidden />
        </a>
      </Tip>
    )
  }

  const reading = status === 'connecting' || !link
  const demo = demoKeyboard() !== null
  const wireless = link?.kind === 'receiver'
  const name = keyboard?.name ?? link?.productName ?? 'Keyboard'
  const how = demo ? 'demo keyboard' : wireless ? 'connected through the 2.4 GHz receiver' : 'connected by cable'
  const lock = !unlock || neverLocks(unlock) ? null : unlocking ? 'unlocking' : unlock.unlocked ? 'unlocked' : 'locked'
  const label = reading ? 'Reading the keyboard…' : [name, how, lock].filter(Boolean).join(', ')
  const LinkIcon = demo ? Sparkles : wireless ? Radio : Cable

  return (
    <Tip label={label} enabled={!open}>
      <PopoverButton
        label={label}
        onOpenChange={setOpen}
        buttonClassName={cx(box, 'bg-raised text-content hover:bg-raised-hover', open && 'ring-2 ring-accent')}
        className="w-60 p-0"
        button={() =>
          reading ? (
            <Spinner size={18} />
          ) : (
            <>
              <Keyboard size={20} aria-hidden />
              <Corner at="bottom" className={demo ? 'text-accent' : 'text-success'}>
                <LinkIcon size={11} aria-hidden />
              </Corner>
              {lock && (
                <Corner at="top" className={lock === 'unlocked' ? 'text-warning' : 'text-muted'}>
                  {lock === 'unlocked' ? <LockOpen size={10} aria-hidden /> : <Lock size={10} aria-hidden />}
                </Corner>
              )}
            </>
          )
        }
      >
        {(close) => (
          <DeviceCard
            onLeave={(why) => {
              focusConnect.current = why === 'disconnect'
              close()
            }}
          />
        )}
      </PopoverButton>
    </Tip>
  )
}
