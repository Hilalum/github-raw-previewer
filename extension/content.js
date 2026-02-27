/**
 * GitHub Raw Previewer - Content Script
 * Injects a native video player or PDF viewer into the GitHub file viewer UI.
 */

function getExtension(filename) {
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return parts[parts.length - 1].toLowerCase();
}

function injectPreview() {
  // Only operate on blob pages
  const match = window.location.pathname.match(/^\/[^\/]+\/[^\/]+\/blob\/[^\/]+\/(.+)$/);
  const existingContainer = document.getElementById('gh-raw-preview-container');

  if (!match) {
    if (existingContainer) existingContainer.remove();
    return;
  }

  const filePath = match[1];
  const ext = getExtension(filePath);

  const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
  const isAudio = ['mp3', 'wav', 'flac', 'm4a', 'aac'].includes(ext);
  const isImage = ['webp', 'bmp'].includes(ext);
  const isPdf = ['pdf'].includes(ext);
  const isSvg = ['svg'].includes(ext);
  const isOffice = ['xls', 'xlsx', 'doc', 'docx', 'ppt', 'pptx'].includes(ext);
  const isiWork = ['pages', 'numbers', 'key'].includes(ext);
  const isFont = ['ttf', 'otf', 'woff', 'woff2'].includes(ext);
  const is3DModel = ['stl', 'obj', 'gltf', 'glb'].includes(ext);

  if (!isVideo && !isAudio && !isImage && !isPdf && !isSvg && !isOffice && !isiWork && !isFont && !is3DModel) {
    if (existingContainer) existingContainer.remove();
    return;
  }

  // Calculate raw URL
  // GitHub displays LFS pointers as text if you hit raw.githubusercontent.com directly
  // It's safest to get the href from the official "Raw" button because it handles 
  // LFS redirects (to media.githubusercontent.com) automatically.
  let rawUrl = '';
  const rawButton = document.querySelector('[data-testid="raw-button"]');
  if (rawButton && rawButton.href) {
    rawUrl = rawButton.href;
  } else {
    // Fallback: convert /blob/ to /raw/
    rawUrl = window.location.href.replace('/blob/', '/raw/');
  }

  // Check if we already injected for this exact URL
  if (existingContainer) {
    if (existingContainer.dataset.url === rawUrl) return;
    // Container exists but URL doesn't match (SPA navigation), so remove it
    existingContainer.remove();
  }

  console.log(`[GitHub Raw Preview Extension] Detected ${ext} file, injecting preview...`);

  // Find a good place to inject
  // We look for the main react container that holds the file content
  const targetContainers = [
    document.querySelector('[class*="BlobContent-module__blobContentSection"]'), // new CSS modules UI
    document.querySelector('[class*="BlobViewContent-module__blobContainer"]'), // new CSS modules UI alternative
    document.querySelector('[data-testid="repos-file-display"]'), // new UI
    document.querySelector('main .Box'),                          // old UI fallback
    document.querySelector('.js-blob-wrapper')                    // older UI fallback
  ];

  const targetContainer = targetContainers.find(c => c !== null);
  if (!targetContainer) {
    console.warn('[GitHub Raw Preview Extension] Could not find suitable DOM container to inject preview.');
    return;
  }

  // Hide ALL existing file viewer message, UI, and 'View raw' links to avoid clutter and dual-rendering
  const elementsToHide = [
    targetContainer.querySelector('[data-testid="repo-file-blob"] > div > div'), // blank slate wrapper
    targetContainer.querySelector('.blankslate'),
    targetContainer.querySelector('[class*="tooLargeError"]'),
    targetContainer.querySelector('[data-testid="blob-viewer-container"]'), // New React UI
    targetContainer.querySelector('.js-blob-wrapper'), // Older UI text viewer
    targetContainer.querySelector('table.highlight'), // Raw code/text container
    targetContainer.querySelector('[data-testid="repo-file-blob"] > div') // inner blob containing text
  ];

  elementsToHide.forEach(el => {
    if (el) el.style.display = 'none';
  });

  // Specifically target any "View raw" links and hide them or their parent blocks
  Array.from(document.querySelectorAll('a')).forEach(a => {
    if (a.textContent.trim().toLowerCase() === 'view raw') {
      const parentBlock = a.closest('[class*="tooLargeError"]') || a.closest('.blankslate') || a.closest('div');
      if (parentBlock) {
        parentBlock.style.display = 'none';
      } else {
        a.style.display = 'none';
      }
    }
  });

  // Create container
  const container = document.createElement('div');
  container.id = 'gh-raw-preview-container';
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
    video.style.cssText = `
      max-width: 100%;
      max-height: 80vh;
      border-radius: 6px;
      outline: none;
    `;
    container.appendChild(video);
  } else if (isAudio) {
    const audio = document.createElement('audio');
    audio.src = rawUrl;
    audio.controls = true;
    audio.style.cssText = `
      width: 100%;
      margin-top: 10px;
      outline: none;
    `;
    container.appendChild(audio);
  } else if (isPdf || isSvg) {
    const iframe = document.createElement('iframe');
    iframe.src = rawUrl;
    iframe.style.cssText = `
      width: 100%;
      height: 85vh;
      border: none;
      border-radius: 6px;
      background: white; /* viewer expectations */
    `;
    container.appendChild(iframe);
  } else if (isOffice) {
    // Microsoft Office Viewer fails on github.com redirects. We must convert it to the direct raw.githubusercontent.com URL.
    let officeRawUrl = rawUrl;
    if (officeRawUrl.startsWith('https://github.com/')) {
      officeRawUrl = officeRawUrl.replace('https://github.com/', 'https://raw.githubusercontent.com/').replace('/raw/', '/').replace('/refs/heads/', '/');
    }

    const iframe = document.createElement('iframe');
    iframe.src = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(officeRawUrl)}`;
    iframe.style.cssText = `
      width: 100%;
      height: 85vh;
      border: none;
      border-radius: 6px 6px 0 0;
      background: white;
      display: block;
    `;
    container.style.flexDirection = 'column';
    container.style.padding = '0';
    container.style.border = '1px solid var(--borderColor-default, #30363d)';
    container.style.overflow = 'hidden';

    const fallbackAlert = document.createElement('div');
    fallbackAlert.innerHTML = `
      <div style="padding: 12px 16px; background-color: var(--bgColor-attention-muted, rgba(187,128,9,0.15)); color: var(--fgColor-attention, #d29922); font-size: 13px; text-align: center; border-top: 1px solid var(--borderColor-default, #30363d); border-radius: 0 0 6px 6px; width: 100%; box-sizing: border-box;">
        <strong>Note:</strong> Microsoft Viewer cannot access private repositories. If you see an error above, <a href="${rawUrl}" download style="color: var(--fgColor-accent, #58a6ff); font-weight: bold; text-decoration: underline;">click here to download</a> natively.
      </div>
    `;
    container.appendChild(iframe);
    container.appendChild(fallbackAlert);
  } else if (isiWork) {
    // Graceful fallback for iWork since there is no web viewer. 
    container.style.cssText = `
      width: 100%;
      margin-top: 16px;
      padding: 40px 20px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background-color: var(--bgColor-muted, #0d1117);
      border: 1px dashed var(--borderColor-default, #30363d);
      border-radius: 6px;
      text-align: center;
    `;
    const message = document.createElement('div');
    message.innerHTML = `
      <h3 style="margin-bottom: 8px; color: var(--fgColor-default, #c9d1d9);">🍏 Apple iWork File Captured</h3>
      <p style="color: var(--fgColor-muted, #8b949e); margin-bottom: 16px; max-width: 500px;">
        Web browsers cannot natively preview <strong>.pages</strong>, <strong>.numbers</strong>, or <strong>.keynote</strong> files. The extension has successfully prevented the forced download.
      </p>
      <div style="display: flex; gap: 12px; justify-content: center;">
         <a href="https://icloud.com" target="_blank" style="padding: 6px 12px; background-color: var(--bgColor-default, #21262d); color: var(--fgColor-default, #c9d1d9); text-decoration: none; border: 1px solid var(--borderColor-default, #30363d); border-radius: 6px; font-weight: 500;">Open iCloud</a>
         <a href="${rawUrl}" download style="padding: 6px 12px; background-color: #238636; color: white; text-decoration: none; border: 1px solid rgba(240, 246, 252, 0.1); border-radius: 6px; font-weight: 500;">Download File</a>
      </div>
    `;
    container.appendChild(message);
  } else if (isImage) {
    const img = document.createElement('img');
    img.src = rawUrl;
    img.style.cssText = `
      max-width: 100%;
      max-height: 85vh;
      border-radius: 6px;
      object-fit: contain;
    `;
    container.appendChild(img);
  } else if (isFont) {
    const iframe = document.createElement('iframe');
    const fontFormat = ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : ext;
    const srcDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @font-face {
            font-family: 'CustomPreviewFont';
            src: url('${rawUrl}') format('${fontFormat}');
          }
          body {
            font-family: 'CustomPreviewFont', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: transparent;
            color: #c9d1d9;
            text-align: center;
            padding: 20px;
            box-sizing: border-box;
          }
          h1 { font-size: 48px; margin-bottom: 20px; font-weight: normal; }
          p { font-size: 24px; line-height: 1.5; max-width: 800px; }
          .sizes { margin-top: 30px; display: flex; flex-direction: column; gap: 10px; }
        </style>
      </head>
      <body>
        <h1>A Quick Brown Fox Jumps Over The Lazy Dog</h1>
        <p>0 1 2 3 4 5 6 7 8 9 ! @ # $ % ^ & * ( ) _ + - = { } | [ ] \ : " ; ' < > ? , . /</p>
        <div class="sizes">
          <span style="font-size: 16px;">16px: The quick brown fox jumps...</span>
          <span style="font-size: 24px;">24px: The quick brown fox jumps...</span>
          <span style="font-size: 36px;">36px: The quick brown fox jumps...</span>
        </div>
      </body>
      </html>
    `;
    iframe.srcdoc = srcDoc;
    iframe.style.cssText = `
      width: 100%;
      height: 60vh;
      border: none;
      border-radius: 6px;
      background: #0d1117;
    `;
    container.appendChild(iframe);
  } else if (is3DModel) {
    const iframe = document.createElement('iframe');
    const srcDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
        <style>
          body {
            margin: 0;
            padding: 0;
            width: 100vw;
            height: 100vh;
            background: #161b22;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          model-viewer {
            width: 100%;
            height: 100%;
            --poster-color: transparent;
          }
        </style>
      </head>
      <body>
        <model-viewer src="${rawUrl}" auto-rotate camera-controls shadow-intensity="1" exposure="1.2" environment-image="neutral" camera-orbit="45deg 55deg auto"></model-viewer>
      </body>
      </html>
    `;
    iframe.srcdoc = srcDoc;
    iframe.style.cssText = `
      width: 100%;
      height: 70vh;
      border: none;
      border-radius: 6px;
      background: #161b22;
    `;
    container.appendChild(iframe);
  }

  // Inject it
  // Prepend inside the file container so it shows immediately below the toolbar
  if (targetContainer.classList.contains('Box')) {
    targetContainer.parentElement.insertBefore(container, targetContainer);
  } else {
    targetContainer.prepend(container);
  }
}

// Observe URL changes for SPAs (GitHub's React routing)
let lastUrl = location.href;
new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    // Allow React some time to render the new page
    setTimeout(injectPreview, 500);
  } else {
    // If not a URL change, maybe DOM just loaded the target nodes
    injectPreview();
  }
}).observe(document.body, { childList: true, subtree: true });

// Listen to GitHub's custom page load events
document.addEventListener('turbo:load', () => setTimeout(injectPreview, 500));
document.addEventListener('pjax:end', () => setTimeout(injectPreview, 500));

// Initial attempt
setTimeout(injectPreview, 500);
