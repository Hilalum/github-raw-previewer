<div align="center">
  <img src="icon_full.png" alt="GitHub Raw Previewer Logo" width="160" />

  # 👁️ GitHub Raw Previewer

  <p><b>Native, zero-click media and document previews directly inside GitHub's file explorer.</b></p>

  <p>
    <a href="https://github.com/Hilalum/github-raw-previewer/stargazers"><img src="https://img.shields.io/github/stars/Hilalum/github-raw-previewer?style=for-the-badge&color=ffd700&label=Stars" alt="Stars"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License: MIT"></a>
    <img src="https://img.shields.io/badge/Manifest-V3-brightgreen.svg?style=for-the-badge" alt="Manifest V3">
    <a href="https://chromewebstore.google.com/detail/github-raw-previewer/bojogbccnklgbfdcafbhinglmcahckmn"><img src="https://img.shields.io/badge/Chrome_Web_Store-Available_Now-green.svg?style=for-the-badge" alt="Chrome Web Store"></a>
    <a href="https://github.com/Hilalum/github-raw-previewer/releases"><img src="https://img.shields.io/github/v/release/Hilalum/github-raw-previewer?style=for-the-badge&color=2ea44f" alt="Latest Release"></a>
  </p>

  [**English**](./README.md) • [**简体中文 (Chinese)**](./README_zh.md)

  <br/>
</div>

## 💡 The problem

When you open a large or unusual file on GitHub — an MP4, a lossless audio track, a high-resolution
image or an Office document — you get a blank "View Raw" placeholder. Clicking it hands you to
`raw.githubusercontent.com`, which sends `Content-Disposition: attachment` and triggers a **forced
download**. Now your `Downloads/` folder is full of files you only wanted to glance at.

## 🚀 The solution

**GitHub Raw Previewer** is a lightweight Chrome/Edge extension (Manifest V3) that removes that
forced-download header and injects a native player or viewer straight into GitHub's file view.

* Media, images and fonts are loaded **directly from GitHub by your own browser** — no third-party
  proxy, no re-hosting, nothing to slow down.
