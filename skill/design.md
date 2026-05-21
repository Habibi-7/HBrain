# HBrain Design System

**Read this before rendering any HTML artifact.** Use these tokens and
components verbatim. Do not invent colors, fonts, spacing, or radii.

The baked templates (`skill/templates/timeline.html`, `tasks.html`) are built
from this doc. Custom artifacts (charts, dashboards, ad-hoc reports) must
feel like siblings to them.

---

## 1. Principles

- **Single-file artifact.** Inline CSS. Inline JS. Inline SVG. No CDN, no
  external fonts, no framework. Must open from `file://` with no network.
- **Dense, not spacious.** Tight rows, hairline rules, narrow padding.
  Bias toward Linear, not Notion.
- **Mono for numbers.** Times, dates, counts, IDs, tags — all `ui-monospace`.
- **Color = meaning.** Restraint on the accent. Subtle backgrounds for
  category, 700-weight color for foreground text. Never solid bright fills
  except for danger states.
- **Self-explaining HTML.** Use `<section>`, `<header>`, `<ul>`, `<footer>`,
  `<time>`. Avoid divsoup.

---

## 2. Tokens — paste verbatim

This block goes at the top of every artifact's `<style>`. Do not edit values.

```css
:root {
  --bg: #fbfbfb;
  --surface: #ffffff;
  --surface-hover: #f4f4f5;
  --fg: #18181b;
  --fg-muted: #71717a;
  --fg-subtle: #a1a1aa;
  --border: #e8e8eb;
  --border-strong: #d4d4d8;

  --accent: #5e6ad2;
  --accent-soft: #eef0fb;

  /* Event-type colors */
  --c-note:        #71717a;  --c-note-bg:     #f4f4f5;
  --c-task:        #b45309;  --c-task-bg:     #fef3c7;
  --c-decision:    #6d28d9;  --c-decision-bg: #ede9fe;
  --c-fact:        #047857;  --c-fact-bg:     #d1fae5;
  --c-link:        #1d4ed8;  --c-link-bg:     #dbeafe;

  /* Status colors */
  --s-open:        #b45309;  --s-open-bg:      #fef3c7;
  --s-done:        #047857;  --s-done-bg:      #d1fae5;
  --s-blocked:     #b91c1c;  --s-blocked-bg:   #fee2e2;
  --s-cancelled:   #a1a1aa;  --s-cancelled-bg: #f4f4f5;

  --font-sans: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Inter",
               "Segoe UI", Roboto, system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas,
               monospace;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0a0a0b;
    --surface: #111114;
    --surface-hover: #18181b;
    --fg: #fafafa;
    --fg-muted: #a1a1aa;
    --fg-subtle: #71717a;
    --border: #27272a;
    --border-strong: #3f3f46;

    --accent: #8b96e6;
    --accent-soft: #1c1d2e;

    --c-note:        #a1a1aa;  --c-note-bg:     #1f1f22;
    --c-task:        #fbbf24;  --c-task-bg:     #2a1f08;
    --c-decision:    #c4b5fd;  --c-decision-bg: #211a3b;
    --c-fact:        #6ee7b7;  --c-fact-bg:     #0e2a20;
    --c-link:        #93c5fd;  --c-link-bg:     #102036;

    --s-open:        #fbbf24;  --s-open-bg:      #2a1f08;
    --s-done:        #6ee7b7;  --s-done-bg:      #0e2a20;
    --s-blocked:     #f87171;  --s-blocked-bg:   #2a1010;
    --s-cancelled:   #71717a;  --s-cancelled-bg: #1f1f22;
  }
}
```

---

## 3. Base — paste verbatim

Goes right after the tokens block.

```css
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--fg);
  max-width: 780px;
  margin: 0 auto;
  padding: 56px 24px 80px;
  font-size: 14px;
  line-height: 1.5;
  font-feature-settings: "ss01", "cv11";
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
```

`max-width` may shift per view: 760 (timeline), 780 (tasks), 920 (wide
dashboards). Never wider than 1040.

---

## 4. Type scale

| Use | Size | Weight | Notes |
|---|---|---|---|
| Page title (h1) | 18px | 600 | `letter-spacing: -0.01em` |
| Section header | 11px | 600 | uppercase, `letter-spacing: 0.06em` |
| Body text | 14px | 400 | default |
| Caption / meta | 12px | 400 | `var(--fg-muted)` |
| Micro (chip/cap) | 11px | 500 | `var(--font-mono)` for numerics |

Numerics: always `font-variant-numeric: tabular-nums` and use
`var(--font-mono)`. Times, dates, IDs, counts, tag chips.

---

## 5. Components

### 5.1 Page header

```html
<header>
  <h1>View name</h1>
  <div class="caption">range · count</div>
</header>
```
```css
header { margin-bottom: 32px; }
h1 { font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }
.caption {
  margin-top: 4px;
  font-size: 12px;
  color: var(--fg-muted);
  font-variant-numeric: tabular-nums;
}
```

