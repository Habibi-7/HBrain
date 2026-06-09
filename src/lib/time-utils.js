/**
 * Time & date utilities
 */

/** Format seconds as "Xh Ym" */
export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0m';
  if (seconds < 60) return '<1m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Format seconds as "X.Xh" */
export function formatHours(seconds) {
  if (!seconds) return '0.0h';
  return `${(seconds / 3600).toFixed(1)}h`;
}

/** Midnight local time for a date */
export function startOfDay(d = new Date()) {
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  return day;
}

/** End of local day for a date */
export function endOfDay(d = new Date()) {
  const day = new Date(d);
  day.setHours(23, 59, 59, 999);
  return day;
}

/** Shift a date by N calendar days */
export function shiftDay(d, days) {
  const day = new Date(d);
  day.setDate(day.getDate() + days);
  return day;
}

/** Get start of today (local time) as ISO string */
export function todayStart() {
  return startOfDay().toISOString();
}

/** Get end of today (local time) as ISO string */
export function todayEnd() {
  return endOfDay().toISOString();
}

/** ISO bounds for a specific local day */
export function dayBounds(d = new Date()) {
  return {
    start: startOfDay(d).toISOString(),
    end: endOfDay(d).toISOString(),
  };
}

/** Get start of N days ago */
export function daysAgoStart(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Get ISO date string for a Date */
export function dateStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/** Get day of week label */
export function dayOfWeek(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short' });
}

/** Get month label */
export function monthLabel(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short' });
}

/** Get readable date */
export function readableDate(dateString) {
  const d = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr(d) === dateStr(today)) return 'Today';
  if (dateStr(d) === dateStr(yesterday)) return 'Yesterday';

  return pageDateLabel(d);
}

/** Always show weekday + month + day (no Today/Yesterday aliases). */
export function pageDateLabel(d = new Date()) {
  return startOfDay(d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/** Get time string from ISO date */
export function timeStr(isoString) {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Get percentage */
export function pct(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

/** Compute a change indicator vs previous period */
export function computeChange(current, previous) {
  if (!previous) return { value: 0, label: '—', positive: true };
  const diff = current - previous;
  const pctChange = Math.round((diff / previous) * 100);
  return {
    value: pctChange,
    label: `${pctChange >= 0 ? '+' : ''}${pctChange}%`,
    positive: pctChange >= 0,
  };
}
