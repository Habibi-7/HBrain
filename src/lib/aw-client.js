/**
 * ActivityWatch REST API Client
 * Talks to aw-server-rust at localhost:5600
 */

import {
  appDurationQuery,
  categoryDurationQuery,
  notAfkDurationQuery,
  timelineEventsQuery,
  titleDurationQuery,
  windowActivityQuery,
} from './aw-query.js';

const AW_BASE = '/api/0';

class AWClient {
  constructor(baseUrl = AW_BASE) {
    this.base = baseUrl;
    this._info = null;
    this._buckets = null;
    this._hostname = null;
  }

  async _fetch(path, opts = {}) {
    const url = `${this.base}${path}`;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...opts.headers },
      ...opts,
    });
    if (!res.ok) throw new Error(`AW API error: ${res.status} ${res.statusText} — ${url}`);
    return res.json();
  }

  /** Check if AW server is reachable */
  async isConnected() {
    try {
      await this.getInfo();
      return true;
    } catch {
      return false;
    }
  }

  /** Server info */
  async getInfo() {
    if (!this._info) this._info = await this._fetch('/info');
    return this._info;
  }

  /** List all buckets */
  async getBuckets() {
    if (!this._buckets) this._buckets = await this._fetch('/buckets/');
    return this._buckets;
  }

  /** Get events from a bucket */
  async getEvents(bucketId, { start, end, limit = 1000 } = {}) {
    const params = new URLSearchParams();
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    if (limit) params.set('limit', String(limit));
    return this._fetch(`/buckets/${encodeURIComponent(bucketId)}/events?${params}`);
  }

  /** Run a query */
  async query(timeperiods, query) {
    return this._fetch('/query/', {
      method: 'POST',
      body: JSON.stringify({ timeperiods, query }),
    });
  }

  /** Find hostname from available buckets */
  async getHostname() {
    if (this._hostname !== null) return this._hostname;
    const buckets = await this.getBuckets();
    for (const [id] of Object.entries(buckets)) {
      const match = id.match(/aw-watcher-window_(.+)/);
      if (match) {
        this._hostname = match[1];
        return this._hostname;
      }
    }
    // Try afk bucket
    for (const [id] of Object.entries(buckets)) {
      const match = id.match(/aw-watcher-afk_(.+)/);
      if (match) {
        this._hostname = match[1];
        return this._hostname;
      }
    }
    this._hostname = null;
    return null;
  }

  async getActivityBuckets() {
    const hostname = await this.getHostname();
    if (!hostname) return null;
    return {
      windowBucket: `aw-watcher-window_${hostname}`,
      afkBucket: `aw-watcher-afk_${hostname}`,
    };
  }

  /** Get window events for a time range, merged and categorized */
  async getWindowActivity(start, end, categories = []) {
    const hostname = await this.getHostname();
    if (!hostname) return { apps: [], titles: [], duration: 0, events: [] };

    const buckets = {
      windowBucket: `aw-watcher-window_${hostname}`,
      afkBucket: `aw-watcher-afk_${hostname}`,
    };
    const tp = [`${start}/${end}`];
    const q = windowActivityQuery({ ...buckets, categories });

    try {
      const data = await this.query(tp, q);
      return {
        apps: data[0]?.app_events || [],
        titles: data[0]?.title_events || [],
        duration: data[0]?.duration || 0,
        activeEvents: data[0]?.active_events || [],
      };
    } catch (err) {
      console.warn('AW query failed:', err);
      return { apps: [], titles: [], duration: 0, activeEvents: [] };
    }
  }

  /** Get raw window events for timeline visualization */
  async getTimelineEvents(start, end) {
    const hostname = await this.getHostname();
    if (!hostname) return [];

    const tp = [`${start}/${end}`];
    const q = timelineEventsQuery({
      windowBucket: `aw-watcher-window_${hostname}`,
      afkBucket: `aw-watcher-afk_${hostname}`,
    });

    try {
      const data = await this.query(tp, q);
      return data[0] || [];
    } catch {
      return [];
    }
  }

  /** Get total active (non-AFK) durations per day for the last N days */
  async getDailyActivity(days = 365) {
    return this._getDailyDurations(days, ({ afkBucket }) => notAfkDurationQuery({ afkBucket }));
  }

  /** Daily active seconds filtered to a specific app */
  async getDailyAppActivity(appName, days = 140) {
    return this._getDailyDurations(days, ({ windowBucket, afkBucket }) => (
      appDurationQuery({ windowBucket, afkBucket, appName })
    ));
  }

  /** Daily active seconds filtered to app + window title */
  async getDailyTitleActivity(appName, title, days = 140) {
    return this._getDailyDurations(days, ({ windowBucket, afkBucket }) => (
      titleDurationQuery({ windowBucket, afkBucket, appName, title })
    ));
  }

  /** Daily active seconds for a category (uses AW categorize) */
  async getDailyCategoryActivity(categoryName, categories, days = 140) {
    return this._getDailyDurations(days, ({ windowBucket, afkBucket }) => (
      categoryDurationQuery({ windowBucket, afkBucket, categoryName, categories })
    ));
  }

  async _getDailyDurations(days, buildQuery) {
    const buckets = await this.getActivityBuckets();
    if (!buckets) return {};

    const result = {};
    const now = new Date();
    const batchSize = 7;

    for (let i = 0; i < days; i += batchSize) {
      const periods = [];
      for (let d = i; d < Math.min(i + batchSize, days); d++) {
        const dayStart = new Date(now);
        dayStart.setDate(dayStart.getDate() - d);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        periods.push(`${dayStart.toISOString()}/${dayEnd.toISOString()}`);
      }

      const q = buildQuery(buckets);

      try {
        const data = await this.query(periods, q);
        periods.forEach((tp, idx) => {
          const dateStr = tp.split('/')[0].slice(0, 10);
          result[dateStr] = typeof data[idx] === 'number' ? data[idx] : 0;
        });
      } catch {
        /* continue with partial data */
      }
    }

    return result;
  }
}

export const awClient = new AWClient();
export default awClient;
