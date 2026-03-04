/**
 * GitHub Raw Previewer - Content Script
 * Injects a native video player or PDF viewer into the GitHub file viewer UI.
 */

const CONTAINER_ID = 'gh-raw-preview-container';

const DEFAULT_OPTIONS = {
  "Video": { _enabled: true, mp4: true, webm: true, ogg: true, mov: true },
  "Audio": { _enabled: true, mp3: true, wav: true, flac: true, m4a: true, aac: true },
  "Image & Vectors": { _enabled: true, bmp: true, tiff: true, tif: true, heic: true },
  "PDF Document": { _enabled: true, pdf: true },
  "Office": { _enabled: true, xls: true, xlsx: true, doc: true, docx: true, ppt: true, pptx: true },
  "Fonts": { _enabled: true, ttf: true, otf: true, woff: true, woff2: true },
  "3D Models": { _enabled: true, glb: true }
};

function getExtension(filename) {
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return parts[parts.length - 1].toLowerCase();
}

// ── Debounce + Lock ──────────────────────────────────────────────────────────
let _debounceTimer = null;
let _injecting = false;  // async lock to prevent concurrent injections

function scheduleInject(delay) {
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    if (!_injecting) {
      _injecting = true;
      injectPreview().finally(() => { _injecting = false; });
    }
  }, delay);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Remove ALL preview containers from the entire page (handles duplicates) */
function removeAllContainers() {
  document.querySelectorAll('#' + CONTAINER_ID).forEach(el => el.remove());
}

/** Find the best GitHub DOM target to inject into */
function findTargetContainer() {
  return [
    document.querySelector('[class*="BlobContent-module__blobContentSection"]'),
    document.querySelector('[class*="BlobViewContent-module__blobContainer"]'),
    document.querySelector('[data-testid="repos-file-display"]'),
    document.querySelector('main .Box'),
    document.querySelector('.js-blob-wrapper')
  ].find(c => c !== null) || null;
}

/** Hide GitHub's native file viewer elements */
function hideNativeElements(targetContainer) {
  if (!targetContainer) return;

  const elementsToHide = [
    targetContainer.querySelector('[data-testid="repo-file-blob"] > div > div'),
    targetContainer.querySelector('.blankslate'),
    targetContainer.querySelector('[class*="tooLargeError"]'),
    targetContainer.querySelector('[data-testid="blob-viewer-container"]'),
    targetContainer.querySelector('.js-blob-wrapper'),
    targetContainer.querySelector('table.highlight'),
    targetContainer.querySelector('[data-testid="repo-file-blob"] > div'),
    // Code editor / syntax-highlighted source code views (for text-based formats like .gltf, .svg, .obj)
    targetContainer.querySelector('[class*="react-code-text"]'),
    targetContainer.querySelector('[class*="react-blob-print-hide"]'),
    targetContainer.querySelector('[class*="CodeMirror"]'),
    targetContainer.querySelector('section[aria-labelledby]'),  // React code section wrapper
    targetContainer.querySelector('[class*="react-blob-header"]')?.nextElementSibling,  // content after header
    // Native PDF viewer components
    targetContainer.querySelector('[data-testid="file-display-pdf"]'),
    targetContainer.querySelector('.react-pdf-viewer'),
    targetContainer.querySelector('embed[type="application/pdf"]'),
    targetContainer.querySelector('iframe[src*="pdf"]')
  ];

  elementsToHide.forEach(el => {
    if (el && el.style.display !== 'none') {
      el.style.setProperty('display', 'none', 'important');
    }
  });

  // Also hide any direct children of the blob container that aren't our preview
  const blobEl = targetContainer.querySelector('[data-testid="repo-file-blob"]');
  if (blobEl) {
    Array.from(blobEl.children).forEach(child => {
      if (child.id !== 'gh-raw-preview-container' && child.style.display !== 'none') {
        child.style.setProperty('display', 'none', 'important');
      }
    });
  }

  document.querySelectorAll('a').forEach(a => {
    if (a.textContent.trim().toLowerCase() === 'view raw') {
      const parentBlock = a.closest('[class*="tooLargeError"]') || a.closest('.blankslate') || a.closest('div');
      if (parentBlock && parentBlock.style.display !== 'none') {
        parentBlock.style.setProperty('display', 'none', 'important');
      } else if (a.style.display !== 'none') {
        a.style.setProperty('display', 'none', 'important');
      }
    }
  });
}

// ── Main injection (returns a Promise) ───────────────────────────────────────

