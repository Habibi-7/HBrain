/**
 * Theme mode: auto (system), night (dark ocean), day (sunny ocean)
 */

export const THEME_STORAGE_KEY = 'hbrain-theme-mode';
export const THEME_MODES = ['auto', 'night', 'day'];

const THEME_LABELS = { auto: 'AUTO', night: 'DARK', day: 'LIGHT' };

let themeMode = loadThemeMode();

const colorSchemeQuery = window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;
let prefersNight = colorSchemeQuery ? colorSchemeQuery.matches : true;

if (colorSchemeQuery) {
  const onSchemeChange = (event) => {
    prefersNight = event.matches;
    if (themeMode === 'auto') applyThemePreference();
  };
  if (colorSchemeQuery.addEventListener) {
    colorSchemeQuery.addEventListener('change', onSchemeChange);
  } else if (colorSchemeQuery.addListener) {
    colorSchemeQuery.addListener(onSchemeChange);
  }
}

function loadThemeMode() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (THEME_MODES.includes(stored)) return stored;
  } catch { /* ignore */ }
  return 'night';
}

function persistThemeMode() {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  } catch { /* ignore */ }
}

export function getThemeMode() {
  return themeMode;
}

export function setThemeMode(mode) {
  if (!THEME_MODES.includes(mode)) return;
  themeMode = mode;
  persistThemeMode();
  applyThemePreference();
  updateThemeToggleUI();
}

export function getThemeLabel(mode = themeMode) {
  return THEME_LABELS[mode] || THEME_LABELS.night;
}

export function getNightPreference() {
  if (themeMode === 'auto') return prefersNight;
  return themeMode === 'night';
}

export function applyThemePreference() {
  const isNight = getNightPreference();
  document.body.classList.toggle('theme-night', isNight);
  document.body.classList.toggle('theme-day', !isNight);
}

export function cycleThemeMode() {
  const idx = THEME_MODES.indexOf(themeMode);
  const next = THEME_MODES[(idx + 1) % THEME_MODES.length];
  setThemeMode(next);
}

function updateThemeToggleUI() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const value = btn.querySelector('.theme-toggle-value');
  if (value) value.textContent = getThemeLabel();
  btn.setAttribute('aria-label', `Appearance: ${getThemeLabel()}`);
}

export function bindThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', cycleThemeMode);
  updateThemeToggleUI();
}

export function initTheme() {
  applyThemePreference();
  updateThemeToggleUI();
}
