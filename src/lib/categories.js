/**
 * Category system — maps app names to categories
 */
import { normalizeIconKey } from './icons.js';

const CATEGORIES_KEY = 'hbrain_categories';
const CATEGORY_COLORS_KEY = 'hbrain_category_colors_v5';
const CATEGORY_ICONS_KEY = 'hbrain_category_icons_v1';

const CATEGORY_ICONS = {
  Coding: 'code',
  Communication: 'message',
  Browsing: 'globe',
  Design: 'palette',
  Writing: 'pen',
  Media: 'clapperboard',
  Other: 'folder',
};

const CATEGORY_COLORS = {
  Coding: '#9eb8f0',
  Communication: '#8db4f2',
  Browsing: '#86c9ae',
  Design: '#b0b8f0',
  Writing: '#86c9ae',
  Media: '#da8598',
  Other: '#da8598',
};

const DEFAULT_CATEGORIES = [
  {
    name: 'Coding',
    color: CATEGORY_COLORS.Coding,
    icon: CATEGORY_ICONS.Coding,
    rules: [
      { type: 'app', match: 'Code' },
      { type: 'app', match: 'Visual Studio Code' },
      { type: 'app', match: 'Terminal' },
      { type: 'app', match: 'iTerm2' },
      { type: 'app', match: 'Warp' },
      { type: 'app', match: 'Cursor' },
      { type: 'app', match: 'Conductor' },
      { type: 'app', match: 'Xcode' },
      { type: 'app', match: 'IntelliJ' },
      { type: 'app', match: 'PyCharm' },
      { type: 'app', match: 'WebStorm' },
      { type: 'app', match: 'Sublime Text' },
      { type: 'app', match: 'Vim' },
      { type: 'app', match: 'Neovim' },
    ],
  },
  {
    name: 'Communication',
    color: CATEGORY_COLORS.Communication,
    icon: CATEGORY_ICONS.Communication,
    rules: [
      { type: 'app', match: 'Slack' },
      { type: 'app', match: 'Discord' },
      { type: 'app', match: 'Telegram' },
      { type: 'app', match: 'Messages' },
      { type: 'app', match: 'WhatsApp' },
      { type: 'app', match: 'Microsoft Teams' },
      { type: 'app', match: 'Zoom' },
      { type: 'app', match: 'FaceTime' },
      { type: 'title', match: 'Gmail' },
      { type: 'title', match: 'Outlook' },
      { type: 'app', match: 'Mail' },
    ],
  },
  {
    name: 'Browsing',
    color: CATEGORY_COLORS.Browsing,
    icon: CATEGORY_ICONS.Browsing,
    rules: [
      { type: 'app', match: 'Safari' },
      { type: 'app', match: 'Google Chrome' },
      { type: 'app', match: 'Arc' },
      { type: 'app', match: 'Firefox' },
      { type: 'app', match: 'Brave Browser' },
      { type: 'app', match: 'Microsoft Edge' },
    ],
  },
  {
    name: 'Design',
    color: CATEGORY_COLORS.Design,
    icon: CATEGORY_ICONS.Design,
    rules: [
      { type: 'app', match: 'Figma' },
      { type: 'app', match: 'Sketch' },
      { type: 'app', match: 'Adobe' },
      { type: 'app', match: 'Photoshop' },
      { type: 'app', match: 'Illustrator' },
      { type: 'app', match: 'Canva' },
    ],
  },
  {
    name: 'Writing',
    color: CATEGORY_COLORS.Writing,
    icon: CATEGORY_ICONS.Writing,
    rules: [
      { type: 'app', match: 'Obsidian' },
      { type: 'app', match: 'Notion' },
      { type: 'app', match: 'Notes' },
      { type: 'app', match: 'Bear' },
      { type: 'app', match: 'Ulysses' },
      { type: 'app', match: 'Google Docs' },
      { type: 'app', match: 'Pages' },
      { type: 'app', match: 'Word' },
    ],
  },
  {
    name: 'Media',
    color: CATEGORY_COLORS.Media,
    icon: CATEGORY_ICONS.Media,
    rules: [
      { type: 'app', match: 'Spotify' },
      { type: 'app', match: 'Music' },
      { type: 'app', match: 'YouTube' },
      { type: 'app', match: 'Netflix' },
      { type: 'app', match: 'VLC' },
      { type: 'app', match: 'QuickTime' },
      { type: 'app', match: 'Podcasts' },
      { type: 'title', match: 'YouTube' },
      { type: 'title', match: 'Netflix' },
      { type: 'title', match: 'Twitch' },
    ],
  },
];

