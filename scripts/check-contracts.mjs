#!/usr/bin/env node
// Compares the data shapes the PRODUCTION frontend uses today with the snapshot this demo mirrors
// (contracts/shapes.json), and reports what was added or removed.
//
//   node scripts/check-contracts.mjs <path-to-production-repo>            report; exit 1 on any difference
//   node scripts/check-contracts.mjs <path-to-production-repo> --json     the same, machine-readable
//   node scripts/check-contracts.mjs <path-to-production-repo> --write    after a human review: take the
//                                                                          production's current usage as the
//                                                                          new snapshot (git shows the diff)
//
// READ-ONLY towards production: it only reads files under <repo>/frontend/src (and <repo>/.git/HEAD to name the
// commit). It runs no git command, writes nothing there, and needs no network or token.
//
// HOW IT EXTRACTS (pragmatic, grep-based — see docs/SYNC.md «Limits»):
//   fields  → in the listed files, every `<identifier>.<field>` and `<identifier>.<nested>.<field>`
//             (optional chaining included) for the identifiers the contract names (product, item, order…).
//   enums   → keys of a named object literal, strings of a named array literal, or keys under a locale path.
//   lists   → every match of a regular expression (used for the market taxonomy names).
// It does not understand destructuring (`const { price } = product`), spreads, or values passed through other
// variable names; such reads are invisible to it. A renamed variable shows up as «removed» + «added».

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const CONTRACT_PATH = join(here, '..', 'contracts', 'shapes.json');

// Names that follow an identifier but are methods/properties of JS values, not data fields.
const NOT_FIELDS = new Set([
  'map', 'filter', 'find', 'findIndex', 'some', 'every', 'forEach', 'reduce', 'includes', 'indexOf', 'length',
  'slice', 'splice', 'join', 'concat', 'sort', 'push', 'flat', 'flatMap', 'keys', 'values', 'entries', 'at',
  'toString', 'toLowerCase', 'toUpperCase', 'trim', 'split', 'replace', 'startsWith', 'endsWith', 'toFixed',
  'getTime', 'getMonth', 'getFullYear', 'getDate', 'localeCompare', 'match', 'test', 'then', 'catch', 'call',
  'apply', 'bind', 'hasOwnProperty',
]);

function usage(message) {
  if (message) console.error(`\n  ${message}\n`);
  console.error('  Usage: node scripts/check-contracts.mjs <path-to-production-repo> [--json] [--write]\n');
  process.exit(2);
}

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const repoArg = args.find((a) => !a.startsWith('--')) || process.env.PRODUCTION_REPO;
if (!repoArg) usage('Give the path of the production repository (or set PRODUCTION_REPO).');
const repo = resolve(repoArg);
const src = join(repo, 'frontend', 'src');
if (!existsSync(src)) usage(`Not a production checkout: ${src} does not exist.`);

const contract = JSON.parse(readFileSync(CONTRACT_PATH, 'utf8'));

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const read = (rel) => {
  const full = join(src, rel);
  return existsSync(full) ? readFileSync(full, 'utf8') : null;
};

function productionCommit() {
  try {
    const head = readFileSync(join(repo, '.git', 'HEAD'), 'utf8').trim();
    if (!head.startsWith('ref:')) return head.slice(0, 8);
    const ref = head.slice(4).trim();
    const loose = join(repo, '.git', ...ref.split('/'));
    if (existsSync(loose)) return readFileSync(loose, 'utf8').trim().slice(0, 8);
    const packed = readFileSync(join(repo, '.git', 'packed-refs'), 'utf8');
    const line = packed.split('\n').find((l) => l.endsWith(` ${ref}`));
    return line ? line.slice(0, 8) : 'unknown';
  } catch {
    return 'unknown';
  }
}

/** `<id>.<a>` and `<id>.<a>.<b>` reads in a source text. */
function fieldsIn(text, identifiers, nested) {
  const ids = identifiers.map(escape).join('|');
  const re = new RegExp(`(?<![\\w$.])(?:${ids})\\??\\.([A-Za-z_$][\\w$]*)(?:\\??\\.([A-Za-z_$][\\w$]*))?`, 'g');
  const out = new Set();
  for (const [, a, b] of text.matchAll(re)) {
    if (NOT_FIELDS.has(a)) continue;
    if (b && nested.includes(a) && !NOT_FIELDS.has(b)) out.add(`${a}.${b}`);
    else out.add(a);
  }
  return out;
}

function blockAfter(text, opener) {
  const start = text.search(new RegExp(`(?:const|let|var)\\s+${escape(opener.name)}\\s*=\\s*\\${opener.bracket}`));
  if (start < 0) return null;
  const open = text.indexOf(opener.bracket, start);
  const close = opener.bracket === '{' ? '}' : ']';
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === opener.bracket) depth++;
    else if (text[i] === close && --depth === 0) return text.slice(open + 1, i);
  }
  return null;
}