function injectPreview() {
  return new Promise((resolve) => {
    // 1. Only operate on blob pages
    const match = window.location.pathname.match(/^\/[^\/]+\/[^\/]+\/blob\/[^\/]+\/(.+)$/);

    if (!match) {
      removeAllContainers();
      return resolve();
    }

    const filePath = match[1];
    const ext = getExtension(filePath);

    // 2. Async: read user config
    chrome.storage.local.get(['previewConfig'], (res) => {
      const config = res.previewConfig || DEFAULT_OPTIONS;

      // 3. Find which category this extension belongs to and whether it's enabled
      let currentCategory = null;
      let isSupported = false;

      for (const cat in DEFAULT_OPTIONS) {
        if (DEFAULT_OPTIONS[cat][ext] !== undefined) {
          currentCategory = cat;
          const userCat = config[cat] || DEFAULT_OPTIONS[cat];
          if (userCat._enabled !== false && userCat[ext] !== false) {
            isSupported = true;
          }
          break;
        }
      }

      if (!isSupported) {
        removeAllContainers();
        return resolve();
      }

      // 4. Determine raw URL
      let rawUrl = '';
      const rawButton = document.querySelector('[data-testid="raw-button"]');
      if (rawButton && rawButton.href) {
        rawUrl = rawButton.href;
      } else {
        rawUrl = window.location.href.replace('/blob/', '/raw/');
      }

      // 5. Find target container
      const targetContainer = findTargetContainer();
      if (!targetContainer) return resolve();

      // 6. Hide native elements
      hideNativeElements(targetContainer);

      // ★ CRITICAL: Re-check for existing containers INSIDE the async callback
      //   This is the second gate that prevents duplicate injection.
      const allExisting = document.querySelectorAll('#' + CONTAINER_ID);

      // If a container for this exact URL already exists and is properly parented, we're done
      for (const ec of allExisting) {
        if (ec.dataset.url === rawUrl) {
          // Remove any extra duplicates beyond this one
          let kept = false;
          allExisting.forEach(c => {
            if (c.dataset.url === rawUrl && !kept) {
              kept = true; // keep the first matching one
            } else {
              c.remove(); // remove all others (duplicates or stale)
            }
          });
          return resolve();
        }
      }

      // Remove ALL stale containers (wrong URL = leftover from previous file)
      allExisting.forEach(c => c.remove());

      // 7. Determine file type flags
      const isVideo = currentCategory === 'Video';
      const isAudio = currentCategory === 'Audio';
      const isPdf = currentCategory === 'PDF Document';
      const isImage = currentCategory === 'Image & Vectors';
      const isOffice = currentCategory === 'Office';
      const isFont = currentCategory === 'Fonts';
      const is3DModel = currentCategory === '3D Models';

      // 8. Build container
      const container = document.createElement('div');
      container.id = CONTAINER_ID;
      container.dataset.url = rawUrl;
      container.style.cssText = `
        width: 100%;
        margin-top: 16px;
        padding: 16px;
        box-sizing: border-box;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: transparent;
        border: 1px solid var(--borderColor-default, #30363d);
        border-radius: 6px;
      `;

      if (isVideo) {
        const video = document.createElement('video');
        video.src = rawUrl;
        video.controls = true;
        video.style.cssText = 'max-width:100%;max-height:80vh;border-radius:6px;outline:none;';
        container.appendChild(video);
      } else if (isAudio) {
        const audio = document.createElement('audio');
        audio.src = rawUrl;
        audio.controls = true;
        audio.style.cssText = 'width:100%;margin-top:10px;outline:none;';
        container.appendChild(audio);
      } else if (isPdf) {
        const iframe = document.createElement('iframe');
        iframe.src = rawUrl;
        iframe.style.cssText = 'width:100%;height:85vh;border:none;border-radius:6px;background:white;';
        container.appendChild(iframe);
      } else if (isOffice) {
        let officeRawUrl = rawUrl;
        if (officeRawUrl.startsWith('https://github.com/')) {
          officeRawUrl = officeRawUrl
            .replace('https://github.com/', 'https://raw.githubusercontent.com/')
            .replace('/raw/', '/')
            .replace('/refs/heads/', '/');
        }
        const sep = officeRawUrl.includes('?') ? '&' : '?';
        const noCacheUrl = `${officeRawUrl}${sep}cb=${Date.now()}`;
        const iframe = document.createElement('iframe');
        iframe.src = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(noCacheUrl)}`;
        iframe.style.cssText = 'width:100%;height:85vh;border:none;border-radius:6px 6px 0 0;background:white;display:block;';
        container.style.flexDirection = 'column';
        container.style.padding = '0';
        container.style.border = '1px solid var(--borderColor-default, #30363d)';
        container.style.overflow = 'hidden';

        const fallbackAlert = document.createElement('div');
        fallbackAlert.innerHTML = `
          <div style="padding:12px 16px;background-color:var(--bgColor-attention-muted,rgba(187,128,9,0.15));color:var(--fgColor-attention,#d29922);font-size:13px;text-align:center;border-top:1px solid var(--borderColor-default,#30363d);border-radius:0 0 6px 6px;width:100%;box-sizing:border-box;">
            <strong>Note:</strong> Microsoft Viewer cannot access private repositories. If you see an error above, <a href="${rawUrl}" download style="color:var(--fgColor-accent,#58a6ff);font-weight:bold;text-decoration:underline;">click here to download</a> natively.
          </div>
        `;
        container.appendChild(iframe);
        container.appendChild(fallbackAlert);
      } else if (isImage) {
        const img = document.createElement('img');
        img.src = rawUrl;
        img.style.cssText = 'max-width:100%;max-height:85vh;border-radius:6px;object-fit:contain;';
        container.appendChild(img);
      } else if (isFont) {
        const iframe = document.createElement('iframe');
        const fontFormat = ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : ext;
        iframe.srcdoc = `
          <!DOCTYPE html><html><head><style>
            @font-face { font-family: 'P'; src: url('${rawUrl}') format('${fontFormat}'); }
            body { font-family:'P',sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; background:transparent; color:#c9d1d9; text-align:center; padding:20px; box-sizing:border-box; }
            h1 { font-size:48px; margin-bottom:20px; font-weight:normal; }
            p { font-size:24px; line-height:1.5; max-width:800px; }
            .sizes { margin-top:30px; display:flex; flex-direction:column; gap:10px; }
          </style></head><body>
            <h1>A Quick Brown Fox Jumps Over The Lazy Dog</h1>
            <p>0 1 2 3 4 5 6 7 8 9 ! @ # $ % ^ & * ( ) _ + - = { } | [ ] \\ : " ; ' < > ? , . /</p>
            <div class="sizes">
              <span style="font-size:16px">16px: The quick brown fox jumps...</span>
              <span style="font-size:24px">24px: The quick brown fox jumps...</span>
              <span style="font-size:36px">36px: The quick brown fox jumps...</span>
            </div>
          </body></html>
        `;
        iframe.style.cssText = 'width:100%;height:60vh;border:none;border-radius:6px;background:#0d1117;';
        container.appendChild(iframe);
      } else if (is3DModel) {
        const iframe = document.createElement('iframe');
        iframe.srcdoc = `
          <!DOCTYPE html><html><head>
            <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"><\/script>
            <style>
              body { margin:0; padding:0; width:100vw; height:100vh; background:#161b22; display:flex; justify-content:center; align-items:center; }
              model-viewer { width:100%; height:100%; --poster-color:transparent; }
            </style>
          </head><body>
            <model-viewer src="${rawUrl}" auto-rotate camera-controls shadow-intensity="1" exposure="1.2" environment-image="neutral" camera-orbit="45deg 55deg auto"></model-viewer>
          </body></html>
        `;
        iframe.style.cssText = 'width:100%;height:70vh;border:none;border-radius:6px;background:#161b22;';
        container.appendChild(iframe);
      }

      // 9. ★ FINAL SAFETY CHECK: one last look before DOM insertion
      const lastCheck = document.querySelectorAll('#' + CONTAINER_ID);
      lastCheck.forEach(c => c.remove());

      // 10. Inject
      if (targetContainer.classList.contains('Box')) {
        targetContainer.parentElement.insertBefore(container, targetContainer);
      } else {
        targetContainer.prepend(container);
      }

      console.log(`[GitHub Raw Previewer] Injected ${ext} preview.`);
      resolve();
    });
  });
}

// ── Event Listeners ──────────────────────────────────────────────────────────

// Observe DOM mutations (debounced)
let lastUrl = location.href;
new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    // URL changed: clean up immediately, then schedule fresh injection
    removeAllContainers();
    scheduleInject(300);
  } else {
    // Same URL, DOM mutated (React re-render) — light debounce
    scheduleInject(150);
  }
}).observe(document.body, { childList: true, subtree: true });

// GitHub's own navigation events
document.addEventListener('turbo:load', () => scheduleInject(300));
document.addEventListener('pjax:end', () => scheduleInject(300));

// Initial
scheduleInject(400);
