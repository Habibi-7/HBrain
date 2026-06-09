/**
 * Small HTML rendering helpers for template-string renderers.
 *
 * Markup in this app mostly comes from trusted source modules, but labels from
 * ActivityWatch and localStorage must be escaped before entering `innerHTML`.
 */

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
};

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

export const escapeAttr = escapeHtml;
