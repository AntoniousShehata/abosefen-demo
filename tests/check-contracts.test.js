import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import contract from '../contracts/shapes.json';

// The drift check against a SYNTHETIC «production» folder, built from the snapshot itself: identical → exit 0;
// one new field → exit 1 and the field is named; missing sources → exit 1; no path → exit 2.

const script = join(__dirname, '..', 'scripts', 'check-contracts.mjs');
const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
const made = [];

function fakeProduction({ extraProductField = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'abosefen-prod-'));
  made.push(root);
  const src = join(root, 'frontend', 'src');
  const files = new Map();
  const add = (file, text) => files.set(file, `${files.get(file) || ''}${text}\n`);

  for (const shape of Object.values(contract.shapes)) {
    const rule = shape.extract;
    const values = [...shape.productionUses];
    if (rule.type === 'fields') {
      const { file, identifiers } = rule.sources[0];
      if (shape === contract.shapes.product && extraProductField) values.push(extraProductField);
      values.forEach((field) => add(file, `${identifiers[0]}.${field};`));
      rule.sources.slice(1).forEach((s) => add(s.file, ''));
    } else if (rule.type === 'objectKeys') {
      add(rule.file, `const ${rule.name} = {\n${values.map((v) => `  ${v}: 0,`).join('\n')}\n};`);
    } else if (rule.type === 'arrayStrings') {
      add(rule.file, `const ${rule.name} = [${values.map((v) => `'${v}'`).join(', ')}];`);
    } else if (rule.type === 'localeKeys') {
      const tree = {};
      rule.path.split('.').reduce((node, key, i, all) => (node[key] = i === all.length - 1 ? Object.fromEntries(values.map((v) => [v, 'x'])) : {}), tree);
      add(rule.file, JSON.stringify(tree));
    } else if (rule.file === 'data/categoriesCatalog.js') {
      values.forEach((v) => add(rule.file, `    title: { ar: 'س', en: '${v}' },`));
    } else if (rule.file === '../index.html') {
      add(rule.file, values.map((v) => `family=${v}&`).join(''));
    } else {
      values.forEach((v) => add(rule.file, `${v};`));
    }
  }
  for (const [file, text] of files) {
    const full = join(src, file);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  return root;
}

afterEach(() => {
  while (made.length) rmSync(made.pop(), { recursive: true, force: true });
});

describe('scripts/check-contracts.mjs', () => {
  it('exits 0 when production uses exactly the snapshot', () => {
    const result = run(fakeProduction());
    expect(result.stdout).toContain('No difference');
    expect(result.status).toBe(0);
  });

  it('exits 1 and names a field production started to use', () => {
    const result = run(fakeProduction({ extraProductField: 'warrantyYears' }), '--json');
    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.changed).toEqual(['product']);
    expect(report.entries.find((e) => e.name === 'product').added).toEqual(['warrantyYears']);
  });

  it('exits 1 when the files it reads are gone', () => {
    const root = mkdtempSync(join(tmpdir(), 'abosefen-prod-'));
    made.push(root);
    mkdirSync(join(root, 'frontend', 'src'), { recursive: true });
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('source not found');
  });

  it('exits 2 without a production path', () => {
    const result = spawnSync(process.execPath, [script], { encoding: 'utf8', env: { ...process.env, PRODUCTION_REPO: '' } });
    expect(result.status).toBe(2);
  });
});
