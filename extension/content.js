/**
 * GitHub Raw Previewer — content script.
 *
 * Renders an inline preview for the file currently open in GitHub's blob view.
 *
 * Design notes (each corresponds to a bug that used to exist here):
 *
 *  - `render()` is fully SYNCHRONOUS. The user config lives in a module-level
 *    cache fed by chrome.storage (loaded once, kept fresh via
 *    storage.onChanged), so a DOM mutation never triggers an async round trip.
 *
 *  - Every GitHub selector lives in selectors.js, which CI checks against real
 *    GitHub pages daily. Nothing here hardcodes markup.
 *
 *  - The mutation observer only compares the route and schedules work; it never
 *    touches the DOM itself. On non-blob routes the observer is disconnected
 *    entirely and replaced by a single route comparison every 2s, so pages like
 *    pull requests and settings cost nothing per mutation.
 *
 *  - Scheduling is a debounce with a maxWait ceiling, so continuous re-rendering
 *    cannot starve the task.
 *
 *  - Hiding GitHub's UI is always reversible: whatever we hid is recorded and
 *    restored on teardown, and if no preview ends up being rendered the
 *    pre-paint hiding is switched off again (a failed preview must never leave
 *    the file view blank).
 *
 *  - The Office viewer is behind an explicit per-file click, because it sends
 *    the file URL to Microsoft.
 *
 *  - The font specimen is an extension-origin page (viewer-font.html), not an
 *    inline `srcdoc` document, so it is not subject to GitHub's CSP.
 */

