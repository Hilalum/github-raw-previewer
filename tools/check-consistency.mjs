#!/usr/bin/env node
/**
 * check-consistency.mjs — zero-dependency static validator for github-raw-previewer.
 *
 * Why this exists: every source of truth in this repo is duplicated somewhere
 * else (formats.js <-> rules.json <-> manifest.json <-> README*.md <-> test_files/).
 * Duplication rots silently, so this script turns "did the change land everywhere?"
 * into a build failure instead of a bug report.
 *
 * It is deliberately dependency-free (no npm install, no network) so CI and a
 * plain `node tools/check-consistency.mjs` behave identically. Run it via
 * `npm run check` / `npm test`.
 *
 * Check groups (the letters are cited in main()'s summary):
 *   A  every JSON file under extension/ parses
 *   B  rules.json is valid declarativeNetRequest (official key allowlists, dup ids,
 *      compilable + host-anchored regexFilter)  <-- catches the real
 *      `excludedRegexFilter` bug, which DNR silently ignored
 *   C  formats.js <-> rules.json coherence (no missing overrides, no dead rules),
 *      and no use of the legacy `excludedRegexFilter` / `urlFilter` / `requestDomains`
 *   D  manifest.json: script load order, every referenced file exists, valid version
 *   E  every `demo` asset declared in formats.js exists in test_files/
 *   F  every repo-relative link/src in README.md + README_zh.md exists
 *   G  every format in formats.js is documented in both READMEs
 *   H  no remote code / injection sinks anywhere under extension/
 *   I  the GitHub DOM contract: every GitHub selector lives in selectors.js, and
 *      nothing else (including injection.css) may hardcode a fragment
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Optional positional argument: validate a different repo root. This exists
// solely so tools/self-test.mjs can run the whole suite against a throwaway
// copy of the repo with deliberate bugs injected, without mutating the real
// tree. Anything --flag-shaped is ignored (the harness passes it through).
const ROOT_ARG = process.argv.slice(2).find((a) => !a.startsWith('-'));
const ROOT = path.resolve(ROOT_ARG || path.join(HERE, '..'));
if (ROOT_ARG && !fs.existsSync(path.join(ROOT, 'extension'))) {
  console.error(`check-consistency: "${ROOT_ARG}" does not look like the repo root (no extension/ directory)`);
  process.exit(2);
}
const EXT = path.join(ROOT, 'extension');
const TEST_FILES = path.join(ROOT, 'test_files');

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const REL = (p) => {
  const rel = path.relative(ROOT, p);
  return (rel.startsWith('..') ? p : rel).split(path.sep).join('/');
};

/** An error attributed to a file, optionally pinned to a line. */
function loc(file, line, column) {
  return line ? `${REL(file)}:${line}${column ? `:${column}` : ''}` : REL(file);
}

const errors = [];
const notes = [];
const summarize = (msg) => String(msg).replace(/\s+/g, ' ').trim();

/** Hard failure. `where` should come from loc(); `msg` explains the fix. */
function err(where, msg) {
  errors.push(`  x ${where ? `[${where}] ` : ''}${summarize(msg)}`);
}

/** An observation that is not a failure (used for the DNR legacy-key report). */
function note(msg) {
  notes.push(`  i ${summarize(msg)}`);
}

function group(letter, title) {
  return { letter, title, failed: 0 };
}
function fail(g, where, msg) {
  g.failed++;
  err(where, msg);
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/** 1-based line numbers of a file, for attributing findings. */
function lineIndex(text) {
  const lines = text.split(/\r?\n/);
  const starts = [];
  let at = 0;
  for (const l of lines) {
    starts.push(at);
    at += l.length + 1;
  }
  return starts;
}
function lineOf(lineStarts, offset) {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      out.push(...walk(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Official declarativeNetRequest allowlists
// Source of truth: https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
// (RuleAction / RuleActionType / UrlFilter / RuleCondition / HeaderInfo)
//
// NOTE: `excludedRegexFilter` is NOT one of them. Chrome ignores unknown keys in
// a static ruleset instead of rejecting the ruleset, which is exactly how the
// real excludedRegexFilter bug shipped unnoticed — hence the strict allowlist
// below. Do not relax it; extend it from the docs instead.
// ---------------------------------------------------------------------------

const DNR_ACTION_TYPES = new Set([
  'allow',
  'block',
  'redirect',
  'modifyHeaders',
  'allowAllRequests',
  'upgradeScheme',
]);

const DNR_ACTION_KEYS = new Set(['type', 'redirect', 'requestHeaders', 'responseHeaders']);

const DNR_REDIRECT_KEYS = new Set([
  'extensionPath',
  'transform',
  'url',
  'regexSubstitution',
]);

const DNR_TRANSFORM_KEYS = new Set([
  'scheme',
  'host',
  'port',
  'path',
  'query',
  'fragment',
  'username',
  'password',
]);

const DNR_HEADER_KEYS = new Set(['header', 'operation', 'value', 'priority']);

const DNR_HEADER_OPERATIONS = new Set(['append', 'set', 'remove']);

const DNR_CONDITION_KEYS = new Set([
  'urlFilter',
  'regexFilter',
  'isUrlFilterCaseSensitive',
  'initiatorDomains',
  'excludedInitiatorDomains',
  'requestDomains',
  'excludedRequestDomains',
  'requestMethods',
  'excludedRequestMethods',
  'resourceTypes',
  'excludedResourceTypes',
  'responseHeaders',
  'excludedResponseHeaders',
  'domainType',
  'tabIds',
  'excludedTabIds',
]);

const DNR_RESOURCE_TYPES = new Set([
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report',
  'media',
  'websocket',
  'webtransport',
  'webbundle',
  'other',
]);

/** Keys of a rule object itself. */
const DNR_RULE_KEYS = new Set(['id', 'priority', 'action', 'condition']);

/** Static rulesets are capped at 30,000 rules; ids must be >= 1. */
const DNR_MAX_RULES = 30000;

/** The only hosts the ruleset may touch (see manifest host_permissions). */
const DNR_HOST_REGEX = /githubusercontent\.com/i;

function checkUnknownKeys(g, where, obj, allowed, label) {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      fail(
        g,
        where,
        `unknown ${label} key "${key}" — not part of the declarativeNetRequest API, ` +
          `so Chrome silently ignores it. Allowed: ${[...allowed].join(', ')}`,
      );
    }
  }
}

function checkResourceTypes(g, where, value, label) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    fail(g, where, `${label} must be an array`);
    return;
  }
  for (const t of value) {
    if (!DNR_RESOURCE_TYPES.has(t)) fail(g, where, `unknown resource type "${t}" in ${label}`);
  }
}

