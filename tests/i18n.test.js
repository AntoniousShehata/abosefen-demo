import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import ar from '../src/i18n/ar.json';
import en from '../src/i18n/en.json';
import de from '../src/i18n/de.json';
import { translate } from '../src/i18n/I18nProvider.jsx';

const keysOf = (node, prefix = '') =>
  Object.entries(node).flatMap(([k, v]) => (v && typeof v === 'object' ? keysOf(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

const filesUnder = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : /\.(js|jsx)$/.test(name) ? [full] : [];
  });

describe('translations', () => {
  it('has the same keys in Arabic, English and German', () => {
    const enKeys = keysOf(en).sort();
    expect(keysOf(ar).sort()).toEqual(enKeys);
    expect(keysOf(de).sort()).toEqual(enKeys);
  });

  it('has no empty text', () => {
    for (const [name, table] of Object.entries({ ar, en, de })) {
      for (const key of keysOf(table)) {
        const value = key.split('.').reduce((n, p) => n[p], table);
        expect(typeof value === 'string' && value.trim().length > 0, `${name}:${key}`).toBe(true);
      }
    }
  });

  it('keeps the same {placeholders} in every language', () => {
    const vars = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
    for (const key of keysOf(en)) {
      const get = (table) => key.split('.').reduce((n, p) => n[p], table);
      expect(vars(get(ar)), `ar:${key}`).toBe(vars(get(en)));
      expect(vars(get(de)), `de:${key}`).toBe(vars(get(en)));
    }
  });

  it('defines every literal key the code asks for', () => {
    const known = new Set(keysOf(en));
    const missing = [];
    for (const file of filesUnder(join(__dirname, '..', 'src'))) {
      const source = readFileSync(file, 'utf8');
      for (const m of source.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
        if (!known.has(m[1])) missing.push(`${file.split('src')[1]}: ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('words every activity the fake API logs, so the owner never reads a key', () => {
    const source = readFileSync(join(__dirname, '..', 'src', 'api', 'createApi.js'), 'utf8');
    const logged = [...new Set([...source.matchAll(/logActivity\('(\w+)'/g)].map((m) => m[1]))];
    expect(logged.length).toBeGreaterThan(0);
    for (const [name, table] of Object.entries({ ar, en, de })) {
      for (const type of logged) expect(table.admin.activityTypes[type], `${name}:${type}`).toBeTypeOf('string');
    }
  });

  it('uses single-brace placeholders only — {{name}} would reach the reader with its braces', () => {
    for (const [name, table] of Object.entries({ ar, en, de })) {
      for (const key of keysOf(table)) {
        const value = key.split('.').reduce((n, p) => n[p], table);
        expect(/\{\{|\}\}/.test(value), `${name}:${key}`).toBe(false);
      }
    }
  });

  it('fills placeholders and falls back to English, then to the key', () => {
    expect(translate('en', 'cart.each', { price: '5 EGP' })).toBe('5 EGP each');
    expect(translate('ar', 'checkout.simulation')).toBe('محاكاة — لا يتم دفع حقيقى');
    expect(translate('en', 'checkout.simulation')).toBe('Simulation — no real payment');
    expect(translate('ar', 'banner.text')).toBe('نسخة عرض — بيانات وهمية');
    expect(translate('en', 'banner.text')).toBe('Demo — synthetic data');
    expect(translate('de', 'no.such.key')).toBe('no.such.key');
  });
});
