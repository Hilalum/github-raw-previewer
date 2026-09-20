#!/usr/bin/env node
/**
 * self-test.mjs — proves check-consistency.mjs actually catches the bug classes
 * it claims to catch.
 *
 * A linter that never fails is worthless, and one that always fails is ignored.
 * This script therefore exercises BOTH directions on a throwaway copy of the
 * repo (never the live tree):
 *
 *   1. baseline  — the copy as-is must PASS (no false positives)
 *   2. mutations — for every check group A..I, inject a representative bug into
 *                  the copy and assert the group fails, with a diagnostic that
 *                  names the problem
 *
 * Run: node tools/self-test.mjs
 * Exit: 0 when every expectation holds, 1 otherwise.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REAL_ROOT = path.resolve(HERE, '..');
const CHECKER = path.join(REAL_ROOT, 'tools', 'check-consistency.mjs');

let failures = 0;
let checks = 0;

const ok = (msg) => {
  checks++;
  console.log(`  PASS  ${msg}`);
};
const bad = (msg) => {
  checks++;
  failures++;
  console.log(`  FAIL  ${msg}`);
};

// ---------------------------------------------------------------------------
// fixture handling
// ---------------------------------------------------------------------------

function copyTree(from, to, skip = new Set(['.git', 'node_modules'])) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyTree(src, dst, skip);
    else if (entry.isFile()) fs.copyFileSync(src, dst);
  }
}

function makeFixture(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `grp-selfcheck-${label}-`));
  copyTree(REAL_ROOT, dir);
  return dir;
}

/** Run the checker against a fixture root; returns {code, out}. */
function runChecker(root) {
  const res = spawnSync(process.execPath, [CHECKER, root], { encoding: 'utf8' });
  return { code: res.status, out: `${res.stdout || ''}${res.stderr || ''}` };
}

/** Parse "A. FAIL (2)   title" lines out of a report. */
function groupStatuses(out) {
  const statuses = {};
  // [A-Z], not a hardcoded range: a new check group must not be silently
  // invisible to this harness (it was, when group I was added).
  for (const m of out.matchAll(/^([A-Z])\.\s+(PASS|FAIL \((\d+)\))\s/mg)) {
    statuses[m[1]] = { pass: m[2] === 'PASS', count: m[3] ? Number(m[3]) : 0 };
  }
  return statuses;
}

const expectFail = (label, out, letter, needles) => {
  const statuses = groupStatuses(out);
  const st = statuses[letter];
  if (!st) bad(`${label}: checker printed no status line for group ${letter}`);
  else if (st.pass) bad(`${label}: group ${letter} PASSED but the injected bug should have failed it`);
  else ok(`${label}: group ${letter} fails as expected (${st.count} finding(s))`);

  for (const needle of needles) {
    if (out.includes(needle)) ok(`${label}: diagnostic mentions ${JSON.stringify(needle)}`);
    else bad(`${label}: diagnostic never mentions ${JSON.stringify(needle)}`);
  }
};

/**
 * Assert every group OTHER than `letter` passed — except ones the mutation
 * legitimately cascades into (`expected`). This is the false-positive guard.
 */
const expectOthersPass = (label, out, letter, expected = []) => {
  const statuses = groupStatuses(out);
  const allowed = new Set([letter, ...expected]);
  const collateral = Object.entries(statuses)
    .filter(([k, v]) => !allowed.has(k) && !v.pass)
    .map(([k]) => k);
  if (collateral.length) bad(`${label}: unrelated group(s) also failed: ${collateral.join(', ')}`);
  else ok(`${label}: no unrelated group fired${expected.length ? ` (expected cascade: ${expected.join(', ')})` : ''}`);
};

const readText = (p) => fs.readFileSync(p, 'utf8');
const writeText = (p, t) => fs.writeFileSync(p, t);
const mustReplace = (label, file, oldStr, newStr) => {
  const text = readText(file);
  if (!text.includes(oldStr)) {
    bad(`${label}: fixture is stale — ${path.basename(file)} no longer contains ${JSON.stringify(oldStr)}`);
    return false;
  }
  writeText(file, text.replace(oldStr, newStr));
  return true;
};

// ---------------------------------------------------------------------------
// mutation definitions — one per check group
// ---------------------------------------------------------------------------