function checkHeaders(g, where, value, label) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    fail(g, where, `${label} must be an array of HeaderInfo`);
    return;
  }
  for (const h of value) {
    if (!h || typeof h !== 'object' || Array.isArray(h)) {
      fail(g, where, `${label} entries must be objects`);
      continue;
    }
    checkUnknownKeys(g, where, h, DNR_HEADER_KEYS, label);
    if (typeof h.header !== 'string' || !h.header) fail(g, where, `${label} entry misses a "header" name`);
    if (!DNR_HEADER_OPERATIONS.has(h.operation)) {
      fail(g, where, `${label} entry has invalid operation "${h.operation}" (append|set|remove)`);
    }
    if (h.operation === 'set' && typeof h.value !== 'string') {
      fail(g, where, `${label} entry with operation "set" needs a string "value"`);
    }
  }
}

/**
 * A regexFilter matching any of these is not host-anchored to githubusercontent.com.
 * Checked on a canonical probe URL so we do not care where the regex physically
 * puts its host part.
 */
const OFF_HOST_PROBES = [
  'https://evil.example.com/o/r/main/x.mp4',
  'http://raw.githubusercontent.com.evil.example.com/o/r/main/x.mp4',
];

function checkRulesJson(g, rulesFileText, jsonFiles) {
  const rulesPath = path.join(EXT, 'rules.json');
  if (!fs.existsSync(rulesPath)) {
    fail(g, 'extension/rules.json', 'missing (manifest.json declarative_net_request references it)');
    return null;
  }

  let rules;
  try {
    rules = JSON.parse(rulesFileText);
  } catch {
    // Already reported by group A; nothing further we can inspect.
    return null;
  }
  if (!Array.isArray(rules)) {
    fail(g, 'extension/rules.json', 'top level must be an array of rules');
    return null;
  }
  if (rules.length === 0) {
    fail(g, 'extension/rules.json', 'ruleset is empty');
  }
  if (rules.length > DNR_MAX_RULES) {
    fail(g, 'extension/rules.json', `ruleset has ${rules.length} rules (static limit ${DNR_MAX_RULES})`);
  }

  const starts = lineIndex(rulesFileText);
  const ruleLine = (rule) => {
    // Locate the rule by its unique top-of-object "id" literal.
    if (rule && typeof rule.id === 'number') {
      const m = new RegExp(`"id"\\s*:\\s*${rule.id}\\s*[,}\\n]`).exec(rulesFileText);
      if (m) return lineOf(starts, m.index);
    }
    return null;
  };

  const byId = new Map();
  const seen = new Set();

  for (const rule of rules) {
    const line = ruleLine(rule);
    const where = loc(rulesPath, line);
    const tag = rule && rule.id !== undefined ? `rule id=${rule.id}` : 'rule (no id)';

    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
      fail(g, where, 'each rule must be an object');
      continue;
    }

    // --- duplicate ids (and id sanity) ---
    if (rule.id === undefined) {
      fail(g, where, `${tag}: missing "id"`);
    } else if (!Number.isInteger(rule.id) || rule.id < 1) {
      fail(g, where, `${tag}: "id" must be a positive integer`);
    } else if (byId.has(rule.id)) {
      fail(g, where, `${tag}: duplicate rule id (already declared at line ${ruleLine(byId.get(rule.id))})`);
    } else {
      byId.set(rule.id, rule);
    }

    // --- top-level shape ---
    checkUnknownKeys(g, where, rule, DNR_RULE_KEYS, `${tag} rule`);
    if (rule.priority !== undefined && !Number.isInteger(rule.priority)) {
      fail(g, where, `${tag}: "priority" must be an integer`);
    }

    // --- action ---
    if (!rule.action || typeof rule.action !== 'object' || Array.isArray(rule.action)) {
      fail(g, where, `${tag}: missing "action" object`);
    } else {
      const action = rule.action;
      checkUnknownKeys(g, where, action, DNR_ACTION_KEYS, `${tag} action`);
      if (!DNR_ACTION_TYPES.has(action.type)) {
        fail(
          g,
          where,
          `${tag}: action.type "${action.type}" is not a declarativeNetRequest action type ` +
            `(${[...DNR_ACTION_TYPES].join(', ')})`,
        );
      }
      if (action.redirect !== undefined) {
        if (!action.redirect || typeof action.redirect !== 'object') {
          fail(g, where, `${tag}: action.redirect must be an object`);
        } else {
          checkUnknownKeys(g, where, action.redirect, DNR_REDIRECT_KEYS, `${tag} action.redirect`);
          if (action.redirect.transform !== undefined) {
            checkUnknownKeys(
              g,
              where,
              action.redirect.transform || {},
              DNR_TRANSFORM_KEYS,
              `${tag} action.redirect.transform`,
            );
          }
        }
      }
      checkHeaders(g, where, action.requestHeaders, `${tag} action.requestHeaders`);
      checkHeaders(g, where, action.responseHeaders, `${tag} action.responseHeaders`);
      // modifyHeaders is meaningless without at least one header directive.
      if (action.type === 'modifyHeaders' && !action.requestHeaders && !action.responseHeaders) {
        fail(g, where, `${tag}: action.type "modifyHeaders" needs requestHeaders or responseHeaders`);
      }
    }

    // --- condition ---
    if (!rule.condition || typeof rule.condition !== 'object' || Array.isArray(rule.condition)) {
      fail(g, where, `${tag}: missing "condition" object`);
      continue;
    }
    const condition = rule.condition;
    checkUnknownKeys(g, where, condition, DNR_CONDITION_KEYS, `${tag} condition`);

    // Legacy / always-ignored filter keys: the whole point of this lint.
    for (const legacy of ['excludedRegexFilter', 'urlFilter', 'requestDomains', 'excludedRequestDomains']) {
      if (legacy in rule || legacy in condition) {
        fail(
          g,
          where,
          `${tag}: "${legacy}" is set — this repo's ruleset is host-anchored regex-only. ` +
            (legacy === 'excludedRegexFilter'
              ? 'excludedRegexFilter is not a declarativeNetRequest key at all and was silently ignored.'
              : `"${legacy}" is a valid DNR key but is intentionally unused here.`),
        );
      }
    }

    if (condition.regexFilter !== undefined) {
      if (typeof condition.regexFilter !== 'string') {
        fail(g, where, `${tag}: condition.regexFilter must be a string`);
      } else {
        let re = null;
        try {
          re = new RegExp(condition.regexFilter);
        } catch (e) {
          fail(g, where, `${tag}: condition.regexFilter is not a compilable RegExp: ${e.message}`);
        }
        if (re) {
          // Host anchoring: canonical probe URLs on other hosts must NOT match.
          for (const probe of OFF_HOST_PROBES) {
            if (re.test(probe)) {
              fail(
                g,
                where,
                `${tag}: regexFilter is not host-anchored to githubusercontent.com ` +
                  `(matches "${probe}")`,
              );
              break;
            }
          }
          // Secondary, human-readable sanity check on the raw pattern. The
          // pattern is unescaped first, because a real filter writes
          // `\.` (backslash-dot), which a naive substring test would miss.
          const unescaped = condition.regexFilter.replace(/\\(.)/g, '$1');
          if (!DNR_HOST_REGEX.test(unescaped)) {
            fail(
              g,
              where,
              `${tag}: regexFilter never mentions githubusercontent.com — the ruleset must stay ` +
                `host-anchored to the two declared host_permissions`,
            );
          }
        }
      }
    }

    if (condition.isUrlFilterCaseSensitive !== undefined && typeof condition.isUrlFilterCaseSensitive !== 'boolean') {
      fail(g, where, `${tag}: isUrlFilterCaseSensitive must be a boolean`);
    }

    checkResourceTypes(g, where, condition.resourceTypes, 'condition.resourceTypes');
    checkResourceTypes(g, where, condition.excludedResourceTypes, 'condition.excludedResourceTypes');
    checkHeaders(g, where, condition.responseHeaders, `${tag} condition.responseHeaders`);
    checkHeaders(g, where, condition.excludedResponseHeaders, `${tag} condition.excludedResponseHeaders`);

    if (condition.resourceTypes) {
      // allowAllRequests may only target main_frame / sub_frame.
      if (rule.action && rule.action.type === 'allowAllRequests') {
        for (const t of condition.resourceTypes) {
          if (t !== 'main_frame' && t !== 'sub_frame') {
            fail(g, where, `${tag}: allowAllRequests may only use resourceTypes main_frame/sub_frame (got "${t}")`);
          }
        }
      }
    }
  }

  // Report the explicit negative claim required by the task: the ruleset is
  // regex-only and uses none of the legacy filter keys.
  const rawText = rulesFileText;
  const clean = ['excludedRegexFilter', 'urlFilter', 'requestDomains'].every(
    (k) => !rawText.includes(`"${k}"`),
  );
  if (clean) {
    note(
      'rules.json is host-anchored regex-only: no excludedRegexFilter, urlFilter or requestDomains anywhere in the file',
    );
  }

  return rules;
}

