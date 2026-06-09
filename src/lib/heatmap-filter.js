/**
 * Heatmap filter state — habits, apps, sites, categories, active time.
 */

const FILTER_KEY = 'hvis_heatmap_filter';
const RECENT_KEY = 'hvis_heatmap_recent';
const MAX_RECENT = 6;

export const FILTER_TYPES = {
  ACTIVE: 'active',
  HABITS_ALL: 'habits-all',
  HABIT: 'habit',
  APP: 'app',
  TITLE: 'title',
  CATEGORY: 'category',
};

const DEFAULT_FILTER = { type: FILTER_TYPES.HABITS_ALL, id: 'habits-all', label: 'All habits', icon: 'flame' };

let currentFilter = loadFilter();
const listeners = new Set();

function loadFilter() {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    if (raw) {
      const filter = JSON.parse(raw);
      if (filter.type === FILTER_TYPES.ACTIVE) return { ...DEFAULT_FILTER };
      return filter;
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_FILTER };
}

function persistFilter() {
  try {
    localStorage.setItem(FILTER_KEY, JSON.stringify(currentFilter));
  } catch { /* ignore */ }
}

export function getHeatmapFilter() {
  return currentFilter;
}

export function setHeatmapFilter(filter) {
  currentFilter = { ...filter };
  persistFilter();
  addRecentFilter(currentFilter);
  listeners.forEach((fn) => fn(currentFilter));
}

export function onHeatmapFilterChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getRecentFilters() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const recent = raw ? JSON.parse(raw) : [];
    return recent.filter((f) => f.type !== FILTER_TYPES.ACTIVE);
  } catch {
    return [];
  }
}

function addRecentFilter(filter) {
  const key = `${filter.type}:${filter.id}`;
  let recent = getRecentFilters().filter((f) => `${f.type}:${f.id}` !== key);
  recent.unshift({ ...filter });
  recent = recent.slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch { /* ignore */ }
}

export function isHabitFilter(filter = currentFilter) {
  return filter.type === FILTER_TYPES.HABIT || filter.type === FILTER_TYPES.HABITS_ALL;
}