### 5.2 Section with hairline + dot

```html
<section class="group group--open">
  <div class="group-header">
    <span class="group-dot"></span>
    <span class="group-label">OPEN</span>
    <span class="group-count">12</span>
  </div>
  <!-- rows -->
</section>
```
```css
.group { margin-top: 28px; }
.group:first-of-type { margin-top: 0; }
.group-header {
  display: flex; align-items: center; gap: 10px;
  padding-bottom: 6px; margin-bottom: 4px;
}
.group-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.group-label {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em;
}
.group-count {
  font-size: 11px; color: var(--fg-subtle);
  font-variant-numeric: tabular-nums;
}
.group-header::after {
  content: ""; flex: 1; height: 1px;
  background: var(--border); margin-left: 2px;
}
.group--open    .group-dot { background: var(--s-open); }
.group--done    .group-dot { background: var(--s-done); }
.group--blocked .group-dot { background: var(--s-blocked); }
```

### 5.3 Row (grid, hover tint, ellipsis)

```html
<ul class="rows">
  <li class="row">
    <span class="row-lead">…</span>
    <span class="row-body">…</span>
    <span class="row-trail">…</span>
  </li>
</ul>
```
```css
.rows { list-style: none; display: flex; flex-direction: column; }
.row {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 6px 8px;
  margin: 0 -8px;
  border-radius: 5px;
  min-height: 28px;
}
.row:hover { background: var(--surface-hover); }
.row-body {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

Adjust `grid-template-columns` to taste. Standard widths: time `48px`,
type-pill `84px`, marker `20px`, due/date `auto`.

### 5.4 Pill (event type or status)

Subtle background, 700-weight text. Never white-on-saturated.

```html
<span class="pill pill--task">task</span>
```
```css
.pill {
  font-size: 11px; font-weight: 500;
  text-transform: lowercase;
  padding: 1px 7px;
  border-radius: 4px;
  line-height: 1.45;
}
.pill--note     { color: var(--c-note);     background: var(--c-note-bg); }
.pill--task     { color: var(--c-task);     background: var(--c-task-bg); }
.pill--decision { color: var(--c-decision); background: var(--c-decision-bg); }
.pill--fact     { color: var(--c-fact);     background: var(--c-fact-bg); }
.pill--link     { color: var(--c-link);     background: var(--c-link-bg); }
```

### 5.5 Chip (tag, date, due)

```html
<span class="chip">due May 25</span>
<span class="chip chip--mono">#design</span>
```
```css
.chip {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg-subtle);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
/* Filled chip for due / status emphasis */
.chip--filled {
  color: var(--s-open);
  background: var(--s-open-bg);
  padding: 1px 7px;
  border-radius: 4px;
}
```

### 5.6 Marker glyph

```
○  open       ✓  done       ⊘  blocked       ✕  cancelled
```
Mono, 13px, status-colored. Width 20px, centered.

### 5.7 Empty state

```html
<div class="empty">No events in this range.</div>
```
```css
.empty {
  margin-top: 16px;
  padding: 24px;
  border: 1px dashed var(--border);
  border-radius: 6px;
  text-align: center;
  color: var(--fg-muted);
  font-size: 13px;
}
```

### 5.8 Metric card (for dashboards)

```html
<div class="metrics">
  <div class="metric">
    <div class="metric-value">42</div>
    <div class="metric-label">open tasks</div>
  </div>
</div>
```
```css
.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
.metric {
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
}
.metric-value {
  font-size: 24px; font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
.metric-label {
  margin-top: 2px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-subtle);
}
```

### 5.9 Footer

```html
<footer>Generated by brain · 2026-05-21 15:04 UTC</footer>
```
```css
footer {
  margin-top: 48px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--fg-subtle);
  font-variant-numeric: tabular-nums;
}
```

---

## 6. Charts — inline SVG

Default: static SVG. Add JS only if interactivity earns its cost.

### 6.1 Sparkline (small trend)

```html
<svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none"
     width="100" height="30" aria-label="trend">
  <polyline fill="none" stroke="var(--accent)" stroke-width="1.5"
            points="0,20 10,18 20,15 30,16 40,12 50,10 60,8 70,9 80,5 90,4 100,2"/>
</svg>
```

Stroke `var(--accent)` or a status color. No fill. 1.5px stroke.

### 6.2 Bar chart

```html
<svg class="bars" viewBox="0 0 200 80" width="100%" height="80">
  <g fill="var(--accent)">
    <rect x="0"   y="40" width="14" height="40"/>
    <rect x="20"  y="30" width="14" height="50"/>
    <rect x="40"  y="20" width="14" height="60"/>
    <!-- axis baseline -->
  </g>
  <line x1="0" y1="80" x2="200" y2="80" stroke="var(--border)" stroke-width="1"/>