// ---------------------------------------------------------------------------
// formats.js loader
// ---------------------------------------------------------------------------

const require_ = createRequire(import.meta.url);

/**
 * Load extension/formats.js the same way tools and Node-based consumers do:
 * as CommonJS through createRequire. The file also assigns globalThis.GRP_FORMATS,
 * which is what the content script relies on, so both paths are asserted.
 */
function loadFormats(g) {
  const file = path.join(EXT, 'formats.js');
  if (!fs.existsSync(file)) {
    fail(g, 'extension/formats.js', 'missing — it is the single source of truth for formats');
    return null;
  }
  let viaGlobal;
  let viaModule;
  try {
    for (const key of Object.keys(require_.cache)) {
      if (key.endsWith('formats.js')) delete require_.cache[key];
    }
    delete globalThis.GRP_FORMATS;
    viaModule = require_(file);
    viaGlobal = globalThis.GRP_FORMATS;
  } catch (e) {
    fail(g, 'extension/formats.js', `could not be loaded/parsed: ${e.message}`);
    return null;
  }

  for (const [label, value] of [
    ['module.exports', viaModule],
    ['globalThis.GRP_FORMATS', viaGlobal],
  ]) {
    if (!value || typeof value !== 'object') {
      fail(g, 'extension/formats.js', `${label} was not set; content.js/popup.js and tools depend on it`);
    }
  }

  const api = viaModule || viaGlobal;
  if (!api) return null;

  const required = [
    'categories',
    'defaultConfig',
    'mergeConfig',
    'lookup',
    'isEnabled',
    'allExtensions',
    'contentTypeOverrides',
    'demoAssets',
  ];
  for (const fn of required) {
    if (!(fn in api)) fail(g, 'extension/formats.js', `required export "${fn}" is missing`);
  }
  if (!Array.isArray(api.categories)) {
    fail(g, 'extension/formats.js', '`categories` must be an array');
    return null;
  }
  return api;
}

