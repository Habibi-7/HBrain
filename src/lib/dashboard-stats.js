/**
 * Dashboard stat loading — scoped to a view root with abort support.
 */
import { awClient } from './aw-client.js';
import { habitStore } from './habit-store.js';
import { formatDuration, todayStart, todayEnd, daysAgoStart, pct } from './time-utils.js';
import { getTopTarget } from './activity-label.js';
import { categoryManager } from './categories.js';
import { escapeHtml } from './html.js';

function isActive(signal) {
  return !signal?.aborted;
}

export function loadHabitsStats(rootEl) {
  const doneEl = rootEl.querySelector('#habits-done');
  const totalEl = rootEl.querySelector('#habits-total');
  if (!doneEl || !totalEl) return;

  const habits = habitStore.getHabits();
  const today = new Date().toISOString().slice(0, 10);
  const completedCount = habits.filter((h) => habitStore.isCompleted(h.id, today)).length;
  doneEl.textContent = `${completedCount}/${habits.length}`;
  totalEl.textContent = `${habits.length} tracked`;
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

export async function loadActivityData(rootEl, { signal } = {}) {
  const start = todayStart();
  const end = todayEnd();
  const yesterdayStart = daysAgoStart(1);
  const yesterdayEnd = todayStart();

  const [today, yesterday] = await Promise.all([
    awClient.getWindowActivity(start, end),
    awClient.getWindowActivity(yesterdayStart, yesterdayEnd),
  ]);

  if (!isActive(signal)) return;

  const activeEl = rootEl.querySelector('#active-time');
  const changeEl = rootEl.querySelector('#active-change');
  const focusEl = rootEl.querySelector('#top-focus');
  const focusTimeEl = rootEl.querySelector('#top-focus-time');

  if (activeEl) activeEl.textContent = formatDuration(today.duration);

  if (changeEl && yesterday.duration > 0) {
    const change = today.duration - yesterday.duration;
    const changePct = Math.round((change / yesterday.duration) * 100);
    changeEl.className = `stat-change ${change >= 0 ? 'positive' : 'negative'}`;
    changeEl.textContent = `${change >= 0 ? '↑' : '↓'} ${Math.abs(changePct)}%`;
  }

  const top = getTopTarget(today);
  if (top && focusEl) {
    focusEl.textContent = top.label;
    focusEl.title = top.app ? `${top.label} · ${top.app}` : top.label;
    if (focusTimeEl) focusTimeEl.textContent = formatDuration(top.duration);
  }

  const sinks = today.titles?.length ? today.titles : today.apps || [];
  renderTopApps(rootEl, sinks);
}

export async function loadDashboardStats(rootEl, { signal } = {}) {
  const connected = await awClient.isConnected();
  if (!isActive(signal)) return;

  if (connected) {
    await loadActivityData(rootEl, { signal });
  } else {
    const activeEl = rootEl.querySelector('#active-time');
    const changeEl = rootEl.querySelector('#active-change');
    if (activeEl) activeEl.textContent = '—';
    if (changeEl) {
      changeEl.innerHTML = '<span class="fg-tertiary text-xs">AW offline</span>';
    }
    renderTopApps(rootEl, []);
  }

  if (isActive(signal)) loadHabitsStats(rootEl);
}
