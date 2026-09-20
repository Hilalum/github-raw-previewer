#!/usr/bin/env node
/**
 * check-github-dom.mjs — the GitHub DOM canary.
 *
 * GitHub Raw Previewer depends entirely on undocumented GitHub markup. When
 * GitHub renames a class, previews stop appearing for every user, silently, and
 * the first symptom is a bad review. This script asserts that contract against
 * real GitHub pages, so the failure shows up here instead.
 *
 * It is deliberately cheap and dependency-free: the load-bearing containers are
 * present in GitHub's *server-rendered* HTML (measured), so plain `fetch` plus
 * substring checks are enough. No browser, no DOM library, no network beyond
 * GitHub itself.
 *
 * The contract lives in extension/selectors.js. This file never hardcodes a
 * selector — if it did, the test could rot in lockstep with the code and prove
 * nothing.
 *
 * Usage:
 *   node tools/check-github-dom.mjs
 *   GRP_CANARY_REPO=owner/repo node tools/check-github-dom.mjs
 *   GRP_CANARY_BASE=http://127.0.0.1:8080 node tools/check-github-dom.mjs   # fixtures
 *
 * Exit codes: 0 = the contract holds, 1 = GitHub's markup no longer matches,
 * 2 = the canary could not run (network), which is reported loudly rather than
 * being mistaken for a pass.
 */

import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const require = createRequire(import.meta.url);
const SEL = require(path.join(ROOT, 'extension', 'selectors.js'));

const REPO = process.env.GRP_CANARY_REPO || SEL.CANARY_DEFAULT_REPO;
const BASE = (process.env.GRP_CANARY_BASE || 'https://github.com').replace(/\/+$/, '');
const TIMEOUT_MS = 25000;
const ATTEMPTS = 3;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';

const failures = [];
const warnings = [];

async function fetchHtml(url) {
  let lastError = 'unknown';
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': UA, accept: 'text/html', 'accept-encoding': 'identity' },
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
      } else {
        const html = await res.text();
        // A tiny response means a rate-limit or interstitial page, not the page
        // we asked for; treating it as content would produce false failures.
        if (html.length > 2000) return { html };
        lastError = `implausibly small response (${html.length} bytes)`;
      }
    } catch (err) {
      lastError = err.name === 'TimeoutError' ? `timed out after ${TIMEOUT_MS}ms` : err.message;
    }
    if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, attempt * 1500));
  }
  return { error: lastError };
}

const targetFragments = SEL.TARGETS.map((t) => t.fragment);
const hideFragments = SEL.HIDE.map((h) => h.fragment);

async function checkPage(page) {
  const url = `${BASE}/${REPO}/${page.path}`;
  console.log(`\n--- ${page.name}`);
  console.log(`    ${url}`);

  const { html, error } = await fetchHtml(url);
  if (error) {
    console.log(`    ! could not fetch: ${error}`);
    failures.push(`could-not-fetch: ${page.name} (${error})`);
    return null;
  }

  const present = (frag) => html.includes(frag);
  const found = (list) => list.filter(present);

  const targetHits = found(targetFragments);
  const hideHits = found(hideFragments);
  const rawButtonFound = present(SEL.RAW_BUTTON.fragment);

  console.log(`    targets   : ${targetHits.length ? targetHits.join(', ') : '(none)'}`);
  console.log(`    hide      : ${hideHits.length ? hideHits.join(', ') : '(none)'}`);
  console.log(`    raw-button: ${rawButtonFound ? SEL.RAW_BUTTON.fragment : '(missing)'}`);

  if (page.expectTarget) {
    if (targetHits.length === 0) {
      failures.push(`${page.name}: no injection target matched (looked for ${targetFragments.join(' | ')})`);
    } else if (!present(SEL.TARGETS[0].fragment)) {
      warnings.push(
        `${page.name}: primary target "${SEL.TARGETS[0].fragment}" is gone but a fallback matched — ` +
          `promote the fallback in extension/selectors.js`,
      );
    }
  }
  if (page.expectRawButton && !rawButtonFound) {
    failures.push(`${page.name}: ${SEL.RAW_BUTTON.fragment} is gone (raw URL resolution would fall back to the address bar)`);
  }
  if (page.expectHide && hideHits.length === 0) {
    failures.push(`${page.name}: no hide selector matched, so GitHub's placeholder would stay visible`);
  }
  if (page.expectHide === false && hideHits.length > 0) {
    failures.push(
      `${page.name}: hide selectors matched a page we must NOT touch (${hideHits.join(', ')}), ` +
        `which would blank out content GitHub already previews`,
    );
  }

  return { targetHits, hideHits };
}

async function main() {
  console.log('='.repeat(72));
  console.log('github-raw-previewer DOM contract canary');
  console.log(`repo: ${REPO}`);
  console.log(`base: ${BASE}`);
  console.log(`pages: ${SEL.CANARY_PAGES.length}`);
  console.log('='.repeat(72));

  const results = [];
  for (const page of SEL.CANARY_PAGES) {
    results.push(await checkPage(page));
  }

  const couldNotRun = failures.filter((f) => f.startsWith('could-not-fetch:')).length;
  const realFailures = failures.filter((f) => !f.startsWith('could-not-fetch:'));

  console.log('\n' + '='.repeat(72));
  if (failures.length) {
    for (const f of failures) console.log(`  x ${f}`);
  }
  for (const w of warnings) console.log(`  i ${w}`);

  if (realFailures.length) {
    console.log("\nFAILED — GitHub's markup no longer matches extension/selectors.js.");
    console.log('  Fix: update extension/selectors.js, then re-run `npm run check:dom`.');
    console.log('  The content script never hardcodes selectors, so this file is the only edit needed.');
    process.exitCode = 1;
    return;
  }

  if (couldNotRun) {
    console.log('\nINCONCLUSIVE — the canary could not reach GitHub. This is NOT a pass.');
    process.exitCode = 2;
    return;
  }

  console.log(`\nPASS — all ${SEL.CANARY_PAGES.length} pages still match the DOM contract in extension/selectors.js.`);
}

main().catch((err) => {
  console.error(`check-github-dom: unexpected error: ${err && err.stack ? err.stack : err}`);
  process.exitCode = 2;
});
