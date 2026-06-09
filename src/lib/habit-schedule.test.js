import { describe, expect, it } from 'vitest';
import {
  computeStreak,
  computeWeeklyRate,
  computeCombinedPerfectDay,
  isScheduledOn,
  normalizeSchedule,
} from './habit-schedule.js';

const gym = { id: 'gym', days: [1, 3, 5] }; // Mon, Wed, Fri

function entries(completedDates) {
  const set = new Set(completedDates);
  return (habitId, date) => set.has(`${habitId}:${date}`);
}

describe('habit schedule', () => {
  it('defaults missing days to every day', () => {
    expect(normalizeSchedule(undefined)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('knows which days a habit is scheduled', () => {
    expect(isScheduledOn(gym, '2026-06-08')).toBe(true); // Mon
    expect(isScheduledOn(gym, '2026-06-09')).toBe(false); // Tue
  });

  it('counts weekly rate over scheduled days only', () => {
    const isCompleted = entries([
      'gym:2026-06-08',
      'gym:2026-06-10',
    ]);
    expect(computeWeeklyRate(gym, isCompleted, '2026-06-12', 7)).toBe(67);
  });

  it('counts streak across scheduled days, skipping rest days', () => {
    const isCompleted = entries([
      'gym:2026-06-08',
      'gym:2026-06-10',
      'gym:2026-06-12',
    ]);
    expect(computeStreak(gym, isCompleted, '2026-06-13')).toBe(3);
  });

  it('breaks streak on a missed scheduled day', () => {
    const isCompleted = entries([
      'gym:2026-06-08',
      'gym:2026-06-12',
    ]);
    expect(computeStreak(gym, isCompleted, '2026-06-13')).toBe(1);
  });
});

describe('combined all-habits perfect day', () => {
  const habits = [
    { id: 'daily', days: [0, 1, 2, 3, 4, 5, 6] },
    { id: 'mwf', days: [1, 3, 5] },
  ];

  function setup(completedDates) {
    const set = new Set(completedDates);
    const isCompleted = (id, date) => set.has(`${id}:${date}`);
    const getStreak = (id, date) => computeStreak(
      habits.find((h) => h.id === id),
      isCompleted,
      date,
    );
    return { isCompleted, getStreak };
  }

  it('requires every scheduled habit done and every habit on streak', () => {
    const { isCompleted, getStreak } = setup([
      'daily:2026-06-08',
      'daily:2026-06-09',
    ]);
    expect(computeCombinedPerfectDay(habits, isCompleted, getStreak, '2026-06-09')).toBe(false);
  });

  it('is perfect when all scheduled habits done and all habits have streak >= 1', () => {
    const { isCompleted, getStreak } = setup([
      'daily:2026-06-08',
      'daily:2026-06-09',
      'mwf:2026-06-08',
    ]);
    expect(computeCombinedPerfectDay(habits, isCompleted, getStreak, '2026-06-09')).toBe(true);
  });

  it('returns null on combined rest days', () => {
    const { isCompleted, getStreak } = setup([]);
    expect(computeCombinedPerfectDay(
      [{ id: 'sun-only', days: [0] }],
      isCompleted,
      getStreak,
      '2026-06-09',
    )).toBe(null);
  });
});
