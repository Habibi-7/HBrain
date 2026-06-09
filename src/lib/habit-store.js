/**
 * Local habit & manual entry storage
 * Persists to localStorage (no server needed)
 */
import { normalizeIconKey } from './icons.js';
import {
  computeStreak,
  computeWeeklyRate,
  computeCombinedPerfectDay,
  computeCombinedStreak,
  isScheduledOn,
  normalizeSchedule,
} from './habit-schedule.js';

const HABITS_KEY = 'hbrain_habits';
const ENTRIES_KEY = 'hbrain_habit_entries';
const HABIT_ICONS_KEY = 'hbrain_habit_icons_v1';
const HABIT_SCHEDULE_KEY = 'hbrain_habit_schedule_v1';
const HABITS_PRESET_KEY = 'hbrain_habits_preset_v1';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function buildDefaultHabits() {
  const created = new Date().toISOString();
  return [
    { id: 'speaking-to-the-camera', name: 'Speaking to the camera', icon: 'video', color: '#9eb8f0', days: [2, 6], created },
    { id: 'multi-disc', name: 'Multi-disc', icon: 'disc', color: '#b0b8f0', days: [...ALL_DAYS], created },
    { id: 'run', name: 'Run', icon: 'footprints', color: '#86c9ae', days: [0, 1, 2, 4, 5, 6], created },
    { id: 'mandarin', name: 'Mandarin', icon: 'languages', color: '#8db4f2', days: [...ALL_DAYS], created },
    { id: 'piano', name: 'Piano', icon: 'music', color: '#b0b8f0', days: [1, 3, 5, 6], created },
    { id: 'math', name: 'Math', icon: 'calculator', color: '#9eb8f0', days: [0, 2, 4, 5, 6], created },
    { id: 'coding', name: 'Coding', icon: 'code', color: '#86c9ae', days: [...ALL_DAYS], created },
    { id: 'journal', name: 'Journal', icon: 'notebook', color: '#da8598', days: [2, 4, 6], created },
    { id: 'reading', name: 'Reading', icon: 'book', color: '#9eb8f0', days: [...ALL_DAYS], created },
    { id: 'work-out', name: 'Work out', icon: 'dumbbell', color: '#da8598', days: [1, 2, 4, 5], created },
  ];
}

/** Default habits for new installs */
const DEFAULT_HABITS = buildDefaultHabits();

class HabitStore {
  constructor() {
    this._habits = null;
    this._entries = null;
  }

  /** Get all habits */
  getHabits() {
    if (!this._habits) {
      const raw = localStorage.getItem(HABITS_KEY);
      this._habits = raw ? JSON.parse(raw) : buildDefaultHabits();
      if (!raw) this._save();
      this._migrateIcons();
      this._migrateSchedule();
      this._migratePresetHabits();
    }
    return this._habits;
  }

  getHabit(id) {
    return this.getHabits().find((h) => h.id === id) || null;
  }

  _migrateIcons() {
    if (localStorage.getItem(HABIT_ICONS_KEY)) return;
    for (const habit of this._habits) {
      habit.icon = normalizeIconKey(habit.icon);
    }
    localStorage.setItem(HABIT_ICONS_KEY, '1');
    this._save();
  }

  _migrateSchedule() {
    if (localStorage.getItem(HABIT_SCHEDULE_KEY)) return;
    for (const habit of this._habits) {
      habit.days = normalizeSchedule(habit.days);
    }
    localStorage.setItem(HABIT_SCHEDULE_KEY, '1');
    this._save();
  }

  _migratePresetHabits() {
    if (localStorage.getItem(HABITS_PRESET_KEY)) return;
    this._habits = buildDefaultHabits();
    this._entries = [];
    localStorage.setItem(HABITS_PRESET_KEY, '1');
    this._save();
    this._saveEntries();
  }

  /** Add a new habit */
  addHabit({ name, icon = 'star', color = '#9eb8f0', days = [0, 1, 2, 3, 4, 5, 6] }) {
    const habits = this.getHabits();
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const habit = {
      id,
      name,
      icon: normalizeIconKey(icon),
      color,
      days: normalizeSchedule(days),
      created: new Date().toISOString(),
    };
    habits.push(habit);
    this._save();
    return habit;
  }

  /** Remove a habit */
  removeHabit(id) {
    this._habits = this.getHabits().filter(h => h.id !== id);
    this._save();
  }

