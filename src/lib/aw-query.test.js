import { describe, expect, it } from 'vitest';
import {
  appDurationQuery,
  categoryDurationQuery,
  escapeAwString,
  timelineEventsQuery,
  windowActivityQuery,
} from './aw-query.js';

const buckets = {
  windowBucket: 'aw-watcher-window_mac',
  afkBucket: 'aw-watcher-afk_mac',
};

describe('ActivityWatch query builder', () => {
  it('escapes AW string literals once at the query boundary', () => {
    expect(escapeAwString('Safari "Personal" \\ notes')).toBe('Safari \\"Personal\\" \\\\ notes');
  });

  it('builds active window queries with AFK filtering', () => {
    expect(timelineEventsQuery(buckets)).toEqual([
      'events = flood(query_bucket("aw-watcher-window_mac"));',
      'not_afk = flood(query_bucket("aw-watcher-afk_mac"));',
      'not_afk = filter_keyvals(not_afk, "status", ["not-afk"]);',
      'events = filter_period_intersect(events, not_afk);',
      'events = sort_by_timestamp(events);',
      'RETURN = events;',
    ]);
  });

  it('aggregates app and title activity from one active-events base', () => {
    const query = windowActivityQuery(buckets);
    expect(query).toContain('title_events = sort_by_duration(merge_events_by_keys(events, ["app", "title"]));');
    expect(query).toContain('app_events = sort_by_duration(merge_events_by_keys(title_events, ["app"]));');
    expect(query.at(-1)).toContain('"active_events": not_afk');
  });

  it('filters daily app activity with escaped app names', () => {
    expect(appDurationQuery({ ...buckets, appName: 'Code "Insiders"' })).toContain(
      'events = filter_keyvals(events, "app", ["Code \\"Insiders\\""]);',
    );
  });

  it('converts category rules into AW regex categories', () => {
    const query = categoryDurationQuery({
      ...buckets,
      categoryName: 'Writing',
      categories: [
        {
          name: 'Writing',
          rules: [
            { type: 'app', match: 'Obsidian' },
            { type: 'title', match: 'Google Docs' },
          ],
        },
      ],
    }).join('\n');

    expect(query).toContain('events = categorize(events, [["Writing"');
    expect(query).toContain('Obsidian|title:Google Docs');
    expect(query).toContain('events = filter_keyvals(events, "$category", ["Writing"]);');
  });
});
