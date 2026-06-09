/**
 * Unified filterable activity heatmap with search.
 */
import { iconHtml } from './icons.js';
import { habitStore } from './habit-store.js';
import { setFocusIndex } from './habit-focus.js';
import { getHeatmapFilter, setHeatmapFilter, FILTER_TYPES } from './heatmap-filter.js';
import { loadHeatmapView } from './heatmap-data.js';
import { openCommandSearch } from './command-search.js';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dateLabel(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function buildWeekGrid(levelByDate) {
  const now = new Date();
  now.setHours(12, 0, 0, 0);

  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - 139);
  start.setDate(start.getDate() - start.getDay());

  const endPad = new Date(end);
  endPad.setDate(endPad.getDate() + (6 - endPad.getDay()));

  const cells = [];
  for (let d = new Date(start); d <= endPad; d.setDate(d.getDate() + 1)) {
    const ds = d.toISOString().slice(0, 10);
    const isFuture = d > now;
    cells.push({
      date: ds,
      level: isFuture ? -1 : (levelByDate[ds] ?? 0),
      isToday: ds === now.toISOString().slice(0, 10),
    });
  }
  return cells;
}

function renderCells(view) {
  const cells = buildWeekGrid(view.levelByDate || {});
  return cells.map((cell) => {
    if (cell.level < 0) {
      return `<div class="heatmap-cell heatmap-cell--future" aria-hidden="true"></div>`;
    }
    const hint = view.cellHint?.(cell.date, cell.level) || cell.date;
    const heatClass = view.mode === 'habits' ? 'habit-heat-cell' : 'activity-heat-cell';
    return `<div class="heatmap-cell ${heatClass}" data-level="${cell.level}" data-date="${cell.date}" title="${escapeHtml(hint)}"></div>`;
  }).join('');
}

function renderAllHabitsChip(filter) {
  const active = filter.type === FILTER_TYPES.HABITS_ALL;
  return `
    <button
      type="button"
      class="habit-chip habit-chip--all ${active ? 'is-selected' : ''}"
      data-habit-scope="all"
      aria-label="All habits"
    >
      ${iconHtml('flame', { size: 16, className: 'ui-icon habit-chip-icon' })}
      <span class="habit-chip-tooltip">All habits</span>
    </button>`;
}

function renderHabitChips(habits, filter) {
  if (!habits.length) return '';
  const today = new Date().toISOString().slice(0, 10);

  return habits.map((habit, i) => {
    const active = filter.type === FILTER_TYPES.HABIT && filter.id === habit.id;
    const done = habitStore.isCompleted(habit.id, today);
    return `
      <button
        type="button"
        class="habit-chip ${active ? 'is-selected' : ''} ${done ? 'is-done' : ''}"
        data-habit-id="${habit.id}"
        data-habit-index="${i}"
        aria-label="${escapeHtml(habit.name)}${done ? ' (completed today)' : ''}"
      >
        ${iconHtml(habit.icon, { size: 16, className: 'ui-icon habit-chip-icon' })}
        <span class="habit-chip-tooltip">${escapeHtml(habit.name)}</span>
      </button>`;
  }).join('');
}

function renderHabitQueue(habits, filter) {
  return `
    <div class="habit-queue" role="toolbar" aria-label="Habits">
      <div class="habit-queue-items">${renderAllHabitsChip(filter)}${habits.length ? renderHabitChips(habits, filter) : ''}</div>
      <button type="button" class="habit-queue-add" id="habit-add-btn" aria-label="Add habit">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>`;
}

