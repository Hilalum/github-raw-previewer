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
  if (!match) return;

  const filePath = match[1];
  const ext = getExtension(filePath);

  const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
  const isPdf = ['pdf'].includes(ext);
  const isSvg = ['svg'].includes(ext);

  if (!isVideo && !isPdf && !isSvg) return;

  // Don't inject if already injected
  if (document.getElementById('gh-raw-preview-container')) return;

  console.log(`[GitHub Raw Preview Extension] Detected ${ext} file, injecting preview...`);

  // Calculate raw URL
  // Convert /user/repo/blob/branch/path -> https://raw.githubusercontent.com/user/repo/branch/path
  const parts = window.location.pathname.split('/');
  parts.splice(3, 1); // remove 'blob'
  const rawPath = parts.filter(Boolean).join('/');
  const rawUrl = `https://raw.githubusercontent.com/${rawPath}`;

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

  // Hide the existing file viewer message and 'View raw' links to avoid clutter
  const blankStateOrError = targetContainer.querySelector('[data-testid="repo-file-blob"] > div > div') || targetContainer.querySelector('.blankslate') || targetContainer.querySelector('[class*="tooLargeError"]');
  if (blankStateOrError) {
    blankStateOrError.style.display = 'none';
  }

  // Specifically target any "View raw" links and hide them or their parent blocks
  Array.from(document.querySelectorAll('a')).forEach(a => {
    if (a.textContent.trim().toLowerCase() === 'view raw') {
      const parentBlock = a.closest('[class*="tooLargeError"]') || a.closest('div');
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
  } else if (isPdf || isSvg) {
    const iframe = document.createElement('iframe');
    iframe.src = rawUrl;
    iframe.style.cssText = `
      width: 100%;
      height: 85vh;
      border: none;
      border-radius: 6px;
      background: white; /* PDF viewer often expects light background */
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
