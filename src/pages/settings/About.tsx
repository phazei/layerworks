// SPDX-License-Identifier: GPL-3.0-or-later
// About Layerworks: version and the commit it was built from, the source, where to report a problem, the licence,
// and the projects it is built on.

import type { ReactNode } from 'react'
import { version } from '../../../package.json'
import { source as pipette } from '../../../vendor.json'
import { BUILD_COMMIT } from '../../build-info'
import { COPYRIGHT_LINE, ISSUES_URL, LICENCES_FILE, LICENSE_FILE, SOURCE_URL, commitUrl } from '../../project'
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

/** A short second line under a row's text. */
function Note({ children }: { children: ReactNode }) {
  return <span className="block text-[13px] text-muted">{children}</span>
}

export function About() {
  const commit = commitUrl(BUILD_COMMIT)
  return (
    <Card title="About Layerworks" description="A configurator for keyboards running Vial firmware, with Keychron’s extras where the keyboard has them.">
      <dl className="-my-2.5 divide-y divide-edge">
        <Row label="Version">
          <span className="tabular-nums">{version}</span>
          {commit && (
            <span className="ml-2 text-[13px] text-muted">
              built from <ExternalLink href={commit}>commit {BUILD_COMMIT.slice(0, 7)}</ExternalLink>
            </span>
          )}
        </Row>
        <Row label="Source code">
          <ExternalLink href={SOURCE_URL}>{SOURCE_URL.replace(/^https:\/\//, '')}</ExternalLink>
        </Row>
        <Row label="Found a bug?">
          <ExternalLink href={ISSUES_URL}>Report a problem</ExternalLink>
          <Note>On GitHub: say what you did, what happened, and which keyboard you have.</Note>
        </Row>
        <Row label="Licence">
          <span className="flex flex-col gap-2">
            <span>
              Free software under the{' '}
              <ExternalLink href={`./${LICENSE_FILE}`}>GNU GPL, version 3 or later</ExternalLink>
              <span className="ml-2 text-[13px] text-muted">GPL-3.0-or-later</span>
            </span>
            <span>
              {COPYRIGHT_LINE}.
              <Note>Comes with no warranty: use it at your own risk, as far as the law allows.</Note>
            </span>
            <ExternalLink href={`./${LICENCES_FILE}`}>Licences of the parts Layerworks is built from</ExternalLink>
          </span>
        </Row>
        <Row label="Built on">
          <span className="flex flex-col gap-2">
            <span>
              The keyboard picture, the key names and the commands that talk to the keyboard come from{' '}
              <ExternalLink href="https://github.com/darakuneko/pipette-desktop">Pipette</ExternalLink> by darakuneko,
              in <ExternalLink href={pipette.repo}>tymon3310’s version</ExternalLink> with Keychron support.
              Pipette builds on <ExternalLink href="https://github.com/vial-kb/vial-gui">Vial GUI</ExternalLink>, Vial’s
              own app, and much of its code is ported from it.
              <Note>
                Pipette version {pipette.version}, commit {pipette.commit}, GPL-3.0-or-later
              </Note>
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
      <p className="mt-4 text-[13px] leading-relaxed text-muted">
        Layerworks is an independent project, not affiliated with or endorsed by Keychron, QMK, Vial or VIA.
      </p>
    </Card>
  )
}