(() => {
  'use strict';

  const GRP = globalThis.GRP_FORMATS;
  const SEL = globalThis.GRP_SELECTORS;
  if (!GRP || !SEL) return;

  const CONTAINER_ID = 'gh-raw-preview-container';
  const ACTIVE_ATTR = 'data-grp-active';
  const BLOB_PATH_RE = /^\/[^/]+\/[^/]+\/blob\/[^/]+\/(.+)$/;
  const PREVIEW_HOSTS = ['https://raw.githubusercontent.com', 'https://media.githubusercontent.com'];

  /** How long to wait for a container before concluding the markup changed. */
  const INJECT_DEADLINE_MS = 5000;
  /** Route poll interval used while the observer is parked on non-blob pages. */
  const NONBLOB_POLL_MS = 2000;

  const DEBUG = false;

  // ── Diagnostics ────────────────────────────────────────────────────────────

  let warned = false;

  /** One-shot warning: a broken selector should be diagnosable without spamming
   *  the console on every mutation. */
  function warnOnce(...args) {
    if (warned) return;
    warned = true;
    console.warn('[GitHub Raw Previewer]', ...args);
  }

  function debug(...args) {
    if (DEBUG) console.log('[GitHub Raw Previewer]', ...args);
  }

  /** True while the extension context is alive. After the extension is
   *  reloaded/updated with a tab open, chrome.runtime.id disappears and every
   *  chrome.* call throws. */
  function hasRuntime() {
    try {
      return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (err) {
      return false;
    }
  }

  /** Report the outcome to the service worker, which owns the toolbar badge.
   *  This is the only feedback channel, and it stays entirely local. */
  function reportDiagnostic(ok, reason) {
    if (!hasRuntime()) return;
    try {
      chrome.runtime.sendMessage({ type: 'grp-diagnostic', ok, reason: reason || '', url: location.href });
    } catch (err) {
      /* context invalidated mid-flight */
    }
  }

  // ── Config cache ───────────────────────────────────────────────────────────

  let config = GRP.defaultConfig();

  function initConfig() {
    if (!hasRuntime()) return;

    try {
      chrome.storage.local.get(['previewConfig'], (res) => {
        if (!hasRuntime()) return;
        config = GRP.mergeConfig(res && res.previewConfig);
        debug('config loaded');
        scheduleTask(0);
      });
    } catch (err) {
      warnOnce('could not read config; using defaults', err);
    }

    try {
      // Live toggling: applying a change from the popup no longer waits for an
      // unrelated DOM mutation.
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes.previewConfig) return;
        config = GRP.mergeConfig(changes.previewConfig.newValue);
        debug('config changed');
        scheduleTask(0);
      });
    } catch (err) {
      /* context already invalidated */
    }
  }

  // ── Scheduling ─────────────────────────────────────────────────────────────

  let timer = null;
  let firstRequestAt = 0;
  let running = false;

  /**
   * Debounce with a ceiling: the task runs `delay` ms after the last request,
   * but never later than `maxWait` after the first one, so a page that mutates
   * continuously still gets its preview.
   */
  function scheduleTask(delay = 150, maxWait = 800) {
    if (timer === null) firstRequestAt = Date.now();
    else clearTimeout(timer);
    const wait = Math.min(delay, Math.max(0, firstRequestAt + maxWait - Date.now()));
    timer = setTimeout(runTask, wait);
  }

  function runTask() {
    timer = null;
    if (running) {
      // Re-entrancy: reschedule instead of dropping the work.
      scheduleTask(150);
      return;
    }
    running = true;
    try {
      render();
    } catch (err) {
      warnOnce('render failed', err);
    } finally {
      running = false;
    }
  }

  // ── Reversible hiding ──────────────────────────────────────────────────────

  /** element -> the inline `display` it had before we hid it. Iterable, because
   *  teardown has to restore everything we touched. */
  const hiddenNodes = new Map();

  function hideNode(el) {
    if (!el || el.id === CONTAINER_ID) return;
    if (!hiddenNodes.has(el)) hiddenNodes.set(el, el.style.display || '');
    if (el.style.getPropertyValue('display') !== 'none') {
      el.style.setProperty('display', 'none', 'important');
    }
  }

  function restoreNative() {
    hiddenNodes.forEach((previous, el) => {
      try {
        el.style.removeProperty('display');
        if (previous) el.style.display = previous;
      } catch (err) {
        /* node detached; nothing to restore */
      }
    });
    hiddenNodes.clear();
  }

  /** Hide GitHub's own view of the file we are previewing. Idempotent, scoped
   *  to `target`, and never falls back to an arbitrary ancestor. */
  function hideNative(target) {
    for (const entry of SEL.HIDE) hideNode(target.querySelector(entry.selector));

    // The "View raw" placeholder, deliberately scoped to the preview target
    // (scanning every <a> on the document was a real cost).
    target.querySelectorAll('a').forEach((a) => {
      if (a.textContent.trim().toLowerCase() !== SEL.VIEW_RAW.text) return;
      hideNode(a.closest(SEL.VIEW_RAW.containerSelector) || a);
    });
  }

  // ── Pre-paint intent ───────────────────────────────────────────────────────

  /**
   * Marks <html> so injection.css can hide GitHub's placeholder before the first
   * paint. Set optimistically from the route alone (the config arrives a moment
   * later), and always cleared when we turn out not to be previewing — a failed
   * preview must give GitHub's own UI back rather than leave a blank area.
   */
  function setActive(on) {
    const root = document.documentElement;
    if (!root) return;
    if (on) root.setAttribute(ACTIVE_ATTR, '');
    else root.removeAttribute(ACTIVE_ATTR);
  }

  function wantsPreview() {
    const match = currentRoute().match(BLOB_PATH_RE);
    if (!match) return false;
    return GRP.isEnabled(config, getExtension(match[1]));
  }

  /**
   * Warm the connection to GitHub's file host before the preview element is
   * created. Deliberately `preconnect` only: a speculative `preload` of the raw
   * URL would spend the user's bandwidth on a possibly multi-hundred-megabyte
   * video the moment the page opens, and the URL synthesised from the address
   * bar can differ from the real one and redirect anyway.
   */
  function preconnect() {
    const parent = document.head || document.documentElement;
    if (!parent) return;
    for (const href of PREVIEW_HOSTS) {
      if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) continue;
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = href;
      link.crossOrigin = 'anonymous';
      parent.appendChild(link);
    }
  }

  let deadlineTimer = null;
  let deadlineRoute = null;

  /** If we claimed the page for a preview and then never managed to render one,
   *  undo the pre-paint hiding and say so. */
  function scheduleDeadlineCheck() {
    const route = currentRoute();
    if (deadlineTimer !== null && deadlineRoute === route) return;
    deadlineRoute = route;
    clearTimeout(deadlineTimer);
    deadlineTimer = setTimeout(() => {
      deadlineTimer = null;
      deadlineRoute = null;
      if (state.container && state.container.isConnected) return;
      if (!wantsPreview()) return;
      setActive(false);
      reportDiagnostic(false, 'no-container');
      warnOnce(
        'no preview container found for', route,
        '— GitHub markup may have changed. Update extension/selectors.js and re-run `npm run check:dom`.',
      );
    }, INJECT_DEADLINE_MS);
  }

  function clearDeadline() {
    clearTimeout(deadlineTimer);
    deadlineTimer = null;
    deadlineRoute = null;
  }

  /** Decide whether this route should be previewed, and prepare the page for it
   *  before anything is rendered. */
  function syncIntent() {
    const wants = wantsPreview();
    setActive(wants);
    if (wants) {
      preconnect();
      scheduleDeadlineCheck();
    } else {
      clearDeadline();
    }
    return wants;
  }

  // ── DOM helpers ────────────────────────────────────────────────────────────

  function getExtension(filePath) {
    const name = filePath.split('/').pop();
    const dot = name.lastIndexOf('.');
    return dot <= 0 ? '' : name.slice(dot + 1).toLowerCase();
  }

  function currentRoute() {
    return location.pathname;
  }

  function isBlobRoute(pathname) {
    return BLOB_PATH_RE.test(pathname);
  }

  function rawUrlFor() {
    const button = SEL.findRawButton(document);
    if (button && button.href) return button.href;
    return location.href.replace('/blob/', '/raw/');
  }

  /** github.com/<o>/<r>/raw/... → raw.githubusercontent.com/<o>/<r>/... */
  function canonicalRawUrl(url) {
    if (!url.startsWith('https://github.com/')) return url;
    return url
      .replace('https://github.com/', 'https://raw.githubusercontent.com/')
      .replace('/raw/', '/')
      .replace('/refs/heads/', '/');
  }

  /** GitHub's own resolved colour scheme, so extension-origin viewers can match
   *  the page instead of hardcoding a dark theme. */
  function detectTheme() {
    const scheme = getComputedStyle(document.documentElement).colorScheme || '';
    if (scheme.includes('dark')) return 'dark';
    if (scheme.includes('light')) return 'light';
    const mode = document.documentElement.getAttribute('data-color-mode');
    if (mode === 'dark' || mode === 'light') return mode;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  const state = { key: null, container: null, routeKey: null };

  function teardown() {
    document.querySelectorAll('#' + CONTAINER_ID).forEach((el) => el.remove());
    restoreNative();
    setActive(false);
    state.container = null;
    state.key = null;
  }

  /** Work out what (if anything) this route should preview. Pure, cheap, sync. */
  function resolveContext() {
    const pathname = currentRoute();
    const match = pathname.match(BLOB_PATH_RE);
    if (!match) return null;

    const filePath = match[1];
    const ext = getExtension(filePath);
    const hit = GRP.lookup(ext);
    if (!hit || !GRP.isEnabled(config, ext)) return null;

    return {
      key: pathname,
      filePath,
      fileName: filePath.split('/').pop(),
      ext,
      kind: hit.kind,
      category: hit.category,
      rawUrl: rawUrlFor(),
    };
  }

  function render() {
    if (!hasRuntime()) return;

    const ctx = resolveContext();
    if (!ctx) {
      teardown();
      return;
    }

    const target = SEL.findTargetContainer(document);
    if (!target) {
      // Never hide anything we cannot replace; the deadline reports this once.
      setActive(false);
      scheduleDeadlineCheck();
      return;
    }

    // Fast path: same file, container still in the DOM. Only re-assert the
    // native hiding (cheap and idempotent) in case React re-rendered it.
    if (state.key === ctx.key && state.container && state.container.isConnected) {
      setActive(true);
      hideNative(target);
      return;
    }

    teardown(); // restores whatever we hid for the previous file
    setActive(true);
    hideNative(target);

    const container = buildContainer(ctx);
    mount(container, target);

    state.container = container;
    state.key = ctx.key;
    clearDeadline();
    reportDiagnostic(true);
    debug('previewed', ctx.ext);
  }

  function mount(container, target) {
    if (target.classList.contains('Box') && target.parentElement) {
      target.parentElement.insertBefore(container, target);
    } else {
      target.prepend(container);
    }
  }

  const BASE_CONTAINER_STYLE = [
    'width:100%',
    'margin-top:16px',
    'padding:16px',
    'box-sizing:border-box',
    'display:flex',
    'justify-content:center',
    'align-items:center',
    'background-color:transparent',
    'border:1px solid var(--borderColor-default, #30363d)',
    'border-radius:6px',
  ].join(';');

  function buildContainer(ctx) {
    const container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.dataset.url = ctx.rawUrl;
    container.style.cssText = BASE_CONTAINER_STYLE;
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', `${ctx.fileName} preview`);

    switch (ctx.kind) {
      case GRP.KIND.VIDEO:
      case GRP.KIND.AUDIO:
        container.appendChild(buildMediaFrame(ctx));
        break;
      case GRP.KIND.IMAGE:
        container.appendChild(buildImage(ctx));
        break;
      case GRP.KIND.OFFICE:
        renderOffice(container, ctx);
        break;
      case GRP.KIND.FONT:
        container.appendChild(buildFontFrame(ctx));
        break;
      default:
        break;
    }
    return container;
  }

  /**
   * Build an iframe pointing at one of the extension's own viewer pages.
   *
   * WHY EVERY RICH PREVIEW IS AN EXTENSION-ORIGIN PAGE:
   * GitHub's CSP on blob pages pins `media-src` to a list that excludes
   * raw.githubusercontent.com, and `frame-src` to two githubusercontent hosts.
   * A <video>/<audio> injected straight into the page is therefore blocked —
   * Chrome reports that as "MEDIA_ELEMENT_ERROR: Format error", which looks like
   * a codec bug and is not — and so is an iframe aimed at Microsoft's viewer.
   * An extension-origin frame is governed by the extension's own CSP instead, so
   * all of this works while GitHub's policy is left completely untouched.
   */
  function buildViewerFrame(opts) {
    const iframe = document.createElement('iframe');
    iframe.title = `${opts.name} preview`;
    iframe.className = opts.className;
    iframe.style.cssText =
      `width:100%;height:${opts.height};border:none;border-radius:6px;background:transparent;display:block;`;

    const params = new URLSearchParams(opts.params || {});
    params.set('src', opts.src);
    params.set('name', opts.name);
    params.set('theme', detectTheme());
    iframe.src = chrome.runtime.getURL(opts.page) + '?' + params.toString();
    return iframe;
  }

  /**
   * Video and audio. The viewer reports the real aspect ratio so the frame can be
   * sized to it, and reports a load failure so we can swap in the download card.
   */
  function buildMediaFrame(ctx) {
    const isAudio = ctx.kind === GRP.KIND.AUDIO;
    const iframe = buildViewerFrame({
      page: 'viewer-media.html',
      src: ctx.rawUrl,
      name: ctx.fileName,
      className: 'grp-media-frame',
      height: isAudio ? '92px' : '360px',
      params: { kind: isAudio ? 'audio' : 'video' },
    });

    const onMessage = (event) => {
      if (event.source !== iframe.contentWindow) return;
      const type = event.data && event.data.type;

      if (type === 'grp-media-ready') {
        window.removeEventListener('message', onMessage);
        if (!iframe.isConnected || event.data.kind !== 'video') return;
        const { width, height } = event.data;
        if (!(width > 0) || !(height > 0)) return;
        const available = iframe.clientWidth || 640;
        const fitted = Math.round(available * (height / width));
        const ceiling = Math.round(window.innerHeight * 0.8);
        iframe.style.height = `${Math.min(Math.max(fitted, 160), ceiling)}px`;
        return;
      }

      if (type === 'grp-media-error') {
        window.removeEventListener('message', onMessage);
        const parent = iframe.parentElement;
        if (parent && iframe.isConnected) {
          parent.replaceChildren(buildFallbackCard('This file could not be played in the browser.', ctx));
        }
      }
    };
    window.addEventListener('message', onMessage);
    return iframe;
  }

  function buildImage(ctx) {
    const img = document.createElement('img');
    img.src = ctx.rawUrl;
    img.alt = ctx.fileName;
    img.decoding = 'async';
    img.style.cssText = 'max-width:100%;max-height:85vh;border-radius:6px;object-fit:contain;';
    img.addEventListener('error', () => {
      if (!img.isConnected) return;
      debug('image failed to load', ctx.rawUrl);
      img.replaceWith(buildFallbackCard('This image could not be displayed.', ctx));
    }, { once: true });
    return img;
  }

  const CARD_STYLE = [
    'padding:20px',
    'text-align:center',
    'font-size:13px',
    'line-height:1.6',
    'color:var(--fgColor-muted, #8b949e)',
  ].join(';');

  function buildFallbackCard(message, ctx) {
    const card = document.createElement('div');
    card.style.cssText = CARD_STYLE;

    const text = document.createElement('p');
    text.style.margin = '0 0 12px';
    text.textContent = message;
    card.appendChild(text);

    card.appendChild(buildRawLink(ctx));
    return card;
  }

  function buildRawLink(ctx) {
    const link = document.createElement('a');
    link.href = ctx.rawUrl;
    link.setAttribute('download', '');
    link.textContent = 'Download the raw file';
    link.style.cssText = 'color:var(--fgColor-accent, #58a6ff);font-weight:600;';
    return link;
  }

  /**
   * Office documents are rendered by Microsoft's hosted viewer, which means the
   * file URL leaves the browser. Never do that without an explicit click.
   */
  function renderOffice(container, ctx) {
    const category = GRP.categories.find((c) => c.key === ctx.category);
    container.style.flexDirection = 'column';
    container.style.padding = '0';
    container.style.overflow = 'hidden';

    const card = document.createElement('div');
    card.style.cssText = `${CARD_STYLE};padding:24px;`;

    const title = document.createElement('p');
    title.style.cssText = 'margin:0 0 8px;font-weight:600;color:var(--fgColor-default, #c9d1d9);';
    title.textContent = ctx.fileName;
    card.appendChild(title);

    const note = document.createElement('p');
    note.style.margin = '0 0 16px';
    note.textContent = (category && category.disclosure) ||
      'This preview is rendered by Microsoft, so the file link is sent to Microsoft when you continue.';
    card.appendChild(note);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:12px;justify-content:center;flex-wrap:wrap;';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Load Microsoft viewer';
    button.style.cssText = [
      'padding:8px 14px',
      'border-radius:6px',
      'border:1px solid var(--borderColor-default, #30363d)',
      'background:var(--bgColor-muted, #21262d)',
      'color:var(--fgColor-default, #c9d1d9)',
      'font-size:13px',
      'font-weight:600',
      'cursor:pointer',
    ].join(';');
    button.addEventListener('click', () => {
      container.replaceChildren(buildOfficeFrame(ctx));
    });
    actions.appendChild(button);
    actions.appendChild(buildRawLink(ctx));
    card.appendChild(actions);

    container.appendChild(card);
  }

  function buildOfficeFrame(ctx) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'width:100%;';

    const iframe = buildViewerFrame({
      page: 'viewer-office.html',
      src: canonicalRawUrl(ctx.rawUrl),
      name: ctx.fileName,
      className: 'grp-office-frame',
      height: '85vh',
      params: {},
    });
    iframe.style.borderRadius = '6px 6px 0 0';
    wrapper.appendChild(iframe);

    const note = document.createElement('div');
    note.style.cssText = [
      'padding:12px 16px',
      'background-color:var(--bgColor-attention-muted, rgba(187,128,9,0.15))',
      'color:var(--fgColor-attention, #d29922)',
      'font-size:13px',
      'text-align:center',
      'border-top:1px solid var(--borderColor-default, #30363d)',
      'border-radius:0 0 6px 6px',
      'box-sizing:border-box',
      'width:100%',
    ].join(';');

    const strong = document.createElement('strong');
    strong.textContent = 'Note: ';
    note.appendChild(strong);
    note.appendChild(document.createTextNode(
      'Microsoft cannot access private repositories. If the preview above shows an error, '
    ));
    const link = document.createElement('a');
    link.href = ctx.rawUrl;
    link.setAttribute('download', '');
    link.textContent = 'download the file';
    link.style.cssText = 'color:var(--fgColor-accent, #58a6ff);font-weight:bold;text-decoration:underline;';
    note.appendChild(link);
    note.appendChild(document.createTextNode(' instead.'));

    wrapper.appendChild(note);
    return wrapper;
  }

  function buildFontFrame(ctx) {
    const iframe = buildViewerFrame({
      page: 'viewer-font.html',
      src: ctx.rawUrl,
      name: ctx.fileName,
      className: 'grp-font-frame',
      height: '65vh',
      params: {},
    });

    // The viewer reports status back to us: a failed load swaps in a usable
    // download card, and either outcome retires the listener (one per injection
    // would otherwise pile up across navigations).
    const onMessage = (event) => {
      if (event.source !== iframe.contentWindow) return;
      const type = event.data && event.data.type;
      if (type !== 'grp-font-error' && type !== 'grp-font-ok') return;
      window.removeEventListener('message', onMessage);
      if (type !== 'grp-font-error') return;
      const parent = iframe.parentElement;
      if (parent && iframe.isConnected) {
        parent.replaceChildren(buildFallbackCard('This font could not be loaded.', ctx));
      }
    };
    window.addEventListener('message', onMessage);
    return iframe;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  const observer = new MutationObserver(() => {
    if (!hasRuntime()) return;

    const changed = noteRoute();
    if (!isBlobRoute(currentRoute())) return;

    if (changed) {
      syncIntent();
      scheduleTask(150);
      return;
    }

    // Already previewing this file: only the cheap, idempotent native hiding may
    // need re-applying, so wait longer and cut the churn right down.
    const settled = state.key === currentRoute() && state.container && state.container.isConnected;
    scheduleTask(settled ? 400 : 150);
  });

  let pollTimer = null;

  /**
   * Detect a route change, clean up after the previous one, and re-arm.
   * Returns true when the route actually changed.
   */
  function noteRoute() {
    const route = currentRoute();
    if (route === state.routeKey) return false;
    state.routeKey = route;
    teardown();
    clearDeadline();
    syncObserverArming();
    return true;
  }

  /**
   * Observe mutations only where they matter. On a blob page the observer needs
   * to see re-renders; everywhere else (pull requests, issues, settings) a
   * single route comparison every 2s is enough, which takes the per-mutation
   * cost of the extension on those pages to zero.
   */
  function syncObserverArming() {
    if (isBlobRoute(currentRoute())) {
      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      observer.disconnect();
      observer.observe(document.documentElement, { childList: true, subtree: true });
      return;
    }

    observer.disconnect();
    if (pollTimer !== null) return;
    pollTimer = setInterval(() => {
      if (!hasRuntime()) {
        clearInterval(pollTimer);
        pollTimer = null;
        return;
      }
      if (currentRoute() === state.routeKey) return;
      noteRoute();
      if (isBlobRoute(currentRoute())) {
        syncIntent();
        scheduleTask(150);
      }
    }, NONBLOB_POLL_MS);
  }

  function onNavigation() {
    if (!hasRuntime()) return;
    noteRoute();
    syncObserverArming();
    if (isBlobRoute(currentRoute())) {
      syncIntent();
      scheduleTask(300);
    }
  }

  function boot() {
    initConfig();
    state.routeKey = currentRoute();
    syncObserverArming();
    if (syncIntent()) scheduleTask(300);
  }

  if (document.documentElement) {
    boot();
  } else {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  }

  document.addEventListener('turbo:load', onNavigation);
  window.addEventListener('pageshow', onNavigation);
})();
