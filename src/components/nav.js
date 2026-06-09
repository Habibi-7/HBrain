/**
 * Earendil-style top chrome navigation
 */

const NAV_ITEMS = [
  { path: '/', label: 'Today', shortcut: '1' },
  { path: '/timeline', label: 'Timeline', shortcut: '2' },
  { path: '/settings', label: 'Settings', shortcut: '3' },
];

export function renderChrome() {
  const links = NAV_ITEMS.map(({ path, label, shortcut }) => `
    <a class="nav-link" data-route="${path}" href="#${path === '/' ? '/' : path}">
      <span>${label}</span>
      <kbd class="nav-kbd">${shortcut}</kbd>
    </a>
  `).join('');

  return `
    <nav class="top-nav" id="top-nav" data-nav-menu>
      <button class="nav-trigger" type="button" aria-expanded="false" aria-controls="nav-links" aria-label="Open navigation">
        <span>Menu</span>
        <span class="nav-chevron" aria-hidden="true">›</span>
      </button>
      <div class="nav-links" id="nav-links">${links}</div>
    </nav>

    <div class="status-chip" id="aw-status">
      <div class="status-dot offline"></div>
      <span>Checking AW...</span>
    </div>

    <button class="theme-toggle" id="theme-toggle" type="button" aria-label="Appearance: DARK">
      <span class="theme-toggle-label">Theme</span>
      <span class="theme-toggle-value">DARK</span>
      <kbd class="theme-toggle-kbd">T</kbd>
    </button>
  `;
}

export function bindNavMenu() {
  const nav = document.getElementById('top-nav');
  const trigger = nav?.querySelector('.nav-trigger');
  const links = document.getElementById('nav-links');
  if (!nav || !trigger || !links) return;

  const close = () => {
    nav.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
  };

  trigger.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  links.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', close);
  });

  document.addEventListener('click', (event) => {
    if (!nav.contains(event.target)) close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
}