/** Flatten formats.js into a stable model used by the coherence checks. */
function buildFormatModel(g, api) {
  const formats = []; // { ext, category, kind, contentType, demo, line }
  const source = fs.readFileSync(path.join(EXT, 'formats.js'), 'utf8');
  const starts = lineIndex(source);

  const seenCategory = new Set();
  for (const category of api.categories) {
    if (!category || typeof category !== 'object') {
      fail(g, 'extension/formats.js', 'every category must be an object');
      continue;
    }
    for (const key of ['key', 'kind', 'formats']) {
      if (!(key in category)) fail(g, 'extension/formats.js', `category "${category.key || '?'}" misses "${key}"`);
    }
    if (category.key) {
      if (seenCategory.has(category.key)) {
        fail(g, 'extension/formats.js', `duplicate category key "${category.key}"`);
      }
      seenCategory.add(category.key);
    }
    if (category.kind && api.KIND && !Object.values(api.KIND).includes(category.kind)) {
      fail(g, 'extension/formats.js', `category "${category.key}" has unknown kind "${category.kind}"`);
    }
    if (!category.formats || typeof category.formats !== 'object') continue;

    for (const [ext, spec] of Object.entries(category.formats)) {
      if (!/^[a-z0-9]+$/.test(ext)) {
        fail(g, 'extension/formats.js', `format key "${ext}" in category "${category.key}" must be lowercase alphanumeric`);
      }
      // Anchor the report to the line declaring the format entry.
      let line = null;
      const m = new RegExp(`(^|[{,\\s])${ext}\\s*:`).exec(source);
      if (m) line = lineOf(starts, m.index);
      formats.push({
        ext,
        category: category.key,
        kind: category.kind,
        contentType: spec && spec.contentType,
        demo: spec && spec.demo,
        line,
        where: loc(path.join(EXT, 'formats.js'), line),
      });
    }
  }

  const dupes = new Set();
  for (const f of formats) {
    if (dupes.has(f.ext)) fail(g, 'extension/formats.js', `extension ".${f.ext}" is declared twice`);
    dupes.add(f.ext);
  }
  return formats;
}

// ---------------------------------------------------------------------------
// groups
// ---------------------------------------------------------------------------

function checkJsonParses(g, jsonFiles) {
  for (const file of jsonFiles) {
    const text = fs.readFileSync(file, 'utf8');
    try {
      JSON.parse(text);
    } catch (e) {
      // V8 messages look like: "Unexpected token } in JSON at position 123"
      // (or "... at line 4 column 3" on newer runtimes) — normalize both to file:line.
      let where = REL(file);
      const at = /at (?:line )(\d+) column (\d+)/.exec(e.message);
      if (at) {
        where = `${REL(file)}:${at[1]}:${at[2]}`;
      } else {
        const pos = /at position (\d+)/.exec(e.message);
        if (pos) where = `${REL(file)}:${lineOf(lineIndex(text), Number(pos[1]))}`;
      }
      fail(g, where, `invalid JSON: ${e.message}`);
    }
  }
}

/** Does any rule in the ruleset specifically target this file extension? */
function ruleTargetsExtension(rule, ext) {
  const rf = rule && rule.condition && rule.condition.regexFilter;
  if (typeof rf !== 'string') return false;
  return new RegExp(`\\.${ext}(\\$|[^A-Za-z0-9])`, 'i').test(rf);
}

/** The file extension a rule pins with an end-anchored `\.ext$`, if any. */
function rulePinnedExtension(rule) {
  const rf = rule && rule.condition && rule.condition.regexFilter;
  if (typeof rf !== 'string') return null;
  const m = /\\\.([A-Za-z0-9]+)\$/.exec(rf);
  return m ? m[1].toLowerCase() : null;
}

/** Does this rule's action actually set a Content-Type response header? */
function ruleSetsContentType(rule) {
  const action = rule && rule.action;
  if (!action || action.type !== 'modifyHeaders' || !Array.isArray(action.responseHeaders)) return false;
  return action.responseHeaders.some(
    (h) => h && String(h.header).toLowerCase() === 'content-type' && h.operation === 'set' && typeof h.value === 'string',
  );
}

/** The Content-Type value this rule sets, if exactly one is set. */
function ruleContentTypeValue(rule) {
  if (!ruleSetsContentType(rule)) return null;
  const values = rule.action.responseHeaders
    .filter((h) => String(h.header).toLowerCase() === 'content-type' && h.operation === 'set')
    .map((h) => h.value);
  return values.length === 1 ? values[0] : null;
}

const MEDIA_PROBE = (ext) => `https://raw.githubusercontent.com/o/r/main/x.${ext}`;

