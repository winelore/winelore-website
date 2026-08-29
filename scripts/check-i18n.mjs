#!/usr/bin/env node
// Verifies the three locale files stay in sync and that every `t()`/`tCount()`
// call site in the app references a key that actually exists in en.ts.
//
// Usage: node scripts/check-i18n.mjs   (or: npm run check-i18n)
// Exits non-zero (and fails CI) if any locale is missing/extra keys relative
// to en.ts, or if any used key isn't defined.

import fs from 'fs';
import { execSync } from 'child_process';

const LOCALES = ['en', 'uk', 'hu'];

function keysOf(file) {
    const src = fs.readFileSync(file, 'utf8');
    const keys = new Set();
    const stack = [];
    for (const line of src.split('\n')) {
        const t = line.trim();
        let m = t.match(/^["']?([A-Za-z0-9_]+)["']?\s*:\s*\{\s*$/);
        if (m) { stack.push(m[1]); continue; }
        if (/^\},?$/.test(t)) { stack.pop(); continue; }
        m = t.match(/^["']?([A-Za-z0-9_]+)["']?\s*:\s*["'`]/);
        if (m) { keys.add([...stack, m[1]].join('.')); continue; }
        m = t.match(/^["']?([A-Za-z0-9_]+)["']?\s*:\s*\[/);
        if (m) { keys.add([...stack, m[1]].join('.')); continue; }
    }
    return keys;
}

const sets = {};
for (const l of LOCALES) sets[l] = keysOf(`lib/i18n/locales/${l}.ts`);

let ok = true;
console.log('key counts:', Object.fromEntries(LOCALES.map(l => [l, sets[l].size])));

for (const l of LOCALES.slice(1)) {
    const missing = [...sets.en].filter(k => !sets[l].has(k));
    const extra = [...sets[l]].filter(k => !sets.en.has(k));
    if (missing.length) {
        ok = false;
        console.log(`\n--- ${l}.ts: missing ${missing.length} key(s) present in en.ts ---`);
        console.log(missing.sort().join('\n'));
    }
    if (extra.length) {
        ok = false;
        console.log(`\n--- ${l}.ts: has ${extra.length} extra key(s) not in en.ts ---`);
        console.log(extra.sort().join('\n'));
    }
}

const used = new Set();
const files = execSync(`grep -rl "" --include=*.tsx --include=*.ts app components lib hooks`)
    .toString().trim().split('\n').filter(Boolean);
for (const f of files) {
    if (f.includes('lib/i18n/locales')) continue;
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*["'`]([A-Za-z0-9_.]+)["'`]/g)) used.add(m[1]);
    for (const m of src.matchAll(/\btCount\(\s*["'`]([A-Za-z0-9_.]+)["'`]/g)) used.add(m[1]);
}
const undef = [...used].filter(k => !sets.en.has(k));
if (undef.length) {
    ok = false;
    console.log(`\n--- ${undef.length} key(s) used in code but not defined in en.ts ---`);
    console.log(undef.sort().join('\n'));
}

const unused = [...sets.en].filter(k => !used.has(k));
if (unused.length) {
    console.log(`\n--- ${unused.length} key(s) defined in en.ts but never referenced (informational, not a failure) ---`);
    console.log(unused.sort().join('\n'));
}

if (!ok) {
    console.log('\ni18n check FAILED.');
    process.exit(1);
}
console.log('\ni18n check passed: all locales in sync, no undefined keys used.');
