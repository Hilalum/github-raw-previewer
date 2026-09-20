/**
 * GitHub Raw Previewer — Office document viewer (extension-origin page).
 *
 * GitHub's CSP sets `frame-src viewscreen.githubusercontent.com
 * notebooks.githubusercontent.com`, so an iframe pointing at Microsoft's viewer
 * is blocked when injected into the page directly. Framing it from the
 * extension's own origin avoids that, without weakening GitHub's policy.
 *
 * This page is only ever loaded after the user explicitly clicks "Load Microsoft
 * viewer" on a specific file — see the disclosure in the popup and PRIVACY.md.
 */

(() => {
  'use strict';

  const ALLOWED_HOSTS = new Set([
    'raw.githubusercontent.com',
    'media.githubusercontent.com',
    'github.com',
  ]);

  const MICROSOFT_VIEWER = 'https://view.officeapps.live.com/op/embed.aspx?src=';

  const params = new URLSearchParams(location.search);
  const src = params.get('src') || '';
  const name = params.get('name') || 'document';
  const theme = params.get('theme') === 'light' ? 'light' : 'dark';

  document.documentElement.className = theme;
  document.title = name;

  const viewer = document.getElementById('viewer');
  const rawLink = document.getElementById('raw-link');
  rawLink.href = src || '#';

  function isAllowed(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && ALLOWED_HOSTS.has(parsed.hostname);
    } catch (err) {
      return false;
    }
  }

  if (!src || !isAllowed(src)) {
    viewer.replaceWith(Object.assign(document.createElement('div'), {
      className: 'note',
      textContent: 'This document could not be loaded: unexpected file link.',
    }));
    return;
  }

  viewer.src = MICROSOFT_VIEWER + encodeURIComponent(src);
})();
