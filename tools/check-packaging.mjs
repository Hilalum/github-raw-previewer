#!/usr/bin/env node
/**
 * check-packaging.mjs — verifies the release workflow's packaging step.
 *
 * What it proves, without needing `zip` installed:
 *
 *   1. The dev-junk exclusion patterns in .github/workflows/release.yml actually
 *      match the paths they are supposed to exclude.
 *
 *      This is NOT hypothetical. "extension/_metadata/" lands at the archive ROOT
 *      as "_metadata/...", so a "x/_metadata/*" pattern silently fails to exclude
 *      it. The check below catches precisely that class of mistake.
 *
 *   2. The fail-closed "unzip -Z1" verification in the same step accepts a clean
 *      archive and rejects one containing junk or a nested manifest.json.
 *
 *   3. The patterns are also applied to the real members of extension/, and an
 *      informational note reports whether local zip/unzip exist.
 *
 * Dependency-free, no network. Run: node tools/check-packaging.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'release.yml');

let failures = 0;
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m) => {
  failures++;
  console.log(`  FAIL  ${m}`);
};

// ---------------------------------------------------------------------------
// 1. Read the packaging step and pull out its -x patterns + verification command
// ---------------------------------------------------------------------------

if (!fs.existsSync(WORKFLOW)) {
  bad(`missing ${path.relative(ROOT, WORKFLOW)}`);
  console.log('\nPACKAGING CHECK FAILED');
  process.exit(1);
}
const workflow = fs.readFileSync(WORKFLOW, 'utf8');

// The excludes array in the package step, e.g.   -x '*/_metadata/*'
const excludeBlock = /excludes=\(([\s\S]*?)\n\s*\)/.exec(workflow);
if (!excludeBlock) {
  bad('could not find the excludes=( ... ) block in the package step');
} else {
  ok('found the packaging step\'s excludes array');
}
const patterns = excludeBlock
  ? [...excludeBlock[1].matchAll(/-x\s+'([^']+)'/g)].map((m) => m[1])
  : [];

console.log(`  patterns: ${patterns.map((p) => `'${p}'`).join(' ')}`);
if (patterns.length === 0) bad('the excludes array declares no -x patterns');

// The archive-name pattern and the fail-closed checks must still be present.
const requiredSnippets = [
  ['archive name pattern', /github-raw-previewer-\$\{TAG\}\.zip/],
  ['fail-closed junk check', /unzip -Z1 "\$zip_name" \| grep -E/],
  ['fail-closed manifest check', /grep -qx 'manifest\.json'/],
  ['sha256 output', /echo "sha256=\$sha256" >> "\$GITHUB_OUTPUT"/],
];
for (const [label, re] of requiredSnippets) {
  if (re.test(workflow)) ok(`workflow still contains the ${label}`);
  else bad(`workflow is missing the ${label}`);
}

// ---------------------------------------------------------------------------
// 2. Do the patterns actually exclude the junk, and keep the extension intact?
//    Glob semantics: zip matches `*` across `/`, i.e. fnmatch without FNM_PATHNAME.
// ---------------------------------------------------------------------------

function globToRegExp(pat) {
  let out = '';
  for (const ch of pat) {
    if (ch === '*') out += '.*';
    else if (ch === '?') out += '.';
    else out += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${out}$`);
}
const matchers = patterns.map(globToRegExp);
const excluded = (member) => matchers.some((re) => re.test(member));

const MUST_EXCLUDE = [
  '.DS_Store',
  'icons/.DS_Store',
  'a/b/.DS_Store',
  '_metadata',
  '_metadata/verified_contents.json',
  '_metadata/computed_hashes.json',
  '.gitignore',
  'nested/.hidden',
  'sub/dir/.keep',
];
const MUST_INCLUDE = [
  'manifest.json',
  'rules.json',
  'formats.js',
  'content.js',
  'popup.html',
  'popup.js',
  'popup.css',
  'viewer-font.html',
  'viewer-font.css',
  'viewer-font.js',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
];

console.log('');
console.log('  exclusion patterns vs dev junk (all must be excluded):');
for (const member of MUST_EXCLUDE) {
  if (excluded(member)) ok(`excluded ${member}`);
  else bad(`LEAKS: ${member} is NOT excluded by any -x pattern`);
}

console.log('');
console.log('  exclusion patterns vs shipped files (none may be excluded):');
for (const member of MUST_INCLUDE) {
  if (!excluded(member)) ok(`keeps ${member}`);
  else bad(`WRONGLY EXCLUDED: ${member}`);
}

// ---------------------------------------------------------------------------
// 3. Simulate the fail-closed verification (unzip -Z1 | grep -E ...) in JS.
// ---------------------------------------------------------------------------

// Mirrors `grep -E '(^|/)(_metadata|\.DS_Store)(/|$)|(^|/)\.'`
const junkRe = /(^|\/)(_metadata|\.DS_Store)(\/|$)|(^|\/)\./;

const verifyArchive = (members) => {
  const junk = members.filter((m) => junkRe.test(m));
  if (junk.length) return { ok: false, why: `dev junk leaked: ${junk.join(', ')}` };
  if (!members.includes('manifest.json')) return { ok: false, why: 'manifest.json is not at the archive root' };
  return { ok: true };
};

console.log('');
console.log('  fail-closed verification behaviour:');
const clean = MUST_INCLUDE.slice();
const v1 = verifyArchive(clean);
if (v1.ok) ok('accepts the real extension contents');
else bad(`rejected a clean archive: ${v1.why}`);

const v2 = verifyArchive([...clean, '_metadata/verified_contents.json']);
if (!v2.ok) ok(`rejects leaked _metadata (${v2.why})`);
else bad('a leaked _metadata/ entry would be published');

const v3 = verifyArchive([...clean, 'icons/.DS_Store']);
if (!v3.ok) ok(`rejects a nested .DS_Store (${v3.why})`);
else bad('a nested .DS_Store would be published');

const v4 = verifyArchive(['sub/manifest.json', 'rules.json']);
if (!v4.ok) ok(`rejects a nested manifest.json (${v4.why})`);
else bad('a nested manifest.json (broken install steps) would be published');

// ---------------------------------------------------------------------------
// 4. Workflow wiring: every steps.<id>.outputs.<key> reference must resolve.
//    GitHub silently renders an unknown step id as an empty string, so a missing
//    `id:` produces a release with an empty artifact name instead of an error.
//    (This check found exactly that bug in an earlier revision of this file.)
// ---------------------------------------------------------------------------

console.log('');
console.log('  step id / output wiring:');

const stepBlocks = [];
{
  // Split the steps list on the `      - ` step marker (6 spaces + dash).
  const lines = workflow.split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const stepStart = /^( {6})- /.exec(line);
    if (stepStart) {
      if (current) stepBlocks.push(current);
      current = [line];
    } else if (current) {
      current.push(line);
    }
  }
  if (current) stepBlocks.push(current);
}

const idToYaml = new Map();
for (const block of stepBlocks) {
  const text = block.join('\n');
  const idMatch = /^\s+id:\s*(\S+)\s*$/m.exec(text);
  if (!idMatch) continue;
  const outputs = new Set();
  for (const m of text.matchAll(/echo\s+"([A-Za-z_][A-Za-z0-9_]*)=/g)) outputs.add(m[1]);
  idToYaml.set(idMatch[1], { outputs, text });
}

if (idToYaml.size === 0) bad('no step in the release workflow declares an id');
else ok(`steps with ids: ${[...idToYaml.keys()].join(', ')}`);

const refs = new Set();
for (const m of workflow.matchAll(/steps\.([A-Za-z_][A-Za-z0-9_-]*)\.outputs\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
  refs.add(`${m[1]}\u0000${m[2]}`);
}
if (refs.size === 0) ok('no step-output references to resolve');

for (const ref of refs) {
  const [id, key] = ref.split('\u0000');
  const entry = idToYaml.get(id);
  if (!entry) {
    bad(`references steps.${id}.outputs.${key} but no step declares "id: ${id}" — GitHub would expand it to an empty string`);
  } else if (!entry.outputs.has(key)) {
    bad(`references steps.${id}.outputs.${key} but that step never writes "${key}" to $GITHUB_OUTPUT`);
  } else {
    ok(`steps.${id}.outputs.${key} resolves`);
  }
}

// ---------------------------------------------------------------------------
// 5. Optional: validate against a REAL archive built from extension/.
//    Skipped cleanly when no unzip/python is available.
// ---------------------------------------------------------------------------

console.log('');
console.log('  real extension/ cross-check:');
const extDir = path.join(ROOT, 'extension');
const realMembers = [];
for (const entry of fs.readdirSync(extDir, { withFileTypes: true, recursive: true })) {
  if (!entry.isFile()) continue;
  const abs = path.join(entry.parentPath || entry.path, entry.name);
  realMembers.push(path.relative(extDir, abs).split(path.sep).join('/'));
}
realMembers.sort();
if (realMembers.length === 0) {
  bad('extension/ contains no files to package');
} else {
  ok(`walked extension/ directly: ${realMembers.length} member(s)`);
  const blocked = realMembers.filter((m) => excluded(m));
  if (blocked.length) bad(`real extension files excluded by the patterns: ${blocked.join(', ')}`);
  else ok('no real extension file is excluded by the -x patterns');
  if (realMembers.includes('manifest.json')) ok('manifest.json present at the archive root');
  else bad('extension/manifest.json is missing');
  const nestedManifests = realMembers.filter((m) => m.endsWith('manifest.json') && m.includes('/'));
  if (nestedManifests.length) bad(`nested manifest.json would break install steps: ${nestedManifests.join(', ')}`);
  else ok('no nested manifest.json');
}

// `zip`/`unzip` presence is informational only; CI runs on ubuntu-latest where
// both are preinstalled. Say so instead of failing on a dev box without them.
const hasUnzip = spawnSync('unzip', ['-v'], { stdio: 'ignore' }).status === 0;
const hasZip = spawnSync('zip', ['-v'], { stdio: 'ignore' }).status === 0;
console.log(`  note: local zip=${hasZip ? 'present' : 'absent'} unzip=${hasUnzip ? 'present' : 'absent'}` +
  (hasZip && hasUnzip ? ' (real round-trip possible)' : ' (glob simulation used above; ubuntu-latest provides both)'));

// ---------------------------------------------------------------------------
console.log('');
if (failures) {
  console.log(`PACKAGING CHECK FAILED — ${failures} problem(s)`);
  process.exitCode = 1;
} else {
  console.log('PACKAGING CHECK PASSED — the release workflow excludes dev junk and publishes manifest.json at the archive root.');
}
