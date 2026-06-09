import { describe, expect, it } from 'vitest';
import { escapeAttr, escapeHtml } from './html.js';

describe('html escaping helpers', () => {
  it('escapes text before template-string rendering', () => {
    expect(escapeHtml('<Safari "tab" & notes>')).toBe('&lt;Safari &quot;tab&quot; &amp; notes&gt;');
  });

  it('uses the same escaping boundary for attributes', () => {
    expect(escapeAttr(`Bob's "site"`)).toBe('Bob&#039;s &quot;site&quot;');
  });
});
