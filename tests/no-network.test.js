import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTENT_SECURITY_POLICY } from '../csp.config.js';

// The demo talks to nothing but Google Fonts. These guards keep it that way.
const root = join(__dirname, '..');
const filesUnder = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : /\.(js|jsx|json|css)$/.test(name) ? [full] : [];
  });

describe('no network', () => {
  it('has no fetch, XHR, WebSocket, beacon or remote URL in the app code', () => {
    for (const file of filesUnder(join(root, 'src'))) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|new WebSocket|sendBeacon|EventSource/);
      const urls = [...source.matchAll(/https?:\/\/[^\s'"`)]+/g)].map((m) => m[0]).filter((u) => !u.startsWith('http://www.w3.org/'));
      expect(urls, file).toEqual([]);
    }
  });

  it('loads nothing remote in index.html except Google Fonts', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    const urls = [...html.matchAll(/https?:\/\/[^\s'"`)]+/g)].map((m) => m[0]);
    for (const u of urls) expect(u).toMatch(/^https:\/\/fonts\.(googleapis|gstatic)\.com/);
  });

  it('ships a content security policy that only allows the fonts', () => {
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("connect-src 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain('https://fonts.googleapis.com');
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/\*/);
  });
});
