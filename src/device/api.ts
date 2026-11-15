// SPDX-License-Identifier: GPL-3.0-or-later
// The device layer's public surface. Pages, plugins and the shell import from here (or from ./index, which adds
// the app's store), never from src/vendor directly.

export { REPORT_LEN } from './link'
export type { HidLink, LinkKind } from './link'
export { LAYER_PUSH, parseLayerReport } from './pushes'
export type { LayerState, PushShape } from './pushes'
export { TransportError } from './transport'
export type { RequestOptions, Transport, TransportStats } from './transport'
export type { Availability, Capabilities, Feature, LightingInfo } from './capabilities'
export { LOAD_PARTS, slotKeycode } from './store'
export type {
  DeviceState,
  DeviceStore,
  Entries,
  KeyboardData,
  Lighting,
  LightingChange,
  LinkInfo,
  LoadPart,
  Slot,
  UnlockResult,
} from './store'
export { UNLOCK_STEPS } from './unlock'
export type { UnlockProgress } from './unlock'
export type { UnlockStatus } from '../vendor/pipette/shared/types/protocol'
export { matrixKeys } from './matrix'
export * from './keycodes'
export type { RestoreProgress, RestoreReport } from './store'
export {
  BACKUP_EXTENSION,
  BackupError,
  backupFileName,
  backupText,
  createBackup,
  missingParts,
  parseBackup,
} from './backup'
export type { Backup } from './backup'
export {
  checkFit,
  countOf,
  describePlan,
  isEmptyPlan,
  keyboardIdentity,
  PART_NAMES,
  planRestore,
  unlockNeeded,
} from './restore'
export type { FileIdentity, FitCheck, KeyboardContents, PlanLine, RestorePart, RestorePlan } from './restore'
export { exportVil, parseVil, VIL_EXTENSION } from './vil'
export { readKeyboardFile } from './keyboard-file'
export type { KeyboardFile } from './keyboard-file'
export {
  BACKLIT_CHOICES,
  formatDuration,
  IDLE_CHOICES,
  MIN_BACKLIT_SECONDS,
  MIN_IDLE_SECONDS,
  timersProblem,
} from './wireless'
export type { WirelessTimers } from './wireless'

export { posKey } from '../vendor/pipette/shared/kle/pos-key'
export type { KleKey, KeyboardLayout } from '../vendor/pipette/shared/kle/types'
export { VIALRGB_EFFECTS } from '../vendor/pipette/shared/constants/lighting'