const MUTATIONS = [
  {
    letter: 'A',
    label: 'A json-parse',
    needles: ['invalid JSON'],
    apply: (fx) => writeText(path.join(fx, 'extension', 'zz-broken.json'), '{ "a": 1, }'),
  },
  {
    letter: 'B',
    label: 'B dnr-legacy-key (the real excludedRegexFilter bug)',
    needles: ['excludedRegexFilter', 'unknown rule id=2 condition key', 'silently ignores'],
    apply: (fx) => {
      const p = path.join(fx, 'extension', 'rules.json');
      const rules = JSON.parse(readText(p));
      rules[1].condition.excludedRegexFilter = '^foo$';
      writeText(p, JSON.stringify(rules, null, 2));
    },
  },
  {
    letter: 'B',
    label: 'B dnr-duplicate-id',
    needles: ['duplicate rule id'],
    apply: (fx) => {
      const p = path.join(fx, 'extension', 'rules.json');
      const rules = JSON.parse(readText(p));
      rules[1].id = rules[0].id;
      writeText(p, JSON.stringify(rules, null, 2));
    },
  },
  {
    letter: 'B',
    label: 'B dnr-bad-action-type',
    needles: ['is not a declarativeNetRequest action type'],
    apply: (fx) => {
      const p = path.join(fx, 'extension', 'rules.json');
      const rules = JSON.parse(readText(p));
      rules[0].action.type = 'modifyResponse';
      writeText(p, JSON.stringify(rules, null, 2));
    },
  },
  {
    letter: 'B',
    label: 'B dnr-uncompilable-regex',
    needles: ['not a compilable RegExp'],
    apply: (fx) => {
      const p = path.join(fx, 'extension', 'rules.json');
      const rules = JSON.parse(readText(p));
      rules[0].condition.regexFilter = '^https://(raw|media)\\.githubusercontent\\.com/[unclosed';
      writeText(p, JSON.stringify(rules, null, 2));
    },
  },
  {
    letter: 'B',
    label: 'B dnr-not-host-anchored',
    needles: ['host-anchored'],
    apply: (fx) => {
      const p = path.join(fx, 'extension', 'rules.json');
      const rules = JSON.parse(readText(p));
      rules[0].condition.regexFilter = '^https?://[^/]+/[^?#]*[?&]download=true';
      writeText(p, JSON.stringify(rules, null, 2));
    },
  },
  {
    letter: 'C',
    label: 'C missing contentType rule',
    needles: ['sets a Content-Type via responseHeaders'],
    apply: (fx) => {
      const p = path.join(fx, 'extension', 'rules.json');
      const rules = JSON.parse(readText(p)).filter((r) => !String(r.condition.regexFilter).includes('mp4'));
      writeText(p, JSON.stringify(rules, null, 2));
    },
  },
  {
    letter: 'C',
    label: 'C dead rule for unknown format',
    needsFormatsEdit: true,
    needles: ['is no longer declared in formats.js'],
    apply: (fx) => {
      // Rewrite the mp4 rule to a format formats.js does not know.
      const p = path.join(fx, 'extension', 'rules.json');
      const rules = JSON.parse(readText(p));
      rules[2].condition.regexFilter = '^https://(raw|media)\\.githubusercontent\\.com/[^?#]*\\.mkv$';
      writeText(p, JSON.stringify(rules, null, 2));
      // mp4 still declares contentType, so replace it with a format that does not
      // (webm) to keep the rest of the fixture coherent apart from the dead rule.
      mustReplace(
        'C dead rule for unknown format',
        path.join(fx, 'extension', 'formats.js'),
        "mp4: { demo: 'test.mp4', contentType: 'video/mp4' },",
        "mp4: { demo: 'test.mp4' },",
      );
    },
  },
  {
    letter: 'D',
    label: 'D manifest rule_resources path missing',
    // Deleting rules.json legitimately fails B too (the ruleset is the input to
    // B's lint), so B is an expected companion failure here — not collateral.
    others: ['B'],
    needles: ['rules.json'],
    apply: (fx) => fs.rmSync(path.join(fx, 'extension', 'rules.json')),
  },
  {
    letter: 'D',
    label: 'D script order reversed',
    needles: ['before formats.js'],
    apply: (fx) => {
      const p = path.join(fx, 'extension', 'manifest.json');
      const m = JSON.parse(readText(p));
      m.content_scripts[0].js = ['content.js', 'formats.js'];
      writeText(p, JSON.stringify(m, null, 2));
    },
  },
  {
    letter: 'D',
    label: 'D manifest path missing on disk',
    needles: ['no such file exists'],
    apply: (fx) => fs.rmSync(path.join(fx, 'extension', 'viewer-font.js')),
  },
  {
    letter: 'D',
    label: 'D bad manifest version',
    needles: ['does not match'],
    apply: (fx) => {
      const p = path.join(fx, 'extension', 'manifest.json');
      const m = JSON.parse(readText(p));
      m.version = '2026.3.6.1.2';
      writeText(p, JSON.stringify(m, null, 2));
    },
  },
  {
    letter: 'E',
    label: 'E demo asset missing',
    // The READMEs link the same sample, so F legitimately fails as well.
    others: ['F'],
    needles: ['test_files/'],
    apply: (fx) => fs.rmSync(path.join(fx, 'test_files', 'test.woff2')),
  },
  {
    letter: 'F',
    label: 'F broken readme link',
    needles: ['test.ttiff', 'broken link'],
    apply: (fx) => {
      const p = path.join(fx, 'README.md');
      writeText(p, `${readText(p)}\n\n[missing sample](./test_files/test.ttiff)\n`);
    },
  },
  {
    letter: 'G',
    label: 'G format missing from docs',
    needles: ['format ".bmp"', 'never documented'],
    apply: (fx) => {
      // Delete every line that documents the .bmp format from both READMEs,
      // leaving formats.js unchanged — the docs silently dropped a format.
      for (const name of ['README.md', 'README_zh.md']) {
        const p = path.join(fx, name);
        const kept = readText(p)
          .split(/\r?\n/)
          .filter((line) => !line.includes('`.bmp`'));
        writeText(p, kept.join('\n'));
      }
    },
  },
  {
    letter: 'H',
    label: 'H eval sink',
    needles: ['eval('],
    apply: (fx) => {
      const p = path.join(fx, 'extension', 'popup.js');
      writeText(p, `${readText(p)}\n// injected\nconst x = eval('1+1');\n`);
    },
  },
  {
    letter: 'H',
    label: 'H new Function sink',
    needles: ['new Function('],
    apply: (fx) => {
      const p = path.join(fx, 'extension', 'popup.js');
      writeText(p, `${readText(p)}\nconst f = new Function('return 1');\n`);
    },
  },
  {
    letter: 'H',
    label: 'H srcdoc sink',
    needles: ['srcdoc'],
    apply: (fx) => {
      const p = path.join(fx, 'extension', 'popup.js');
      writeText(p, `${readText(p)}\niframe.srcdoc = '<b>hi</b>';\n`);
    },
  },
  {
    letter: 'H',
    label: 'H remote script tag',
    // The diagnostic names the sink and its file:line, not the injected URL.
    needles: ['remote <script src>', 'viewer-font.html:'],
    apply: (fx) => {
      const p = path.join(fx, 'extension', 'viewer-font.html');
      const text = readText(p);
      if (!mustReplace('H remote script tag', p, '</body>', '  <script src="https://cdn.example.com/x.js"></script>\n</body>')) {
        return;
      }
    },
  },
  {
    letter: 'I',
    label: 'I dom-contract hardcoded selector',
    needles: ['hardcodes the GitHub fragment', 'selectors.js'],
    apply: (fx) => {
      const p = path.join(fx, 'extension', 'content.js');
      writeText(p, `const LEGACY_SELECTOR = '[class*="tooLargeError"]';\n${readText(p)}`);
    },
  },
  {
    letter: 'I',
    label: 'I dom-contract css drift',
    needles: ['not declared in selectors.js HIDE'],
    apply: (fx) => {
      const p = path.join(fx, 'extension', 'injection.css');
      writeText(p, `${readText(p)}\nhtml[data-grp-active] [class*="someUnknownThing"] { display: none !important; }\n`);
    },
  },
];

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------

