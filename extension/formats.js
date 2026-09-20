/**
 * GitHub Raw Previewer — format registry.
 *
 * SINGLE SOURCE OF TRUTH for every format the extension can preview.
 *
 * Loaded in two places:
 *   - as a content script, listed BEFORE content.js in manifest.json
 *   - as a plain <script> in popup.html, BEFORE popup.js
 *
 * Both consumers are classic scripts sharing one global scope, so this file
 * exposes everything on `globalThis.GRP_FORMATS`. When a new format is added,
 * this is the ONLY table that has to change: content.js, popup.js and the
 * consistency checker all derive from it.
 *
 * Per-format fields (all optional):
 *   demo           test_files/ sample used by the README live demos
 *   contentType    MIME override needed because GitHub serves the wrong type
 *                  for this extension (verified against raw.githubusercontent.com).
 *                  Only set this when the served type is actually wrong — each
 *                  entry requires a matching rule in rules.json.
 */

(function () {
  'use strict';

  /** Preview strategies, i.e. how a category is rendered. */
  const KIND = {
    VIDEO: 'video',
    AUDIO: 'audio',
    IMAGE: 'image',
    OFFICE: 'office',
    FONT: 'font',
  };

  const categories = [
    {
      key: 'Video',
      label: 'Video',
      kind: KIND.VIDEO,
      // raw.githubusercontent.com serves .mp4 as application/octet-stream,
      // which makes a top-level "View raw" navigation download instead of play.
      // Verified: webm/mov/ogg already come back with a usable media type.
      formats: {
        mp4: { demo: 'test.mp4', contentType: 'video/mp4' },
        webm: { demo: 'test.webm' },
        ogg: {},
        mov: { demo: 'test.mov' },
      },
    },
    {
      key: 'Audio',
      label: 'Audio',
      kind: KIND.AUDIO,
      // Verified: GitHub already serves mp3/wav/flac with correct media types.
      formats: {
        mp3: { demo: 'test.mp3' },
        wav: { demo: 'test.wav' },
        flac: { demo: 'test.flac' },
        m4a: {},
        aac: {},
      },
    },
    {
      key: 'Image',
      label: 'Images',
      kind: KIND.IMAGE,
      // Chrome decodes BMP natively. TIFF and HEIC are deliberately absent:
      // Chrome cannot decode them, so offering a toggle would be a lie.
      formats: {
        bmp: { demo: 'test.bmp' },
      },
    },
    {
      key: 'Office',
      label: 'Office documents',
      kind: KIND.OFFICE,
      // Rendered by Microsoft's hosted viewer, so the file URL leaves the
      // browser. Never auto-loaded: content.js renders a card and only fetches
      // the viewer after an explicit click (see OFFICE_DISCLOSURE).
      requiresConsent: true,
      disclosure:
        'Microsoft Office previews are rendered by Microsoft, so the file link is sent to ' +
        'view.officeapps.live.com only after you click. Everything else in this extension ' +
        'stays between you and GitHub.',
      formats: {
        doc: { demo: 'test.doc' },
        docx: { demo: 'test.docx' },
        xls: { demo: 'test.xls' },
        xlsx: { demo: 'test.xlsx' },
        ppt: { demo: 'test.ppt' },
        pptx: { demo: 'test.pptx' },
      },
    },
    {
      key: 'Fonts',
      label: 'Fonts',
      kind: KIND.FONT,
      // Rendered in an extension-origin page (viewer-font.html). GitHub serves
      // these as text/plain; verified that Chrome loads them anyway, so no
      // Content-Type override is needed.
      formats: {
        ttf: { demo: 'test.ttf' },
        otf: { demo: 'test.otf' },
        woff: { demo: 'test.woff' },
        woff2: { demo: 'test.woff2' },
      },
    },
  ];

  /** Flat lookup table: extension -> { category, kind, format }. */
  const byExtension = new Map();
  for (const category of categories) {
    for (const [ext, format] of Object.entries(category.formats)) {
      byExtension.set(ext, { category: category.key, kind: category.kind, format });
    }
  }

  /**
   * Build the default user configuration:
   * { Video: { _enabled: true, mp4: true, ... }, ... }
   */
  function defaultConfig() {
    const config = {};
    for (const category of categories) {
      const entry = { _enabled: true };
      for (const ext of Object.keys(category.formats)) entry[ext] = true;
      config[category.key] = entry;
    }
    return config;
  }

  /**
   * Merge a stored config over the defaults, per category and per format.
   * Unknown keys (formats that no longer exist, legacy categories) are dropped,
   * which makes removing a format a safe one-line change.
   */
  function mergeConfig(stored) {
    const config = {};
    for (const category of categories) {
      const saved = (stored && stored[category.key]) || {};
      const entry = { _enabled: saved._enabled !== false };
      for (const ext of Object.keys(category.formats)) {
        entry[ext] = saved[ext] !== false;
      }
      config[category.key] = entry;
    }
    return config;
  }

  /** Is this extension previewable at all? */
  function lookup(ext) {
    return byExtension.get(String(ext || '').toLowerCase()) || null;
  }

  /** Is this extension enabled in the given config? */
  function isEnabled(config, ext) {
    const hit = lookup(ext);
    if (!hit) return false;
    const entry = config && config[hit.category];
    if (!entry || entry._enabled === false) return false;
    return entry[ext.toLowerCase()] !== false;
  }

  /** Every extension in the registry, in display order. */
  function allExtensions() {
    const out = [];
    for (const category of categories) out.push(...Object.keys(category.formats));
    return out;
  }

  /** Extensions whose Content-Type needs an explicit override (=> rules.json). */
  function contentTypeOverrides() {
    const out = [];
    for (const category of categories) {
      for (const [ext, format] of Object.entries(category.formats)) {
        if (format.contentType) out.push({ ext, contentType: format.contentType });
      }
    }
    return out;
  }

  /** Extensions that ship a README live-demo sample. */
  function demoAssets() {
    const out = [];
    for (const category of categories) {
      for (const [ext, format] of Object.entries(category.formats)) {
        if (format.demo) out.push({ ext, demo: format.demo, category: category.key });
      }
    }
    return out;
  }

  const GRP_FORMATS = {
    KIND,
    categories,
    defaultConfig,
    mergeConfig,
    lookup,
    isEnabled,
    allExtensions,
    contentTypeOverrides,
    demoAssets,
  };

  globalThis.GRP_FORMATS = GRP_FORMATS;

  // Allow `require()` from tools/check-consistency.mjs. Not reachable in a
  // browser or extension context, where `module` is undefined.
  if (typeof module !== 'undefined' && module.exports) module.exports = GRP_FORMATS;
})();
