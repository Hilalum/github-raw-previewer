const defaultOptions = {
    "Video": { _enabled: true, mp4: true, webm: true, ogg: true, mov: true },
    "Audio": { _enabled: true, mp3: true, wav: true, flac: true, m4a: true, aac: true },
    "Image & Vectors": { _enabled: true, webp: true, bmp: true, svg: true, tiff: true, tif: true, heic: true },
    "PDF Document": { _enabled: true, pdf: true },
    "Office": { _enabled: true, xls: true, xlsx: true, doc: true, docx: true, ppt: true, pptx: true },
    "Apple iWork": { _enabled: true, pages: true, numbers: true, key: true },
    "Fonts": { _enabled: true, ttf: true, otf: true, woff: true, woff2: true },
    "3D Models": { _enabled: true, gltf: true, glb: true, obj: true, stl: true }
};

let currentConfig = {};

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['previewConfig'], (res) => {
        // Deep merge config to handle backward compatibility and new formats
        if (!res.previewConfig) {
            currentConfig = JSON.parse(JSON.stringify(defaultOptions));
        } else {
            currentConfig = res.previewConfig;
            for (let cat in defaultOptions) {
                if (!currentConfig[cat]) currentConfig[cat] = JSON.parse(JSON.stringify(defaultOptions[cat]));
                for (let ext in defaultOptions[cat]) {
                    if (currentConfig[cat][ext] === undefined) {
                        currentConfig[cat][ext] = defaultOptions[cat][ext];
                    }
                }
            }
        }
        renderUI();
    });
});

function renderUI() {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';

    const caretSVG = `<svg class="caret" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M12.78 6.22a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0L3.22 7.28a.75.75 0 011.06-1.06L8 9.94l3.72-3.72a.75.75 0 011.06 0z"></path></svg>`;

    Object.keys(currentConfig).forEach(category => {
        const row = document.createElement('div');
        row.className = 'category-row';

        const catData = currentConfig[category];

        // Header (Category Level)
        const header = document.createElement('div');
        header.className = 'category-header';

        const titleArea = document.createElement('div');
        titleArea.className = 'category-title';
        titleArea.innerHTML = `${caretSVG} <span>${category}</span>`;

        const toggleWrap = document.createElement('div');
        toggleWrap.className = 'header-switch-wrap';

        const switchLabel = document.createElement('label');
        switchLabel.className = 'switch';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !!catData._enabled;
        const slider = document.createElement('span');
        slider.className = 'slider';

        checkbox.addEventListener('change', (e) => {
            currentConfig[category]._enabled = e.target.checked;
            saveConfig();
        });

        // Prevent expanding accordion when interacting with the toggle
        toggleWrap.addEventListener('click', (e) => e.stopPropagation());

        switchLabel.appendChild(checkbox);
        switchLabel.appendChild(slider);
        toggleWrap.appendChild(switchLabel);

        header.appendChild(titleArea);
        header.appendChild(toggleWrap);

        header.addEventListener('click', () => {
            const isCurrentlyOpen = row.classList.contains('open');
            // Close all
            document.querySelectorAll('.category-row').forEach(r => r.classList.remove('open'));
            // Toggle clicked
            if (!isCurrentlyOpen) {
                row.classList.add('open');
                // Scroll into view if needed after a tiny delay
                setTimeout(() => {
                    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 50);
            }
        });

        row.appendChild(header);

        // List (Extension Level)
        const listContainer = document.createElement('div');
        listContainer.className = 'extensions-list';

        Object.keys(catData).forEach(ext => {
            if (ext === '_enabled') return;
            const item = document.createElement('div');
            item.className = 'extension-item';

            const name = document.createElement('div');
            name.className = 'extension-name';
            name.textContent = `.${ext}`;

            const itemLabel = document.createElement('label');
            itemLabel.className = 'switch';
            const itemCheck = document.createElement('input');
            itemCheck.type = 'checkbox';
            itemCheck.checked = !!catData[ext];
            const itemSlider = document.createElement('span');
            itemSlider.className = 'slider';

            itemCheck.addEventListener('change', (e) => {
                currentConfig[category][ext] = e.target.checked;
                saveConfig();
            });

            itemLabel.appendChild(itemCheck);
            itemLabel.appendChild(itemSlider);

            item.appendChild(name);
            item.appendChild(itemLabel);
            listContainer.appendChild(item);
        });

        row.appendChild(listContainer);
        container.appendChild(row);
    });
}

function saveConfig() {
    chrome.storage.local.set({ previewConfig: currentConfig });
}
