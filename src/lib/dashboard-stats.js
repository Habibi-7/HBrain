/**
 * Dashboard stat loading — scoped to a view root with abort support.
 */
import { awClient } from './aw-client.js';
import { habitStore } from './habit-store.js';
import {
  formatDuration,
  dayBounds,
  shiftDay,
  dateStr,
  startOfDay,
  pct,
} from './time-utils.js';
import { getTopTarget } from './activity-label.js';
import { categoryManager } from './categories.js';
import { escapeHtml } from './html.js';

function isActive(signal) {
  return !signal?.aborted;
}

export function loadHabitsStats(rootEl, { selectedDay = startOfDay() } = {}) {
  const doneEl = rootEl.querySelector('#habits-done');
  const totalEl = rootEl.querySelector('#habits-total');
  if (!doneEl || !totalEl) return;

  const day = dateStr(selectedDay);
  const isToday = day === dateStr(new Date());
  const habits = habitStore.getScheduledHabits(day);
  const completedCount = habits.filter((h) => habitStore.isCompleted(h.id, day)).length;
  doneEl.textContent = habits.length ? `${completedCount}/${habits.length}` : '—';
  totalEl.textContent = habits.length
    ? `${habits.length} due${isToday ? ' today' : ''}`
    : 'Rest day';
}

export function renderTopApps(rootEl, titles) {
  const host = rootEl.querySelector('#top-apps');
  if (!host) return;

  if (!titles.length) {
    host.innerHTML = '<div class="empty-inline">No window data yet</div>';
    return;
  }

  const maxDuration = titles[0]?.duration || 1;
  host.innerHTML = titles.slice(0, 5).map((item, i) => {
    const app = item.data?.app || 'Unknown';
    const title = item.data?.title || '';
    const primary = title && title !== app ? title : app;
    const secondary = title && title !== app ? app : (item.data?.url || '');
    const cat = categoryManager.categorize(app, title);
    const width = pct(item.duration, maxDuration);
    const catClass = cat.name.toLowerCase().replace(/[^a-z0-9-]/g, '');

    return `
      <div class="attention-row">
        <span class="app-rank">${String(i + 1).padStart(2, '0')}</span>
        <div class="attention-info">
          <div class="attention-title truncate">${escapeHtml(primary)}</div>
          <div class="attention-meta truncate">${escapeHtml(secondary || app)}</div>
          <div class="app-bar-track">
            <div class="app-bar-fill app-bar-fill--${catClass}" style="width: ${width}%;"></div>
          </div>
        </div>
        <span class="app-time mono">${formatDuration(item.duration)}</span>
      </div>`;
  }).join('');
}

export async function loadActivityData(rootEl, { signal, selectedDay = startOfDay() } = {}) {
  const { start, end } = dayBounds(selectedDay);
  const prevDay = shiftDay(selectedDay, -1);
  const { start: prevStart, end: prevEnd } = dayBounds(prevDay);

  const [dayData, prevData] = await Promise.all([
    awClient.getWindowActivity(start, end),
    awClient.getWindowActivity(prevStart, prevEnd),
  ]);

  if (!isActive(signal)) return;

  const activeEl = rootEl.querySelector('#active-time');
  const changeEl = rootEl.querySelector('#active-change');
  const focusEl = rootEl.querySelector('#top-focus');
  const focusTimeEl = rootEl.querySelector('#top-focus-time');

  if (activeEl) activeEl.textContent = formatDuration(dayData.duration);

  if (changeEl) {
    if (prevData.duration > 0) {
      const change = dayData.duration - prevData.duration;
      const changePct = Math.round((change / prevData.duration) * 100);
      changeEl.className = `stat-change ${change >= 0 ? 'positive' : 'negative'}`;
      changeEl.textContent = `${change >= 0 ? '↑' : '↓'} ${Math.abs(changePct)}%`;
    } else {
      changeEl.className = 'stat-chip-note';
      changeEl.textContent = '';
    }
  }

  const top = getTopTarget(dayData);
  if (focusEl) {
    if (top) {
      focusEl.textContent = top.label;
      focusEl.title = top.app ? `${top.label} · ${top.app}` : top.label;
      if (focusTimeEl) focusTimeEl.textContent = formatDuration(top.duration);
    } else {
      focusEl.textContent = '—';
      focusEl.title = '';
      if (focusTimeEl) focusTimeEl.textContent = '';
    }
  }

  const sinks = dayData.titles?.length ? dayData.titles : dayData.apps || [];
  renderTopApps(rootEl, sinks);
}

export async function loadDashboardStats(rootEl, { signal, selectedDay = startOfDay() } = {}) {
  const connected = await awClient.isConnected();
  if (!isActive(signal)) return;

  if (connected) {
    await loadActivityData(rootEl, { signal, selectedDay });
  } else {
    const activeEl = rootEl.querySelector('#active-time');
    const changeEl = rootEl.querySelector('#active-change');
    if (activeEl) activeEl.textContent = '—';
    if (changeEl) {
      changeEl.innerHTML = '<span class="fg-tertiary text-xs">AW offline</span>';
    }
    renderTopApps(rootEl, []);
  }

  if (isActive(signal)) loadHabitsStats(rootEl, { selectedDay });
}
