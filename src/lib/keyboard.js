/**
 * Global keyboard shortcuts for full-app navigation.
 */

import { cycleThemeMode } from './theme.js';
import { habitStore } from './habit-store.js';
import { moveHabitFocus, getSelectedHabitId } from './habit-focus.js';
import { isCommandSearchOpen, closeCommandSearch } from './command-search.js';
import { invokeViewAction } from './view-actions.js';

const ROUTES = {
  '1': '/',
  '2': '/timeline',
  '3': '/settings',
};

const SHORTCUTS_HTML = `
  <div class="modal-backdrop shortcuts-backdrop" id="shortcuts-backdrop">
    <div class="modal shortcuts-modal" role="dialog" aria-label="Keyboard shortcuts">
      <div class="modal-title">Keyboard shortcuts</div>
      <div class="shortcuts-grid">
        <div><kbd>1</kbd><span>Today</span></div>
        <div><kbd>2</kbd><span>Timeline</span></div>
        <div><kbd>3</kbd><span>Settings</span></div>
        <div><kbd>T</kbd><span>Cycle theme</span></div>
        <div><kbd>M</kbd><span>Toggle menu</span></div>
        <div><kbd>J</kbd> / <kbd>↓</kbd><span>Next habit</span></div>
        <div><kbd>K</kbd> / <kbd>↑</kbd><span>Previous habit</span></div>
        <div><kbd>Space</kbd><span>Toggle focused habit</span></div>
        <div><kbd>N</kbd><span>New habit</span></div>
        <div><kbd>⌘K</kbd><span>Search & filter heatmap</span></div>
        <div><kbd>Esc</kbd><span>Close menu / modal</span></div>
        <div><kbd>?</kbd><span>Show shortcuts</span></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="shortcuts-close" type="button">Close</button>
      </div>
    </div>
  </div>`;

let navigateFn = null;
let getRouteFn = () => '/';

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function closeMenu() {
  const nav = document.getElementById('top-nav');
  const trigger = nav?.querySelector('.nav-trigger');
  if (nav?.classList.contains('is-open')) {
    nav.classList.remove('is-open');
    trigger?.setAttribute('aria-expanded', 'false');
  }
}

function toggleMenu() {
  const nav = document.getElementById('top-nav');
  const trigger = nav?.querySelector('.nav-trigger');
  if (!nav || !trigger) return;
  const open = !nav.classList.contains('is-open');
  nav.classList.toggle('is-open', open);
  trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) nav.querySelector('.nav-link')?.focus();
}

function closeShortcuts() {
  document.getElementById('shortcuts-backdrop')?.remove();
}

function openShortcuts() {
  if (document.getElementById('shortcuts-backdrop')) return;
  document.body.insertAdjacentHTML('beforeend', SHORTCUTS_HTML);
  const backdrop = document.getElementById('shortcuts-backdrop');
  backdrop.querySelector('#shortcuts-close')?.addEventListener('click', closeShortcuts);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeShortcuts();
  });
  backdrop.querySelector('#shortcuts-close')?.focus();
}

function handleHabitNav(delta) {
  const habits = habitStore.getScheduledHabits();
  if (!habits.length) return;
  const id = moveHabitFocus(delta, habits);
  document.querySelectorAll('.habit-chip.is-hovered').forEach((chip) => {
    chip.classList.remove('is-hovered');
  });
  invokeViewAction('habitFocus', id);
}

function toggleFocusedHabit() {
  const habits = habitStore.getScheduledHabits();
  const id = getSelectedHabitId(habits);
  if (!id) return;
  invokeViewAction('habitToggle', id);
}

function onKeyDown(event) {
  if (isCommandSearchOpen()) return;
  if (isTypingTarget(event.target)) return;

  const key = event.key;
  const lower = key.toLowerCase();

  if (key === 'Escape') {
    closeShortcuts();
    closeMenu();
    closeCommandSearch();
    document.querySelector('.modal-backdrop:not(.shortcuts-backdrop):not(.cmdk-backdrop)')?.remove();
    return;
  }

  if (key === '?' || (event.shiftKey && key === '/')) {
    event.preventDefault();
    openShortcuts();
    return;
  }

  if (ROUTES[key]) {
    event.preventDefault();
    navigateFn?.(ROUTES[key]);
    return;
  }

  if (lower === 't') {
    event.preventDefault();
    cycleThemeMode();
    return;
  }

  if (lower === 'm') {
    event.preventDefault();
    toggleMenu();
    return;
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') return;

  if ((lower === 'j' || key === 'ArrowDown') && getRouteFn() === '/') {
    event.preventDefault();
    handleHabitNav(1);
    return;
  }

  if ((lower === 'k' || key === 'ArrowUp') && getRouteFn() === '/' && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    handleHabitNav(-1);
    return;
  }

  if (key === ' ' || key === 'Enter') {
    if (getRouteFn() !== '/') return;
    event.preventDefault();
    toggleFocusedHabit();
    return;
  }

  if (lower === 'n' && getRouteFn() === '/') {
    event.preventDefault();
    invokeViewAction('openAddModal');
    return;
  }
}

export function initKeyboard({ navigate, getRoute }) {
  navigateFn = navigate;
  getRouteFn = getRoute || (() => '/');

  if (document.body.dataset.keyboardBound) return;
  document.body.dataset.keyboardBound = '1';
  document.addEventListener('keydown', onKeyDown);
}
