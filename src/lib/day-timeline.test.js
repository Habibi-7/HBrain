import { describe, expect, it, vi } from 'vitest';
import { resolveViewWindow, ZOOM_LEVELS } from './day-timeline.js';

describe('day timeline windowing', () => {
  it('declares the supported zoom levels in display order', () => {
    expect(ZOOM_LEVELS.map((z) => z.id)).toEqual(['day', '6h', '3h', '1h']);
  });

  it('returns the whole local day for day zoom', () => {
    const day = new Date('2026-06-09T12:00:00');
    const window = resolveViewWindow(day, 'day');

    expect(window.isFullDay).toBe(true);
    expect(window.endMs - window.startMs).toBe(24 * 60 * 60 * 1000);
  });

  it('pans shorter zoom windows across completed days', () => {
    const day = new Date('2026-06-09T12:00:00');
    const start = resolveViewWindow(day, '6h', 0, false);
    const end = resolveViewWindow(day, '6h', 100, false);

    expect(start.isFullDay).toBe(false);
    expect(start.endMs - start.startMs).toBe(6 * 60 * 60 * 1000);
    expect(end.endMs - end.startMs).toBe(6 * 60 * 60 * 1000);
    expect(end.startMs).toBeGreaterThan(start.startMs);
  });

  it('caps today windows at the current time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-09T15:30:00'));

    const day = new Date('2026-06-09T12:00:00');
    const window = resolveViewWindow(day, '6h', 100, true);

    expect(window.endMs).toBe(Date.now());
    vi.useRealTimers();
  });
});
