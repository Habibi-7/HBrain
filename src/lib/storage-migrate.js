/** One-time rename of localStorage keys from HBrain → Hvis. */

const KEY_PAIRS = [
  ['hbrain_habits', 'hvis_habits'],
  ['hbrain_habit_entries', 'hvis_habit_entries'],
  ['hbrain_habit_icons_v1', 'hvis_habit_icons_v1'],
  ['hbrain_habit_schedule_v1', 'hvis_habit_schedule_v1'],
  ['hbrain_habits_preset_v1', 'hvis_habits_preset_v1'],
  ['hbrain_habits_backup', 'hvis_habits_backup'],
  ['hbrain_categories', 'hvis_categories'],
  ['hbrain_category_colors_v5', 'hvis_category_colors_v5'],
  ['hbrain_category_icons_v1', 'hvis_category_icons_v1'],
  ['hbrain_category_other_red_v1', 'hvis_category_other_red_v1'],
  ['hbrain_category_conductor_v1', 'hvis_category_conductor_v1'],
  ['hbrain_heatmap_filter', 'hvis_heatmap_filter'],
  ['hbrain_heatmap_recent', 'hvis_heatmap_recent'],
  ['hbrain-theme-mode', 'hvis-theme-mode'],
];

function renameKey(from, to) {
  if (localStorage.getItem(to) != null) return;
  const value = localStorage.getItem(from);
  if (value == null) return;
  localStorage.setItem(to, value);
  localStorage.removeItem(from);
}

export function migrateHBrainStorageKeys() {
  try {
    for (const [from, to] of KEY_PAIRS) renameKey(from, to);
  } catch {
    /* ignore private browsing / blocked storage */
  }
}
