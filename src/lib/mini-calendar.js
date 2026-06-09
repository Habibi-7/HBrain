/**
 * Mini calendar popover for day selection.
 */
import { dateStr, startOfDay } from './time-utils.js';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function monthStart(d) {
  const m = startOfDay(d);
  m.setDate(1);
  return m;
}

export function renderMiniCalendar({ selectedDay, viewMonth }) {
  const today = startOfDay();
  const todayStr = dateStr(today);
  const selectedStr = dateStr(selectedDay);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const startOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i -= 1) {
    cells.push({ date: new Date(year, month - 1, prevMonthDays - i), outside: true });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, month, day), outside: false });
  }

  let trailing = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ date: new Date(year, month + 1, trailing), outside: true });
    trailing += 1;
  }

  const canGoNextMonth = dateStr(new Date(year, month + 1, 1)) <= todayStr;

  const dayButtons = cells.map(({ date, outside }) => {
    const ds = dateStr(date);
    const isToday = ds === todayStr;
    const isSelected = ds === selectedStr;
    const isFuture = ds > todayStr;
    const classes = [
      'mini-cal-day',
      outside ? 'is-outside' : '',
      isToday ? 'is-today' : '',
      isSelected ? 'is-selected' : '',
      isFuture ? 'is-future' : '',
    ].filter(Boolean).join(' ');

    return `<button type="button" class="${classes}" data-date="${ds}" ${isFuture ? 'disabled' : ''} aria-label="${date.toLocaleDateString()}">${date.getDate()}</button>`;
  }).join('');

  return `
    <div class="mini-cal" role="dialog" aria-label="Choose date">
      <div class="mini-cal-header">
        <button type="button" class="mini-cal-nav" data-cal-nav="-1" aria-label="Previous month">‹</button>
        <span class="mini-cal-month">${monthLabel}</span>
        <button type="button" class="mini-cal-nav" data-cal-nav="1" aria-label="Next month" ${canGoNextMonth ? '' : 'disabled'}>›</button>
      </div>
      <div class="mini-cal-weekdays">${WEEKDAYS.map((d) => `<span>${d}</span>`).join('')}</div>
      <div class="mini-cal-grid">${dayButtons}</div>
    </div>`;
}

export function mountMiniCalendar(anchor, { selectedDay, onSelect, onClose }) {
  let viewMonth = monthStart(selectedDay);

  const popover = document.createElement('div');
  popover.className = 'mini-cal-popover';

  function paint() {
    popover.innerHTML = renderMiniCalendar({ selectedDay, viewMonth });

    popover.querySelectorAll('[data-date]:not([disabled])').forEach((btn) => {
      btn.addEventListener('click', () => {
        onSelect(startOfDay(new Date(`${btn.dataset.date}T12:00:00`)));
        onClose();
      });
    });

    popover.querySelectorAll('[data-cal-nav]:not([disabled])').forEach((btn) => {
      btn.addEventListener('click', () => {
        viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + Number(btn.dataset.calNav), 1);
        paint();
      });
    });
  }

  paint();
  anchor.after(popover);

  function handleOutside(event) {
    if (popover.contains(event.target) || anchor.contains(event.target)) return;
    onClose();
  }

  function handleEscape(event) {
    if (event.key === 'Escape') onClose();
  }

  const outsideTimer = setTimeout(() => {
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
  }, 0);

  return {
    close() {
      clearTimeout(outsideTimer);
      popover.remove();
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    },
  };
}
