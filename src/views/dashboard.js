/**
 * Dashboard view — day overview with date navigation
 */
import { habitStore } from '../lib/habit-store.js';
import { mountActivityHeatmap } from '../lib/activity-heatmap.js';
import { mountCompoundGrowth } from '../lib/compound-growth.js';
import { setFocusIndex, getSelectedHabitId } from '../lib/habit-focus.js';
import { onHeatmapFilterChange, setHeatmapFilter, FILTER_TYPES } from '../lib/heatmap-filter.js';
import { registerViewActions, clearViewActions } from '../lib/view-actions.js';
import { openHabitManagerModal } from '../lib/habit-manager-modal.js';
import { loadDashboardStats, loadHabitsStats } from '../lib/dashboard-stats.js';
import { openDatePickerModal } from '../lib/mini-calendar.js';
import { dateStr, pageDateLabel, shiftDay, startOfDay } from '../lib/time-utils.js';

export function dashboardView() {
  const el = document.createElement('div');
  el.className = 'page-view page-dashboard fade-in';

  let abortController = null;
  let selectedDay = startOfDay();
  let datePicker = null;

  const heatmapHandlers = {
    onMarkDone: (habitId) => toggleHabit(habitId),
    onAddHabit: () => openAddModal(),
    onFilterChange: () => renderHeatmap(),
  };

  function renderHeatmap() {
    mountActivityHeatmap(el.querySelector('#habit-heatmap-section'), heatmapHandlers, { selectedDay });
  }

  function renderCompound() {
    mountCompoundGrowth(el.querySelector('#compound-growth-section'));
  }

  function refreshGrowthSignals() {
    renderCompound();
    loadHabitsStats(el, { selectedDay });
  }

  async function toggleHabit(habitId) {
    await habitStore.toggleHabit(habitId, dateStr(selectedDay));
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
    const habits = habitStore.getScheduledHabits(dateStr(selectedDay));
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
    const id = getSelectedHabitId(habitStore.getScheduledHabits(dateStr(selectedDay)));
    if (id) toggleHabit(id);
  }

  function canGoNextDay() {
    return dateStr(selectedDay) < dateStr(startOfDay());
  }

  function updateDayPickerUi() {
    const label = el.querySelector('#dashboard-day-label');
    const picker = el.querySelector('#dashboard-day-picker');
    const nextChevron = el.querySelector('.dashboard-day-chevron--next');

    if (label) label.textContent = pageDateLabel(selectedDay);
    if (nextChevron) nextChevron.classList.toggle('is-disabled', !canGoNextDay());
    if (picker) picker.setAttribute('aria-label', `Selected day: ${pageDateLabel(selectedDay)}`);
  }

  function closeDatePicker() {
    datePicker?.close();
    datePicker = null;
    el.querySelector('#dashboard-day-picker')?.setAttribute('aria-expanded', 'false');
  }

  function openDatePicker() {
    if (datePicker) {
      closeDatePicker();
      return;
    }

    const picker = el.querySelector('#dashboard-day-picker');
    picker?.setAttribute('aria-expanded', 'true');

    datePicker = openDatePickerModal({
      selectedDay,
      onSelect: (day) => {
        selectedDay = day;
        loadDay();
      },
      onClose: () => {
        datePicker = null;
        picker?.setAttribute('aria-expanded', 'false');
      },
    });
  }

  function shiftSelectedDay(delta) {
    if (delta > 0 && !canGoNextDay()) return;
    selectedDay = shiftDay(selectedDay, delta);
    closeDatePicker();
    loadDay();
  }

  function loadDay() {
    updateDayPickerUi();
    renderHeatmap();
    loadHabitsStats(el, { selectedDay });
    abortController?.abort();
    abortController = new AbortController();
    loadDashboardStats(el, { signal: abortController.signal, selectedDay });
  }

  function onDashboardKeyDown(event) {
    if (datePicker) return;
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      shiftSelectedDay(-1);
      return;
    }

    if (event.key === 'ArrowRight') {
      if (!canGoNextDay()) return;
      event.preventDefault();
      shiftSelectedDay(1);
    }
  }

  el.innerHTML = `
    <header class="page-toolbar">
      <div class="dashboard-day-nav">
        <button
          type="button"
          class="dashboard-day-picker"
          id="dashboard-day-picker"
          aria-haspopup="dialog"
          aria-expanded="false"
        >
          <span class="dashboard-day-chevron dashboard-day-chevron--prev" data-action="prev" aria-hidden="true">‹</span>
          <span class="dashboard-day-label page-title" id="dashboard-day-label" data-action="pick">${pageDateLabel(selectedDay)}</span>
          <span class="dashboard-day-chevron dashboard-day-chevron--next" data-action="next" aria-hidden="true">›</span>
        </button>
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
      el.querySelector('#dashboard-day-picker')?.addEventListener('click', (event) => {
        const action = event.target.closest('[data-action]')?.dataset.action;

        if (action === 'prev') {
          event.stopPropagation();
          shiftSelectedDay(-1);
          return;
        }

        if (action === 'next') {
          event.stopPropagation();
          if (canGoNextDay()) shiftSelectedDay(1);
          return;
        }

        openDatePicker();
      });

      document.addEventListener('keydown', onDashboardKeyDown);
      renderCompound();
      loadDay();
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
      closeDatePicker();
      document.removeEventListener('keydown', onDashboardKeyDown);
      el._unsubFilter?.();
      clearViewActions();
    },
  };
}
