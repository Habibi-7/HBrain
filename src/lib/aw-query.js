/**
 * ActivityWatch query helpers.
 *
 * Keep AW's string query language behind one module so callers request data,
 * not hand-roll bucket names, escaping, and AFK filtering each time.
 */

import { toActivityWatchCategories } from './categories.js';

export { toActivityWatchCategories };

export function escapeAwString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function withActiveWindowEvents({ windowBucket, afkBucket }) {
  return [
    `events = flood(query_bucket("${windowBucket}"));`,
    ...withNotAfkEvents(afkBucket),
    `events = filter_period_intersect(events, not_afk);`,
  ];
}

export function withNotAfkEvents(afkBucket) {
  return [
    `not_afk = flood(query_bucket("${afkBucket}"));`,
    `not_afk = filter_keyvals(not_afk, "status", ["not-afk"]);`,
  ];
}

export function windowActivityQuery({ windowBucket, afkBucket, categories = [] }) {
  const categoryLines = categories.length
    ? [`events = categorize(events, ${JSON.stringify(categories).replace(/\\\\/g, '\\')});`]
    : [];

  return [
    ...withActiveWindowEvents({ windowBucket, afkBucket }),
    ...categoryLines,
    `title_events = sort_by_duration(merge_events_by_keys(events, ["app", "title"]));`,
    `app_events = sort_by_duration(merge_events_by_keys(title_events, ["app"]));`,
    `app_events = limit_events(app_events, 20);`,
    `title_events = limit_events(title_events, 30);`,
    `duration = sum_durations(events);`,
    `RETURN = {"app_events": app_events, "title_events": title_events, "duration": duration, "active_events": not_afk};`,
  ];
}

export function timelineEventsQuery({ windowBucket, afkBucket }) {
  return [
    ...withActiveWindowEvents({ windowBucket, afkBucket }),
    `events = sort_by_timestamp(events);`,
    `RETURN = events;`,
  ];
}

export function notAfkDurationQuery({ afkBucket }) {
  return [
    ...withNotAfkEvents(afkBucket),
    `RETURN = sum_durations(not_afk);`,
  ];
}

export function appDurationQuery({ windowBucket, afkBucket, appName }) {
  return [
    ...withActiveWindowEvents({ windowBucket, afkBucket }),
    `events = filter_keyvals(events, "app", ["${escapeAwString(appName)}"]);`,
    `RETURN = sum_durations(events);`,
  ];
}

export function titleDurationQuery({ windowBucket, afkBucket, appName, title }) {
  return [
    ...withActiveWindowEvents({ windowBucket, afkBucket }),
    `events = filter_keyvals(events, "app", ["${escapeAwString(appName)}"]);`,
    `events = filter_keyvals(events, "title", ["${escapeAwString(title)}"]);`,
    `RETURN = sum_durations(events);`,
  ];
}

export function categoryDurationQuery({ windowBucket, afkBucket, categoryName, categories }) {
  return [
    ...withActiveWindowEvents({ windowBucket, afkBucket }),
    `events = categorize(events, ${JSON.stringify(toActivityWatchCategories(categories)).replace(/\\\\/g, '\\')});`,
    `events = filter_keyvals(events, "$category", ["${escapeAwString(categoryName)}"]);`,
    `RETURN = sum_durations(events);`,
  ];
}
