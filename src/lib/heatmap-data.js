/**
 * Load heatmap cell data for any filter type.
 */
import { awClient } from './aw-client.js';
import { habitStore } from './habit-store.js';
import { categoryManager } from './categories.js';
import { formatDuration } from './time-utils.js';
import { FILTER_TYPES } from './heatmap-filter.js';

export const HEATMAP_DAYS = 140;

/** Map daily seconds to intensity levels 0–4 */
export function secondsToLevels(dailySeconds) {
  const values = Object.values(dailySeconds).filter((v) => v > 0);
  const max = Math.max(...values, 1);

  return Object.fromEntries(
    Object.entries(dailySeconds).map(([date, seconds]) => {
      if (!seconds) return [date, 0];
      if (seconds >= max * 0.75) return [date, 4];
      if (seconds >= max * 0.5) return [date, 3];
      if (seconds >= max * 0.25) return [date, 2];
      return [date, 1];
    }),
  );
}

/** Load heatmap levels + metadata for the current filter */
export async function loadHeatmapView(filter) {
  switch (filter.type) {
    case FILTER_TYPES.ACTIVE:
      return loadActiveView(filter);
    case FILTER_TYPES.HABITS_ALL:
      return loadHabitsAllView(filter);
    case FILTER_TYPES.HABIT:
      return loadHabitView(filter);
    case FILTER_TYPES.APP:
      return loadAppView(filter);
    case FILTER_TYPES.TITLE:
      return loadTitleView(filter);
    case FILTER_TYPES.CATEGORY:
      return loadCategoryView(filter);
    default:
      return loadActiveView(filter);
  }
}

async function loadActiveView(filter) {
  const connected = await awClient.isConnected();
  if (!connected) {
    return emptyView(filter, 'ActivityWatch offline');
  }

  const daily = await awClient.getDailyActivity(HEATMAP_DAYS);
  const total = Object.values(daily).reduce((a, b) => a + b, 0);
  return {
    title: filter.label,
    subtitle: `${formatDuration(total)} total`,
    icon: filter.icon || 'activity',
    mode: 'activity',
    levelByDate: secondsToLevels(daily),
    cellHint: (date, level) => {
      const seconds = daily[date] || 0;
      return `${date}: ${formatDuration(seconds)}`;
    },
  };
}

function loadHabitsAllView(filter) {
  const history = habitStore.getCombinedHistory(HEATMAP_DAYS);
  const levels = habitStore.historyToLevels(history, { combined: true });
  const levelByDate = Object.fromEntries(history.map((d, i) => [d.date, levels[i]]));

  return Promise.resolve({
    title: filter.label,
    subtitle: `${Math.round(history.filter((d) => d.completed).length / 7 * 100)}% this week`,
    icon: 'flame',
    mode: 'habits',
    levelByDate,
    cellHint: (date, level) => {
      const day = history.find((d) => d.date === date);
      if (!day) return date;
      return `${date}${day.completed ? ' · all done' : day.fraction > 0 ? ` · ${Math.round(day.fraction * 100)}%` : ''}`;
    },
  });
}

function loadHabitView(filter) {
  const history = habitStore.getHabitHistory(filter.id, HEATMAP_DAYS);
  const levels = habitStore.historyToLevels(history);
  const levelByDate = Object.fromEntries(history.map((d, i) => [d.date, levels[i]]));

  return Promise.resolve({
    title: filter.label,
    subtitle: `${habitStore.getWeeklyRate(filter.id)}% this week`,
    icon: filter.icon || 'star',
    mode: 'habits',
    levelByDate,
    cellHint: (date, level) => {
      const day = history.find((d) => d.date === date);
      return `${date}${day?.completed ? ' · done' : ''}`;
    },
  });
}

async function loadAppView(filter) {
  const connected = await awClient.isConnected();
  if (!connected) return emptyView(filter, 'ActivityWatch offline');

  const daily = await awClient.getDailyAppActivity(filter.app || filter.id, HEATMAP_DAYS);
  const total = Object.values(daily).reduce((a, b) => a + b, 0);
  return {
    title: filter.label,
    subtitle: `${formatDuration(total)} in app`,
    icon: 'folder',
    mode: 'activity',
    levelByDate: secondsToLevels(daily),
    cellHint: (date) => `${date}: ${formatDuration(daily[date] || 0)}`,
  };
}

async function loadTitleView(filter) {
  const connected = await awClient.isConnected();
  if (!connected) return emptyView(filter, 'ActivityWatch offline');

  const daily = await awClient.getDailyTitleActivity(filter.app, filter.title, HEATMAP_DAYS);
  const total = Object.values(daily).reduce((a, b) => a + b, 0);
  return {
    title: filter.label,
    subtitle: `${formatDuration(total)} total`,
    icon: 'globe',
    mode: 'activity',
    levelByDate: secondsToLevels(daily),
    cellHint: (date) => `${date}: ${formatDuration(daily[date] || 0)}`,
  };
}

async function loadCategoryView(filter) {
  const connected = await awClient.isConnected();
  if (!connected) return emptyView(filter, 'ActivityWatch offline');

  const cats = categoryManager.getCategories();
  const daily = await awClient.getDailyCategoryActivity(filter.id, cats, HEATMAP_DAYS);
  const total = Object.values(daily).reduce((a, b) => a + b, 0);
  const cat = cats.find((c) => c.name === filter.id);
  return {
    title: filter.label,
    subtitle: `${formatDuration(total)} total`,
    icon: cat?.icon || filter.icon || 'folder',
    mode: 'activity',
    levelByDate: secondsToLevels(daily),
    cellHint: (date) => `${date}: ${formatDuration(daily[date] || 0)}`,
  };
}

function emptyView(filter, message) {
  return {
    title: filter.label,
    subtitle: message,
    icon: filter.icon || 'activity',
    mode: 'empty',
    levelByDate: {},
    cellHint: () => '',
  };
}
