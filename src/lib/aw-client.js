/**
 * ActivityWatch REST API Client
 * Talks to aw-server-rust at localhost:5600
 */

const AW_BASE = '/api/0';

class AWClient {
  constructor(baseUrl = AW_BASE) {
    this.base = baseUrl;
    this._info = null;
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
    return this._fetch('/buckets/');
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
    const buckets = await this.getBuckets();
    for (const [id] of Object.entries(buckets)) {
      const match = id.match(/aw-watcher-window_(.+)/);
      if (match) return match[1];
    }
    // Try afk bucket
    for (const [id] of Object.entries(buckets)) {
      const match = id.match(/aw-watcher-afk_(.+)/);
      if (match) return match[1];
    }
    return null;
  }

  /** Get window events for a time range, merged and categorized */
  async getWindowActivity(start, end, categories = []) {
    const hostname = await this.getHostname();
    if (!hostname) return { apps: [], titles: [], duration: 0, events: [] };

    const bidWindow = `aw-watcher-window_${hostname}`;
    const bidAfk = `aw-watcher-afk_${hostname}`;
    const tp = [`${start}/${end}`];

    const catStr = categories.length > 0
      ? JSON.stringify(categories).replace(/\\\\/g, '\\')
      : '[]';

    const q = [
      `events = flood(query_bucket("${bidWindow}"));`,
      `not_afk = flood(query_bucket("${bidAfk}"));`,
      `not_afk = filter_keyvals(not_afk, "status", ["not-afk"]);`,
      `events = filter_period_intersect(events, not_afk);`,
      categories.length > 0 ? `events = categorize(events, ${catStr});` : '',
      `title_events = sort_by_duration(merge_events_by_keys(events, ["app", "title"]));`,
      `app_events = sort_by_duration(merge_events_by_keys(title_events, ["app"]));`,
      `app_events = limit_events(app_events, 20);`,
      `title_events = limit_events(title_events, 30);`,
      `duration = sum_durations(events);`,
      `RETURN = {"app_events": app_events, "title_events": title_events, "duration": duration, "active_events": not_afk};`,
    ].filter(Boolean);

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

    const bidWindow = `aw-watcher-window_${hostname}`;
    const bidAfk = `aw-watcher-afk_${hostname}`;
    const tp = [`${start}/${end}`];

    const q = [
      `events = flood(query_bucket("${bidWindow}"));`,
      `not_afk = flood(query_bucket("${bidAfk}"));`,
      `not_afk = filter_keyvals(not_afk, "status", ["not-afk"]);`,
      `events = filter_period_intersect(events, not_afk);`,
      `events = sort_by_timestamp(events);`,
      `RETURN = events;`,
    ];

    try {
      const data = await this.query(tp, q);
      return data[0] || [];
    } catch {
      return [];
    }
  }

  /** Get total active (non-AFK) durations per day for the last N days */
  async getDailyActivity(days = 365) {
    return this._getDailyDurations(days, (bidWindow, bidAfk) => [
      `not_afk = flood(query_bucket("${bidAfk}"));`,
      `not_afk = filter_keyvals(not_afk, "status", ["not-afk"]);`,
      `RETURN = sum_durations(not_afk);`,
    ]);
  }

  /** Daily active seconds filtered to a specific app */
  async getDailyAppActivity(appName, days = 140) {
    const escaped = appName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return this._getDailyDurations(days, (bidWindow, bidAfk) => [
      `events = flood(query_bucket("${bidWindow}"));`,
      `not_afk = flood(query_bucket("${bidAfk}"));`,
      `not_afk = filter_keyvals(not_afk, "status", ["not-afk"]);`,
      `events = filter_period_intersect(events, not_afk);`,
      `events = filter_keyvals(events, "app", ["${escaped}"]);`,
      `RETURN = sum_durations(events);`,
    ]);
  }

  /** Daily active seconds filtered to app + window title */
  async getDailyTitleActivity(appName, title, days = 140) {
    const escapedApp = appName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const escapedTitle = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return this._getDailyDurations(days, (bidWindow, bidAfk) => [
      `events = flood(query_bucket("${bidWindow}"));`,
      `not_afk = flood(query_bucket("${bidAfk}"));`,
      `not_afk = filter_keyvals(not_afk, "status", ["not-afk"]);`,
      `events = filter_period_intersect(events, not_afk);`,
      `events = filter_keyvals(events, "app", ["${escapedApp}"]);`,
      `events = filter_keyvals(events, "title", ["${escapedTitle}"]);`,
      `RETURN = sum_durations(events);`,
    ]);
  }

  /** Daily active seconds for a category (uses AW categorize) */
  async getDailyCategoryActivity(categoryName, categories, days = 140) {
    const catJson = JSON.stringify(this._toAWCategories(categories)).replace(/\\\\/g, '\\');
    const escaped = categoryName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return this._getDailyDurations(days, (bidWindow, bidAfk) => [
      `events = flood(query_bucket("${bidWindow}"));`,
      `not_afk = flood(query_bucket("${bidAfk}"));`,
      `not_afk = filter_keyvals(not_afk, "status", ["not-afk"]);`,
      `events = filter_period_intersect(events, not_afk);`,
      `events = categorize(events, ${catJson});`,
      `events = filter_keyvals(events, "$category", ["${escaped}"]);`,
      `RETURN = sum_durations(events);`,
    ]);
  }

  _toAWCategories(categories) {
    return categories.map((cat) => {
      const parts = cat.rules.map((r) => {
        const match = r.match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return r.type === 'title' ? `title:${match}` : match;
      });
      return [cat.name, { type: 'regex', regex: parts.join('|'), ignoreCase: true }];
    });
  }

  async _getDailyDurations(days, buildQuery) {
    const hostname = await this.getHostname();
    if (!hostname) return {};

    const bidWindow = `aw-watcher-window_${hostname}`;
    const bidAfk = `aw-watcher-afk_${hostname}`;
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

      const q = buildQuery(bidWindow, bidAfk);

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
