/**
 * Compound growth — discipline curve (habits) + optional focus curve (growth categories).
 * Rest days are neutral; status is driven by rhythm, trajectory, and combined streak.
 */
import { awClient } from './aw-client.js';
import { categoryManager, toActivityWatchCategories } from './categories.js';
import { habitStore } from './habit-store.js';
import { escapeHtml } from './html.js';

export const DAYS = 30;
export const DAILY_RATE = 0.018;
export const GROWTH_CATEGORIES = ['Coding', 'Design', 'Writing'];
const ROLLING_WINDOW = 14;

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function avg(values) {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Build per-day habit deposits (null = rest) and optional focus scores. */
export function buildHabitSeries(habitHistory, focusDaily = {}) {
  const focusValues = Object.values(focusDaily).filter((v) => v > 0);
  const focusBaseline = median(focusValues) || 2 * 3600;

  return habitHistory.map((day) => {
    const habitDeposit = day.deposit ?? null;
    const focusSeconds = focusDaily[day.date] || 0;
    const focusScore = focusSeconds > 0
      ? Math.min(Math.sqrt(focusSeconds / focusBaseline), 1)
      : 0;

    return {
      date: day.date,
      habitDeposit,
      focusScore,
      isToday: day.isToday,
      isRest: habitDeposit === null,
    };
  });
}

/** Best calendar rolling average of habit deposits on scheduled days. */
export function bestRollingDeposit(points, window = ROLLING_WINDOW) {
  const deposits = points
    .filter((p) => p.habitDeposit !== null)
    .map((p) => p.habitDeposit);

  if (!deposits.length) return 0;

  let best = 0;
  for (let i = 0; i <= deposits.length - 1; i += 1) {
    const slice = deposits.slice(i, Math.min(i + window, deposits.length));
    if (slice.length < Math.min(7, window)) continue;
    const mean = avg(slice);
    if (mean > best) best = mean;
  }

  return best || avg(deposits.slice(-7)) || avg(deposits);
}

export function accumulateHabitCompound(points, flatDeposit) {
  let compound = 1;
  let linear = 1;
  let scheduledIndex = 0;

  return points.map((day) => {
    if (day.habitDeposit === null) {
      return { ...day, compound, linear, scheduledIndex: null };
    }

    compound *= 1 + day.habitDeposit * DAILY_RATE;
    scheduledIndex += 1;
    linear = 1 + flatDeposit * DAILY_RATE * scheduledIndex;

    return { ...day, compound, linear, scheduledIndex };
  });
}


/** Weighted rhythm on scheduled days — perfect = 1, partial (streaks broken) = 0.5. */
export function computeRhythm(points) {
  const scheduled = points.filter((p) => p.habitDeposit !== null);
  if (!scheduled.length) return { percent: 0, scheduledDays: 0, perfectDays: 0, partialDays: 0 };

  let weighted = 0;
  let perfectDays = 0;
  let partialDays = 0;

  for (const day of scheduled) {
    if (day.habitDeposit === 1) {
      weighted += 1;
      perfectDays += 1;
    } else if (day.habitDeposit === 0.5) {
      weighted += 0.5;
      partialDays += 1;
    }
  }

  return {
    percent: Math.round((weighted / scheduled.length) * 100),
    scheduledDays: scheduled.length,
    perfectDays,
    partialDays,
  };
}

export function computeTrajectory(points) {
  const scheduled = points.filter((p) => p.habitDeposit !== null);
  const recent = scheduled.slice(-ROLLING_WINDOW);
  const prior = scheduled.slice(-ROLLING_WINDOW * 2, -ROLLING_WINDOW);

  const recentAvg = avg(recent.map((p) => p.habitDeposit));
  const priorAvg = avg(prior.map((p) => p.habitDeposit));
  const delta = recentAvg - priorAvg;

  return {
    delta,
    recentAvg,
    priorAvg,
    recentPercent: Math.round(recentAvg * 100),
    priorPercent: Math.round(priorAvg * 100),
  };
}

export function deriveStatus({ rhythm, trajectory, streak }) {
  const trajectoryUp = trajectory.delta >= 0;
  const trajectoryDown = trajectory.delta < -0.05;

  if (rhythm.percent >= 80 && streak >= 7 && trajectoryUp) {
    return {
      status: 'compounding',
      label: 'Compounding',
      tagline: 'Perfect days are stacking — the curve is bending upward.',
    };
  }

  if (rhythm.percent >= 60 || (streak >= 3 && trajectoryUp)) {
    return {
      status: 'building',
      label: 'Building',
      tagline: 'Rhythm is holding — keep long enough to compound.',
    };
  }

  if (rhythm.percent >= 40 && !trajectoryDown) {
    return {
      status: 'drifting',
      label: 'Drifting',
      tagline: 'Inconsistent scheduled days are flattening the curve.',
    };
  }

  return {
    status: 'stalled',
    label: 'Stalled',
    tagline: 'Momentum has flatlined — one perfect day restarts the curve.',
  };
}

export function primaryBlocker({
  rhythm,
  trajectory,
  streak,
  missedLast7,
  lastBrokenDate,
  habitsOnly,
  focusRhythm,
}) {
  if (rhythm.scheduledDays === 0) {
    return 'No habits scheduled in this window.';
  }

  if (streak === 0 && rhythm.percent < 40) {
    return 'Combined streak broken — finish every scheduled habit today.';
  }

  if (missedLast7 > 0) {
    return `${missedLast7} of last 7 scheduled days missed.`;
  }

  if (trajectory.delta < -0.05 && trajectory.priorAvg > 0) {
    return `Rhythm down — recent ${trajectory.recentPercent}% vs prior ${trajectory.priorPercent}%.`;
  }

  if (rhythm.percent < 80 && rhythm.partialDays > 0) {
    return `${rhythm.partialDays} day${rhythm.partialDays === 1 ? '' : 's'} done but streaks not intact.`;
  }

  if (rhythm.percent < 80) {
    const gap = 100 - rhythm.percent;
    return `${gap}% of scheduled days not yet perfect.`;
  }

  if (!habitsOnly && focusRhythm !== null && focusRhythm < 40) {
    return 'Low focus time in growth categories this month.';
  }

  if (lastBrokenDate) {
    return `Last imperfect scheduled day: ${lastBrokenDate}.`;
  }

  return 'Keep the daily rhythm — compounding needs consistency.';
}

function countMissedLast7(points) {
  const scheduled = points.filter((p) => p.habitDeposit !== null).slice(-7);
  return scheduled.filter((p) => p.habitDeposit === 0).length;
}

function lastImperfectDate(points) {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const day = points[i];
    if (day.habitDeposit !== null && day.habitDeposit < 1) {
      return day.date;
    }
  }
  return null;
}

