// SPDX-License-Identifier: GPL-3.0-or-later
// What the build knows about itself. vite.config.ts fills `__LAYERWORKS_COMMIT__` in (`define`): the commit the
// page was built from (GITHUB_SHA in the publishing workflow, else `git rev-parse HEAD`, else "unknown"; a fixed
// made-up hash in tests).

declare const __LAYERWORKS_COMMIT__: string

/** The full hash of the commit this page was built from, or "unknown". */
export const BUILD_COMMIT: string = __LAYERWORKS_COMMIT__
