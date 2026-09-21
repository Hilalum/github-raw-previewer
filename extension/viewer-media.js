/**
 * GitHub Raw Previewer — media viewer (extension-origin page).
 *
 * Why this page exists: GitHub's Content-Security-Policy on blob pages pins
 * `media-src` to a list that does NOT include raw.githubusercontent.com, so a
 * <video> or <audio> element injected straight into the page is blocked — Chrome
 * surfaces that as "MEDIA_ELEMENT_ERROR: Format error", which looks like a codec
 * problem and is not. (Measured: media-src = github.com user-images… gist.github.com
 * github.githubassets.com.)
 *
 * Rendering the player in the extension's own origin sidesteps that entirely:
 * this document is governed by the extension's CSP, not GitHub's, so GitHub's
 * policy stays untouched. The same trick is already used for fonts, whose
 * `font-src` would otherwise block them too.
 */

(() => {
  'use strict';

  const ALLOWED_HOSTS = new Set([
    'raw.githubusercontent.com',
    'media.githubusercontent.com',
    'github.com',
  ]);

  const params = new URLSearchParams(location.search);
  const src = params.get('src') || '';
  const name = params.get('name') || 'file';
  const kind = params.get('kind') === 'audio' ? 'audio' : 'video';
  const theme = params.get('theme') === 'light' ? 'light' : 'dark';

  document.documentElement.className = theme;

  const errorPanel = document.getElementById('error');
  const errorMessage = document.getElementById('error-message');
  const errorLink = document.getElementById('error-link');

  function notify(payload) {
    try {
      if (window.parent && window.parent !== window) window.parent.postMessage(payload, '*');
    } catch (err) {
      /* cross-origin parent; the in-page state is enough */
    }
  }

  function reportFailure(message) {
    document.title = 'Preview unavailable';
    errorMessage.textContent = message;
    errorLink.href = src || '#';
    errorPanel.hidden = false;
    notify({ type: 'grp-media-error', message });
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

  if (!src) { reportFailure('No file was specified.'); return; }
  if (!isAllowed(src)) { reportFailure('This file could not be loaded: unexpected file host.'); return; }

  const el = document.createElement(kind);
  el.src = src;
  el.controls = true;
  el.preload = 'metadata';
  el.autoplay = false;
  el.setAttribute('aria-label', name);
  if (kind === 'video') el.playsInline = true;

  el.addEventListener('loadedmetadata', () => {
    // Let the embedding content script size the frame to the real aspect ratio
    // instead of a guessed one.
    notify({
      type: 'grp-media-ready',
      kind,
      width: el.videoWidth || 0,
      height: el.videoHeight || 0,
      duration: Number.isFinite(el.duration) ? el.duration : 0,
    });
  }, { once: true });

  el.addEventListener('error', () => {
    const code = el.error ? el.error.code : '?';
    console.warn('[GitHub Raw Previewer] media failed to load, code', code, src);
    reportFailure('This file could not be played in the browser.');
  }, { once: true });

  document.body.insertBefore(el, errorPanel);
})();
