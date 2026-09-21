/**
 * GitHub Raw Previewer — popup.
 *
 * Renders one collapsible section per category from the shared format registry
 * (formats.js), so the popup can never drift out of sync with the content
 * script. Everything is built with DOM APIs rather than innerHTML.
 */

(() => {
  'use strict';

  const GRP = globalThis.GRP_FORMATS;

  /** Static markup only — never interpolated with data. */
  const CARET_SVG =
    '<svg class="caret" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
    '<path fill-rule="evenodd" d="M12.78 6.22a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0L3.22 7.28a.75.75 0 011.06-1.06L8 9.94l3.72-3.72a.75.75 0 011.06 0z">' +
    '</path></svg>';

  const container = document.getElementById('categories-container');
  const versionBadge = document.getElementById('version');
  const diagnostic = document.getElementById('diagnostic');

  let config = GRP.defaultConfig();

  versionBadge.textContent = 'v' + chrome.runtime.getManifest().version;

  function save() {
    chrome.storage.local.set({ previewConfig: config });
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  function buildSwitch({ checked, label, onChange }) {
    const wrapper = document.createElement('label');
    wrapper.className = 'switch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.setAttribute('aria-label', label);
    input.addEventListener('change', (event) => onChange(event.target.checked));

    const slider = document.createElement('span');
    slider.className = 'slider';
    slider.setAttribute('aria-hidden', 'true');

    wrapper.appendChild(input);
    wrapper.appendChild(slider);
    return wrapper;
  }

  function buildCategory(category) {
    const state = config[category.key];
    const listId = `list-${category.key.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;

    const row = document.createElement('section');
    row.className = 'category-row';

    // ── Header: a real button (keyboard operable) + a sibling switch ─────────
    const header = document.createElement('div');
    header.className = 'category-header';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'category-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', listId);
    toggle.disabled = !state._enabled;

    const caret = document.createElement('span');
    caret.className = 'caret-wrap';
    caret.innerHTML = CARET_SVG;
    toggle.appendChild(caret);

    const title = document.createElement('span');
    title.className = 'category-label';
    title.textContent = category.label;
    toggle.appendChild(title);

    header.appendChild(toggle);

    const switchWrap = document.createElement('div');
    switchWrap.className = 'header-switch-wrap';
    switchWrap.appendChild(buildSwitch({
      checked: state._enabled,
      label: `Enable ${category.label} previews`,
      onChange: (checked) => {
        config[category.key]._enabled = checked;
        save();
        if (!checked) setOpen(false);
        toggle.disabled = !checked;
      },
    }));
    header.appendChild(switchWrap);

    row.appendChild(header);

    // ── Body: the per-format toggles ────────────────────────────────────────
    const list = document.createElement('div');
    list.className = 'extensions-list';
    list.id = listId;
    list.inert = true; // collapsed content must not be reachable by Tab
    list.setAttribute('aria-hidden', 'true');

    if (category.requiresConsent && category.disclosure) {
      const note = document.createElement('p');
      note.className = 'disclosure';
      note.textContent = category.disclosure;
      list.appendChild(note);
    }

    for (const ext of Object.keys(category.formats)) {
      const item = document.createElement('div');
      item.className = 'extension-item';

      const name = document.createElement('span');
      name.className = 'extension-name';
      name.textContent = `.${ext}`;
      item.appendChild(name);

      item.appendChild(buildSwitch({
        checked: state[ext],
        label: `Preview .${ext} files inline`,
        onChange: (checked) => {
          config[category.key][ext] = checked;
          save();
        },
      }));

      list.appendChild(item);
    }

    row.appendChild(list);

    function setOpen(open) {
      row.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      list.inert = !open;
      list.setAttribute('aria-hidden', String(!open));
      if (open) {
        toggle.scrollIntoView({ block: 'nearest' });
      }
    }

    toggle.addEventListener('click', () => {
      const isOpen = row.classList.contains('open');
      // Accordion: only one section open at a time.
      container.querySelectorAll('.category-row').forEach((other) => {
        if (other === row) return;
        other.classList.remove('open');
        const otherToggle = other.querySelector('.category-toggle');
        const otherList = other.querySelector('.extensions-list');
        if (otherToggle) otherToggle.setAttribute('aria-expanded', 'false');
        if (otherList) {
          otherList.inert = true;
          otherList.setAttribute('aria-hidden', 'true');
        }
      });
      setOpen(!isOpen);
    });

    return row;
  }

  function render() {
    container.replaceChildren();
    for (const category of GRP.categories) {
      container.appendChild(buildCategory(category));
    }
  }

  // ── Wiring ─────────────────────────────────────────────────────────────────

  /**
   * Surfaces the one failure the extension cannot recover from on its own:
   * GitHub renaming a container. The toolbar badge says something is wrong; this
   * says what it means. Purely local — nothing is reported anywhere.
   */
  function renderDiagnostic(state) {
    if (!state || state.ok) {
      diagnostic.hidden = true;
      return;
    }
    diagnostic.textContent =
      'The last GitHub file page could not be previewed — GitHub may have changed its markup. ' +
      'Look for an extension update; if it keeps happening, please open an issue.';
    diagnostic.hidden = false;
  }

  document.getElementById('reset').addEventListener('click', () => {
    config = GRP.defaultConfig();
    chrome.storage.local.remove('previewConfig');
    render();
  });

  chrome.storage.local.get(['previewConfig', 'lastDiagnostic'], (res) => {
    config = GRP.mergeConfig(res && res.previewConfig);
    renderDiagnostic(res && res.lastDiagnostic);
    render();
  });
})();
