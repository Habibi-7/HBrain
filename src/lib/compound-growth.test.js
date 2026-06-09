import { describe, expect, it } from 'vitest';
import {
  accumulateHabitCompound,
  analyzeGrowth,
  bestRollingDeposit,
  buildHabitSeries,
  computeRhythm,
  computeTrajectory,
  deriveStatus,
  primaryBlocker,
} from './compound-growth.js';

function history(entries) {
  return entries.map(([date, deposit], index, arr) => ({
    date,
    deposit,
    scheduled: deposit !== null,
    completed: deposit === 1,
    fraction: deposit === null ? 0 : deposit,
    isToday: index === arr.length - 1,
  }));
}

describe('compound growth', () => {
  it('skips rest days in rhythm and compound accumulation', () => {
    const series = buildHabitSeries(history([
      ['2026-06-01', 1],
      ['2026-06-02', null],
      ['2026-06-03', 1],
    ]));

    const rhythm = computeRhythm(series);
    expect(rhythm.scheduledDays).toBe(2);
    expect(rhythm.percent).toBe(100);

    const points = accumulateHabitCompound(series, 1);
    expect(points[1].compound).toBe(points[0].compound);
    expect(points[1].scheduledIndex).toBe(null);
    expect(points[2].compound).toBeGreaterThan(points[0].compound);
  });

  it('weights partial perfect days at half in rhythm', () => {
    const series = buildHabitSeries(history([
      ['2026-06-01', 1],
      ['2026-06-02', 0.5],
      ['2026-06-03', 0],
    ]));

    expect(computeRhythm(series)).toMatchObject({
      percent: 50,
      perfectDays: 1,
      partialDays: 1,
      scheduledDays: 3,
    });
  });

  it('uses best rolling average for the linear baseline', () => {
    const series = buildHabitSeries(history([
      ['2026-06-01', 1],
      ['2026-06-02', 1],
      ['2026-06-03', 1],
      ['2026-06-04', 1],
      ['2026-06-05', 1],
      ['2026-06-06', 1],
      ['2026-06-07', 1],
      ['2026-06-08', 1],
      ['2026-06-09', 1],
      ['2026-06-10', 1],
    ]));

    expect(bestRollingDeposit(series)).toBe(1);

    const points = accumulateHabitCompound(series, bestRollingDeposit(series));
    const last = points.at(-1);
    expect(last.compound).toBeGreaterThan(1);
    expect(last.linear).toBeGreaterThan(1);
    expect(last.compound).toBeGreaterThan(last.linear);
  });

  it('derives compounding status from rhythm, streak, and trajectory', () => {
    const trajectory = { delta: 0.1, recentAvg: 0.9, priorAvg: 0.8, recentPercent: 90, priorPercent: 80 };
    const rhythm = { percent: 85, scheduledDays: 20, perfectDays: 17, partialDays: 0 };

    expect(deriveStatus({ rhythm, trajectory, streak: 8 })).toMatchObject({
      status: 'compounding',
      label: 'Compounding',
    });

    expect(deriveStatus({
      rhythm: { percent: 50, scheduledDays: 10, perfectDays: 5, partialDays: 0 },
      trajectory: { delta: 0, recentAvg: 0.5, priorAvg: 0.5, recentPercent: 50, priorPercent: 50 },
      streak: 2,
    })).toMatchObject({
      status: 'drifting',
    });

    expect(deriveStatus({
      rhythm: { percent: 50, scheduledDays: 10, perfectDays: 5, partialDays: 0 },
      trajectory: { delta: -0.1, recentAvg: 0.4, priorAvg: 0.5, recentPercent: 40, priorPercent: 50 },
      streak: 2,
    })).toMatchObject({
      status: 'stalled',
    });
  });

  it('surfaces a primary blocker for missed scheduled days', () => {
    const points = buildHabitSeries(history([
      ['2026-06-01', 1],
      ['2026-06-02', 0],
      ['2026-06-03', 1],
      ['2026-06-04', 0],
      ['2026-06-05', 1],
      ['2026-06-06', 1],
      ['2026-06-07', 1],
    ]));

    const blocker = primaryBlocker({
      rhythm: computeRhythm(points),
      trajectory: computeTrajectory(points),
      streak: 0,
      missedLast7: 2,
      lastBrokenDate: '2026-06-04',
      habitsOnly: true,
      focusRhythm: null,
    });

    expect(blocker).toBe('2 of last 7 scheduled days missed.');
  });

  it('analyzes growth with separate focus rhythm when activity is available', () => {
    const habitHistory = history([
      ['2026-06-01', 1],
      ['2026-06-02', 1],
      ['2026-06-03', null],
      ['2026-06-04', 1],
    ]);

    const series = buildHabitSeries(habitHistory, {
      '2026-06-01': 7200,
      '2026-06-02': 3600,
      '2026-06-04': 10800,
    });

    const result = analyzeGrowth(series, { streak: 2, habitsOnly: false });
    expect(result.rhythm.percent).toBe(100);
    expect(result.focusRhythm).toBeTypeOf('number');
    expect(result.habitsOnly).toBe(false);
  });
});
