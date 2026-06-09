/**
 * Gantt-style day timeline — swimlanes with time blocks.
 */
import { categoryManager } from './categories.js';
import { formatActivityLabel } from './activity-label.js';
import { formatDuration, timeStr, startOfDay, endOfDay } from './time-utils.js';
import { iconHtml } from './icons.js';

const MAX_ROWS = 12;
const MERGE_GAP_MS = 90 * 1000;

export const ZOOM_LEVELS = [
  { id: 'day', label: 'Day', hours: 24 },
  { id: '6h', label: '6h', hours: 6 },
  { id: '3h', label: '3h', hours: 3 },
  { id: '1h', label: '1h', hours: 1 },
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function eventRange(event) {
  const start = new Date(event.timestamp).getTime();
  const end = start + (event.duration || 0) * 1000;
  return { start, end };
}

function mergeBlocks(blocks) {
  if (!blocks.length) return [];
  const sorted = [...blocks].sort((a, b) => a.start - b.start);
  const merged = [{ ...sorted[0], titles: [sorted[0].title] }];

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = merged[merged.length - 1];
    const next = sorted[i];
    if (next.start - prev.end <= MERGE_GAP_MS && next.app === prev.app) {
      prev.end = Math.max(prev.end, next.end);
      prev.duration = (prev.end - prev.start) / 1000;
      if (next.title && !prev.titles.includes(next.title)) prev.titles.push(next.title);
      continue;
    }
    merged.push({ ...next, titles: [next.title] });
  }

  return merged;
}

/** Resolve visible time window from zoom + pan */
export function resolveViewWindow(day, zoomId, panPct = 100, isToday = false) {
  const level = ZOOM_LEVELS.find((z) => z.id === zoomId) || ZOOM_LEVELS[0];
  const dayStartMs = startOfDay(day).getTime();
  const dayEndMs = endOfDay(day).getTime() + 1;

  if (level.hours >= 24) {
    return {
      startMs: dayStartMs,
      endMs: dayEndMs,
      zoomId: level.id,
      isFullDay: true,
    };
  }

  const windowMs = level.hours * 60 * 60 * 1000;
  let endCap = isToday ? Math.min(Date.now(), dayEndMs) : dayEndMs;
  const maxStart = Math.max(dayStartMs, endCap - windowMs);
  const startMs = dayStartMs + ((maxStart - dayStartMs) * panPct) / 100;
  let endMs = Math.min(endCap, startMs + windowMs);

  if (endMs - startMs < 60 * 1000) {
    endMs = Math.min(endCap, startMs + 60 * 1000);
  }

  return {
    startMs,
    endMs,
    zoomId: level.id,
    isFullDay: false,
  };
}

export function formatWindowRange(startMs, endMs) {
  return `${timeStr(new Date(startMs).toISOString())} – ${timeStr(new Date(endMs).toISOString())}`;
}

/** Group raw AW events into swimlane rows */
export function buildTimelineRows(events, { groupBy = 'app', maxRows = MAX_ROWS } = {}) {
  const rowMap = new Map();

  for (const event of events) {
    const app = event.data?.app || 'Unknown';
    const title = event.data?.title || '';
    const label = groupBy === 'category'
      ? categoryManager.categorize(app, title).name
      : formatActivityLabel(event);

    const { start, end } = eventRange(event);
    if (!rowMap.has(label)) {
      const cat = categoryManager.categorize(app, title);
      rowMap.set(label, {
        id: label,
        label,
        icon: groupBy === 'category' ? cat.icon : null,
        color: groupBy === 'category' ? cat.color : categoryManager.getAppColor(app, title),
        total: 0,
        blocks: [],
      });
    }

    const row = rowMap.get(label);
    row.total += event.duration || 0;
    row.blocks.push({
      start,
      end,
      duration: event.duration || 0,
      app,
      title: title || app,
      color: categoryManager.getAppColor(app, title),
    });
  }

  const rows = [...rowMap.values()]
    .map((row) => ({ ...row, blocks: mergeBlocks(row.blocks) }))
    .sort((a, b) => b.total - a.total);

  const visible = rows.slice(0, maxRows);
  const hidden = rows.length - visible.length;

  return { rows: visible, hidden, totalActive: rows.reduce((sum, row) => sum + row.total, 0) };
}

function clipRowsToWindow(rows, startMs, endMs) {
  return rows
    .map((row) => {
      const blocks = row.blocks.filter((block) => block.end > startMs && block.start < endMs);
      let total = 0;
      for (const block of blocks) {
        const clipStart = Math.max(block.start, startMs);
        const clipEnd = Math.min(block.end, endMs);
        total += (clipEnd - clipStart) / 1000;
      }
      return { ...row, blocks, total };
    })
    .filter((row) => row.blocks.length > 0)
    .sort((a, b) => b.total - a.total);
}

function rowVisibleSeconds(row, viewStartMs, viewEndMs) {
  let total = 0;
  for (const block of row.blocks) {
    const clipStart = Math.max(block.start, viewStartMs);
    const clipEnd = Math.min(block.end, viewEndMs);
    if (clipEnd > clipStart) total += (clipEnd - clipStart) / 1000;
  }
  return total;
}

