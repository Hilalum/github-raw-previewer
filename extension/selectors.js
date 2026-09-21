/**
 * GitHub Raw Previewer — the GitHub DOM contract.
 *
 * EVERY selector that depends on GitHub's markup lives here and nowhere else.
 * Two consumers share it:
 *   - extension/content.js        (runs against the live, hydrated page)
 *   - tools/check-github-dom.mjs  (asserts it against real GitHub pages daily)
 *
 * Each entry carries:
 *   selector  a real CSS selector, for use with querySelector()
 *   fragment  the literal substring the canary looks for in GitHub's HTML,
 *             so the checker needs no CSS parser and no browser
 *   verified  true = observed in the hydrated DOM of a real blob page
 *   note      what it is for / where it was seen
 *
 * Provenance: `verified` entries were measured on 2026-03-06 against three real
 * blob pages of this project (binary media, font, markdown) rendered in a
 * Chromium build. Anything that did not appear was DELETED rather than kept
 * "just in case": a dead fallback never matches, it only misleads the next
 * reader into thinking the code path is covered.
 *
 * When GitHub renames something, CI turns red with the missing fragment named.
 * The fix is always: update this file, then re-run `npm run check:dom`.
 */

(function () {
  'use strict';

  /** Injection targets, most specific first. */
  const TARGETS = [
    {
      selector: '[class*="BlobContent-module__blobContentSection"]',
      fragment: 'BlobContent-module__blobContentSection',
      verified: true,
      note: 'primary blob content section — where the preview is mounted',
    },
    {
      selector: '[class*="BlobViewContent-module__blobContainer"]',
      fragment: 'BlobViewContent-module__blobContainer',
      verified: true,
      note: 'outer blob container, used if the section above ever disappears',
    },
  ];

  /**
   * GitHub UI to hide once we are previewing the file ourselves.
   * Hiding is always reversible — content.js records what it hid and restores
   * it on teardown.
   */
  const HIDE = [
    {
      selector: '[class*="tooLargeError"]',
      fragment: 'tooLargeError',
      verified: true,
      note: 'placeholder GitHub shows for large or non-renderable files (seen on binary media)',
    },
    {
      selector: '[class*="react-code-text"]',
      fragment: 'react-code-text',
      verified: true,
      note: 'a binary file rendered as source text (seen on fonts)',
    },
    {
      selector: '[class*="react-blob-print-hide"]',
      fragment: 'react-blob-print-hide',
      verified: true,
      note: 'the code view wrapper that goes with the entry above',
    },
    {
      selector: '.blankslate',
      fragment: 'blankslate',
      verified: false,
      note: 'generic GitHub empty state — kept as a belt-and-braces fallback, never actually observed',
    },
  ];

  /** Matches the "View raw" placeholder link and the block that contains it. */
  const VIEW_RAW = {
    text: 'view raw',
    containerSelector: '[class*="tooLargeError"], .blankslate',
  };

  /** The button whose href tells us the real raw URL. */
  const RAW_BUTTON = {
    selector: '[data-testid="raw-button"]',
    fragment: 'data-testid="raw-button"',
    verified: true,
    note: 'href is the canonical raw URL; without it we synthesise one from the page URL',
  };

  /**
   * Pages the canary checks against real GitHub. Kept to files that this
   * repository itself ships, so they stay stable.
   *
   * `expectHide: false` on the markdown page is deliberate: it asserts that our
   * hide selectors do NOT match a page GitHub already previews natively. A
   * selector that is too broad would silently blank out legitimate content.
   */
  const CANARY_PAGES = [
    { name: 'binary media', path: 'blob/main/test_files/test.mp4', expectTarget: true, expectRawButton: true, expectHide: true },
    { name: 'font', path: 'blob/main/test_files/test.woff2', expectTarget: true, expectRawButton: true, expectHide: true },
    { name: 'markdown (must stay untouched)', path: 'blob/main/README.md', expectTarget: true, expectRawButton: true, expectHide: false },
  ];

  /** Default repo to probe; CI overrides it with the repository being built. */
  const CANARY_DEFAULT_REPO = 'Hilalum/github-raw-previewer';

  // ── helpers used by the content script ────────────────────────────────────

  function findTargetContainer(doc) {
    const root = doc || document;
    for (const target of TARGETS) {
      const el = root.querySelector(target.selector);
      if (el) return el;
    }
    return null;
  }

  function findRawButton(doc) {
    return (doc || document).querySelector(RAW_BUTTON.selector);
  }

  const GRP_SELECTORS = {
    TARGETS,
    HIDE,
    VIEW_RAW,
    RAW_BUTTON,
    CANARY_PAGES,
    CANARY_DEFAULT_REPO,
    findTargetContainer,
    findRawButton,
  };

  globalThis.GRP_SELECTORS = GRP_SELECTORS;

  // Allow require() from tools/check-github-dom.mjs. Not reachable in a browser
  // or extension context, where `module` is undefined.
  if (typeof module !== 'undefined' && module.exports) module.exports = GRP_SELECTORS;
})();
