/**
 * Explicit view action registry for keyboard shortcuts and global commands.
 * Views register actions on mount and clear on destroy.
 */

let actions = {};

export function registerViewActions(next = {}) {
  actions = next;
}

export function clearViewActions() {
  actions = {};
}

export function invokeViewAction(name, ...args) {
  return actions[name]?.(...args);
}
