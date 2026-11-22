// SPDX-License-Identifier: GPL-3.0-or-later
// The device layer's public surface. Pages, plugins and the shell import from here (or from ./index, which adds
// the app's store), never from src/vendor directly.

export { receiverName, REPORT_LEN } from './link'
export type { HidLink, LinkKind } from './link'
export { LAYER_PUSH, parseLayerReport } from './pushes'
export type { LayerState, PushShape } from './pushes'
export { TransportError } from './transport'
export type { RequestOptions, Transport, TransportStats } from './transport'
export type { Availability, Capabilities, Feature, LightingInfo, NkroMode } from './capabilities'
export { offeredEffectCount } from './capabilities'
export { lightingAsWritten, lightingKind } from './lighting-kind'
export { NOT_VIAL, VIAL_FIRMWARE_URL } from './vial-firmware'
export type { LightingKind } from './lighting-kind'
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
export { canSend, groupsFor, KEY_USES, KEY_WITH_MODS_MAX, ORDINARY_KEY_MAX, paletteFeatures } from './sendable'
export type { KeyUse } from './sendable'
export type { BootloaderResult, RestoreProgress, RestoreReport } from './store'
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
  planItems,
  planRestore,
  planRisks,
  unlockNeeded,
} from './restore'
export type { FileIdentity, FitCheck, KeyboardContents, PlanItems, PlanLine, RestorePart, RestorePlan } from './restore'
export { baseLayers, keymapRisks } from './risks'
export type { Risk } from './risks'
export { KEY_BOOT_LOCKED, MACRO_INTERRUPTED, macrosHalted, NOT_ANSWERING, OTHER_APP_UNLOCKING } from './store'
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
export { MACRO_UNDO_LOCKED } from './store'
export type { MacroSaveResult } from './store'
export {
  canTypeText,
  decodeMacro,
  encodeMacro,
  macroKeycode,
  macroSize,
  macroSpace,
  macroUses,
  MAX_WAIT_MS,
  rawMacros,
  readMacros,
  replaceMacro,
  sameSteps,
  stepProblem,
  stepsFromRecording,
  untypable,
} from './macros'
export type { MacroSpace, MacroStep, RecordedKey, RecordOptions } from './macros'
export { keycodeUses } from './macros'
export { bootKeycode, ENTRY_KINDS, entryNeedsUnlock } from './restore'
export type { EntryKind } from './restore'
export { ENTRY_UNDO_LOCKED } from './store'
export type { EntrySaveResult } from './store'
export {
  ALL_LAYERS,
  altRepeatKeycode,
  chordKeys,
  DEFAULT_TAPPING_TERM,
  emptyEntry,
  entriesMatch,
  entryIsEmpty,
  entryProblem,
  MAX_TAPPING_TERM,
  MOD_KEYS,
  MOD_PAIRS,
  modsText,
  OVERRIDE_DEFAULT_OPTIONS,
  OVERRIDE_OPTIONS,
  REPEAT_OPTIONS,
  sameEntry,
  tapDanceKeycode,
  withChordKeys,
} from './entries'
export type { AltRepeatKeyEntry, AnyEntry, ComboEntry, EntryOf, KeyOverrideEntry, TapDanceEntry } from './entries'
export {
  decodeSetting,
  encodeSetting,
  fieldRange,
  fieldSearchText,
  fieldsOf,
  flagOn,
  formatMs,
  formatSetting,
  isKnownSetting,
  SETTING_FIELDS,
  SETTING_GROUP_INFO,
  SETTING_GROUPS,
  SETTING_WIDTHS,
  settingValues,
  settingWidth,
  withFlag,
} from './settings'
export type {
  SettingControl,
  SettingField,
  SettingGroup,
  SettingGroupId,
  SettingPreset,
  SettingUnit,
  SettingValues,
} from './settings'
export {
  DEBOUNCE_TYPES,
  debounceMax,
  debounceType,
  EMPTY_SNAP_CLICK,
  isSnapClickKey,
  SNAP_CLICK_PRESETS,
  SNAP_CLICK_RULES,
  snapClickProblem,
  snapClickRule,
} from './keychron-typing'
export type { Debounce, DebounceType, SnapClickEntry, SnapClickRule } from './keychron-typing'
export {
  keyLeds,
  LOCK_LIGHT_MIN_VAL,
  LOCK_LIGHTS,
  PER_KEY_EFFECT,
  PER_KEY_STYLE_COUNT,
  zoneEffectChoices,
  zoneEffectNumbers,
  ZONES_EFFECT,
} from './keychron-rgb'
export type { Hsv, LockLights, ZoneEffect, ZoneNumbers } from './keychron-rgb'

export { posKey } from '../vendor/pipette/shared/kle/pos-key'
export type { KleKey, KeyboardLayout } from '../vendor/pipette/shared/kle/types'
export { VIALRGB_EFFECTS } from '../vendor/pipette/shared/constants/lighting'