function renderHeatmapInner(view, filter) {
  const habits = habitStore.getHabits();

  return `
    ${renderHabitQueue(habits, filter)}
    <div class="habit-heatmap-head">
      <div class="habit-heatmap-title">
        <span class="habit-heatmap-icon">${iconHtml(view.icon, { size: 14 })}</span>
        <span class="habit-heatmap-name">${escapeHtml(view.title)}</span>
        <span class="habit-heatmap-streak mono">${escapeHtml(view.subtitle)}</span>
      </div>
      <div class="heatmap-controls">
        <button type="button" class="heatmap-search-btn" id="heatmap-search-btn" aria-label="Search activity (Cmd+K)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span class="heatmap-search-label">Filter</span>
          <kbd class="heatmap-search-kbd">⌘K</kbd>
        </button>
      </div>
    </div>
    <div class="habit-heatmap-grid-wrap">
      <div class="heatmap-grid habit-heatmap-grid" role="img" aria-label="${escapeHtml(view.title)} heatmap">${renderCells(view)}</div>
    </div>`;
}

function renderLoading() {
  return `<div class="heatmap-loading"><span class="pulse">Loading heatmap…</span></div>`;
}

function clearChipHover(container) {
  container.querySelectorAll('.habit-chip.is-hovered').forEach((chip) => {
    chip.classList.remove('is-hovered');
  });
}

function bindHabitChips(container, handlers = {}) {
  const chips = container.querySelectorAll('.habit-chip');
  if (container._habitChipCleanup) container._habitChipCleanup();

  const onLeave = (event) => {
    const next = event.relatedTarget;
    if (next && container.contains(next)) return;
    clearChipHover(container);
  };

  chips.forEach((chip) => {
    let clickTimer = null;
    chip.addEventListener('mouseenter', () => {
      clearChipHover(container);
      chip.classList.add('is-hovered');
    });
    chip.addEventListener('mouseleave', (event) => {
      if (event.relatedTarget && chip.contains(event.relatedTarget)) return;
      chip.classList.remove('is-hovered');
    });
    chip.addEventListener('click', () => {
      if (clickTimer) clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        const filter = getHeatmapFilter();
        const habits = habitStore.getHabits();

        if (chip.dataset.habitScope === 'all') {
          if (filter.type !== FILTER_TYPES.HABITS_ALL) {
            setHeatmapFilter({
              type: FILTER_TYPES.HABITS_ALL,
              id: 'habits-all',
              label: 'All habits',
              icon: 'flame',
            });
            handlers.onFilterChange?.();
          }
          clickTimer = null;
          return;
        }

        const index = parseInt(chip.dataset.habitIndex, 10);
        const habitId = chip.dataset.habitId;
        const habit = habits[index];
        if (!habit) {
          clickTimer = null;
          return;
        }

        if (filter.type === FILTER_TYPES.HABIT && filter.id === habitId) {
          handlers.onToggle?.(habitId, index);
        } else {
          setFocusIndex(index, habits);
          setHeatmapFilter({
            type: FILTER_TYPES.HABIT,
            id: habit.id,
            label: habit.name,
            icon: habit.icon,
          });
          handlers.onFilterChange?.();
        }
        clickTimer = null;
      }, 200);
    });
    chip.addEventListener('dblclick', (event) => {
      event.preventDefault();
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
      }
      handlers.onDelete?.(chip.dataset.habitId, chip);
    });
  });

  container.addEventListener('mouseleave', onLeave);
  container._habitChipCleanup = () => {
    container.removeEventListener('mouseleave', onLeave);
    clearChipHover(container);
  };
}

function bindControls(host, handlers) {
  host.querySelector('#heatmap-search-btn')?.addEventListener('click', () => {
    openCommandSearch({ onSelect: () => handlers.onFilterChange?.() });
  });

  host.querySelector('#habit-add-btn')?.addEventListener('click', () => {
    handlers.onAddHabit?.();
  });
}

export async function mountActivityHeatmap(host, handlers = {}) {
  if (!host) return;
  const filter = getHeatmapFilter();
  host.innerHTML = renderLoading();

  try {
    const view = await loadHeatmapView(filter);
    host.innerHTML = renderHeatmapInner(view, filter);
    bindControls(host, handlers);
    bindHabitChips(host, handlers);
  } catch (err) {
    console.error('Heatmap load error:', err);
    host.innerHTML = `<div class="habit-heatmap-empty">Failed to load heatmap</div>`;
  }
}

/** @deprecated use mountActivityHeatmap */
export const mountHabitHeatmap = mountActivityHeatmap;