function checkFormatRuleCoherence(g, rules, formats) {
  if (!rules) return;
  const withContentType = formats.filter((f) => f.contentType);
  const declared = new Set(formats.map((f) => f.ext));

  // (1) Every contentType override must be backed by a rule that both matches
  //     that extension's URL and actually sets the Content-Type header.
  for (const f of withContentType) {
    const probe = MEDIA_PROBE(f.ext);
    // A rule is a candidate only if it is pinned to this very extension, or is
    // extension-agnostic (no `\.ext$` pin) — otherwise an unrelated rule that
    // merely happens to match the URL (e.g. the `?download=true` allow rule)
    // would be mistaken for the override.
    const candidates = rules.filter((rule) => {
      const rf = rule && rule.condition && rule.condition.regexFilter;
      if (typeof rf !== 'string') return false;
      const pinned = rulePinnedExtension(rule);
      if (pinned !== null && pinned !== f.ext) return false;
      try {
        return new RegExp(rf).test(probe);
      } catch {
        return false;
      }
    });
    const headerRules = candidates.filter(ruleSetsContentType);

    if (headerRules.length === 0) {
      fail(
        g,
        f.where,
        `".${f.ext}" declares contentType "${f.contentType}" but no rules.json rule both matches ` +
          `${probe} and sets a Content-Type via responseHeaders — the override would never apply`,
      );
      continue;
    }
    const values = headerRules.map(ruleContentTypeValue).filter((v) => v);
    if (values.length && !values.includes(f.contentType)) {
      fail(
        g,
        f.where,
        `".${f.ext}" declares contentType "${f.contentType}" but its matching rule ` +
          `(id ${headerRules.map((r) => r.id).join(', ')}) sets ${values.map((v) => `"${v}"`).join(', ')} instead`,
      );
    }
  }

  // (2) No dead media rules: a rule pinning .<ext>$ must reference a live format.
  for (const rule of rules) {
    if (!rule || typeof rule !== 'object') continue;
    const ext = rulePinnedExtension(rule);
    if (!ext) continue;
    if (!declared.has(ext)) {
      fail(
        g,
        loc(path.join(EXT, 'rules.json'), null),
        `rule id=${rule.id} targets ".${ext}" but that extension is no longer declared in formats.js (dead rule)`,
      );
    } else if (!withContentType.some((f) => f.ext === ext)) {
      fail(
        g,
        loc(path.join(EXT, 'rules.json'), null),
        `rule id=${rule.id} is media-specific for ".${ext}" but formats.js declares no contentType for it ` +
          `(dead rule — GitHub already serves it correctly)`,
      );
    }
  }
}

const SEMVERISH = /^\d+(\.\d+){0,3}$/;

function checkManifest(g, formats) {
  const manifestPath = path.join(EXT, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    fail(g, 'extension/manifest.json', 'missing');
    return null;
  }
  let manifest;
  try {
    manifest = readJson(manifestPath);
  } catch {
    return null; // reported by group A
  }

  const where = (line = null) => loc(manifestPath, line);
  const source = fs.readFileSync(manifestPath, 'utf8');
  const starts = lineIndex(source);
  const findLine = (needle) => {
    const idx = source.indexOf(needle);
    return idx === -1 ? null : lineOf(starts, idx);
  };

  /** Try each plausible base directory for an extension-relative path. */
  const resolveRef = (ref) => {
    const candidates = [
      path.join(EXT, ref),
      path.join(ROOT, ref),
      path.join(ROOT, '.github', ref),
      path.join(ROOT, 'test_files', ref),
    ];
    return candidates.find((c) => fs.existsSync(c)) || null;
  };
  const requireRef = (ref, label, line) => {
    if (typeof ref !== 'string' || !ref) {
      fail(g, where(line), `${label} is not a usable path`);
      return;
    }
    if (!resolveRef(ref)) {
      fail(
        g,
        where(line),
        `${label} references "${ref}" but no such file exists ` +
          `(looked in extension/, repo root, .github/, test_files/)`,
      );
    }
  };

  // --- content_scripts: shared registries must load before content.js ---
  const scripts = Array.isArray(manifest.content_scripts) ? manifest.content_scripts : [];
  if (scripts.length === 0) fail(g, where(), 'content_scripts is empty');
  scripts.forEach((cs, i) => {
    const line = findLine('"content_scripts"');
    const js = Array.isArray(cs.js) ? cs.js : [];
    for (const ref of js) requireRef(ref, `content_scripts[${i}].js`, line);
    const ci = js.indexOf('content.js');
    if (ci === -1) {
      fail(g, where(line), `content_scripts[${i}].js does not load content.js`);
    }
    // formats.js and selectors.js each define a global that content.js reads at
    // load time, so both have to be listed first.
    for (const [name, global] of [['formats.js', 'GRP_FORMATS'], ['selectors.js', 'GRP_SELECTORS']]) {
      const di = js.indexOf(name);
      if (di === -1) {
        fail(g, where(line), `content_scripts[${i}].js does not load ${name} — content.js derives from it`);
      } else if (ci !== -1 && di > ci) {
        fail(
          g,
          where(line),
          `content_scripts[${i}].js loads content.js before ${name} ` +
            `(index ${ci} vs ${di}); ${name} must come first or ${global} is undefined`,
        );
      }
    }
  });

  // --- web_accessible_resources ---
  const war = Array.isArray(manifest.web_accessible_resources) ? manifest.web_accessible_resources : [];
  war.forEach((entry, i) => {
    const line = findLine('"web_accessible_resources"');
    if (!Array.isArray(entry.resources)) {
      fail(g, where(line), `web_accessible_resources[${i}].resources must be an array`);
      return;
    }
    for (const ref of entry.resources) {
      if (ref.includes('*')) continue; // glob entries cannot be existence-checked
      requireRef(ref, `web_accessible_resources[${i}].resources`, line);
    }
  });

  // --- declarative_net_request rule_resources ---
  const dnr = manifest.declarative_net_request;
  if (!dnr || !Array.isArray(dnr.rule_resources)) {
    fail(g, where(), 'declarative_net_request.rule_resources is missing');
  } else {
    if (dnr.rule_resources.length === 0) fail(g, where(), 'declarative_net_request.rule_resources is empty');
    for (const rr of dnr.rule_resources) {
      requireRef(rr.path, `declarative_net_request rule_resources "${rr.id}" path`, findLine('"rule_resources"'));
    }
  }

  // --- action.default_popup + icons ---
  const action = manifest.action || {};
  if (action.default_popup !== undefined) {
    requireRef(action.default_popup, 'action.default_popup', findLine('"default_popup"'));
  } else if (manifest.action) {
    fail(g, where(), 'action.default_popup is missing (popup.html exists and popup.js needs formats.js)');
  }
  const iconSets = [
    ['icons', manifest.icons],
    ['action.default_icon', action.default_icon],
  ];
  for (const [label, set] of iconSets) {
    if (!set) continue;
    for (const [size, ref] of Object.entries(set)) {
      requireRef(ref, `${label}["${size}"]`, null);
    }
  }

  // --- background service worker (may be absent legitimately) ---
  const sw = (manifest.background && manifest.background.service_worker) || manifest.background?.page;
  if (sw) requireRef(sw, 'background.service_worker', findLine('"background"'));
  if (manifest.background && manifest.background.scripts) {
    for (const ref of manifest.background.scripts) requireRef(ref, 'background.scripts', findLine('"background"'));
  }

  // --- version ---
  const version = manifest.version;
  if (typeof version !== 'string') {
    fail(g, where(findLine('"version"')), 'manifest version must be a string');
  } else if (!SEMVERISH.test(version)) {
    fail(
      g,
      where(findLine('"version"')),
      `version "${version}" does not match ^\\d+(\\.\\d+){0,3}$ (Chrome uses 1-4 dot-separated integers)`,
    );
  } else {
    for (const part of version.split('.')) {
      if (Number(part) > 65535) {
        fail(g, where(findLine('"version"')), `version "${version}" has a part > 65535 ("${part}")`);
      }
    }
  }

  return manifest;
}