* The one exception is the Office preview, which is opt-in per file and clearly labelled — see
  [Privacy](#-privacy).

## ✨ Core features

* **⚡️ Zero-click inline preview** — the placeholder is replaced by the real player as soon as the
  file opens.
* **🛡️ Manifest V3** — a three-rule `declarativeNetRequest` ruleset, `storage`, and that's it.
* **🌐 Truly native rendering** — your browser's own `<video>`/`<audio>`/image pipeline, GPU included.
* **🔗 Honest fallbacks** — if a file cannot be decoded (or lives in a private repository), you get a
  clear message and a direct download link instead of an empty black box.
* **🎛️ Per-format control** — switch off any category or any single extension from the popup, and the
  change applies to open tabs immediately.

---

## 📂 Supported formats

Install the extension, then click any sample below to watch it render in place.

| Category | Formats | Live demos |
| :--- | :--- | :--- |
| **🎥 Video** | `.mp4`, `.webm`, `.ogg`, `.mov` | [`test.mp4`](./test_files/test.mp4) • [`test.webm`](./test_files/test.webm) • [`test.mov`](./test_files/test.mov) |
| **🎵 Audio** | `.mp3`, `.wav`, `.flac`, `.m4a`, `.aac` | [`test.mp3`](./test_files/test.mp3) • [`test.wav`](./test_files/test.wav) • [`test.flac`](./test_files/test.flac) |
| **🖼️ Images** | `.bmp` | [`test.bmp`](./test_files/test.bmp) |
| **📊 Office** | `.doc`, `.docx`, `.ppt`, `.pptx`, `.xls`, `.xlsx` | [`test.doc`](./test_files/test.doc) • [`test.docx`](./test_files/test.docx) • [`test.ppt`](./test_files/test.ppt) • [`test.pptx`](./test_files/test.pptx) • [`test.xls`](./test_files/test.xls) • [`test.xlsx`](./test_files/test.xlsx) |
| **🅰️ Fonts** | `.ttf`, `.otf`, `.woff`, `.woff2` | [`test.ttf`](./test_files/test.ttf) • [`test.otf`](./test_files/test.otf) • [`test.woff`](./test_files/test.woff) • [`test.woff2`](./test_files/test.woff2) |

Two notes on that table:

* `.ogg`, `.m4a` and `.aac` are supported but ship without a sample file in this repository, so they
  have no demo link.
* The font samples are Adobe **Source Code Pro**, used under the SIL Open Font License — see
  [`test_files/SourceCodePro-LICENSE.md`](./test_files/SourceCodePro-LICENSE.md).

### Deliberately *not* supported

* **PDF, SVG, CSV, Markdown, CommonMark and code** — GitHub already previews these natively. The
  extension stays out of the way instead of fighting GitHub's own viewer.
* **TIFF (`.tif`/`.tiff`) and HEIC (`.heic`)** — Chrome has no decoder for either, so an in-page
  preview is impossible without shipping a decoder library. They are not offered as a toggle.
* **3D models (`.glb`)** — the previous third-party renderer was removed to comply with the Chrome
  Web Store's Manifest V3 "no remotely hosted code" rule. Use *Download* / *Open raw* instead.

---

## 🔒 Privacy

The full policy is in [PRIVACY.md](./PRIVACY.md). In short:

* No servers, no analytics, no telemetry. The extension makes no network request of its own.
* Video, audio, images and fonts are fetched **by your browser, from GitHub**, exactly as if you had
  opened the raw URL in a tab.
* **Office documents are the one exception.** They are rendered by Microsoft's hosted viewer, so
  loading that preview sends the file's URL to `view.officeapps.live.com`. Because of that:
  * nothing is sent until you click **Load Microsoft viewer** on the specific file, and
  * for a private repository that URL may include a short-lived access token.

  If you never want that to happen, leave the **Office documents** category switched off.
* Permissions requested: `declarativeNetRequest` (to drop the forced-download header on
  `raw.githubusercontent.com` and `media.githubusercontent.com` only) and `storage` (to remember your
  toggles).

---

## 🛠️ Installation

### From the Chrome Web Store
1. Open the [Chrome Web Store listing](https://chromewebstore.google.com/detail/github-raw-previewer/bojogbccnklgbfdcafbhinglmcahckmn).
2. Click **Add to Chrome**.
3. Refresh any open GitHub tabs.

### Manually from a release (.zip)
1. Grab the latest `github-raw-previewer-vX.X.X.zip` from
   [Releases](https://github.com/Hilalum/github-raw-previewer/releases).
2. Extract it into a permanent folder. The zip contains the *contents* of `extension/`, so
   `manifest.json` sits at the root of the extracted folder — that folder is what you load.
3. Open `chrome://extensions` (or `edge://extensions`) and enable **Developer mode**.
4. Click **Load unpacked** and select that extracted folder.
5. Refresh your GitHub tabs.

Edge users can install the Chrome build too. If Edge refuses, enable **Allow extensions from other
stores** first.

### From source
```bash
git clone https://github.com/Hilalum/github-raw-previewer.git
npm run check       # static consistency checks (9 groups, no dependencies)
npm run check:dom   # optional: check the GitHub DOM contract against the live site
```
Then load the `extension/` folder as an unpacked extension.

---

## 👨‍💻 Under the hood

The extension is five small files doing five jobs: `rules.json` (network), `content.js` (DOM),
`selectors.js` (the GitHub markup contract), `formats.js` (the supported-format registry), and
`background.js` (the toolbar diagnostic badge).

### GitHub's markup is the real risk here

This extension reads GitHub's DOM, and that DOM is undocumented and changes without notice. So every
GitHub selector lives in exactly one file — `extension/selectors.js` — and nothing else is allowed to
name one (enforced by `npm run check`, which also refuses to let `injection.css` hide anything the
contract does not declare).

On top of that, `npm run check:dom` asserts the contract against **real GitHub pages** — a media
blob, a font blob and a markdown blob — and CI runs it daily, because a GitHub redesign ships without
a commit here. It needs no browser: the load-bearing containers are present in GitHub's
server-rendered HTML, so the canary is a plain `fetch` plus substring checks. When GitHub renames
something, the canary names the missing fragment and the fix is a one-line edit to `selectors.js`.

The markdown page is in that set deliberately: it asserts our hide selectors do **not** match a page
GitHub already previews natively, so a selector that is too broad can never silently blank out
content.

### When it cannot preview, it says so

If GitHub's markup moves under us, the extension does not fail silently:

* GitHub's own view is restored. Hiding is always reversible, and the pre-paint hiding is switched
  off again, so a failed preview can never leave you staring at an empty file view.
* A small `!` badge appears on the toolbar icon for that tab, and the popup explains what happened.

All of that state stays on your machine — there is no telemetry anywhere.

### Injection lifecycle

`content.js` renders synchronously from a config cache kept fresh by `chrome.storage.onChanged`, so a
DOM mutation never triggers an IPC round trip. The `MutationObserver` only compares the route and
schedules work (debounced, with a ceiling so continuous re-rendering cannot starve it), and on
non-blob pages it is disconnected entirely — a single route comparison every two seconds replaces
per-mutation work, so pull requests and settings pages cost nothing.

The stylesheet loads at `document_start` and hides GitHub's placeholder only while the route is a
supported blob page, which removes the old flash of "View raw" before the preview appears. The
connection to GitHub's file host is warmed with `preconnect` — deliberately not a speculative
`preload`, which would burn your bandwidth on a possibly huge video the moment the page opens.

### The ruleset is intentionally tiny

`rules.json` grew to twelve rules and then measurement showed almost all of them did nothing. Each
claim below was checked against `raw.githubusercontent.com` and against a real Chromium build:

| What was believed | What was measured | Consequence |
| :--- | :--- | :--- |
| `<video>`/`<audio>` need the right `Content-Type` | Chrome sniffs the container: files served as `application/octet-stream` parse and play identically | Per-format `Content-Type` rules for webm/mov/mp3/bmp/tiff deleted |
| `Content-Disposition: attachment` blocks inline media | Media elements ignore it entirely | Keeping the header rules for `media`/`xmlhttprequest` was pointless |
| Fonts need a `font/*` MIME type | GitHub serves them as `text/plain`; Chrome loads them anyway | Font rules deleted |
| `excludedRegexFilter` skips `?download=true` | **Not a real `declarativeNetRequest` key.** Silently ignored since day one | Replaced with a real higher-priority `allow` rule |
| `urlFilter: "/*.mp4*"` targets `.mp4` files | Substring matching also rewrote `/clip.mp4.txt`, `/get?q=clip.mp4`, `/docs.mp4/readme.txt` | All urlFilters replaced by host- and path-anchored `regexFilter`s |
| `requestDomains` limits rules to GitHub | It is Chrome 101+. Older browsers ignore the key and apply the rule to **every** domain | Hosts are encoded in the regex itself, so there is nothing to ignore |

What survives is what measurement justified:

1. `allow` + `?download=true` — an explicit download is left alone.
2. Drop `Content-Disposition` on `main_frame` for the two GitHub file hosts, so opening a raw link
   shows the file instead of downloading it.
3. Force `video/mp4` for `.mp4` only — GitHub serves it as `application/octet-stream`, which a
   top-level navigation would otherwise download.

### Why every viewer runs in the extension's own origin

Every rich preview — video, audio, Office documents and fonts — is rendered by a small page that
ships with the extension (`viewer-media.html`, `viewer-office.html`, `viewer-font.html`, all declared
in `web_accessible_resources`) and framed by the content script.

That is not a stylistic choice. GitHub's CSP on blob pages is strict, and it blocks the obvious
approach of injecting the player straight into the page:

| Directive | What GitHub sends | Consequence for a directly injected element |
| :--- | :--- | :--- |
| `media-src` | `github.com user-images… gist.github.com github.githubassets.com` | **no `raw.githubusercontent.com`** → `<video>`/`<audio>` are blocked, and Chrome reports it as `MEDIA_ELEMENT_ERROR: Format error`, which looks like a codec bug and is not |
| `font-src` | `github.githubassets.com` | a font loaded from the page context is blocked |
| `frame-src` | `viewscreen.githubusercontent.com notebooks.githubusercontent.com` | an iframe aimed at Microsoft's viewer is blocked |
| `img-src` | includes `*.githubusercontent.com` | images are allowed, so they are still injected directly |

An extension-origin frame is governed by the extension's own CSP instead, so all four work while
GitHub's policy is left completely untouched: **the extension never modifies GitHub's own
responses.** Verified against the live site — the video plays (readyState 4, 320×240), audio plays,
and the Office viewer mounts only after the consent click.

The same reasoning is why the font specimen is a packaged page rather than an inline `srcdoc`
document: `srcdoc` inherits the embedding page's CSP, which is what forced older versions to strip
CSP headers from every GitHub page.

### Injection lifecycle

`content.js` renders synchronously from a config cache kept fresh by `chrome.storage.onChanged`, so a
DOM mutation never triggers an IPC round trip. Hiding of GitHub's native placeholder is reversible:
every element the extension hides is recorded and restored on teardown, so switching a format off
mid-page gives you GitHub's own view back.

### Layout

| Path | Role |
| :--- | :--- |
| `extension/formats.js` | Which formats are supported, and how each is rendered |
| `extension/selectors.js` | Every GitHub selector, with verification status and provenance |
| `extension/content.js` | The injection lifecycle |
| `extension/viewer-*.html` / `viewer-*.js` | Media, Office and font viewers — they must run in the extension's own origin |
| `extension/rules.json` | The three network rules |
| `extension/injection.css` | Pre-paint hiding of GitHub's placeholder |
| `extension/background.js` | The toolbar diagnostic badge |
| `tools/` | Zero-dependency checks: consistency, packaging, DOM canary, self-test |

---

## 🤝 Contributing & feedback

Found a bug or a format worth adding? Issues and pull requests are welcome. Adding a format means
editing **one** table (`extension/formats.js`) — the popup, the content script, the consistency
checks and the docs all derive from it.

## 📄 License

Released under the [MIT License](./LICENSE).
