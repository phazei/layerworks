// SPDX-License-Identifier: GPL-3.0-or-later
// The fixed column on the left: the app's name, the connected keyboard, and the pages.

import { Layers } from 'lucide-react'
import type { PageDef, PageGroup } from '../plugins/api'
import { cx } from '../ui/controls'
import { DeviceCard } from './DeviceCard'

const GROUP_TITLES: Record<PageGroup, string | null> = { main: null, plugins: 'Extras', app: null }

function NavItem({ page, current }: { page: PageDef; current: boolean }) {
  const Icon = page.icon
  return (
    <li>
      <a
        href={`#/${page.path}`}
        aria-current={current ? 'page' : undefined}
        className={cx(
          'flex h-9 items-center gap-3 rounded-control px-3 font-medium transition-colors duration-(--motion-fast)',
          current ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-raised hover:text-content',
        )}
      >
        <Icon size={18} aria-hidden className="shrink-0" />
        <span className="truncate">{page.title}</span>
      </a>
    </li>
  )
}

interface Props {
  pages: PageDef[]
  current: PageDef | null
}

export function Sidebar({ pages, current }: Props) {
  const group = (name: PageGroup) => pages.filter((page) => (page.group ?? 'main') === name)
  const nav = (name: PageGroup) => {
    const items = group(name)
    if (items.length === 0) return null
    const title = GROUP_TITLES[name]
    return (
      <div className={cx(name === 'app' && 'mt-auto pt-4')}>
        {title && <h2 className="mb-1 px-3 text-xs font-medium text-muted">{title}</h2>}
        <ul className="flex flex-col gap-0.5">
          {items.map((page) => (
            <NavItem key={page.path} page={page} current={page === current} />
          ))}
        </ul>
      </div>
    )
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-5 overflow-y-auto border-r border-edge bg-card px-3 py-4">
      <div className="flex items-center gap-2.5 px-2">
        <span className="flex size-8 items-center justify-center rounded-control bg-accent-soft text-accent">
          <Layers size={18} aria-hidden />
        </span>
        <span className="text-base font-semibold tracking-tight">Layerworks</span>
      </div>
      <DeviceCard />
      <nav aria-label="Pages" className="flex flex-1 flex-col gap-4">
        {nav('main')}
        {nav('plugins')}
        {nav('app')}
      </nav>
    </aside>
  )
}
