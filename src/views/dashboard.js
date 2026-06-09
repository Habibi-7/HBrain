/**
 * Dashboard view — Today's overview
 */
import { habitStore } from '../lib/habit-store.js';
import { mountActivityHeatmap } from '../lib/activity-heatmap.js';
import { mountCompoundGrowth } from '../lib/compound-growth.js';
import { setFocusIndex, getSelectedHabitId } from '../lib/habit-focus.js';
import { onHeatmapFilterChange, setHeatmapFilter, FILTER_TYPES } from '../lib/heatmap-filter.js';
import { registerViewActions, clearViewActions } from '../lib/view-actions.js';
import { openHabitManagerModal } from '../lib/habit-manager-modal.js';
import { loadDashboardStats, loadHabitsStats } from '../lib/dashboard-stats.js';

export function dashboardView() {
  const el = document.createElement('div');
  el.className = 'page-view page-dashboard fade-in';

  let abortController = null;

  const heatmapHandlers = {
    onToggle: (habitId, index) => {
      const habits = habitStore.getScheduledHabits();
      setFocusIndex(index, habits);
      toggleHabit(habitId);
    },
    onAddHabit: () => openAddModal(),
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
    loadHabitsStats(el);
  }

  async function toggleHabit(habitId) {
    await habitStore.toggleHabit(habitId);
    renderHeatmap();
    refreshGrowthSignals();
  }

  function openAddModal() {
    openHabitManagerModal({
      onSave: () => {
        renderHeatmap();
        refreshGrowthSignals();
      },
    });
  }

  function focusSelectedHabit() {
    const habits = habitStore.getScheduledHabits();
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
  }

  function toggleFocusedHabit() {
    const id = getSelectedHabitId(habitStore.getScheduledHabits());
    if (id) toggleHabit(id);
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

  return {
    el,
    mount() {
      abortController = new AbortController();
      renderHeatmap();
      renderCompound();
      loadDashboardStats(el, { signal: abortController.signal });
      el._unsubFilter = onHeatmapFilterChange(() => renderHeatmap());
      registerViewActions({
        habitFocus: focusSelectedHabit,
        habitToggle: toggleFocusedHabit,
        openAddModal,
      });
    },
    destroy() {
      abortController?.abort();
      abortController = null;
      el._unsubFilter?.();
      clearViewActions();
    },
  };
}
