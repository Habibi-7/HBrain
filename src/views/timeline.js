/**
 * Timeline view — Gantt-style day swimlanes
 */
import { awClient } from '../lib/aw-client.js';
import {
  buildTimelineRows,
  renderDayTimeline,
  resolveViewWindow,
  formatWindowRange,
  ZOOM_LEVELS,
} from '../lib/day-timeline.js';
import { mountMiniCalendar } from '../lib/mini-calendar.js';
import { dateStr, dayBounds, readableDate, shiftDay, startOfDay } from '../lib/time-utils.js';

export function timelineView() {
  const el = document.createElement('div');
  el.className = 'page-view page-timeline fade-in';

  let selectedDay = startOfDay();
  let groupBy = 'app';
  let zoomId = 'day';
  let panPct = 100;
  let cachedEvents = [];
  let calendar = null;

  const zoomButtons = ZOOM_LEVELS.map(({ id, label }) => `
    <button type="button" class="timeline-zoom-btn ${id === zoomId ? 'is-active' : ''}" data-zoom="${id}">${label}</button>
  `).join('');

  el.innerHTML = `
    <header class="page-toolbar">
      <div>
        <span class="page-kicker">When</span>
        <h1 class="page-title">Timeline</h1>
      </div>
      <div class="timeline-toolbar">
        <div class="timeline-nav">
          <div class="timeline-day-picker-wrap">
            <button
              type="button"
              class="timeline-day-picker"
              id="timeline-day-picker"
              aria-haspopup="dialog"
              aria-expanded="false"
            >
              <span class="timeline-day-chevron timeline-day-chevron--prev" data-action="prev" aria-hidden="true">‹</span>
              <span class="timeline-day-label" id="timeline-day-label" data-action="pick">${readableDate(selectedDay)}</span>
              <span class="timeline-day-chevron timeline-day-chevron--next" data-action="next" aria-hidden="true">›</span>
            </button>
          </div>
        </div>
        <div class="timeline-modes" role="group" aria-label="Group by">
          <button type="button" class="timeline-mode is-active" data-group="app">Apps</button>
          <button type="button" class="timeline-mode" data-group="category">Categories</button>
        </div>
      </div>
    </header>

    <div class="page-body timeline-body">
      <div class="card gantt-card">
        <div class="gantt-controls">
          <div class="timeline-zoom" role="group" aria-label="Zoom granularity">
            <span class="gantt-controls-label">Zoom</span>
            ${zoomButtons}
          </div>
          <div class="timeline-pan-wrap is-hidden" id="timeline-pan-wrap">
            <span class="gantt-controls-label">Pan</span>
            <input
              type="range"
              class="timeline-pan-bar"
              id="timeline-pan"
              min="0"
              max="100"
              value="${panPct}"
              aria-label="Pan timeline window"
            />
            <span class="timeline-pan-range mono" id="timeline-pan-label"></span>
          </div>
        </div>
        <div id="gantt-container" class="gantt-container">
          <div class="fg-tertiary text-sm pulse">Loading timeline…</div>
        </div>
      </div>
    </div>
  `;

  function isToday() {
    return dateStr(selectedDay) === dateStr(new Date());
  }

  function canGoNextDay() {
    return dateStr(selectedDay) < dateStr(startOfDay());
  }

  function updateDayPickerUi() {
    const label = el.querySelector('#timeline-day-label');
    const picker = el.querySelector('#timeline-day-picker');
    const nextChevron = el.querySelector('.timeline-day-chevron--next');

    if (label) label.textContent = readableDate(selectedDay);
    if (nextChevron) nextChevron.classList.toggle('is-disabled', !canGoNextDay());
    if (picker) picker.setAttribute('aria-label', `Selected day: ${readableDate(selectedDay)}`);
  }

  function closeCalendar() {
    calendar?.close();
    calendar = null;
    el.querySelector('#timeline-day-picker')?.setAttribute('aria-expanded', 'false');
  }

  function openCalendar() {
    if (calendar) {
      closeCalendar();
      return;
    }

    const picker = el.querySelector('#timeline-day-picker');
    picker?.setAttribute('aria-expanded', 'true');

    calendar = mountMiniCalendar(picker, {
      selectedDay,
      onSelect: (day) => {
        selectedDay = day;
        panPct = 100;
        loadTimeline();
      },
      onClose: closeCalendar,
    });
  }

  function shiftSelectedDay(delta) {
    if (delta > 0 && !canGoNextDay()) return;
    selectedDay = shiftDay(selectedDay, delta);
    panPct = 100;
    closeCalendar();
    loadTimeline();
  }

  function updatePanUi(viewWindow) {
    const panWrap = el.querySelector('#timeline-pan-wrap');
    const panLabel = el.querySelector('#timeline-pan-label');
    const panInput = el.querySelector('#timeline-pan');

    if (viewWindow.isFullDay) {
      panWrap?.classList.add('is-hidden');
      return;
    }

    panWrap?.classList.remove('is-hidden');
    panInput.value = String(panPct);
    panLabel.textContent = formatWindowRange(viewWindow.startMs, viewWindow.endMs);
  }

  function paintTimeline() {
    const container = el.querySelector('#gantt-container');
    const viewWindow = resolveViewWindow(selectedDay, zoomId, panPct, isToday());
    const model = buildTimelineRows(cachedEvents, { groupBy });

    container.innerHTML = renderDayTimeline({
      ...model,
      viewWindow,
      showNow: isToday(),
    });

    updatePanUi(viewWindow);
  }

  async function loadTimeline() {
    const container = el.querySelector('#gantt-container');
    updateDayPickerUi();

    const connected = await awClient.isConnected();
    if (!connected) {
      container.innerHTML = '<div class="gantt-empty">ActivityWatch not connected</div>';
      return;
    }

    container.innerHTML = '<div class="fg-tertiary text-sm pulse">Loading timeline…</div>';

    try {
      const { start, end } = dayBounds(selectedDay);
      cachedEvents = await awClient.getTimelineEvents(start, end);
      paintTimeline();
    } catch (err) {
      console.error('Timeline error:', err);
      container.innerHTML = '<div class="gantt-empty">Failed to load timeline</div>';
    }
  }

  function setZoom(nextZoom) {
    zoomId = nextZoom;
    if (zoomId !== 'day') panPct = 100;
    el.querySelectorAll('.timeline-zoom-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.zoom === zoomId);
    });
    paintTimeline();
  }

  function onTimelineKeyDown(event) {
    if (calendar) return;
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

  function bindControls() {
    el.querySelector('#timeline-day-picker')?.addEventListener('click', (event) => {
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

      openCalendar();
    });

    el.querySelectorAll('.timeline-mode').forEach((btn) => {
      btn.addEventListener('click', () => {
        groupBy = btn.dataset.group;
        el.querySelectorAll('.timeline-mode').forEach((b) => {
          b.classList.toggle('is-active', b === btn);
        });
        paintTimeline();
      });
    });

    el.querySelectorAll('.timeline-zoom-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        setZoom(btn.dataset.zoom);
      });
    });

    el.querySelector('#timeline-pan')?.addEventListener('input', (event) => {
      panPct = Number(event.target.value);
      paintTimeline();
    });

    document.addEventListener('keydown', onTimelineKeyDown);
  }

  return {
    el,
    mount() {
      bindControls();
      updateDayPickerUi();
      loadTimeline();
    },
    destroy() {
      closeCalendar();
      document.removeEventListener('keydown', onTimelineKeyDown);
    },
  };
}