  /** Get all entries (habit completions) */
  getEntries() {
    if (!this._entries) {
      const raw = localStorage.getItem(ENTRIES_KEY);
      this._entries = raw ? JSON.parse(raw) : [];
    }
    return this._entries;
  }

  /** Toggle a habit for a given date */
  toggleHabit(habitId, date = todayStr()) {
    const entries = this.getEntries();
    const existing = entries.findIndex(e => e.habitId === habitId && e.date === date);
    if (existing >= 0) {
      entries.splice(existing, 1);
    } else {
      entries.push({
        habitId,
        date,
        completedAt: new Date().toISOString(),
      });
    }
    this._saveEntries();
    return this.isCompleted(habitId, date);
  }

  /** Check if a habit is completed on a date */
  isCompleted(habitId, date = todayStr()) {
    return this.getEntries().some(e => e.habitId === habitId && e.date === date);
  }

  isScheduled(habitId, date = todayStr()) {
    const habit = this.getHabit(habitId);
    return habit ? isScheduledOn(habit, date) : false;
  }

  /** Get completion data for a habit over the last N days */
  getHabitHistory(habitId, days = 30) {
    const habit = this.getHabit(habitId);
    const entries = this.getEntries();
    const result = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      result.push({
        date: dateStr,
        scheduled: habit ? isScheduledOn(habit, dateStr) : true,
        completed: entries.some(e => e.habitId === habitId && e.date === dateStr),
        isToday: i === 0,
      });
    }
    return result;
  }

  /** Map habit history to heatmap intensity levels (0–4, -2 = rest day) */
  historyToLevels(history, { combined = false } = {}) {
    return history.map((day) => {
      if (combined) {
        if (!day.scheduled) return -2;
        return day.completed ? 4 : 0;
      }

      if (day.scheduled === false) return -2;
      return day.completed ? 4 : 0;
    });
  }

  getStreakAsOf(habitId, dateStr) {
    const habit = this.getHabit(habitId);
    if (!habit) return 0;
    return computeStreak(habit, (id, date) => this.isCompleted(id, date), dateStr);
  }

  getCombinedPerfectStatus(dateStr) {
    const habits = this.getHabits();
    return computeCombinedPerfectDay(
      habits,
      (id, date) => this.isCompleted(id, date),
      (id, date) => this.getStreakAsOf(id, date),
      dateStr,
    );
  }

  getCombinedHistory(days = 140) {
    const habits = this.getHabits();
    const result = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const scheduledHabits = habits.filter((h) => isScheduledOn(h, dateStr));
      const done = scheduledHabits.filter((h) => this.isCompleted(h.id, dateStr)).length;
      const total = scheduledHabits.length;
      const fraction = total ? done / total : 0;
      const perfect = this.getCombinedPerfectStatus(dateStr);

      result.push({
        date: dateStr,
        scheduled: perfect !== null,
        completed: perfect === true,
        fraction,
        isToday: i === 0,
      });
    }
    return result;
  }

  /** Completion rate on scheduled days in the last 7 days */
  getWeeklyRate(habitId) {
    const habit = this.getHabit(habitId);
    if (!habit) return 0;
    return computeWeeklyRate(habit, (id, date) => this.isCompleted(id, date), todayStr(), 7);
  }

  getStreak(habitId) {
    const habit = this.getHabit(habitId);
    if (!habit) return 0;
    return computeStreak(habit, (id, date) => this.isCompleted(id, date), todayStr());
  }

  getCombinedStreak(asOfDate = todayStr()) {
    const habits = this.getHabits();
    return computeCombinedStreak(
      habits,
      (date) => this.getCombinedPerfectStatus(date),
      asOfDate,
    );
  }

  getCombinedWeeklyRate(days = 7) {
    const habits = this.getHabits();
    const end = new Date();
    let scheduled = 0;
    let done = 0;

    for (let i = 0; i < days; i += 1) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      for (const habit of habits) {
        if (!isScheduledOn(habit, dateStr)) continue;
        scheduled += 1;
        if (this.isCompleted(habit.id, dateStr)) done += 1;
      }
    }

    return scheduled ? Math.round((done / scheduled) * 100) : 100;
  }

  _save() {
    localStorage.setItem(HABITS_KEY, JSON.stringify(this._habits));
  }

  _saveEntries() {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(this._entries));
  }
}

function todayStr() {
  return formatDate(new Date());
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

export const habitStore = new HabitStore();
export default habitStore;
