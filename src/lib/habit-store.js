/**
 * Local habit & manual entry storage
 * Persists to localStorage (no server needed)
 */
import { normalizeIconKey } from './icons.js';

const HABITS_KEY = 'hbrain_habits';
const ENTRIES_KEY = 'hbrain_habit_entries';
const HABIT_ICONS_KEY = 'hbrain_habit_icons_v1';

/** Default habits to scaffold */
const DEFAULT_HABITS = [
  { id: 'gym', name: 'Gym', icon: 'dumbbell', color: '#da8598', created: new Date().toISOString() },
  { id: 'reading', name: 'Reading', icon: 'book', color: '#9eb8f0', created: new Date().toISOString() },
  { id: 'meditation', name: 'Meditation', icon: 'flower', color: '#b0b8f0', created: new Date().toISOString() },
  { id: 'water', name: 'Water (8 cups)', icon: 'droplets', color: '#86c9ae', created: new Date().toISOString() },
];

class HabitStore {
  constructor() {
    this._habits = null;
    this._entries = null;
  }

  /** Get all habits */
  getHabits() {
    if (!this._habits) {
      const raw = localStorage.getItem(HABITS_KEY);
      this._habits = raw ? JSON.parse(raw) : [...DEFAULT_HABITS];
      if (!raw) {
        this._save();
      } else {
        this._migrateIcons();
      }
    }
    return this._habits;
  }

  _migrateIcons() {
    if (localStorage.getItem(HABIT_ICONS_KEY)) return;
    for (const habit of this._habits) {
      habit.icon = normalizeIconKey(habit.icon);
    }
    localStorage.setItem(HABIT_ICONS_KEY, '1');
    this._save();
  }

  /** Add a new habit */
  addHabit({ name, icon = 'star', color = '#9eb8f0' }) {
    const habits = this.getHabits();
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const habit = { id, name, icon: normalizeIconKey(icon), color, created: new Date().toISOString() };
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

  /** Get completion data for a habit over the last N days */
  getHabitHistory(habitId, days = 30) {
    const entries = this.getEntries();
    const result = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      result.push({
        date: dateStr,
        completed: entries.some(e => e.habitId === habitId && e.date === dateStr),
        isToday: i === 0,
      });
    }
    return result;
  }

  /** Map habit history to heatmap intensity levels (0–4) */
  getCombinedHistory(days = 140) {
    const habits = this.getHabits();
    const result = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const done = habits.filter((h) => this.isCompleted(h.id, dateStr)).length;
      const total = habits.length;
      const fraction = total ? done / total : 0;
      result.push({
        date: dateStr,
        completed: total > 0 && done === total,
        fraction,
        isToday: i === 0,
      });
    }
    return result;
  }

  /** Map habit history to heatmap intensity levels (0–4) */
  historyToLevels(history, { combined = false } = {}) {
    return history.map((day) => {
      if (combined) {
        if (day.completed) return 4;
        if (day.fraction >= 0.75) return 3;
        if (day.fraction >= 0.5) return 2;
        if (day.fraction > 0) return 1;
        return 0;
      }
      return day.completed ? 4 : 0;
    });
  }

  /** Get weekly completion rate */
  getWeeklyRate(habitId) {
    const history = this.getHabitHistory(habitId, 7);
    const completed = history.filter(d => d.completed).length;
    return Math.round((completed / 7) * 100);
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
