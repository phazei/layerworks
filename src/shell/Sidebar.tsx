// SPDX-License-Identifier: GPL-3.0-or-later
// The fixed column on the left: the app's name, the connected keyboard, and the pages. In a narrow window, or when
// the button at its bottom says so, it shows the icons only (sidebar-collapse.ts): each page's name then appears
// beside its icon on pointing and on keyboard focus, the logo is its mark, and the keyboard's card is one icon that
// opens the card beside it.

import { Layers, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { PageDef, PageGroup } from '../plugins/api'
import { cx } from '../ui/controls'
import { Tip } from '../ui/Tip'
import { DeviceCard, DeviceIcon } from './DeviceCard'
import { useSidebarCollapsed } from './sidebar-collapse'

const GROUP_TITLES: Record<PageGroup, string | null> = { main: null, plugins: 'Extras', app: null }

/** A row of the sidebar: icon and name; with icons only, the name is still its accessible name. */
const ROW = 'flex h-9 items-center gap-3 rounded-control px-[11px] font-medium transition-colors duration-(--motion-fast)'

function NavItem({ page, current, collapsed }: { page: PageDef; current: boolean; collapsed: boolean }) {
  const Icon = page.icon
  return (
    <li>
      <Tip label={page.title} enabled={collapsed}>
        <a
          href={`#/${page.path}`}
          aria-current={current ? 'page' : undefined}
          className={cx(ROW, current ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-raised hover:text-content')}
        >
          <Icon size={18} aria-hidden className="shrink-0" />
          <span className={collapsed ? 'sr-only' : 'truncate'}>{page.title}</span>
        </a>
      </Tip>
    </li>
  )
}

interface Props {
  pages: PageDef[]
  current: PageDef | null
}

export function Sidebar({ pages, current }: Props) {
  const [collapsed, toggle] = useSidebarCollapsed()
  const group = (name: PageGroup) => pages.filter((page) => (page.group ?? 'main') === name)
  const nav = (name: PageGroup) => {
    const items = group(name)
    if (items.length === 0) return null
    const title = GROUP_TITLES[name]
    return (
      <div className={cx(name === 'app' && 'mt-auto pt-4')}>
        {/* With icons only, a line stands for the group's title, which screen readers still hear. */}
        {title && (
          <h2 className={collapsed ? 'sr-only' : 'mb-1 px-3 text-xs font-medium text-muted'}>{title}</h2>
        )}
        {title && collapsed && <div aria-hidden className="mx-2 mb-2 border-t border-edge" />}
        <ul className="flex flex-col gap-0.5">
          {items.map((page) => (
            <NavItem key={page.path} page={page} current={page === current} collapsed={collapsed} />
          ))}
        </ul>
      </div>
    )
  }

  const toggleLabel = collapsed ? 'Expand sidebar' : 'Collapse sidebar'
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <aside
      data-collapsed={collapsed ? 'true' : 'false'}
      className={cx(
        'flex shrink-0 flex-col gap-5 overflow-x-hidden overflow-y-auto border-r border-edge bg-card px-3 py-4',
        'transition-[width] duration-(--motion)',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className={cx('flex items-center gap-2.5', collapsed ? 'px-1' : 'px-2')}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
          <Layers size={18} aria-hidden />
        </span>
        <span className={collapsed ? 'sr-only' : 'text-base font-semibold tracking-tight whitespace-nowrap'}>Layerworks</span>
      </div>
      {collapsed ? <DeviceIcon /> : <DeviceCard />}
      <nav aria-label="Pages" data-tour="nav" className="flex flex-1 flex-col gap-4">
        {nav('main')}
        {nav('plugins')}
        {nav('app')}
      </nav>
      <Tip label={toggleLabel} enabled={collapsed} className="-mt-3">
        <button
          type="button"
          onClick={toggle}
          className={cx(ROW, 'w-full cursor-pointer text-[13px] text-muted hover:bg-raised hover:text-content')}
        >
          <ToggleIcon size={18} aria-hidden className="shrink-0" />
          <span className={collapsed ? 'sr-only' : 'truncate'}>{toggleLabel}</span>
        </button>
      </Tip>
    </aside>
  )
}