function computeFocusRhythm(points) {
  const active = points.filter((p) => p.focusScore > 0);
  if (!active.length) return null;
  return Math.round(avg(active.map((p) => p.focusScore)) * 100);
}

export function analyzeGrowth(points, { streak, habitsOnly }) {
  if (!points.length) {
    return {
      rhythm: { percent: 0, scheduledDays: 0, perfectDays: 0, partialDays: 0 },
      trajectory: { delta: 0, recentAvg: 0, priorAvg: 0, recentPercent: 0, priorPercent: 0 },
      streak: 0,
      focusRhythm: null,
      compoundEdge: 1,
      flatDeposit: 0,
      status: 'stalled',
      label: 'Stalled',
      tagline: 'Start with one perfect scheduled day.',
      blocker: 'No habit history yet.',
      habitsOnly,
      points: [],
    };
  }

  const flatDeposit = bestRollingDeposit(points);
  const withCompound = accumulateHabitCompound(points, flatDeposit);

  const rhythm = computeRhythm(withCompound);
  const trajectory = computeTrajectory(withCompound);
  const focusRhythm = habitsOnly ? null : computeFocusRhythm(withCompound);

  const last = withCompound.filter((p) => p.habitDeposit !== null).at(-1) || withCompound.at(-1);
  const compoundEdge = last?.compound && last?.linear
    ? last.compound / Math.max(last.linear, 1.001)
    : 1;

  const { status, label, tagline } = deriveStatus({ rhythm, trajectory, streak });
  const blocker = primaryBlocker({
    rhythm,
    trajectory,
    streak,
    missedLast7: countMissedLast7(withCompound),
    lastBrokenDate: lastImperfectDate(withCompound),
    habitsOnly,
    focusRhythm,
  });

  return {
    rhythm,
    trajectory,
    streak,
    focusRhythm,
    compoundEdge,
    flatDeposit,
    status,
    label,
    tagline,
    blocker,
    habitsOnly,
    points: withCompound,
  };
}