function checkDemoAssets(g, formats) {
  for (const f of formats) {
    if (!f.demo) continue;
    const target = path.join(TEST_FILES, f.demo);
    if (!fs.existsSync(target)) {
      const near = fs.existsSync(TEST_FILES)
        ? fs.readdirSync(TEST_FILES).filter((n) => n.includes(f.ext))
        : [];
      fail(
        g,
        f.where,
        `".${f.ext}" declares demo "${f.demo}" but test_files/${f.demo} does not exist` +
          (near.length ? ` (test_files/ has: ${near.join(', ')})` : ''),
      );
    }
  }
}

// ---------------------------------------------------------------------------
// markdown
// ---------------------------------------------------------------------------

/** Strip fenced blocks + inline code so `[x](y)` examples in docs are ignored. */
function markdownProse(text) {
  return text
    .replace(/^```[\s\S]*?^```/gm, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/~~~[\s\S]*?~~~/g, (m) => m.replace(/[^\n]/g, ' '));
}

function scanMarkdownRefs(file) {
  const text = fs.readFileSync(file, 'utf8');
  const prose = markdownProse(text);
  const starts = lineIndex(text);
  const refs = [];
  const push = (raw, kind) => {
    const target = raw.trim().replace(/^<|>$/g, '');
    if (!target) return;
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return; // http:, mailto:, data:, ...
    if (target.startsWith('#')) return; // in-page anchor
    refs.push({ target, kind });
  };

  // [text](href "title") and ![alt](src "title")
  const linkRe = /!?\[[^\]]*\]\(\s*(<[^>]*>|[^()\s]+)(?:\s+"[^"]*")?\s*\)/g;
  let m;
  while ((m = linkRe.exec(prose))) push(m[1], 'link');

  // HTML href/src attributes
  const attrRe = /\b(?:src|href)\s*=\s*("([^"]*)"|'([^']*)')/gi;
  while ((m = attrRe.exec(prose))) push(m[2] !== undefined ? m[2] : m[3], 'src');

  // Reference-style definitions: [label]: ./path
  const refRe = /^\s{0,3}\[[^\]]+\]:\s*(\S+)/gm;
  while ((m = refRe.exec(prose))) push(m[1], 'link definition');

  return refs.map((r) => ({ ...r, line: lineOf(starts, prose.indexOf(r.target)) }));
}

function checkReadmeLinks(g, readmes) {
  for (const file of readmes) {
    if (!fs.existsSync(file)) {
      fail(g, REL(file), 'missing');
      continue;
    }
    let refs;
    try {
      refs = scanMarkdownRefs(file);
    } catch (e) {
      fail(g, REL(file), `could not be scanned: ${e.message}`);
      continue;
    }
    for (const ref of refs) {
      const cleanPath = decodeURIComponent(ref.target.split('#')[0].split('?')[0]);
      if (!cleanPath) continue;
      const candidates = [
        path.resolve(ROOT, cleanPath),
        path.join(EXT, cleanPath),
        path.resolve(TEST_FILES, cleanPath),
      ];
      if (!candidates.some((c) => fs.existsSync(c))) {
        fail(
          g,
          loc(file, ref.line),
          `broken ${ref.kind} "${ref.target}" — no such file relative to the repo root, ` +
            `extension/ or test_files/`,
        );
      }
    }
  }
}

