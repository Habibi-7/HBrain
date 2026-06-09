/**
 * Fuzzy search index for heatmap filters (Mintlify-style matching).
 */
import { habitStore } from './habit-store.js';
import { categoryManager } from './categories.js';
import { formatActivityLabel } from './activity-label.js';
import { awClient } from './aw-client.js';
import { daysAgoStart, todayEnd } from './time-utils.js';
import { FILTER_TYPES } from './heatmap-filter.js';
import { escapeHtml } from './html.js';

/** Score a fuzzy match — lower is better (Fuse.js-style threshold ~0.1) */
export function fuzzyScore(query, text) {
  if (!query) return 1;
  if (!text) return 1;
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  if (t === q) return 0;
  if (t.startsWith(q)) return 0.05;
  if (t.includes(q)) return 0.12;

  let qi = 0;
  let last = -1;
  let gaps = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      if (last >= 0 && i - last > 1) gaps++;
      last = i;
      qi++;
    }
  }
  if (qi < q.length) return 1;
  return 0.2 + gaps * 0.04;
}

function highlightMatch(query, text) {
  if (!query) return text;
  const q = query.toLowerCase();
  const t = text;
  const idx = t.toLowerCase().indexOf(q);
  if (idx < 0) return text;
  return `${escapeHtml(t.slice(0, idx))}<mark>${escapeHtml(t.slice(idx, idx + q.length))}</mark>${escapeHtml(t.slice(idx + q.length))}`;
}

let cachedTargets = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

/** Build searchable targets from habits, categories, and AW data */
export async function buildSearchIndex({ force = false } = {}) {
  if (!force && cachedTargets && Date.now() - cacheTime < CACHE_TTL) {
    return cachedTargets;
  }

  const items = [
    {
      type: FILTER_TYPES.HABITS_ALL,
      id: 'habits-all',
      label: 'All habits',
      suffix: 'Habits',
      icon: 'flame',
      keywords: 'habits combined default',
    },
  ];

  for (const habit of habitStore.getHabits()) {
    items.push({
      type: FILTER_TYPES.HABIT,
      id: habit.id,
      label: habit.name,
      suffix: 'Habit',
      icon: habit.icon,
      keywords: `habit ${habit.name}`,
    });
  }

  for (const cat of categoryManager.getCategories()) {
    items.push({
      type: FILTER_TYPES.CATEGORY,
      id: cat.name,
      label: cat.name,
      suffix: 'Category',
      icon: cat.icon,
      keywords: `category ${cat.name}`,
      color: cat.color,
    });
  }

  const connected = await awClient.isConnected();
  if (connected) {
    try {
      const data = await awClient.getWindowActivity(daysAgoStart(30), todayEnd());
      const seenApps = new Set();
      const seenTitles = new Set();

      for (const event of data.apps || []) {
        const app = event.data?.app;
        if (!app || seenApps.has(app)) continue;
        seenApps.add(app);
        items.push({
          type: FILTER_TYPES.APP,
          id: app,
          label: app,
          suffix: 'App',
          icon: 'folder',
          keywords: `app application ${app}`,
          app,
        });
      }

      for (const event of data.titles || []) {
        const app = event.data?.app || '';
        const title = event.data?.title || '';
        const label = formatActivityLabel(event);
        const key = `${app}::${title}`;
        if (!label || seenTitles.has(key)) continue;
        seenTitles.add(key);
        items.push({
          type: FILTER_TYPES.TITLE,
          id: key,
          label,
          suffix: app || 'Window',
          icon: 'globe',
          keywords: `site window title ${label} ${app} ${title}`,
          app,
          title,
        });
      }
    } catch {
      /* AW offline mid-fetch */
    }
  }

  cachedTargets = items;
  cacheTime = Date.now();
  return items;
}

export function searchIndex(items, query, { limit = 12 } = {}) {
  const q = query.trim();
  if (!q) return [];

  return items
    .map((item) => {
      const labelScore = fuzzyScore(q, item.label);
      const suffixScore = fuzzyScore(q, item.suffix) * 0.9;
      const kwScore = fuzzyScore(q, item.keywords || '') * 0.85;
      const score = Math.min(labelScore, suffixScore, kwScore);
      return { item, score };
    })
    .filter(({ score }) => score < 0.45)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ item, score }) => ({ ...item, score, highlight: highlightMatch(q, item.label) }));
}

export function itemToFilter(item) {
  const filter = {
    type: item.type,
    id: item.id,
    label: item.label,
    icon: item.icon,
  };
  if (item.app) filter.app = item.app;
  if (item.title) filter.title = item.title;
  if (item.color) filter.color = item.color;
  return filter;
}
