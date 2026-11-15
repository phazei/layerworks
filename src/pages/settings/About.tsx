// SPDX-License-Identifier: GPL-3.0-or-later
// About Layerworks: version, licence, and the projects it is built on.

import type { ReactNode } from 'react'
import { version } from '../../../package.json'
import { source as pipette } from '../../../vendor.json'
import { ExternalLink } from '../../ui/display'
import { Card } from '../../ui/layout'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-4 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 leading-relaxed">{children}</dd>
    </div>
  )
}

export function About() {
  return (
    <Card title="About Layerworks" description="A configurator for Keychron keyboards running Vial firmware.">
      <dl className="-my-2.5 divide-y divide-edge">
        <Row label="Version">
          <span className="tabular-nums">{version}</span>
        </Row>
        <Row label="Licence">
          Free software under the{' '}
          <ExternalLink href="https://www.gnu.org/licenses/gpl-3.0.html">GNU GPL, version 3 or later</ExternalLink>
          <span className="ml-2 text-[13px] text-muted">GPL-3.0-or-later</span>
        </Row>
        <Row label="Built on">
          <span className="flex flex-col gap-2">
            <span>
              The keyboard picture, the key names and the commands that talk to the keyboard come from{' '}
              <ExternalLink href="https://github.com/darakuneko/pipette-desktop">Pipette</ExternalLink> by darakuneko,
              in <ExternalLink href={pipette.repo}>tymon3310’s version</ExternalLink> with Keychron support.
              <span className="block text-[13px] text-muted">
                Version {pipette.version}, commit {pipette.commit}, GPL-3.0-or-later
              </span>
            </span>
            <span>
              <ExternalLink href="https://qmk.fm">QMK</ExternalLink>, the firmware the keyboard runs, and{' '}
              <ExternalLink href="https://get.vial.today">Vial</ExternalLink>, which lets apps change it without
              rebuilding it. Keychron support for Vial by{' '}
              <ExternalLink href="https://github.com/tymon3310/vial-qmk">tymon3310</ExternalLink>.
            </span>
            <span>
              Icons from <ExternalLink href="https://lucide.dev">Lucide</ExternalLink>
              <span className="ml-2 text-[13px] text-muted">ISC licence</span>
            </span>
          </span>
        </Row>
      </dl>
    </Card>
  )
}