async function getDailyFocusActivity(days) {
  const categories = categoryManager.getCategories();
  const awCategories = toActivityWatchCategories(categories);
  const names = GROWTH_CATEGORIES.filter((name) => categories.some((cat) => cat.name === name));

  if (!names.length) return {};

  const maps = await Promise.all(
    names.map((name) => awClient.getDailyCategoryActivity(name, awCategories, days)),
  );

  const merged = {};
  for (const map of maps) {
    for (const [date, seconds] of Object.entries(map)) {
      merged[date] = (merged[date] || 0) + seconds;
    }
  }
  return merged;
}

export async function computeCompoundGrowth({ days = DAYS } = {}) {
  const habitHistory = habitStore.getCombinedHistory(days);
  let focusDaily = {};
  let habitsOnly = true;

  try {
    if (await awClient.isConnected()) {
      focusDaily = await getDailyFocusActivity(days);
      habitsOnly = false;
    }
  } catch {
    /* habit-only mode */
  }

  const series = buildHabitSeries(habitHistory, focusDaily);
  const streak = habitStore.getCombinedStreak();
  return analyzeGrowth(series, { streak, habitsOnly });
}

function chartPaths(points, width, height, pad) {
  const scheduled = points.filter((p) => p.habitDeposit !== null);
  if (scheduled.length < 2) {
    return { compoundPath: '', linearPath: '', areaPath: '', perfectDots: [] };
  }

  const values = scheduled.flatMap((p) => [p.compound, p.linear]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const coords = scheduled.map((p, i) => {
    const x = pad + (i / (scheduled.length - 1)) * innerW;
    const yCompound = pad + innerH - ((p.compound - min) / range) * innerH;
    const yLinear = pad + innerH - ((p.linear - min) / range) * innerH;
    return { x, yCompound, yLinear, perfect: p.habitDeposit === 1, date: p.date };
  });

  const compoundPath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.yCompound.toFixed(1)}`).join(' ');
  const linearPath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.yLinear.toFixed(1)}`).join(' ');
  const areaPath = `${compoundPath} L ${coords[coords.length - 1].x.toFixed(1)} ${(pad + innerH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(pad + innerH).toFixed(1)} Z`;
  const perfectDots = coords.filter((c) => c.perfect);

  return { compoundPath, linearPath, areaPath, perfectDots };
}

function trajectoryLabel(trajectory) {
  const pct = Math.round(trajectory.delta * 100);
  if (pct > 2) return `↑ ${pct}pp`;
  if (pct < -2) return `↓ ${Math.abs(pct)}pp`;
  return '→ flat';
}

function trajectoryClass(trajectory) {
  if (trajectory.delta > 0.02) return 'positive';
  if (trajectory.delta < -0.02) return 'negative';
  return 'neutral';
}

