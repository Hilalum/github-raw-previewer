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
    document.querySelector('[data-testid="repos-file-display"]'), // new UI
    document.querySelector('main .Box'),                          // old UI fallback
    document.querySelector('.js-blob-wrapper')                    // older UI fallback
  ];

  const targetContainer = targetContainers.find(c => c !== null);
  if (!targetContainer) {
    console.warn('[GitHub Raw Preview Extension] Could not find suitable DOM container to inject preview.');
    return;
  }

  // Hide the existing file viewer message to avoid clutter
  // In new UI, it's often inside a container with 'repos-file-display'
  const blankStateOrError = targetContainer.querySelector('[data-testid="repo-file-blob"] > div > div') || targetContainer.querySelector('.blankslate');
  if (blankStateOrError && blankStateOrError.textContent.includes('display')) {
    blankStateOrError.style.display = 'none';
  }

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

  // Add a dedicated download button next to the preview
  const actionsContainer = document.createElement('div');
  actionsContainer.style.cssText = `
    display: flex;
    justify-content: flex-end;
    width: 100%;
    margin-bottom: 8px;
  `;

  const downloadBtn = document.createElement('a');
  // Add a '?download=true' hint to the url
  downloadBtn.href = rawUrl + (rawUrl.includes('?') ? '&' : '?') + 'download=true';
  downloadBtn.textContent = '⬇️ Force Download';
  downloadBtn.style.cssText = `
    display: inline-block;
    padding: 5px 16px;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    white-space: nowrap;
    vertical-align: middle;
    cursor: pointer;
    user-select: none;
    border: 1px solid var(--button-default-borderColor-rest, rgba(205, 217, 229, 0.1));
    border-radius: 6px;
    appearance: none;
    color: var(--button-default-fgColor-rest, #c9d1d9);
    background-color: var(--button-default-bgColor-rest, #21262d);
    text-decoration: none;
  `;

  downloadBtn.addEventListener('mouseover', () => { downloadBtn.style.backgroundColor = 'var(--button-default-bgColor-hover, #30363d)'; });
  downloadBtn.addEventListener('mouseout', () => { downloadBtn.style.backgroundColor = 'var(--button-default-bgColor-rest, #21262d)'; });
  // Force click to prompt download bypass mechanism
  downloadBtn.setAttribute('download', '');

  actionsContainer.appendChild(downloadBtn);

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width: 100%; margin-top: 16px;';

  wrapper.appendChild(actionsContainer);
  wrapper.appendChild(container);

  // Update container style to remove top margin as it's now wrapped
  container.style.marginTop = '0';

  // Inject it
  // Prepend inside the file container so it shows immediately below the toolbar
  if (targetContainer.classList.contains('Box')) {
    targetContainer.parentElement.insertBefore(wrapper, targetContainer);
    // targetContainer.style.display = 'none'; // Optional: hide the box entirely
  } else {
    targetContainer.prepend(wrapper);
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
