// SPDX-License-Identifier: GPL-3.0-or-later
// How pages and panels get into the app. The built-in sections register through this too, so a plugin has
// exactly the abilities the core has.

import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { Capabilities, DeviceState, KeyboardData, LinkInfo, PushShape } from '../device/api'
import type { HelpTopicId } from '../help/topics'

/** Where a page appears in the sidebar. */
export type PageGroup = 'main' | 'plugins' | 'app'

/** Sections of built-in pages that accept plugin panels. */
export type PanelSection = 'lighting' | 'typing' | 'device'

/**
 * How a page uses the keyboard stage (layer stack and picture) above it:
 * - 'view': shown, for looking at the keyboard and its layers;
 * - 'select': shown, and clicking a key or knob direction selects it (`useStage().selection`).
 */
export type StageUse = 'view' | 'select'

export interface PageDef {
  /** The page's address: "keys" is shown at #/keys. */
  path: string
  title: string
  icon: LucideIcon
  group?: PageGroup
  /** Show the keyboard stage above the page. Omit for pages that use the full height. */
  stage?: StageUse
  /** The page works without a keyboard connected; otherwise the shell asks to connect one first. */
  offline?: boolean
  /** The help topic behind the "?" beside the page title. */
  help?: HelpTopicId
  component: ComponentType
}

export interface PanelDef {
  section: PanelSection
  title: string
  component: ComponentType
}

export interface PluginDef {
  id: string
  /** Which keyboards the plugin is for. Omit for all. */
  matches?: (device: { link: LinkInfo; keyboard: KeyboardData }) => boolean
  /** What the keyboard must be able to do. Omit when nothing special. */
  requires?: (capabilities: Capabilities) => boolean
  pages?: PageDef[]
  panels?: PanelDef[]
  /** Shapes of unsolicited reports the plugin listens for, so they are never taken for replies. */
  pushes?: PushShape[]
  /**
   * New names for lighting effects, by VialRGB effect id, for firmware that puts an effect of its own in a
   * standard slot. The Lighting page shows them instead of the standard name while the plugin is active.
   */
  lightingEffects?: Record<number, { name: string; description?: string }>
}

const plugins: PluginDef[] = []

export function definePlugin(plugin: PluginDef): PluginDef {
  if (plugins.some((p) => p.id === plugin.id)) throw new Error(`Plugin "${plugin.id}" is already defined`)
  plugins.push(plugin)
  return plugin
}

/** For tests. */
export function resetPlugins(): void {
  plugins.length = 0
}

/** Whether a plugin applies: always when it has no conditions, otherwise only to a matching connected keyboard. */
function active(plugin: PluginDef, state: DeviceState): boolean {
  if (!plugin.matches && !plugin.requires) return true
  const { link, keyboard, capabilities } = state
  if (!link || !keyboard || !capabilities) return false
  return (plugin.matches?.({ link, keyboard }) ?? true) && (plugin.requires?.(capabilities) ?? true)
}

export function activePlugins(state: DeviceState): PluginDef[] {
  return plugins.filter((plugin) => active(plugin, state))
}

export function activePages(state: DeviceState): PageDef[] {
  return activePlugins(state).flatMap((plugin) => plugin.pages ?? [])
}

export function activePanels(state: DeviceState, section: PanelSection): PanelDef[] {
  return activePlugins(state)
    .flatMap((plugin) => plugin.panels ?? [])
    .filter((panel) => panel.section === section)
}
