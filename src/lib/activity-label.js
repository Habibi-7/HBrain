/**
 * Format ActivityWatch window events as a specific app or site label.
 */

function parseHostname(raw) {
  if (!raw) return null;
  try {
    const url = raw.includes('://') ? raw : `https://${raw}`;
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Best-effort label: site hostname, page title, or app name */
export function formatActivityLabel(event) {
  const app = (event?.data?.app || '').trim();
  const title = (event?.data?.title || '').trim();
  const url = event?.data?.url || '';

  const fromUrl = parseHostname(url);
  if (fromUrl) return fromUrl;

  if (title) {
    const pipe = title.split(' | ').pop()?.trim();
    if (pipe && /\.[a-z]{2,}/i.test(pipe)) {
      return pipe.replace(/^www\./, '');
    }

    const dash = title.split(' - ').pop()?.trim();
    if (dash && (/\.[a-z]{2,}/i.test(dash) || dash.length <= 24)) {
      return dash.replace(/^www\./, '');
    }

    if (title.length <= 32) return title;
  }

  return app || 'Unknown';
}

/** Pick the top specific target from title-level events, falling back to apps */
export function getTopTarget(events) {
  const list = events?.titles?.length ? events.titles : events?.apps || events || [];
  if (!list.length) return null;
  const top = list[0];
  return {
    label: formatActivityLabel(top),
    duration: top.duration || 0,
    app: top.data?.app || '',
  };
}
