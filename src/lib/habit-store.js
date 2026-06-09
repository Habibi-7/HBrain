/**
 * Habit storage — SQLite via local API, with localStorage fallback.
 */
import { buildDefaultHabits } from './default-habits.js';
import { checkHabitApi, habitApi } from './habit-api.js';
import { normalizeIconKey } from './icons.js';
import {
  computeStreak,
  computeWeeklyRate,
  computeCombinedPerfectDay,
  computeCombinedStreak,
  isScheduledOn,
  normalizeSchedule,
} from './habit-schedule.js';

const HABITS_KEY = 'hvis_habits';
const ENTRIES_KEY = 'hvis_habit_entries';
const HABIT_ICONS_KEY = 'hvis_habit_icons_v1';
const HABIT_SCHEDULE_KEY = 'hvis_habit_schedule_v1';
const HABITS_PRESET_KEY = 'hvis_habits_preset_v1';
const LEGACY_BACKUP_KEY = 'hvis_habits_backup';

class HabitStore {
  constructor() {
    this._habits = [];
    this._entries = [];
    this._storage = 'localStorage';
    this._initialized = false;
    this._writeLock = Promise.resolve();
  }

  async init() {
    if (this._initialized) return this._storage;

    try {
      await checkHabitApi();
      const legacy = this._readLegacyLocal();
      let state = await habitApi('/state');

      if (legacy.hasData && !state.meta?.localImportComplete) {
        state = await habitApi('/migrate', {
          method: 'POST',
          body: JSON.stringify({
            habits: legacy.habits,
            entries: legacy.entries,
          }),
        });
        this._archiveLegacyLocal(legacy);
      }

      this._applyState(state);
      this._storage = 'sqlite';
    } catch (err) {
      console.warn('Hvis SQLite API unavailable, falling back to localStorage.', err);
      this._initLocal();
      this._storage = 'localStorage';
    }

    this._initialized = true;
    return this._storage;
  }

  getStorageMode() {
    return this._storage;
  }