/** Runs one extraction rule. Returns { values: string[], missing: string[] }. */
function extract(rule) {
  const missing = [];
  const values = new Set();
  if (rule.type === 'fields') {
    for (const source of rule.sources) {
      const text = read(source.file);
      if (text === null) {
        missing.push(source.file);
        continue;
      }
      fieldsIn(text, source.identifiers, rule.nested || []).forEach((f) => values.add(f));
    }
  } else if (rule.type === 'objectKeys' || rule.type === 'arrayStrings') {
    const text = read(rule.file);
    const block = text === null ? null : blockAfter(text, { name: rule.name, bracket: rule.type === 'objectKeys' ? '{' : '[' });
    if (block === null) missing.push(`${rule.file} (${rule.name})`);
    else if (rule.type === 'objectKeys') for (const [, k] of block.matchAll(/^\s*['"]?([A-Za-z_$][\w$]*)['"]?\s*:/gm)) values.add(k);
    else for (const [, s] of block.matchAll(/['"]([^'"]+)['"]/g)) values.add(s);
  } else if (rule.type === 'localeKeys') {
    const text = read(rule.file);
    let node = null;
    try {
      node = text === null ? null : rule.path.split('.').reduce((n, p) => (n ? n[p] : undefined), JSON.parse(text));
    } catch {
      node = null;
    }
    if (!node || typeof node !== 'object') missing.push(`${rule.file} (${rule.path})`);
    else Object.keys(node).forEach((k) => values.add(k));
  } else if (rule.type === 'regex') {
    const text = read(rule.file);
    if (text === null) missing.push(rule.file);
    else for (const m of text.matchAll(new RegExp(rule.pattern, 'gm'))) values.add(m[rule.group ?? 1]);
  } else {
    throw new Error(`Unknown rule type ${rule.type}`);
  }
  return { values: [...values].sort(), missing };
}

// ── Compare ─────────────────────────────────────────────────────────────────────────────────────
const commit = productionCommit();
const report = { contractVersion: contract.contractVersion, snapshotCommit: contract.snapshot.commit, productionCommit: commit, entries: [] };

for (const [name, entry] of Object.entries(contract.shapes)) {
  const { values, missing } = extract(entry.extract);
  const before = new Set(entry.productionUses || []);
  const now = new Set(values);
  const added = values.filter((v) => !before.has(v));
  const removed = [...before].filter((v) => !now.has(v)).sort();
  const provided = new Set([...(entry.demoProvides || []), ...(entry.knownGaps || [])]);
  const unserved = entry.demoProvides ? values.filter((v) => !provided.has(v)) : [];
  report.entries.push({ name, kind: entry.kind, added, removed, missing, unserved, count: values.length, values });
}

const changed = report.entries.filter((e) => e.added.length || e.removed.length || e.missing.length);

if (flags.has('--write')) {
  for (const e of report.entries) {
    if (e.missing.length) {
      console.error(`Refusing to write: source missing for «${e.name}»: ${e.missing.join(', ')} — fix the rule in contracts/shapes.json first.`);
      process.exit(1);
    }
    contract.shapes[e.name].productionUses = e.values;
  }
  contract.snapshot = { ...contract.snapshot, commit, takenAt: new Date().toISOString().slice(0, 10) };
  writeFileSync(CONTRACT_PATH, `${JSON.stringify(contract, null, 2)}\n`);
  console.log(`Snapshot updated from production ${commit}. Review the diff of contracts/shapes.json, then bump contractVersion if the demo's own shapes changed.`);
  process.exit(0);
}

if (flags.has('--json')) {
  console.log(JSON.stringify({ ...report, changed: changed.map((e) => e.name) }, null, 2));
  process.exit(changed.length ? 1 : 0);
}

console.log(`\nContract ${contract.contractVersion} — snapshot of production ${contract.snapshot.commit} (${contract.snapshot.takenAt})`);
console.log(`Production checked now: ${commit}  (${repo})\n`);
for (const e of report.entries) {
  const status = e.missing.length || e.added.length || e.removed.length ? 'CHANGED' : 'ok';
  console.log(`${status === 'ok' ? '  ok     ' : '  CHANGED'}  ${e.name.padEnd(18)} ${e.kind.padEnd(7)} ${e.count} values`);
  e.missing.forEach((m) => console.log(`             ! source not found: ${m}`));
  e.added.forEach((v) => console.log(`             + now used by production: ${v}`));
  e.removed.forEach((v) => console.log(`             - no longer used by production: ${v}`));
  if (e.unserved.length) console.log(`             · used by production, not served by the demo (not a failure): ${e.unserved.join(', ')}`);
}
if (changed.length) {
  console.log(`\n${changed.length} contract(s) changed. Review them by hand (docs/SYNC.md, «When the check fails»), update the demo if needed,`);
  console.log('then refresh the snapshot with --write and commit both together.\n');
  process.exit(1);
}
console.log('\nNo difference: the demo still mirrors what production uses.\n');
