/** Weekday helpers — JS Date.getDay(): 0 = Sun … 6 = Sat */

export const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export const WEEKDAY_PICKER = [
  { day: 1, label: 'Mon', short: 'M' },
  { day: 2, label: 'Tue', short: 'T' },
  { day: 3, label: 'Wed', short: 'W' },
  { day: 4, label: 'Thu', short: 'T' },
  { day: 5, label: 'Fri', short: 'F' },
  { day: 6, label: 'Sat', short: 'S' },
  { day: 0, label: 'Sun', short: 'S' },
];

export function normalizeSchedule(days) {
  if (!Array.isArray(days) || !days.length) return [...ALL_WEEKDAYS];
  return [...new Set(days.filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b);
}

export function parseDate(dateStr) {
  return new Date(`${dateStr}T12:00:00`);
}

export function isScheduledOn(habit, dateStr) {
  const schedule = normalizeSchedule(habit?.days);
  return schedule.includes(parseDate(dateStr).getDay());
}

export function scheduledDaysInRange(habit, startDate, endDate) {
  const schedule = normalizeSchedule(habit?.days);
  const days = [];
  const cursor = new Date(startDate);
  cursor.setHours(12, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(12, 0, 0, 0);

  while (cursor <= end) {
    if (schedule.includes(cursor.getDay())) {
      days.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/** Consecutive scheduled days completed, walking backward from today. */
export function computeStreak(habit, isCompleted, todayStr) {
  const today = parseDate(todayStr);
  let cursor = new Date(today);
  let streak = 0;

  if (isScheduledOn(habit, todayStr) && !isCompleted(habit.id, todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  for (let i = 0; i < 366; i += 1) {
    const dateStr = cursor.toISOString().slice(0, 10);
    if (cursor > today) break;

    if (isScheduledOn(habit, dateStr)) {
      if (isCompleted(habit.id, dateStr)) streak += 1;
      else break;
    }

    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function computeWeeklyRate(habit, isCompleted, todayStr, days = 7) {
  const end = parseDate(todayStr);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  const scheduled = scheduledDaysInRange(habit, start, end);
  if (!scheduled.length) return 100;

  const done = scheduled.filter((date) => isCompleted(habit.id, date)).length;
  return Math.round((done / scheduled.length) * 100);
}

/**
 * All-habits perfect day: every scheduled habit done AND every habit has streak >= 1.
 * Returns null when no habits are scheduled (rest day).
 */
export function computeCombinedPerfectDay(habits, isCompleted, getStreak, dateStr) {
  if (!habits.length) return null;

  const scheduled = habits.filter((h) => isScheduledOn(h, dateStr));
  if (!scheduled.length) return null;

  if (!scheduled.every((h) => isCompleted(h.id, dateStr))) return false;
  if (!habits.every((h) => getStreak(h.id, dateStr) >= 1)) return false;
  return true;
}

/** Consecutive all-habits perfect days, skipping combined rest days. */
export function computeCombinedStreak(habits, isCombinedPerfect, todayStr) {
  const today = parseDate(todayStr);
  let cursor = new Date(today);
  let streak = 0;

  const todayStatus = isCombinedPerfect(todayStr);
  if (todayStatus === false) {
    cursor.setDate(cursor.getDate() - 1);
  }

  for (let i = 0; i < 366; i += 1) {
    const dateStr = cursor.toISOString().slice(0, 10);
    if (cursor > today) break;

    const status = isCombinedPerfect(dateStr);
    if (status === true) streak += 1;
    else if (status === false) break;

    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
