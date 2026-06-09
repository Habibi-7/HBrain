/**
 * Compound growth — measures whether habits + activity are compounding
 * over time: dogged, incremental progress over a long horizon.
 */
import { awClient } from './aw-client.js';
import { habitStore } from './habit-store.js';

const DAYS = 30;
const HABIT_WEIGHT = 0.58;
const ACTIVITY_WEIGHT = 0.42;
const DAILY_RATE = 0.018;

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function buildDailySeries(habitHistory, activityDaily) {
  const activityValues = Object.values(activityDaily).filter((v) => v > 0);
  const baseline = median(activityValues) || 4 * 3600;

  return habitHistory.map((day) => {
    const habit = day.fraction ?? 0;
    const seconds = activityDaily[day.date] || 0;
    const activity = seconds > 0 ? Math.min(Math.sqrt(seconds / baseline), 1) : 0;
    const deposit = HABIT_WEIGHT * habit + ACTIVITY_WEIGHT * activity;
    return { date: day.date, deposit, habit, activity, isToday: day.isToday };
  });
}

function accumulateCompound(series) {
  const avgDeposit = avg(series.map((d) => d.deposit)) || 0;
  let compound = 1;

  return series.map((day, i) => {
    compound *= 1 + day.deposit * DAILY_RATE;
    const linear = 1 + avgDeposit * DAILY_RATE * (i + 1);
    return { ...day, compound, linear, index: i };
  });
}

function analyzeCompound(points) {
  if (!points.length) {
    return {
      score: 0,
      status: 'stalled',
      label: 'Stalled',
      tagline: 'Start with one small daily deposit.',
      consistency: 0,
      momentum: 0,
      compoundEdge: 1,
      activeDays: 0,
    };
  }

  const last = points[points.length - 1];
  const maxPossible = Math.pow(1 + DAILY_RATE, points.length) - 1;
  const compoundGain = last.compound - 1;
  const gainRatio = maxPossible > 0 ? compoundGain / maxPossible : 0;

  const consistency = points.filter((p) => p.deposit >= 0.35).length / points.length;
  const compoundEdge = last.compound / Math.max(last.linear, 1.001);

  const recent = points.slice(-14);
  const prior = points.slice(-28, -14);
  const recentAvg = avg(recent.map((p) => p.deposit));
  const priorAvg = avg(prior.map((p) => p.deposit)) || 0.05;
  const momentum = recentAvg / priorAvg;

  const activeDays = points.filter((p) => p.deposit >= 0.2).length;

  const score = clamp(Math.round(100 * (
    0.34 * gainRatio +
    0.30 * consistency +
    0.18 * clamp((compoundEdge - 0.98) / 0.12, 0, 1) +
    0.18 * clamp((momentum - 0.85) / 0.5, 0, 1)
  )), 0, 100);

  let status = 'stalled';
  let label = 'Stalled';
  let tagline = 'Momentum has flatlined — one habit today restarts the curve.';

  if (score >= 75 && compoundEdge >= 1.02) {
    status = 'compounding';
    label = 'Compounding';
    tagline = 'Small daily deposits are bending the curve upward.';
  } else if (score >= 55) {
    status = 'building';
    label = 'Building';
    tagline = 'Progress is steady — keep the rhythm long enough to compound.';
  } else if (score >= 35) {
    status = 'drifting';
    label = 'Drifting';
    tagline = 'Inconsistent days are eating the exponential edge.';
  }

  return {
    score,
    status,
    label,
    tagline,
    consistency: Math.round(consistency * 100),
    momentum: Math.round((momentum - 1) * 100),
    compoundEdge,
    activeDays,
    points,
  };
}

export async function computeCompoundGrowth({ days = DAYS } = {}) {
  const habitHistory = habitStore.getCombinedHistory(days);
  let activityDaily = {};

  try {
    if (await awClient.isConnected()) {
      activityDaily = await awClient.getDailyActivity(days);
    }
  } catch {
    /* habit-only mode */
  }

  const series = buildDailySeries(habitHistory, activityDaily);
  const points = accumulateCompound(series);
  return analyzeCompound(points);
}

function chartPaths(points, width, height, pad) {
  if (points.length < 2) {
    return { compoundPath: '', linearPath: '', areaPath: '' };
  }

  const values = points.flatMap((p) => [p.compound, p.linear]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * innerW;
    const yCompound = pad + innerH - ((p.compound - min) / range) * innerH;
    const yLinear = pad + innerH - ((p.linear - min) / range) * innerH;
    return { x, yCompound, yLinear };
  });

  const compoundPath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.yCompound.toFixed(1)}`).join(' ');
  const linearPath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.yLinear.toFixed(1)}`).join(' ');
  const areaPath = `${compoundPath} L ${coords[coords.length - 1].x.toFixed(1)} ${(pad + innerH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(pad + innerH).toFixed(1)} Z`;

  return { compoundPath, linearPath, areaPath };
}

function momentumLabel(value) {
  if (value > 0) return `↑ ${value}%`;
  if (value < 0) return `↓ ${Math.abs(value)}%`;
  return '→ flat';
}

function momentumClass(value) {
  if (value > 2) return 'positive';
  if (value < -2) return 'negative';
  return 'neutral';
}

export function renderCompoundGrowth(container, data) {
  const { score, label, tagline, status, consistency, momentum, activeDays, points } = data;
  const { compoundPath, linearPath, areaPath } = chartPaths(points, 320, 120, 8);
  const momentumText = momentumLabel(momentum);
  const momentumTone = momentumClass(momentum);

  container.innerHTML = `
    <div class="compound-growth-inner">
      <header class="compound-growth-head">
        <div>
          <span class="compound-growth-kicker">The long game</span>
          <h2 class="compound-growth-title">${label}</h2>
          <p class="compound-growth-tagline">${tagline}</p>
        </div>
        <div class="compound-growth-score mono" aria-label="Compound score ${score}">${score}</div>
      </header>

      <div class="compound-growth-visual">
        <div class="compound-growth-bar-wrap" aria-hidden="true">
          <div class="compound-growth-bar-track">
            <div class="compound-growth-bar-fill is-${status}" style="height: ${score}%"></div>
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
          </svg>
          <div class="compound-growth-chart-legend">
            <span><i class="compound-legend-line is-curve"></i>Compound path</span>
            <span><i class="compound-legend-line is-linear"></i>Linear baseline</span>
          </div>
        </div>
      </div>

      <footer class="compound-growth-stats">
        <div class="compound-stat">
          <span class="compound-stat-label">Consistency</span>
          <strong class="compound-stat-value mono">${consistency}%</strong>
          <span class="compound-stat-note">${activeDays} active days</span>
        </div>
        <div class="compound-stat">
          <span class="compound-stat-label">Momentum</span>
          <strong class="compound-stat-value mono ${momentumTone}">${momentumText}</strong>
          <span class="compound-stat-note">last 2 weeks</span>
        </div>
        <div class="compound-stat compound-stat--wide">
          <span class="compound-stat-label">Definition</span>
          <p class="compound-stat-quote">Dogged, incremental, constant progress over a very long time frame.</p>
        </div>
      </footer>
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
