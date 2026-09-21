# Privacy Policy — GitHub Raw Previewer

**Last updated: 2026-03-06**

This policy covers the **GitHub Raw Previewer** browser extension (version 2026.3.6, Manifest V3) for Chrome and Microsoft Edge. It is written to be read by anyone, not only lawyers.

Source code and full history: <https://github.com/Hilalum/github-raw-previewer> (MIT licensed).

---

## 1. Summary

- **We collect no data.** Not personal data, not usage data, nothing.
- **There are no analytics, no telemetry, no crash reporting and no ads.**
- **We operate no servers.** The extension has no backend, no account system and no sign-in.
- **We do not sell, rent or share data with anyone.** We have nothing to sell and no way to receive it.
- **One exception, and it is always your choice:** Office documents are rendered by Microsoft's hosted viewer. Nothing is sent to Microsoft unless you click a button that asks for your permission first. See section 5.

## 2. What the extension does

GitHub normally forces certain file types to download instead of showing them. GitHub Raw Previewer adds an inline preview inside GitHub's own file view for the formats it supports, so you can play or open a file without leaving the page.

The 20 supported formats are:

| Category | Formats |
| --- | --- |
| Video | `.mp4` `.webm` `.ogg` `.mov` |
| Audio | `.mp3` `.wav` `.flac` `.m4a` `.aac` |
| Images | `.bmp` |
| Office documents | `.doc` `.docx` `.xls` `.xlsx` `.ppt` `.pptx` |
| Fonts | `.ttf` `.otf` `.woff` `.woff2` |

PDF, SVG, CSV, Markdown and code files are deliberately not handled, because GitHub already previews them itself. TIFF and HEIC are not handled because Chrome has no decoder for them. 3D `.glb` files are not handled.

## 3. What data we collect

**None.**

The extension does not collect, read, store on our side or transmit to us:

- personally identifiable information, names, email addresses or account details;
- health, financial or payment information;
- authentication information — the extension never asks you to sign in and has no access to your GitHub credentials or tokens;
- personal communications;
- location data;
- web history or browsing history;
- user activity (clicks, keystrokes, mouse movement, scrolling);
- website content.

The extension makes **no network request of its own**. All media, images and fonts you preview are fetched by your own browser, directly from GitHub's own file hosts. We never sit in the middle of that connection, so we never see the files you open or the repositories you visit.

There is no account, no licence key, no activation and no "phone home" on install or on startup.

## 4. Permissions we ask for, and exactly why

The extension requests **two** API permissions and **two** host permissions. Each one is used for the single, narrow purpose described here.

### API permissions

**`declarativeNetRequest`** — used to modify the response headers of files served from GitHub's two raw-file hosts (see below). Two things happen:

1. The `Content-Disposition: attachment` response header is **removed**, so a raw file link opens in the tab instead of triggering a download.
2. For `.mp4` files only, the `Content-Type` header is **forced to `video/mp4`**, because GitHub's raw host serves those files with a media type that prevents playback.

These header changes apply **only** to responses from `raw.githubusercontent.com` and `media.githubusercontent.com`. The extension cannot read, modify or block requests to any other site, and declarativeNetRequest rules are static: the extension does not observe your traffic, and no request data is logged or reported anywhere.

**`storage`** — used to save your own settings on your own machine. See section 6.

### Host permissions

- `https://raw.githubusercontent.com/*`
- `https://media.githubusercontent.com/*`

These are GitHub's raw-file hosts, and they are the only two hosts the extension is allowed to act on. The extension does **not** request access to `github.com` as a host permission.

The extension does include a content script that runs on `https://github.com/*` pages. A content script declared this way lets the extension draw the preview panel inside the page you are already looking at; it does not grant host permission over that origin, and the extension does not modify GitHub requests anywhere except the two raw-file hosts listed above.

Nothing about your GitHub session, your cookies, your repositories or your files is read, collected or sent anywhere.

## 5. The one exception: Microsoft's Office viewer (opt-in only)

This is the only situation in which anything about the file you are viewing leaves your browser for a third party, so it is described in full.

Six formats — `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt` and `.pptx` — cannot be rendered by Chrome itself. For those files, the extension shows a card with an explanation and a button labelled **"Load Microsoft viewer"**.

- **Nothing is sent to Microsoft until you click that button.** The preview is never loaded automatically, and never in the background.
- When you do click, the file's URL is passed to Microsoft's hosted viewer at **`view.officeapps.live.com`**, which fetches the file from GitHub and renders it inside the page. From that moment the request is between your browser, GitHub and Microsoft.
- For a file in a **private repository**, the raw URL may include a **short-lived access token**. That token is part of the URL, so it would be included in the request to Microsoft. It expires quickly and grants access only to that file. Microsoft's handling of it is governed by Microsoft's own privacy statement, not by this one.
- **You can avoid this entirely.** The "Office documents" category can be switched off in the extension's settings. While it is off, Office files are not previewed at all, the button is never shown, and **no URL is ever sent to Microsoft**. The same is true if you simply never click the button.

Apart from this one Microsoft viewer, the extension sends nothing to anyone. This is why the Office preview requires a click rather than happening silently.

## 6. What is stored on your device

Two small pieces of information are stored locally, using the browser's `chrome.storage.local` area on your own computer:

1. **Your configuration** — which format categories and which individual formats are enabled.
2. **Diagnostic state** — whether the preview was applied on the last page you visited, so that the extension's own popup can tell you what happened.

Both are stored **only on your machine**. They are not synced to other devices, not uploaded, not transmitted anywhere, and not visible to us — we have no server that could receive them. The diagnostic state is shown only to you, only inside the extension's own popup.

Uninstalling the extension removes this data, because the browser deletes the extension's local storage with it.

## 7. What we never do

- We do not sell, rent, trade or share any data with third parties. We never have any data to share.
- We do not use data for advertising, profiling, credit or lending decisions, or any purpose unrelated to the extension's single function.
- We do not use or transfer data for purposes that are unrelated to the extension's core functionality, or to determine creditworthiness.
- We do not load or execute remote code. Every line the extension runs is inside the package you installed from the store, which is what the Chrome Web Store's Manifest V3 rules require.
- We do not run servers, so there is no data retention period to describe: no data is ever received, so no data is retained.

## 8. Your control

Everything the extension does is optional and reversible:

- Turn off individual formats or a whole category, including Office documents, in the extension's settings at any time.
- Disable or remove the extension at any time — the header rules stop applying immediately and the locally stored settings are deleted by the browser.

No request, email or form is needed to exercise any of this, because there is no account and no data held about you.

## 9. Children's privacy

The extension does not collect data from anyone, including children. It has no user accounts, no messaging and no user-generated content.

## 10. Changes to this policy

If the extension's behaviour changes in a way that affects privacy — for example, if a new file format is added that requires a third-party renderer, or a permission is added or removed — this page will be updated and the "Last updated" date at the top will change. The current version of this policy always applies to the current released version of the extension, and past versions remain visible in the repository's history.

## 11. Contact

Questions about this policy or the extension:

- Open an issue at <https://github.com/Hilalum/github-raw-previewer/issues>

## 12. License

The extension is released under the **MIT License**. Its source code is public, so every claim on this page can be verified directly in the repository at <https://github.com/Hilalum/github-raw-previewer>.
