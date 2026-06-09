/**
 * Shared habit selection state for heatmap + keyboard navigation.
 */

let focusIndex = 0;
let selectedHabitId = null;

export function resetHabitFocus() {
  focusIndex = 0;
  selectedHabitId = null;
}

export function getFocusIndex() {
  return focusIndex;
}

export function setFocusIndex(index, habits) {
  if (!habits.length) return null;
  focusIndex = ((index % habits.length) + habits.length) % habits.length;
  selectedHabitId = habits[focusIndex].id;
  return selectedHabitId;
}

export function moveHabitFocus(delta, habits) {
  if (!habits.length) return null;
  const current = selectedHabitId
    ? habits.findIndex((h) => h.id === selectedHabitId)
    : focusIndex;
  return setFocusIndex(current + delta, habits);
}

export function getSelectedHabitId(habits) {
  if (!habits.length) return null;
  if (selectedHabitId && habits.some((h) => h.id === selectedHabitId)) {
    return selectedHabitId;
  }
  focusIndex = Math.min(focusIndex, habits.length - 1);
  selectedHabitId = habits[focusIndex]?.id || null;
  return selectedHabitId;
}
