/**
 * GitHub Raw Previewer — service worker.
 *
 * Deliberately tiny. It exists for one reason: a content script cannot touch
 * chrome.action, so if the preview could not be applied on a page (the classic
 * symptom of GitHub renaming something), the user needs *some* visible signal.
 * This shows a small "!" badge on the toolbar icon for that tab, and records the
 * outcome locally so the popup can explain it.
 *
 * No network requests, no telemetry, nothing leaves the machine.
 */

const BADGE_COLOR = '#d29922';
const DEFAULT_TITLE = 'GitHub Raw Previewer';

/** Last outcome per tab, so a routine success on every page load does not turn
 *  into a storage write every time. Resets when the worker is torn down, which
 *  merely costs one redundant write. */
const lastByTab = new Map();

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== 'grp-diagnostic') return;

  const record = {
    ok: !!msg.ok,
    reason: typeof msg.reason === 'string' ? msg.reason : '',
    url: typeof msg.url === 'string' ? msg.url : '',
    at: Date.now(),
  };

  const tabId = sender && sender.tab && sender.tab.id;
  const key = tabId === undefined ? 'unknown' : tabId;
  const previous = lastByTab.get(key);
  lastByTab.set(key, record);

  const unchanged = previous && previous.ok === record.ok && previous.url === record.url;
  if (unchanged) return;

  chrome.storage.local.set({ lastDiagnostic: record });

  if (tabId === undefined || !chrome.action) return;

  if (record.ok) {
    chrome.action.setBadgeText({ tabId, text: '' });
    chrome.action.setTitle({ tabId, title: DEFAULT_TITLE });
  } else {
    chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR });
    chrome.action.setBadgeText({ tabId, text: '!' });
    chrome.action.setTitle({
      tabId,
      title: 'Preview could not be applied on this page — GitHub markup may have changed. Open the popup for details.',
    });
  }
});
