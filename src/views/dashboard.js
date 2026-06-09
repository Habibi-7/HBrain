/**
 * Dashboard view — Today's overview
 */
import { awClient } from '../lib/aw-client.js';
import { habitStore } from '../lib/habit-store.js';
import { formatDuration, todayStart, todayEnd, daysAgoStart, pct } from '../lib/time-utils.js';
import { getTopTarget } from '../lib/activity-label.js';
import { categoryManager } from '../lib/categories.js';
import { mountActivityHeatmap } from '../lib/activity-heatmap.js';
import { mountCompoundGrowth } from '../lib/compound-growth.js';
import { iconPickerHtml, bindIconPicker } from '../lib/icons.js';
import { setFocusIndex, getSelectedHabitId } from '../lib/habit-focus.js';
import { onHeatmapFilterChange, setHeatmapFilter, FILTER_TYPES } from '../lib/heatmap-filter.js';

export function dashboardView() {
  const el = document.createElement('div');
  el.className = 'page-view page-dashboard fade-in';

  const heatmapHandlers = {
    onToggle: (habitId, index) => {
      const habits = habitStore.getHabits();
      setFocusIndex(index, habits);
      toggleHabit(habitId);
    },
    onDelete: (habitId, chip) => {
      const name = chip.getAttribute('aria-label')?.replace(' (completed today)', '') || '';
      if (confirm(`Remove "${name}"?`)) {
        habitStore.removeHabit(habitId);
        renderHeatmap();
        refreshGrowthSignals();
      }
    },
    onAddHabit: () => showAddModal(),
    onFilterChange: () => renderHeatmap(),
  };

  function renderHeatmap() {
    mountActivityHeatmap(el.querySelector('#habit-heatmap-section'), heatmapHandlers);
  }

  function renderCompound() {
    mountCompoundGrowth(el.querySelector('#compound-growth-section'));
  }

  function refreshGrowthSignals() {
    renderCompound();
    loadHabitsStats();
  }

  function toggleHabit(habitId) {
    habitStore.toggleHabit(habitId);
    renderHeatmap();
    refreshGrowthSignals();
  }

  el.innerHTML = `
    <header class="page-toolbar">
      <div>
        <h1 class="page-title">Today</h1>
      </div>
      <div class="stat-strip">
        <div class="stat-chip">
          <span class="stat-chip-label">Active</span>
          <strong class="stat-chip-value mono" id="active-time">—</strong>
          <span class="stat-chip-note" id="active-change"></span>
        </div>
        <div class="stat-chip">
          <span class="stat-chip-label">Habits</span>
          <strong class="stat-chip-value mono" id="habits-done">—</strong>
          <span class="stat-chip-note" id="habits-total"></span>
        </div>
        <div class="stat-chip">
          <span class="stat-chip-label">Focus</span>
          <strong class="stat-chip-value truncate" id="top-focus">—</strong>
          <span class="stat-chip-note" id="top-focus-time"></span>
        </div>
      </div>
    </header>

    <div class="page-body today-hero">
      <div class="today-hero-main">
        <div id="habit-heatmap-section" class="habit-heatmap-host habit-heatmap-bar today-hero-heatmap"></div>
        <div class="card insight-card attention-card today-hero-sinks">
          <div class="card-header">
            <span class="card-title">Time sinks</span>
          </div>
          <div id="top-apps" class="attention-list card-fill"></div>
        </div>
      </div>
      <div id="compound-growth-section" class="compound-growth-card card today-hero-growth"></div>
    </div>
  `;

  function showAddModal() {
    let modalHost = document.getElementById('add-habit-modal-root');
    if (!modalHost) {
      modalHost = document.createElement('div');
      modalHost.id = 'add-habit-modal-root';
      document.body.appendChild(modalHost);
    }

    const closeModal = () => { modalHost.innerHTML = ''; };

    modalHost.innerHTML = `
      <div class="modal-backdrop" id="modal-backdrop">
        <div class="modal" role="dialog" aria-labelledby="habit-modal-title">
          <div class="modal-title" id="habit-modal-title">New Habit</div>
          <div class="form-group">
            <label class="form-label" for="habit-name">Name</label>
            <input class="form-input" id="habit-name" placeholder="e.g. Morning Run" autofocus />
          </div>
          <div class="form-group">
            <label class="form-label">Icon</label>
            ${iconPickerHtml('star')}
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="modal-cancel" type="button">Cancel</button>
            <button class="btn btn-primary" id="modal-save" type="button">Add Habit</button>
          </div>
        </div>
      </div>
    `;

    bindIconPicker(modalHost);

    modalHost.querySelector('#modal-cancel').addEventListener('click', closeModal);
    modalHost.querySelector('#modal-backdrop').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
    modalHost.querySelector('#modal-save').addEventListener('click', () => {
      const name = modalHost.querySelector('#habit-name').value.trim();
      const icon = modalHost.querySelector('#habit-icon').value || 'star';
      if (name) {
        habitStore.addHabit({ name, icon });
        closeModal();
        renderHeatmap();
        refreshGrowthSignals();
      }
    });
    modalHost.querySelector('#habit-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') modalHost.querySelector('#modal-save').click();
      if (e.key === 'Escape') closeModal();
    });
  }

  return {
    el,
    mount() {
      renderHeatmap();
      renderCompound();
      loadDashboard();
      el._unsubFilter = onHeatmapFilterChange(() => renderHeatmap());
    },
    destroy() {
      el._unsubFilter?.();
    },
    onHabitFocus() {
      const habits = habitStore.getHabits();
      const id = getSelectedHabitId(habits);
      const habit = habits.find((h) => h.id === id);
      if (habit) {
        setHeatmapFilter({
          type: FILTER_TYPES.HABIT,
          id: habit.id,
          label: habit.name,
          icon: habit.icon,
        });
      }
      renderHeatmap();
    },
    onHabitToggle() {
      const id = getSelectedHabitId(habitStore.getHabits());
      if (id) toggleHabit(id);
    },
    openAddModal: showAddModal,
  };
}