  #runExclusive(task) {
    const next = this._writeLock.then(task);
    this._writeLock = next.catch(() => {});
    return next;
  }

  _applyState(state) {
    this._habits = (state.habits || []).map((habit) => ({
      ...habit,
      icon: normalizeIconKey(habit.icon),
      days: normalizeSchedule(habit.days),
    }));
    this._entries = state.entries || [];
  }

  _readLegacyLocal() {
    const habits = JSON.parse(localStorage.getItem(HABITS_KEY) || '[]');
    const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]');
    return {
      habits,
      entries,
      hasData: habits.length > 0 || entries.length > 0,
    };
  }

  _archiveLegacyLocal(legacy) {
    localStorage.setItem(LEGACY_BACKUP_KEY, JSON.stringify({
      habits: legacy.habits,
      entries: legacy.entries,
      archivedAt: new Date().toISOString(),
    }));
    localStorage.removeItem(HABITS_KEY);
    localStorage.removeItem(ENTRIES_KEY);
  }

  _initLocal() {
    const raw = localStorage.getItem(HABITS_KEY);
    this._habits = raw ? JSON.parse(raw) : buildDefaultHabits();
    if (!raw) this._saveLocal();
    this._migrateIcons();
    this._migrateSchedule();
    this._migratePresetHabits();
    const entriesRaw = localStorage.getItem(ENTRIES_KEY);
    this._entries = entriesRaw ? JSON.parse(entriesRaw) : [];
  }

  _saveLocal() {
    localStorage.setItem(HABITS_KEY, JSON.stringify(this._habits));
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(this._entries));
  }

  _createHabit({ name, icon = 'star', color = '#9eb8f0', days = [0, 1, 2, 3, 4, 5, 6] }) {
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    return {
      id,
      name,
      icon: normalizeIconKey(icon),
      color,
      days: normalizeSchedule(days),
      created: new Date().toISOString(),
    };
  }

  getHabits() {
    return this._habits;
  }

  getHabit(id) {
    return this.getHabits().find((h) => h.id === id) || null;
  }

  _migrateIcons() {
    if (this._storage === 'sqlite') return;
    if (localStorage.getItem(HABIT_ICONS_KEY)) return;
    for (const habit of this._habits) {
      habit.icon = normalizeIconKey(habit.icon);
    }
    localStorage.setItem(HABIT_ICONS_KEY, '1');
    this._saveLocal();
  }

  _migrateSchedule() {
    if (this._storage === 'sqlite') return;
    if (localStorage.getItem(HABIT_SCHEDULE_KEY)) return;
    for (const habit of this._habits) {
      habit.days = normalizeSchedule(habit.days);
    }
    localStorage.setItem(HABIT_SCHEDULE_KEY, '1');
    this._saveLocal();
  }

  _migratePresetHabits() {
    if (this._storage === 'sqlite') return;
    if (localStorage.getItem(HABITS_PRESET_KEY)) return;
    this._habits = buildDefaultHabits();
    this._entries = [];
    localStorage.setItem(HABITS_PRESET_KEY, '1');
    this._saveLocal();
  }

  async addHabit(input) {
    const habit = this._createHabit(input);

    if (this._storage === 'sqlite') {
      return this.#runExclusive(async () => {
        const state = await habitApi('/habits', {
          method: 'POST',
          body: JSON.stringify(habit),
        });
        this._applyState(state);
        return this.getHabit(habit.id);
      });
    }

    this._habits.push(habit);
    this._saveLocal();
    return habit;
  }

  async removeHabit(id) {
    if (this._storage === 'sqlite') {
      return this.#runExclusive(async () => {
        const state = await habitApi(`/habits/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        this._applyState(state);
      });
    }

    this._habits = this._habits.filter((h) => h.id !== id);
    this._entries = this._entries.filter((e) => e.habitId !== id);
    this._saveLocal();
  }

  getEntries() {
    return this._entries;
  }

  async toggleHabit(habitId, date = todayStr()) {
    if (!this.isScheduled(habitId, date)) return false;

    if (this._storage === 'sqlite') {
      return this.#runExclusive(async () => {
        const state = await habitApi('/entries/toggle', {
          method: 'POST',
          body: JSON.stringify({ habitId, date }),
        });
        this._applyState(state);
        return this.isCompleted(habitId, date);
      });
    }

    const existing = this._entries.findIndex((e) => e.habitId === habitId && e.date === date);
    if (existing >= 0) {
      this._entries.splice(existing, 1);
    } else {
      this._entries.push({
        habitId,
        date,
        completedAt: new Date().toISOString(),
      });
    }
    this._saveLocal();
    return this.isCompleted(habitId, date);
  }

  isCompleted(habitId, date = todayStr()) {
    return this.getEntries().some((e) => e.habitId === habitId && e.date === date);
  }

  isScheduled(habitId, date = todayStr()) {
    const habit = this.getHabit(habitId);
    return habit ? isScheduledOn(habit, date) : false;
  }

  getScheduledHabits(date = todayStr()) {
    return this.getHabits().filter((h) => isScheduledOn(h, date));
  }

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
        completed: entries.some((e) => e.habitId === habitId && e.date === dateStr),
        isToday: i === 0,
      });
    }
    return result;
  }

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

  getCombinedDeposit(dateStr) {
    const habits = this.getHabits();
    const scheduled = habits.filter((h) => isScheduledOn(h, dateStr));
    if (!scheduled.length) return null;

    const allDone = scheduled.every((h) => this.isCompleted(h.id, dateStr));
    if (!allDone) return 0;

    const perfect = computeCombinedPerfectDay(
      habits,
      (id, date) => this.isCompleted(id, date),
      (id, date) => this.getStreakAsOf(id, date),
      dateStr,
    );
    return perfect ? 1 : 0.5;
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
      const deposit = this.getCombinedDeposit(dateStr);
      const perfect = deposit === 1;

      result.push({
        date: dateStr,
        scheduled: deposit !== null,
        completed: perfect,
        deposit,
        fraction,
        isToday: i === 0,
      });
    }
    return result;
  }

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

  exportData() {
    return {
      habits: this.getHabits(),
      entries: this.getEntries(),
    };
  }

  async resetData() {
    if (this._storage === 'sqlite') {
      return this.#runExclusive(async () => {
        const state = await habitApi('/data', { method: 'DELETE' });
        this._applyState(state);
      });
    }

    this._habits = buildDefaultHabits();
    this._entries = [];
    this._saveLocal();
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