export function renderCompoundGrowth(container, data) {
  const {
    rhythm,
    trajectory,
    streak,
    focusRhythm,
    status,
    label,
    tagline,
    blocker,
    habitsOnly,
    points,
  } = data;

  const { compoundPath, linearPath, areaPath, perfectDots } = chartPaths(points, 320, 120, 8);
  const trajectoryText = trajectoryLabel(trajectory);
  const trajectoryTone = trajectoryClass(trajectory);
  const focusText = focusRhythm === null ? '—' : `${focusRhythm}%`;
  const perfectDotsMarkup = perfectDots.map((dot) => (
    `<circle cx="${dot.x.toFixed(1)}" cy="${dot.yCompound.toFixed(1)}" r="2.5" class="compound-growth-perfect-dot" />`
  )).join('');

  container.innerHTML = `
    <div class="compound-growth-inner">
      <header class="compound-growth-head">
        <div>
          <h2 class="compound-growth-title">${escapeHtml(label)}</h2>
          <p class="compound-growth-tagline">${escapeHtml(blocker)}</p>
        </div>
        <div class="compound-growth-score mono" aria-label="Rhythm ${rhythm.percent} percent">${rhythm.percent}</div>
      </header>

      <div class="compound-growth-visual">
        <div class="compound-growth-bar-wrap" aria-hidden="true">
          <div class="compound-growth-bar-track">
            <div class="compound-growth-bar-fill is-${status}" style="height: ${rhythm.percent}%"></div>
            <div class="compound-growth-bar-glow is-${status}"></div>
          </div>
          <div class="compound-growth-bar-ticks">
            <span>100</span>
            <span>50</span>
            <span>0</span>
          </div>
        </div>

        <div class="compound-growth-chart">
          <svg class="compound-growth-svg" viewBox="0 0 320 120" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="compound-area-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--progress-green)" stop-opacity="0.28" />
                <stop offset="100%" stop-color="var(--progress-green)" stop-opacity="0" />
              </linearGradient>
              <linearGradient id="compound-line-fill" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="var(--progress-lavender)" />
                <stop offset="100%" stop-color="var(--progress-green)" />
              </linearGradient>
            </defs>
            <path class="compound-growth-area" d="${areaPath}" fill="url(#compound-area-fill)" />
            <path class="compound-growth-linear" d="${linearPath}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 5" />
            <path class="compound-growth-curve" d="${compoundPath}" fill="none" stroke="url(#compound-line-fill)" stroke-width="2.2" stroke-linecap="round" />
            ${perfectDotsMarkup}
          </svg>
          <div class="compound-growth-chart-legend">
            <span><i class="compound-legend-line is-curve"></i>Discipline curve</span>
            <span><i class="compound-legend-line is-linear"></i>Recent average pace</span>
            <span><i class="compound-legend-dot"></i>Perfect day</span>
          </div>
        </div>
      </div>

      <footer class="compound-growth-stats">
        <div class="compound-stat">
          <span class="compound-stat-label">Rhythm</span>
          <strong class="compound-stat-value mono">${rhythm.percent}%</strong>
          <span class="compound-stat-note">${rhythm.perfectDays} perfect · ${rhythm.scheduledDays} scheduled</span>
        </div>
        <div class="compound-stat">
          <span class="compound-stat-label">Trajectory</span>
          <strong class="compound-stat-value mono ${trajectoryTone}">${trajectoryText}</strong>
          <span class="compound-stat-note">last 2 weeks vs prior</span>
        </div>
        <div class="compound-stat">
          <span class="compound-stat-label">Streak</span>
          <strong class="compound-stat-value mono">${streak}</strong>
          <span class="compound-stat-note">combined perfect days</span>
        </div>
        <div class="compound-stat">
          <span class="compound-stat-label">Focus</span>
          <strong class="compound-stat-value mono ${habitsOnly ? 'neutral' : ''}">${focusText}</strong>
          <span class="compound-stat-note">${habitsOnly ? 'ActivityWatch offline' : 'Coding · Design · Writing'}</span>
        </div>
      </footer>
      <p class="compound-growth-footnote">${escapeHtml(tagline)}</p>
    </div>
  `;
}

export async function mountCompoundGrowth(container) {
  if (!container) return;
  container.innerHTML = '<div class="compound-growth-loading"><span class="pulse">Measuring compound growth…</span></div>';

  try {
    const data = await computeCompoundGrowth();
    renderCompoundGrowth(container, data);
  } catch (err) {
    console.error('Compound growth error:', err);
    container.innerHTML = '<div class="compound-growth-loading">Unable to measure growth</div>';
  }
}