async function loadDashboard() {
  const connected = await awClient.isConnected();

  if (connected) {
    loadActivityData();
  } else {
    document.getElementById('active-time').textContent = '—';
    document.getElementById('active-change').innerHTML =
      '<span class="fg-tertiary text-xs">AW offline</span>';
    renderTopApps([]);
  }

  loadHabitsStats();
}

async function loadActivityData() {
  const start = todayStart();
  const end = todayEnd();
  const yesterdayStart = daysAgoStart(1);
  const yesterdayEnd = todayStart();

  const [today, yesterday] = await Promise.all([
    awClient.getWindowActivity(start, end),
    awClient.getWindowActivity(yesterdayStart, yesterdayEnd),
  ]);

  document.getElementById('active-time').textContent = formatDuration(today.duration);
  const change = today.duration - yesterday.duration;
  const changePct = yesterday.duration ? Math.round((change / yesterday.duration) * 100) : 0;
  const changeEl = document.getElementById('active-change');
  if (yesterday.duration > 0) {
    changeEl.className = `stat-change ${change >= 0 ? 'positive' : 'negative'}`;
    changeEl.textContent = `${change >= 0 ? '↑' : '↓'} ${Math.abs(changePct)}%`;
  }

  const top = getTopTarget(today);
  const focusEl = document.getElementById('top-focus');
  const focusTimeEl = document.getElementById('top-focus-time');
  if (top && focusEl) {
    focusEl.textContent = top.label;
    focusEl.title = top.app ? `${top.label} · ${top.app}` : top.label;
    focusTimeEl.textContent = formatDuration(top.duration);
  }

  const sinks = today.titles?.length ? today.titles : today.apps || [];
  renderTopApps(sinks);
}

function loadHabitsStats() {
  const habits = habitStore.getHabits();
  const today = new Date().toISOString().slice(0, 10);
  const completedCount = habits.filter(h => habitStore.isCompleted(h.id, today)).length;
  document.getElementById('habits-done').textContent = `${completedCount}/${habits.length}`;
  document.getElementById('habits-total').textContent = `${habits.length} tracked`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTopApps(titles) {
  const host = document.getElementById('top-apps');
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

    return `
      <div class="attention-row">
        <span class="app-rank">${String(i + 1).padStart(2, '0')}</span>
        <div class="attention-info">
          <div class="attention-title truncate">${escapeHtml(primary)}</div>
          <div class="attention-meta truncate">${escapeHtml(secondary || app)}</div>
          <div class="app-bar-track">
            <div class="app-bar-fill app-bar-fill--${cat.name.toLowerCase()}" style="width: ${width}%;"></div>
          </div>
        </div>
        <span class="app-time mono">${formatDuration(item.duration)}</span>
      </div>`;
  }).join('');
}
