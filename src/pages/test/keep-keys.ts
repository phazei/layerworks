// SPDX-License-Identifier: GPL-3.0-or-later
// Which key presses the Test page keeps from the browser while it is open, so testing a key doesn't scroll the page,
// open a menu or reload it. Every key is still seen by the test either way (the page listens for them separately);
// keeping one only stops the browser's own action. Tab and Shift + Tab always move the focus, and Enter and Space
// still press the button or link that has the focus, so the page can be used and left from the keyboard.

/** Elements Enter and Space operate: the browser's action on them is wanted. */
const OPERABLE = 'button, a[href], summary, [role="button"], [role="link"], [role="switch"], [role="checkbox"], [role="radio"], [role="menuitem"], [role="tab"]'

/** Where typing belongs to the element: the page keeps nothing there. */
const FIELDS = 'dialog, input, textarea, select, [contenteditable]'

/**
 * Whether the Test page stops the browser's own action for this key event. Kept: the arrows, Page Up / Down, Home,
 * End, Space and Enter away from a control (they scroll), Backspace, the function keys (F1 help, F3 find, F5
 * reload, F6 address bar, F7 caret browsing, F10 menu), Alt (the menu), the menu key, and every other key, so
 * nothing the browser gives a meaning to acts while keys are being tested. Not kept: anything with Ctrl or the
 * Windows / Command key (the browser's and the system's shortcuts), keys typed in a field or dialog, Tab, and
 * Enter or Space on a control.
 */
export function keptOnTestPage(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'target'>): boolean {
  if (event.ctrlKey || event.metaKey) return false
  const target = event.target instanceof Element ? event.target : null
  if (target?.closest(FIELDS)) return false
  if (event.key === 'Tab') return false
  if ((event.key === 'Enter' || event.key === ' ') && target?.closest(OPERABLE)) return false
  return true
}
