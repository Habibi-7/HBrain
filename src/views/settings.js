/**
 * Settings view — AW connection, category editor
 */
import { awClient } from '../lib/aw-client.js';
import { categoryManager, CATEGORIES_KEY } from '../lib/categories.js';
import { habitStore } from '../lib/habit-store.js';
import { getThemeMode, setThemeMode, THEME_MODES, getThemeLabel } from '../lib/theme.js';
import { iconHtml } from '../lib/icons.js';
import { escapeHtml, escapeAttr } from '../lib/html.js';

export function settingsView() {
  const el = document.createElement('div');

  async function render() {
    const connected = await awClient.isConnected();
    let info = null;
    let hostname = null;
    let buckets = {};

    if (connected) {
      try {
        info = await awClient.getInfo();
        hostname = await awClient.getHostname();
        buckets = await awClient.getBuckets();
      } catch { /* ignore */ }
    }

    const categories = categoryManager.getCategories();
    const bucketIds = Object.keys(buckets);

    el.className = 'page-view page-settings fade-in';
    el.innerHTML = `
      <header class="page-toolbar">
        <div>
          <span class="page-kicker">System</span>
          <h1 class="page-title">Settings</h1>
        </div>
      </header>

      <div class="page-body">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Appearance</span>
          </div>
          <div class="date-bar" id="theme-picker" style="margin-bottom:0;">
            ${THEME_MODES.map(mode => `
              <button class="date-btn ${getThemeMode() === mode ? 'active' : ''}" type="button" data-theme="${escapeAttr(mode)}">
                ${escapeHtml(getThemeLabel(mode))}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Data</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);">
            <button class="btn btn-secondary text-sm" id="export-data">Export</button>
            <button class="btn btn-ghost text-sm" id="clear-data" style="color:var(--cat-media);">Reset</button>
          </div>
          <p class="text-xs fg-muted" style="margin-top:var(--sp-2);">Habit storage: ${escapeHtml(habitStore.getStorageMode())} · v1.0.0 · MIT</p>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">ActivityWatch</span>
            <span style="display:flex;align-items:center;gap:var(--sp-2);">
              <div class="status-dot ${connected ? '' : 'offline'}"></div>
              <span class="text-xs ${connected ? 'fg-primary' : 'fg-tertiary'}">${connected ? 'Connected' : 'Offline'}</span>
            </span>
          </div>
          ${connected ? `
            <dl class="settings-kv">
              <div><dt>Server</dt><dd>${escapeHtml(info?.hostname || 'localhost')}:5600</dd></div>
              <div><dt>Host</dt><dd>${escapeHtml(hostname || '—')}</dd></div>
              <div><dt>Buckets</dt><dd>${bucketIds.length}</dd></div>
            </dl>
            ${bucketIds.length ? `
              <div class="settings-scroll" style="margin-top:var(--sp-2);">
                <div style="display:flex;flex-wrap:wrap;gap:var(--sp-1);">
                  ${bucketIds.slice(0, 6).map(id => `
                    <span class="text-xs fg-tertiary" style="padding:2px 6px;background:var(--track-bg);border-radius:var(--radius-sm);font-family:var(--font-mono);">${escapeHtml(id)}</span>
                  `).join('')}
                  ${bucketIds.length > 6 ? `<span class="text-xs fg-muted">+${bucketIds.length - 6}</span>` : ''}
                </div>
              </div>
            ` : ''}
          ` : `
            <p class="text-sm fg-secondary">Start ActivityWatch to see screen activity.</p>
            <a href="https://activitywatch.net/downloads/" target="_blank" class="btn btn-secondary text-sm" style="margin-top:var(--sp-2);">Download</a>
          `}
          <button class="btn btn-ghost text-sm" id="test-connection" style="margin-top:var(--sp-2);">Test connection</button>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">About</span>
          </div>
          <p class="text-sm fg-secondary">
            <strong>Hvis</strong> — local-first activity dashboard. All data stays on your machine.
          </p>
        </div>

        <div class="card settings-card--wide">
          <div class="card-header">
            <span class="card-title">Categories</span>
          </div>
          <div class="settings-scroll">
            ${categories.map(cat => `
              <div class="settings-category-row">
                <div class="settings-category-dot" style="background:${escapeAttr(cat.color)};"></div>
                <span class="settings-category-name">
                  ${iconHtml(cat.icon, { size: 14 })} ${escapeHtml(cat.name)}
                </span>
                <span class="settings-category-rules fg-muted">${cat.rules.map(r => escapeHtml(r.match)).join(', ')}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    el.querySelectorAll('[data-theme]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setThemeMode(btn.dataset.theme);
        el.querySelectorAll('[data-theme]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    el.querySelector('#test-connection')?.addEventListener('click', async () => {
      const btn = el.querySelector('#test-connection');
      btn.textContent = 'Testing...';
      await new Promise(r => setTimeout(r, 500));
      render();
    });

    el.querySelector('#export-data')?.addEventListener('click', () => {
      const data = {
        ...habitStore.exportData(),
        categories: JSON.parse(localStorage.getItem(CATEGORIES_KEY) || '[]'),
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hvis-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    el.querySelector('#clear-data')?.addEventListener('click', async () => {
      if (confirm('This will delete all habit data. Are you sure?')) {
        await habitStore.resetData();
        localStorage.removeItem(CATEGORIES_KEY);
        render();
      }
    });

  }

  return {
    el,
    mount: render,
  };
}