</svg>
```

Bars use `var(--accent)`. Hover/active bar can switch to a stronger accent.
Axis lines use `var(--border)`. No gridlines unless data needs them.

### 6.3 Line + area (compounding curve, cumulative)

```html
<svg class="curve" viewBox="0 0 400 160" width="100%" height="160"
     preserveAspectRatio="none" aria-label="compounding progress">
  <!-- area fill, 10% accent -->
  <path d="M0,150 L40,140 L80,128 L120,115 L160,100 L200,82 L240,60 L280,40 L320,25 L360,12 L400,4 L400,160 L0,160 Z"
        fill="var(--accent)" fill-opacity="0.10"/>
  <!-- line -->
  <path d="M0,150 L40,140 L80,128 L120,115 L160,100 L200,82 L240,60 L280,40 L320,25 L360,12 L400,4"
        fill="none" stroke="var(--accent)" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"/>
  <!-- baseline -->
  <line x1="0" y1="160" x2="400" y2="160" stroke="var(--border)" stroke-width="1"/>
</svg>
```

Pattern: two `<path>` — filled area at 10% opacity, then stroked line on
top. Endpoints can be marked with `<circle r="3" fill="var(--accent)">`.

### 6.4 Heatmap (calendar-style)

```html
<svg class="heat" viewBox="0 0 350 50" width="100%" height="50">
  <!-- one <rect> per day, width 8 height 8, gap 2 -->
  <!-- fill = var(--accent) with opacity by intensity (0.1, 0.3, 0.6, 1.0) -->
</svg>
```

Use opacity steps `0`, `0.15`, `0.35`, `0.6`, `0.9` of `var(--accent)`.
Empty days = `var(--surface-hover)`. No gradients.

---

## 7. Interactivity

Default: static. Add JS only when filter/sort/select pays off (e.g. a
60-item task board). Keep under ~150 lines, inlined at the bottom of
`<body>`. No globals leaked.

### 7.1 Filter chips

```html
<nav class="filters">
  <button class="filter is-active" data-filter="all">All</button>
  <button class="filter" data-filter="open">Open</button>
  <button class="filter" data-filter="blocked">Blocked</button>
</nav>
```
```css
.filters { display: flex; gap: 6px; margin-bottom: 16px; }
.filter {
  font: inherit;
  font-size: 12px;
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--surface);
  color: var(--fg-muted);
  cursor: pointer;
}
.filter:hover { background: var(--surface-hover); color: var(--fg); }
.filter.is-active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}
```
```js
const filters = document.querySelectorAll('.filter');
const rows = document.querySelectorAll('[data-status]');
filters.forEach(btn => btn.addEventListener('click', () => {
  filters.forEach(b => b.classList.remove('is-active'));
  btn.classList.add('is-active');
  const f = btn.dataset.filter;
  rows.forEach(r => {
    r.hidden = (f !== 'all' && r.dataset.status !== f);
  });
}));
```

### 7.2 Sort by column header

```html
<button class="sort" data-key="created">Created ↕</button>
```
```js
let sortDir = 1;
document.querySelectorAll('.sort').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.key;
    const list = btn.closest('section').querySelector('ul');
    const items = [...list.children];
    items.sort((a, b) => sortDir * (a.dataset[key] > b.dataset[key] ? 1 : -1));
    sortDir *= -1;
    items.forEach(li => list.appendChild(li));
  });
});
```

### 7.3 URL state (shareable)

```js
const url = new URL(location);
// read: const status = url.searchParams.get('status') ?? 'all';
// write on filter change:
url.searchParams.set('status', f);
history.replaceState({}, '', url);
```

---

## 8. Don'ts

- No external fonts (Google Fonts, Adobe). System stack only.
- No CDN, no `<script src=…>`, no `<link rel="stylesheet" href=…>`.
- No frameworks (React, Vue, Alpine, Tailwind, htmx). Hand-written only.
- No emoji as decoration. Use them only if the source text contains them.
- No shadows beyond `1px` hairlines.
- No `border-radius > 6px`.
- No solid saturated fills except for danger (`var(--s-blocked)`).
- No bright `#ff0000` red. Use `var(--s-blocked)` (`#b91c1c`).
- No gradients.
- No animation except `transition: background 80ms` on hover/focus.
- Do not invent token values. If you need a color, pick the closest from
  the token block.

---

## 9. Asking the agent for a custom view

Tell the agent:

> Render <X> as an HTML artifact following `skill/design.md`. Use the tokens
> and components verbatim. Keep it single-file.

For charts:

> Render <X> as an inline-SVG <pattern> from `skill/design.md` §6. Use
> `var(--accent)` for the data line.

The agent should read this doc, paste the tokens block, paste the base
block, then assemble the artifact from §5–§6 components.