function main() {
  console.log(`self-test for ${CHECKER}`);
  console.log(`source repo: ${REAL_ROOT}`);
  console.log('');

  // --- baseline -----------------------------------------------------------
  console.log('[baseline] clean copy must pass');
  const baseline = makeFixture('baseline');
  try {
    const { code, out } = runChecker(baseline);
    const statuses = groupStatuses(out);
    const printed = Object.keys(statuses).length;
    if (printed !== 9) bad(`baseline: expected 9 group status lines, got ${printed}`);
    const notPassing = Object.entries(statuses)
      .filter(([, v]) => !v.pass)
      .map(([k]) => k);
    if (notPassing.length) {
      bad(`baseline: groups ${notPassing.join(', ')} failed on a clean copy (false positives)`);
      console.log(out);
    } else if (code === 0) {
      ok('baseline: clean copy passes all 9 groups');
    } else {
      bad(`baseline: exit code ${code} with no failing group?`);
      console.log(out);
    }
  } finally {
    fs.rmSync(baseline, { recursive: true, force: true });
  }

  // --- mutations ----------------------------------------------------------
  for (const mutation of MUTATIONS) {
    console.log('');
    console.log(`[${mutation.label}]`);
    const fx = makeFixture(mutation.letter.toLowerCase());
    try {
      mutation.apply(fx);
      const { code, out } = runChecker(fx);
      if (code === 0) {
        bad(`${mutation.label}: checker exited 0 but should have failed`);
        console.log(out);
        continue;
      }
      expectFail(mutation.label, out, mutation.letter, mutation.needles);
      expectOthersPass(mutation.label, out, mutation.letter, mutation.others || []);
    } finally {
      fs.rmSync(fx, { recursive: true, force: true });
    }
  }

  console.log('');
  console.log('='.repeat(72));
  if (failures) {
    console.log(`SELF-TEST FAILED — ${failures}/${checks} expectation(s) unmet`);
    process.exitCode = 1;
  } else {
    console.log(`SELF-TEST PASSED — ${checks}/${checks} expectations met`);
  }
}

main();