function blockPosition(block, viewStartMs, viewLengthMs) {
  const viewEndMs = viewStartMs + viewLengthMs;
  const clampedStart = Math.max(block.start, viewStartMs);
  const clampedEnd = Math.min(block.end, viewEndMs);
  if (clampedEnd <= clampedStart) return null;

  const left = ((clampedStart - viewStartMs) / viewLengthMs) * 100;
  const width = ((clampedEnd - clampedStart) / viewLengthMs) * 100;
  return {
    left,
    width: Math.max(width, 0.35),
  };
}

function axisTickCount(durationMs) {
  const hours = durationMs / (60 * 60 * 1000);
  if (hours >= 20) return 13;
  if (hours >= 5) return Math.max(6, Math.round(hours) + 1);
  if (hours >= 2) return Math.max(5, Math.round(hours * 2) + 1);
  return 7;
}

function renderTimeAxis(startMs, endMs) {
  const durationMs = endMs - startMs;
  const ticks = axisTickCount(durationMs);

  return Array.from({ length: ticks }, (_, i) => {
    const t = startMs + (durationMs * i) / (ticks - 1);
    const label = timeStr(new Date(t).toISOString());
    return `<span class="gantt-hour">${label}</span>`;
  }).join('');
}

function renderRowLabel(row, viewStartMs, viewEndMs) {
  const total = rowVisibleSeconds(row, viewStartMs, viewEndMs);
  const icon = row.icon
    ? iconHtml(row.icon, { size: 14 })
    : `<span class="gantt-row-dot" style="background:${row.color}"></span>`;

  return `
    <div class="gantt-row-label">
      <span class="gantt-row-icon">${icon}</span>
      <span class="gantt-row-name truncate" title="${escapeHtml(row.label)}">${escapeHtml(row.label)}</span>
      <span class="gantt-row-total mono">${formatDuration(total)}</span>
    </div>`;
}

function renderRowTrack(row, viewStartMs, viewLengthMs) {
  const blocks = row.blocks
    .map((block) => {
      const pos = blockPosition(block, viewStartMs, viewLengthMs);
      if (!pos) return '';
      const hintTitle = block.titles?.length === 1 ? block.titles[0] : block.titles?.slice(0, 2).join(' · ');
      const hint = `${timeStr(new Date(block.start).toISOString())}–${timeStr(new Date(block.end).toISOString())} · ${hintTitle || row.label} · ${formatDuration(block.duration)}`;
      return `<div class="gantt-block" style="left:${pos.left}%;width:${pos.width}%;--block-color:${block.color};" title="${escapeHtml(hint)}"></div>`;
    })
    .join('');

  return `
    <div class="gantt-row-track">
      <div class="gantt-blocks">${blocks}</div>
    </div>`;
}

/** Render the full Gantt timeline markup */
export function renderDayTimeline({
  rows,
  hidden,
  totalActive,
  viewWindow,
  showNow = false,
}) {
  const { startMs, endMs, isFullDay } = viewWindow;
  const viewLengthMs = endMs - startMs;
  const tickCount = axisTickCount(viewLengthMs);
  const visibleRows = isFullDay ? rows : clipRowsToWindow(rows, startMs, endMs);

  const visibleActive = visibleRows.reduce(
    (sum, row) => sum + rowVisibleSeconds(row, startMs, endMs),
    0,
  );

  const now = Date.now();
  const nowInView = showNow && now >= startMs && now <= endMs;
  const nowPct = nowInView ? ((now - startMs) / viewLengthMs) * 100 : null;

  const labels = visibleRows.length
    ? visibleRows.map((row) => renderRowLabel(row, startMs, endMs)).join('')
    : '';

  const tracks = visibleRows.length
    ? visibleRows.map((row) => renderRowTrack(row, startMs, viewLengthMs)).join('')
    : `<div class="gantt-empty">No activity in this window</div>`;

  const shellStyle = [
    `--gantt-ticks:${tickCount}`,
    nowPct != null ? `--now-pct:${nowPct}` : '',
  ].filter(Boolean).join(';');

  const nowMarker = nowPct != null
    ? '<div class="gantt-now-line" aria-hidden="true"><span class="gantt-now-badge mono">Now</span></div>'
    : '';

  const hiddenNote = hidden > 0
    ? `<span class="gantt-footer">${isFullDay ? `+${hidden} more` : `+${hidden} more apps today`}</span>`
    : '';

  return `
    <div class="gantt-shell" style="${shellStyle}">
      <div class="gantt-main">
        <aside class="gantt-sidebar">
          <div class="gantt-sidebar-head"></div>
          ${labels || '<div class="gantt-sidebar-empty"></div>'}
        </aside>
        <div class="gantt-canvas">
          <div class="gantt-axis-hours">${renderTimeAxis(startMs, endMs)}</div>
          <div class="gantt-tracks">
            ${nowMarker}
            ${tracks}
          </div>
        </div>
      </div>
      <div class="gantt-meta">
        <span class="gantt-summary mono">${formatDuration(visibleActive || totalActive)} active${isFullDay ? '' : ` · ${formatWindowRange(startMs, endMs)}`}</span>
        ${hiddenNote}
      </div>
    </div>`;
}