function checkFormatsDocumented(g, formats, readmes) {
  const texts = [];
  for (const file of readmes) {
    if (!fs.existsSync(file)) {
      fail(g, REL(file), 'missing — documented formats cannot be verified');
      continue;
    }
    texts.push({ file, text: fs.readFileSync(file, 'utf8') });
  }
  for (const f of formats) {
    for (const { file, text } of texts) {
      // Require the extension to appear as a marked-up token (`.ext`, `ext` or `.ext`),
      // so a stray substring inside a word cannot satisfy the check.
      const token = new RegExp('`\\.' + f.ext + '`|`' + f.ext + '`|\\.' + f.ext + '(?![A-Za-z0-9])', 'i');
      if (!token.test(text)) {
        fail(
          g,
          `${REL(file)} (format documentation)`,
          `format ".${f.ext}" (category ${f.category}) is declared in formats.js but never documented ` +
            `in ${path.basename(file)} — the docs would silently drop it`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// injection / remote-code scan
// ---------------------------------------------------------------------------

const TEXT_EXT = new Set(['.js', '.mjs', '.cjs', '.html', '.htm', '.css', '.json', '.svg']);

const DANGEROUS = [
  {
    name: 'eval(',
    re: /\beval\s*\(/g,
    why: 'remote/dynamic code execution',
  },
  {
    name: 'new Function(',
    re: /\bnew\s+Function\s*\(/g,
    why: 'remote/dynamic code execution',
  },
  {
    name: 'srcdoc assignment',
    re: /\.\s*srcdoc\s*=|srcdoc\s*=\s*["'`]/g,
    why: 'HTML injection sink; build the iframe body with textContent/DOM nodes instead',
  },
  {
    name: 'remote <script src>',
    re: /<script\b[^>]*\bsrc\s*=\s*(?:["']|&quot;)\s*https?:\/\//gi,
    why: 'Chrome MV3 forbids remotely hosted code; bundle it instead',
  },
  {
    name: 'protocol-relative remote <script src>',
    re: /<script\b[^>]*\bsrc\s*=\s*(?:["']|&quot;)\s*\/\//gi,
    why: 'Chrome MV3 forbids remotely hosted code; bundle it instead',
  },
];

function checkNoRemoteCode(g) {
  const files = walk(EXT).filter((f) => TEXT_EXT.has(path.extname(f).toLowerCase()));
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (text.includes('\u0000')) continue; // binary masquerading with a text extension
    for (const { name, re, why } of DANGEROUS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        fail(g, loc(file, lineOf(lineIndex(text), m.index)), `injection sink "${name}" (${why})`);
      }
    }
    // MV3 manifest-level remote code: extensions may not add remote script URLs.
    if (path.basename(file) === 'manifest.json') {
      const remoteUrlRe = /"(https?:\/\/[^"]+)"/g;
      let m;
      while ((m = remoteUrlRe.exec(text))) {
        const url = m[1];
        if (/^https:\/\/(raw|media)\.githubusercontent\.com\//.test(url)) continue; // host_permissions
        if (/^https:\/\/github\.com\//.test(url)) continue; // matches / WAR
        fail(
          g,
          loc(file, lineOf(lineIndex(text), m.index)),
          `manifest references remote URL "${url}" — only declared host_permissions/matches targets are allowed`,
        );
      }
    }
  }
  return files.length;
}

// ---------------------------------------------------------------------------
// I: the GitHub DOM contract
// ---------------------------------------------------------------------------

function loadSelectorsApi(g) {
  const file = path.join(EXT, 'selectors.js');
  if (!fs.existsSync(file)) {
    fail(g, REL(file), 'missing — every GitHub selector must live in extension/selectors.js');
    return null;
  }
  try {
    return createRequire(import.meta.url)(file);
  } catch (e) {
    fail(g, REL(file), `could not be loaded: ${e.message}`);
    return null;
  }
}

/**
 * The extension scrapes GitHub's markup, which is undocumented and changes
 * without notice. This group keeps that dependency in exactly one file, so a
 * GitHub rename is a one-line fix in a known place instead of a hunt through the
 * content script — and so the CSS cannot hide something the contract does not
 * declare.
 */
function checkDomContract(g, api) {
  if (!api) return 0;

  let checked = 0;
  for (const [name, list] of [['TARGETS', api.TARGETS], ['HIDE', api.HIDE]]) {
    if (!Array.isArray(list) || list.length === 0) {
      fail(g, REL(path.join(EXT, 'selectors.js')), `${name} must be a non-empty array`);
      continue;
    }
    for (const entry of list) {
      checked++;
      const label = (entry && entry.selector) || JSON.stringify(entry);
      if (!entry || typeof entry.selector !== 'string' || !entry.selector) {
        fail(g, REL(path.join(EXT, 'selectors.js')), `${name} entry is missing a selector: ${JSON.stringify(entry)}`);
      }
      if (!entry || typeof entry.fragment !== 'string' || !entry.fragment) {
        fail(g, REL(path.join(EXT, 'selectors.js')), `${name} entry ${label} is missing the canary fragment`);
      }
      if (!entry || typeof entry.verified !== 'boolean') {
        fail(g, REL(path.join(EXT, 'selectors.js')), `${name} entry ${label} must state verified: true|false`);
      }
    }
  }

  if (!api.RAW_BUTTON || typeof api.RAW_BUTTON.selector !== 'string' || typeof api.RAW_BUTTON.fragment !== 'string') {
    fail(g, REL(path.join(EXT, 'selectors.js')), 'RAW_BUTTON must declare both selector and fragment');
  }
  if (!Array.isArray(api.CANARY_PAGES) || api.CANARY_PAGES.length === 0) {
    fail(g, REL(path.join(EXT, 'selectors.js')), 'CANARY_PAGES must list the pages tools/check-github-dom.mjs verifies');
  } else {
    for (const page of api.CANARY_PAGES) {
      if (!page || typeof page.name !== 'string' || typeof page.path !== 'string') {
        fail(g, REL(path.join(EXT, 'selectors.js')), `CANARY_PAGES entry needs name + path: ${JSON.stringify(page)}`);
      }
    }
  }

  const fragments = [];
  for (const list of [api.TARGETS, api.HIDE]) {
    if (Array.isArray(list)) for (const e of list) if (e && e.fragment) fragments.push(e.fragment);
  }
  if (api.RAW_BUTTON && api.RAW_BUTTON.fragment) fragments.push(api.RAW_BUTTON.fragment);

  // 1. selectors.js is the ONLY JavaScript file allowed to name a fragment.
  const jsFiles = walk(EXT).filter(
    (f) => path.extname(f).toLowerCase() === '.js' && path.basename(f) !== 'selectors.js',
  );
  for (const file of jsFiles) {
    const text = fs.readFileSync(file, 'utf8');
    for (const fragment of fragments) {
      if (text.includes(fragment)) {
        fail(
          g,
          loc(file),
          `hardcodes the GitHub fragment "${fragment}" — read it from GRP_SELECTORS (extension/selectors.js) instead`,
        );
      }
    }
  }
  checked += jsFiles.length;

  // 2. content.js must actually consume the contract.
  const contentPath = path.join(EXT, 'content.js');
  if (fs.existsSync(contentPath) && !fs.readFileSync(contentPath, 'utf8').includes('GRP_SELECTORS')) {
    fail(g, REL(contentPath), 'does not reference GRP_SELECTORS — GitHub selectors must come from extension/selectors.js');
  }

  // 3. injection.css may only hide what the contract declares.
  const cssPath = path.join(EXT, 'injection.css');
  if (fs.existsSync(cssPath)) {
    const css = fs.readFileSync(cssPath, 'utf8');
    const declared = new Set((api.HIDE || []).map((e) => e && e.fragment).filter(Boolean));
    for (const m of css.matchAll(/\[class\*="([^"]+)"\]/g)) {
      if (!declared.has(m[1])) {
        fail(g, loc(cssPath), `hides "${m[1]}", which is not declared in selectors.js HIDE — the CSS would drift from the contract`);
      }
    }
  } else {
    fail(g, REL(cssPath), 'missing — the pre-paint hiding stylesheet');
  }

  return checked;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main() {
  const groups = [
    group('A', 'JSON files under extension/ parse'),
    group('B', 'rules.json is valid declarativeNetRequest'),
    group('C', 'formats.js <-> rules.json coherence'),
    group('D', 'manifest.json references + version + script order'),
    group('E', 'formats.js demo assets exist in test_files/'),
    group('F', 'README repo-relative links resolve'),
    group('G', 'formats.js formats are documented in both READMEs'),
    group('H', 'no remote code / injection sinks in extension/'),
    group('I', 'GitHub DOM contract + canary wiring (selectors.js)'),
  ];
  const [gA, gB, gC, gD, gE, gF, gG, gH, gI] = groups;

  // A group that throws is reported as a failure of that group instead of
  // aborting the run, so one broken input still yields a full report.
  const safe = (g, fn) => {
    try {
      fn();
    } catch (e) {
      fail(g, REL(ROOT), `internal error in group ${g.letter}: ${e.message}`);
    }
  };

  const jsonFiles = walk(EXT).filter((f) => path.extname(f).toLowerCase() === '.json');
  safe(gA, () => checkJsonParses(gA, jsonFiles));

  const rulesPath = path.join(EXT, 'rules.json');
  const rulesText = fs.existsSync(rulesPath) ? fs.readFileSync(rulesPath, 'utf8') : '';
  let rules = null;
  safe(gB, () => {
    rules = checkRulesJson(gB, rulesText);
  });

  let formats = [];
  safe(gA, () => {
    const api = loadFormats(gA);
    formats = api ? buildFormatModel(gA, api) : [];
  });

  const readmes = [path.join(ROOT, 'README.md'), path.join(ROOT, 'README_zh.md')];

  safe(gC, () => checkFormatRuleCoherence(gC, rules, formats));
  safe(gD, () => checkManifest(gD));
  safe(gE, () => checkDemoAssets(gE, formats));
  safe(gF, () => checkReadmeLinks(gF, readmes));
  safe(gG, () => checkFormatsDocumented(gG, formats, readmes));
  let scanned = 0;
  safe(gH, () => {
    scanned = checkNoRemoteCode(gH);
  });

  let domChecked = 0;
  safe(gI, () => {
    domChecked = checkDomContract(gI, loadSelectorsApi(gI));
  });

  // --- report ---
  const bar = '='.repeat(72);
  console.log(bar);
  console.log('github-raw-previewer consistency check');
  console.log(`repo: ${ROOT}`);
  console.log(
    `scanned: ${jsonFiles.length} JSON file(s), ${formats.length} format(s), ${scanned} extension source file(s)`,
  );
  console.log(bar);

  for (const g of groups) {
    const status = g.failed === 0 ? 'PASS' : `FAIL (${g.failed})`;
    console.log(`${g.letter}. ${status.padEnd(10)} ${g.title}`);
  }

  if (notes.length) {
    console.log('');
    console.log('Notes:');
    for (const n of notes) console.log(n);
  }

  if (errors.length) {
    const failed = groups.filter((g) => g.failed > 0);
    console.log('');
    console.log(`Errors (${errors.length}):`);
    for (const e of errors) console.log(e);
    console.log('');
    console.log(`FAILED — ${errors.length} problem(s) in ${failed.map((g) => g.letter).join(', ')}`);
    console.log('  group keys: A=json B=dnr-rules C=coherence D=manifest E=demo-assets');
    console.log('              F=readme-links G=readme-formats H=injection-sinks I=dom-contract');
    process.exitCode = 1;
    return;
  }

  console.log('');
  console.log('PASS — all 9 check groups clean.');
  console.log('  formats.js is the single source of truth: rules.json, manifest.json,');
  console.log('  test_files/ and both READMEs agree with it.');
  console.log(`  selectors.js is the single source of truth for GitHub markup (${domChecked} fragment(s) checked).`);
}

main();
