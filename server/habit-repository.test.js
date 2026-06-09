import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHabitRepository } from './habit-repository.js';

function tempDbPath() {
  return join(tmpdir(), `hbrain-test-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
}

describe('habit repository', () => {
  let dbPath;
  let db;
  let repo;

  beforeEach(() => {
    dbPath = tempDbPath();
    db = new Database(dbPath);
    repo = createHabitRepository(db);
  });

  afterEach(() => {
    db.close();
    try {
      unlinkSync(dbPath);
    } catch {
      /* ignore */
    }
  });

  it('seeds default habits in an empty database', () => {
    const { habits, meta } = repo.getState();
    expect(habits.length).toBeGreaterThan(0);
    expect(meta.localImportComplete).toBe(false);
  });

  it('imports local habits and marks migration complete', () => {
    repo.importLocal({
      habits: [{ id: 'run', name: 'Run', icon: 'footprints', color: '#86c9ae', days: [1], created: '2026-01-01T00:00:00.000Z' }],
      entries: [{ habitId: 'run', date: '2026-06-09', completedAt: '2026-06-09T12:00:00.000Z' }],
    });

    const state = repo.getState();
    expect(state.habits).toHaveLength(1);
    expect(state.entries).toHaveLength(1);
    expect(state.meta.localImportComplete).toBe(true);
    expect(state.meta.localImport.habitCount).toBe(1);
  });

  it('toggles entries idempotently', () => {
    repo.importLocal({
      habits: [{ id: 'run', name: 'Run', icon: 'footprints', color: '#86c9ae', days: [1], created: '2026-01-01T00:00:00.000Z' }],
      entries: [],
    });

    repo.toggleEntry('run', '2026-06-09');
    expect(repo.getState().entries).toHaveLength(1);

    repo.toggleEntry('run', '2026-06-09');
    expect(repo.getState().entries).toHaveLength(0);
  });

  it('deletes habits and cascades entries', () => {
    repo.importLocal({
      habits: [{ id: 'run', name: 'Run', icon: 'footprints', color: '#86c9ae', days: [1], created: '2026-01-01T00:00:00.000Z' }],
      entries: [{ habitId: 'run', date: '2026-06-09', completedAt: '2026-06-09T12:00:00.000Z' }],
    });

    repo.deleteHabit('run');
    const state = repo.getState();
    expect(state.habits).toHaveLength(0);
    expect(state.entries).toHaveLength(0);
  });

  it('reset restores defaults and clears migration meta', () => {
    repo.importLocal({
      habits: [{ id: 'run', name: 'Run', icon: 'footprints', color: '#86c9ae', days: [1], created: '2026-01-01T00:00:00.000Z' }],
      entries: [],
    });

    const state = repo.reset();
    expect(state.habits.length).toBeGreaterThan(1);
    expect(state.entries).toHaveLength(0);
    expect(state.meta.localImportComplete).toBe(false);
  });
});
