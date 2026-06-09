/**
 * Mintlify-style command palette search for heatmap filters.
 * Cmd/Ctrl+K, fuzzy match, recent searches, keyboard navigation.
 */
import { buildSearchIndex, searchIndex, itemToFilter } from './search-index.js';
import { getRecentFilters, setHeatmapFilter } from './heatmap-filter.js';
import { iconHtml } from './icons.js';

let isOpen = false;
let activeIndex = 0;
let currentResults = [];
let onSelectCallback = null;

const GROUP_LABELS = {
  recent: 'Recent',
  habit: 'Habits',
  'habits-all': 'Habits',
  app: 'Apps',
  title: 'Sites & windows',
  category: 'Categories',
};

function escapeAttr(value) {
  return String(value).replace(/"/g, '&quot;');
}

function groupResults(results, query, recent) {
  if (!query && recent.length) {
    return [{ id: 'recent', label: GROUP_LABELS.recent, items: recent.map((f) => ({
      type: f.type,
      id: f.id,
      label: f.label,
      suffix: f.app || f.type,
      icon: f.icon,
      app: f.app,
      title: f.title,
      highlight: f.label,
    })) }];
  }

  const groups = new Map();
  for (const item of results) {
    const key = item.type === 'habit' ? 'habit' : item.type;
    if (!groups.has(key)) {
      groups.set(key, { id: key, label: GROUP_LABELS[key] || 'Results', items: [] });
    }
    groups.get(key).items.push(item);
  }
  return Array.from(groups.values());
}

function renderResults(groups, query) {
  if (!query && !groups.length) {
    return `<div class="cmdk-empty">Start typing to filter activity…</div>`;
  }
  if (query && !groups.some((g) => g.items.length)) {
    return `<div class="cmdk-empty">No results for "<strong>${escapeAttr(query)}</strong>"</div>`;
  }

  let idx = 0;
  return groups.map((group) => {
    if (!group.items.length) return '';
    const items = group.items.map((item) => {
      const i = idx++;
      const active = i === activeIndex ? ' is-active' : '';
      return `
        <button type="button" class="cmdk-item${active}" data-index="${i}" data-type="${item.type}" data-id="${escapeAttr(item.id)}">
          <span class="cmdk-item-icon">${iconHtml(item.icon || 'activity', { size: 14 })}</span>
          <span class="cmdk-item-body">
            <span class="cmdk-item-label">${item.highlight || item.label}</span>
            <span class="cmdk-item-suffix">${item.suffix || ''}</span>
          </span>
        </button>`;
    }).join('');
    return `
      <div class="cmdk-group">
        <div class="cmdk-group-label">${group.label}</div>
        ${items}
      </div>`;
  }).join('');
}

function flattenGroups(groups) {
  return groups.flatMap((g) => g.items);
}

async function updateResults(modal, query) {
  const list = modal.querySelector('#cmdk-results');
  if (query) {
    list.innerHTML = `<div class="cmdk-loading-inline"><span class="pulse">Searching…</span></div>`;
  }

  const index = await buildSearchIndex();
  const results = query ? searchIndex(index, query) : [];
  const recent = !query ? getRecentFilters().slice(0, 5).map((f) => ({
    ...f,
    suffix: f.type === 'title' ? (f.app || 'Site') : (f.type === 'category' ? 'Category' : f.type === 'habit' ? 'Habit' : f.type === 'app' ? 'App' : 'Overview'),
    highlight: f.label,
  })) : [];

  const groups = groupResults(results, query, recent);
  currentResults = flattenGroups(groups);
  activeIndex = Math.min(activeIndex, Math.max(0, currentResults.length - 1));
  list.innerHTML = renderResults(groups, query);
}

function selectItem(item) {
  if (!item) return;
  const filter = itemToFilter(item);
  setHeatmapFilter(filter);
  onSelectCallback?.(filter);
  closeCommandSearch();
}

function bindModal(modal) {
  const input = modal.querySelector('#cmdk-input');
  const results = modal.querySelector('#cmdk-results');

  input.addEventListener('input', () => {
    activeIndex = 0;
    updateResults(modal, input.value);
  });

  results.addEventListener('click', (e) => {
    const btn = e.target.closest('.cmdk-item');
    if (!btn) return;
    const idx = parseInt(btn.dataset.index, 10);
    selectItem(currentResults[idx]);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeCommandSearch();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, currentResults.length - 1);
      results.innerHTML = renderResults(
        groupResultsFromFlat(currentResults),
        input.value,
      );
      results.querySelector('.cmdk-item.is-active')?.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      results.innerHTML = renderResults(
        groupResultsFromFlat(currentResults),
        input.value,
      );
      results.querySelector('.cmdk-item.is-active')?.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = e.metaKey || e.ctrlKey ? currentResults[0] : currentResults[activeIndex];
      selectItem(item);
      return;
    }
    if (e.key === 'Tab' && currentResults.length) {
      e.preventDefault();
    }
  }, true);

  input.focus();
  updateResults(modal, '');
}

function groupResultsFromFlat(items) {
  return [{ id: 'results', label: 'Results', items }];
}

export function openCommandSearch({ onSelect } = {}) {
  if (isOpen) return;
  isOpen = true;
  activeIndex = 0;
  onSelectCallback = onSelect || null;

  const el = document.createElement('div');
  el.id = 'cmdk-backdrop';
  el.className = 'cmdk-backdrop';
  el.innerHTML = `
    <div class="cmdk-modal" role="dialog" aria-label="Search activity" aria-modal="true">
      <div class="cmdk-input-row">
        <svg class="cmdk-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="cmdk-input" class="cmdk-input" type="text" placeholder="Search apps, sites, habits, categories…" autocomplete="off" spellcheck="false" />
        <kbd class="cmdk-kbd">esc</kbd>
      </div>
      <div id="cmdk-results" class="cmdk-results" role="listbox"></div>
      <div class="cmdk-footer">
        <span><kbd>↑↓</kbd> navigate</span>
        <span><kbd>↵</kbd> select</span>
        <span><kbd>⌘↵</kbd> first result</span>
      </div>
    </div>`;

  document.body.appendChild(el);
  el.addEventListener('click', (e) => {
    if (e.target === el) closeCommandSearch();
  });
  bindModal(el);
}

export function closeCommandSearch() {
  const el = document.getElementById('cmdk-backdrop');
  if (el) el.remove();
  isOpen = false;
  onSelectCallback = null;
}

export function isCommandSearchOpen() {
  return isOpen;
}

export function initCommandSearch() {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (isOpen) closeCommandSearch();
      else openCommandSearch();
    }
  });
}
