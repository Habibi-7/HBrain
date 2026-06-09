import { buildDefaultHabits } from '../src/lib/default-habits.js';

export const SCHEMA_VERSION = 1;
export const META_LOCAL_IMPORT = 'local_import_v1';

function parseDays(raw) {
  const days = JSON.parse(raw);
  if (!Array.isArray(days)) throw new Error('Invalid habit days');
  return days;
}

function habitFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    days: parseDays(row.days),
    created: row.created_at,
  };
}

function entryFromRow(row) {
  return {
    habitId: row.habit_id,
    date: row.date,
    completedAt: row.completed_at,
  };
}

export function normalizeHabitInput(input) {
  if (!input?.id || !input?.name) {
    throw new Error('Habit requires id and name');
  }

  const days = Array.isArray(input.days) ? input.days : [0, 1, 2, 3, 4, 5, 6];

  return {
    id: String(input.id),
    name: String(input.name),
    icon: String(input.icon || 'star'),
    color: String(input.color || '#9eb8f0'),
    days: JSON.stringify(days),
    created_at: String(input.created || input.createdAt || new Date().toISOString()),
  };
}

export function normalizeEntryInput(input) {
  if (!input?.habitId || !input?.date) {
    throw new Error('Entry requires habitId and date');
  }

  return {
    habit_id: String(input.habitId),
    date: String(input.date).slice(0, 10),
    completed_at: String(input.completedAt || new Date().toISOString()),
  };
}

export function createHabitRepository(db) {
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'star',
      color TEXT NOT NULL DEFAULT '#9eb8f0',
      days TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS habit_entries (
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      PRIMARY KEY (habit_id, date)
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const getMetaRow = db.prepare('SELECT value FROM meta WHERE key = ?');
  const setMetaRow = db.prepare(`
    INSERT INTO meta (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const insertHabit = db.prepare(`
    INSERT INTO habits (id, name, icon, color, days, created_at)
    VALUES (@id, @name, @icon, @color, @days, @created_at)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      icon = excluded.icon,
      color = excluded.color,
      days = excluded.days
  `);

  const insertEntry = db.prepare(`
    INSERT OR IGNORE INTO habit_entries (habit_id, date, completed_at)
    VALUES (@habit_id, @date, @completed_at)
  `);

  function getMeta() {
    const raw = getMetaRow.get(META_LOCAL_IMPORT)?.value;
    let localImport = null;
    if (raw) {
      try {
        localImport = JSON.parse(raw);
      } catch {
        localImport = { complete: true };
      }
    }

    return {
      schemaVersion: SCHEMA_VERSION,
      localImportComplete: Boolean(localImport?.complete),
      localImport,
    };
  }

  function setLocalImportMeta(counts) {
    setMetaRow.run({
      key: META_LOCAL_IMPORT,
      value: JSON.stringify({
        complete: true,
        importedAt: new Date().toISOString(),
        ...counts,
      }),
    });
  }

  function clearLocalImportMeta() {
    db.prepare('DELETE FROM meta WHERE key = ?').run(META_LOCAL_IMPORT);
  }

  function getState() {
    const habits = db.prepare('SELECT * FROM habits ORDER BY created_at, rowid').all().map(habitFromRow);
    const entries = db.prepare('SELECT * FROM habit_entries ORDER BY date, habit_id').all().map(entryFromRow);
    return { habits, entries, meta: getMeta() };
  }

  function seedDefaultsIfEmpty() {
    const count = db.prepare('SELECT COUNT(*) AS count FROM habits').get().count;
    if (count > 0) return;

    const seed = db.transaction(() => {
      for (const habit of buildDefaultHabits()) {
        insertHabit.run(normalizeHabitInput(habit));
      }
    });
    seed();
  }

  seedDefaultsIfEmpty();

  const importLocal = db.transaction((payload) => {
    if (!Array.isArray(payload.habits) || !payload.habits.length) {
      throw new Error('Migration requires habits');
    }

    db.prepare('DELETE FROM habit_entries').run();
    db.prepare('DELETE FROM habits').run();

    for (const habit of payload.habits) {
      insertHabit.run(normalizeHabitInput(habit));
    }

    if (Array.isArray(payload.entries)) {
      for (const entry of payload.entries) {
        insertEntry.run(normalizeEntryInput(entry));
      }
    }

    setLocalImportMeta({
      habitCount: payload.habits.length,
      entryCount: Array.isArray(payload.entries) ? payload.entries.length : 0,
    });
  });

  function addHabit(input) {
    insertHabit.run(normalizeHabitInput(input));
    return getState();
  }

  function deleteHabit(id) {
    db.prepare('DELETE FROM habits WHERE id = ?').run(id);
    return getState();
  }

  function toggleEntry(habitId, date) {
    const entry = normalizeEntryInput({ habitId, date });
    const existing = db.prepare(
      'SELECT 1 FROM habit_entries WHERE habit_id = ? AND date = ?',
    ).get(entry.habit_id, entry.date);

    if (existing) {
      db.prepare('DELETE FROM habit_entries WHERE habit_id = ? AND date = ?')
        .run(entry.habit_id, entry.date);
    } else {
      insertEntry.run(entry);
    }

    return getState();
  }

  function reset() {
    db.prepare('DELETE FROM habit_entries').run();
    db.prepare('DELETE FROM habits').run();
    clearLocalImportMeta();
    seedDefaultsIfEmpty();
    return getState();
  }

  return {
    getState,
    getMeta,
    importLocal,
    addHabit,
    deleteHabit,
    toggleEntry,
    reset,
  };
}
