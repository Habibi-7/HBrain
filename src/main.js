import { Router } from './router.js';
import { renderChrome, bindNavMenu } from './components/nav.js';
import { dashboardView } from './views/dashboard.js';
import { timelineView } from './views/timeline.js';
import { settingsView } from './views/settings.js';
import { awClient } from './lib/aw-client.js';
import { initOceanBackground } from './lib/ocean-bg.js';
import { initTheme, bindThemeToggle } from './lib/theme.js';
import { initKeyboard } from './lib/keyboard.js';
import { initCommandSearch } from './lib/command-search.js';

initTheme();

/** Canvas must stay in the DOM — never wipe body via innerHTML */
function ensureBgCanvas() {
  let canvas = document.getElementById('bg-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'bg-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);
  } else {
    document.body.prepend(canvas);
  }
  return canvas;
}

function recreateBgCanvas() {
  const stale = document.getElementById('bg-canvas');
  stale?.remove();
  const canvas = document.createElement('canvas');
  canvas.id = 'bg-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  return canvas;
}

function bootOcean({ force = false } = {}) {
  let canvas = ensureBgCanvas();

  const gl = canvas.getContext('webgl');
  const contextLost = gl?.isContextLost?.() ?? false;

  if (force || contextLost) {
    canvas = recreateBgCanvas();
  }

  if (!canvas.dataset.oceanInit) {
    initOceanBackground(canvas);
  }
}

function scheduleOceanBoot() {
  const attempt = (n = 0) => {
    const force = n > 0 && n % 6 === 0;
    bootOcean({ force });
    const canvas = document.getElementById('bg-canvas');
    if (!canvas?.classList.contains('shader-ready') && n < 48) {
      requestAnimationFrame(() => attempt(n + 1));
    }
  };
  requestAnimationFrame(() => requestAnimationFrame(() => attempt(0)));
}

scheduleOceanBoot();
window.addEventListener('load', () => bootOcean());

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    document.getElementById('bg-canvas')?.remove();
  });
}

const shell = document.createElement('div');
shell.className = 'app-shell';
shell.innerHTML = `
  <div class="app-chrome" id="chrome-container"></div>
  <main class="main-content" id="main-content"></main>
`;
document.body.appendChild(shell);

document.getElementById('chrome-container').innerHTML = renderChrome();
bindNavMenu();
bindThemeToggle();

const routes = [
  { path: '/', view: dashboardView },
  { path: '/timeline', view: timelineView },
  { path: '/activity', view: timelineView },
  { path: '/habits', view: dashboardView },
  { path: '/settings', view: settingsView },
];

const router = new Router(routes, document.getElementById('main-content'));

initCommandSearch();
initKeyboard({
  navigate: (path) => router.navigate(path),
  getRoute: () => router.getCurrentPath(),
  onHabitFocus: () => {
    router.currentView?.onHabitFocus?.();
  },
  onHabitToggled: () => {
    router.currentView?.onHabitToggle?.();
  },
  onAddHabit: () => {
    router.currentView?.openAddModal?.();
  },
});

async function checkStatus() {
  const statusEl = document.getElementById('aw-status');
  if (!statusEl) return;
  const connected = await awClient.isConnected();
  const dot = statusEl.querySelector('.status-dot');
  const text = statusEl.querySelector('span');

  if (connected) {
    dot.className = 'status-dot';
    text.textContent = 'AW Connected';
    text.className = 'fg-primary text-xs';
  } else {
    dot.className = 'status-dot offline';
    text.textContent = 'AW Offline';
    text.className = 'fg-tertiary text-xs';
  }
}

checkStatus();
setInterval(checkStatus, 10000);
