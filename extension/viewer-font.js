/**
 * GitHub Raw Previewer — font specimen viewer (extension-origin page).
 *
 * Runs as a top-level document in the extension's own origin, framed by the
 * content script from a GitHub blob page. Being extension-origin means it is
 * not subject to github.com's Content-Security-Policy, which is why the
 * extension no longer needs to strip CSP headers from GitHub pages.
 *
 * The font URL arrives as a query parameter, so it is validated against the
 * same hosts the manifest declares before anything is fetched.
 */

(() => {
  'use strict';

  const ALLOWED_HOSTS = new Set([
    'raw.githubusercontent.com',
    'media.githubusercontent.com',
    'github.com',
  ]);

  const SIZES = [16, 24, 36];

  const specimen = document.getElementById('specimen');
  const errorPanel = document.getElementById('error');
  const errorMessage = document.getElementById('error-message');
  const errorLink = document.getElementById('error-link');

  const params = new URLSearchParams(location.search);
  const src = params.get('src') || '';
  const name = params.get('name') || 'font file';
  const theme = params.get('theme') === 'light' ? 'light' : 'dark';

  document.documentElement.className = theme;

  /** Tell the embedding content script to swap in its own fallback card. */
  function reportFailure(message, rawUrl) {
    document.title = 'Font preview unavailable';
    errorMessage.textContent = message;
    errorLink.href = rawUrl || '#';
    specimen.hidden = true;
    errorPanel.hidden = false;
    notifyParent({ type: 'grp-font-error', message });
  }

  /** Only ever fetch from GitHub's own file hosts. */
  function isAllowed(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && ALLOWED_HOSTS.has(parsed.hostname);
    } catch (err) {
      return false;
    }
  }

  function renderSpecimen() {
    document.title = name;
    document.getElementById('filename').textContent = name;
    document.getElementById('headline').textContent = 'A Quick Brown Fox Jumps Over The Lazy Dog';
    document.getElementById('charset').textContent =
      '0 1 2 3 4 5 6 7 8 9 ! @ # $ % ^ & * ( ) _ + - = { } | [ ] \\ : " ; \' < > ? , . /';

    const sizesContainer = document.getElementById('sizes');
    sizesContainer.replaceChildren();
    for (const size of SIZES) {
      const line = document.createElement('span');
      line.style.fontSize = `${size}px`;
      line.textContent = `${size}px: The quick brown fox jumps over the lazy dog.`;
      sizesContainer.appendChild(line);
    }

    specimen.hidden = false;
    errorPanel.hidden = true;
    notifyParent({ type: 'grp-font-ok', name });
  }

  /** Best-effort status reporting for the page that embedded this viewer. */
  function notifyParent(payload) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, '*');
      }
    } catch (err) {
      /* cross-origin parent; the in-page state is enough */
    }
  }

  /**
   * A font that never arrives must not leave the viewer (and the page that
   * embedded it) hanging on an empty frame. The timeout aborts the fetch, which
   * flows into the same failure card as any other load error.
   */
  const FONT_TIMEOUT_MS = 20000;

  async function loadFont() {
    // Fetch the bytes ourselves: avoids building a CSS url() string from user
    // input, and lets us tell "could not download" apart from "not a font".
    const response = await fetch(src, { credentials: 'omit', signal: AbortSignal.timeout(FONT_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = await response.arrayBuffer();

    const face = new FontFace('GRPPreview', bytes);
    await face.load();
    document.fonts.add(face);
  }

  if (!src) {
    reportFailure('No font file was specified.', '');
    return;
  }
  if (!isAllowed(src)) {
    reportFailure('This font could not be loaded: unexpected file host.', src);
    return;
  }

  loadFont()
    .then(renderSpecimen)
    .catch((err) => {
      // Most likely causes: the file is not actually a font, or the raw URL
      // needs credentials (private repository).
      console.warn('[GitHub Raw Previewer] font load failed:', err);
      reportFailure(
        'This font could not be loaded or decoded. It may not be a real font file, ' +
        'it may live in a private repository, or the download timed out.',
        src
      );
    });
})();