class CategoryManager {
  constructor() {
    this._categories = null;
  }

  getCategories() {
    if (!this._categories) {
      const raw = localStorage.getItem(CATEGORIES_KEY);
      this._categories = raw ? JSON.parse(raw) : [...DEFAULT_CATEGORIES];
      if (!raw) {
        this._save();
      } else {
        this._migrateColors();
        this._migrateIcons();
        this._migrateOtherRed();
        this._migrateConductorRule();
      }
    }
    return this._categories;
  }

  _migrateColors() {
    if (localStorage.getItem(CATEGORY_COLORS_KEY)) return;
    for (const cat of this._categories) {
      if (CATEGORY_COLORS[cat.name]) cat.color = CATEGORY_COLORS[cat.name];
    }
    localStorage.setItem(CATEGORY_COLORS_KEY, '1');
    this._save();
  }

  _migrateOtherRed() {
    if (localStorage.getItem('hbrain_category_other_red_v1')) return;
    for (const cat of this._categories) {
      if (cat.name === 'Other') cat.color = CATEGORY_COLORS.Other;
    }
    localStorage.setItem('hbrain_category_other_red_v1', '1');
    this._save();
  }

  _migrateIcons() {
    if (localStorage.getItem(CATEGORY_ICONS_KEY)) return;
    for (const cat of this._categories) {
      if (CATEGORY_ICONS[cat.name]) cat.icon = CATEGORY_ICONS[cat.name];
      else cat.icon = normalizeIconKey(cat.icon);
    }
    localStorage.setItem(CATEGORY_ICONS_KEY, '1');
    this._save();
  }

  _migrateConductorRule() {
    if (localStorage.getItem('hbrain_category_conductor_v1')) return;
    const coding = this._categories.find((cat) => cat.name === 'Coding');
    if (coding && !coding.rules.some((r) => r.match === 'Conductor')) {
      const cursorIdx = coding.rules.findIndex((r) => r.match === 'Cursor');
      const rule = { type: 'app', match: 'Conductor' };
      if (cursorIdx >= 0) coding.rules.splice(cursorIdx + 1, 0, rule);
      else coding.rules.push(rule);
      this._save();
    }
    localStorage.setItem('hbrain_category_conductor_v1', '1');
  }

  /** Categorize an app event */
  categorize(appName, title = '') {
    const cats = this.getCategories();
    for (const cat of cats) {
      for (const rule of cat.rules) {
        if (rule.type === 'app' && appName?.toLowerCase().includes(rule.match.toLowerCase())) {
          return cat;
        }
        if (rule.type === 'title' && title?.toLowerCase().includes(rule.match.toLowerCase())) {
          return cat;
        }
      }
    }
    return { name: 'Other', color: CATEGORY_COLORS.Other, icon: CATEGORY_ICONS.Other };
  }

  /** Categorize a list of AW app events and return aggregated by category */
  categorizeEvents(appEvents) {
    const catMap = {};
    for (const event of appEvents) {
      const cat = this.categorize(event.data?.app, event.data?.title);
      if (!catMap[cat.name]) {
        catMap[cat.name] = { ...cat, duration: 0 };
      }
      catMap[cat.name].duration += event.duration || 0;
    }
    return Object.values(catMap).sort((a, b) => b.duration - a.duration);
  }

  /** Get color for an app name */
  getAppColor(appName, title = '') {
    return this.categorize(appName, title).color;
  }

  /** Save categories */
  saveCategories(categories) {
    this._categories = categories;
    this._save();
  }

  _save() {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(this._categories));
  }
}

export const categoryManager = new CategoryManager();
export default categoryManager;
