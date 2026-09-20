# Chrome Web Store listing — GitHub Raw Previewer

Working copy for the Chrome Web Store (and Microsoft Edge Add-ons) listing of **GitHub Raw Previewer** v2026.3.6.

Everything in the "Listing copy" section below describes **only the shipped feature set**. The extension previews 20 formats across 5 categories: video, audio, BMP images, Office documents and fonts. It does **not** preview PDF, SVG, CSV, Markdown, code files, TIFF, HEIC or 3D `.glb` files, and no listing text may claim otherwise.

---

## 1. Listing copy

### 1a. Short description

> Preview videos, audio, Office docs, fonts and BMP images inline on GitHub. No forced downloads, no servers, no tracking.

**Character count: 120** (store limit: 132 — 12 characters of headroom, leaving room for small edits without breaking the limit).

The count is the length of the single line inside the block quote above, including spaces and punctuation, with no trailing newline. If the text is edited, recount it before publishing; the store rejects anything over 132.

### 1b. Detailed description

**GitHub Raw Previewer — stop forced downloads in GitHub's file view**

GitHub sometimes refuses to show you a file and downloads it instead. This extension fixes that: 20 file formats now open inline, right inside GitHub's own file view, without any proxy and without leaving the page.

**What you get**

- **Video** — `.mp4` `.webm` `.ogg` `.mov`
- **Audio** — `.mp3` `.wav` `.flac` `.m4a` `.aac`
- **Images** — `.bmp`
- **Office documents** — `.doc` `.docx` `.xls` `.xlsx` `.ppt` `.pptx`
- **Fonts** — `.ttf` `.otf` `.woff` `.woff2`

That is **20 formats across 5 categories**, each one switchable on or off.

**How it works**

The extension removes the `Content-Disposition: attachment` header that GitHub sends for these files, so the file opens in your tab instead of downloading. For `.mp4`, it also corrects the served media type so the video actually plays. That is the whole mechanism — small, static and transparent.

- **No proxy.** Your browser fetches the file directly from GitHub. The extension never sits between you and the file.
- **No servers of ours.** There is no backend, no account, no sign-in.
- **No tracking.** No analytics, no telemetry, no ads.
- **No remote code.** Every line that runs is inside the installed package, as Manifest V3 requires.
- **Tiny and dependency-free.** About 50 KB of plain JavaScript and CSS, with zero third-party libraries.

**Office documents: your call, never automatic**

Chrome cannot render Office files on its own, so those six formats are the one case that uses an outside renderer. The extension shows the file behind a **"Load Microsoft viewer"** button and explains, on the card itself, that continuing sends the file's link to Microsoft at `view.officeapps.live.com`. Nothing is ever sent until you click. You can also switch the "Office documents" category off entirely — then Office files are not previewed at all and no link is ever sent to Microsoft. (Note: Microsoft's viewer cannot open files from private repositories; for those, use the download link the extension offers.)

**Your settings stay on your machine**

Which formats are enabled is saved locally in your browser and never uploaded or synced. Full detail, including exactly which permissions are used and why, is in the privacy policy: <https://github.com/Hilalum/github-raw-previewer/blob/main/PRIVACY.md>

**What this extension does not do**

- It does not preview **PDF, SVG, CSV, Markdown or code files** — GitHub already previews those itself, so there is nothing to fix.
- It does not preview **TIFF or HEIC** — Chrome has no decoder for them.
- It does not preview **3D `.glb` files**. An earlier third-party 3D renderer was removed to comply with the Chrome Web Store's Manifest V3 rule against remotely hosted code, and it has not been restored.

**Who it is for**

Developers and reviewers who read repositories in the browser, share raw asset links with teammates, or check a build artefact without cloning the repo. If GitHub keeps handing you a download prompt for a clip, a voice memo, a spreadsheet or a font file, this is the extension that makes it just open.

Open source, MIT licensed: <https://github.com/Hilalum/github-raw-previewer>

### 1c. Suggested category and metadata

- **Category:** Developer Tools
- **Language:** English
- **Version to enter:** `2026.3.6` (must match `extension/manifest.json`)

---

## 2. Data usage declaration

Answers to the Chrome Web Store "Data usage" form for this extension. The developer dashboard also asks you to certify a set of statements; those certifications are listed after the categories.

### 2a. Category-by-category answers

| Data-usage category | Answer to declare | Why |
| --- | --- | --- |
| Personally identifiable information | **Not collected** | The extension has no account system and no way to identify a user. No network request of its own is ever made. |
| Health information | **Not collected** | Not applicable to the extension's single function. |
| Financial and payment information | **Not collected** | No payments, no purchases, no billing of any kind. |
| Authentication information | **Not collected** | No sign-in, no credentials, no OAuth. The extension never reads or stores GitHub tokens. (See the note in 2b about the private-repo URL.) |
| Personal communications | **Not collected** | The extension does not read mail, chat, messages or any user-authored text. |
| Location | **Not collected** | Location is never requested or inferred. |
| Web history | **Not collected** | No browsing history is read, logged or transmitted. The extension acts only on responses from two GitHub file hosts. |
| User activity | **Not collected** | No clicks, keystrokes, scrolls or mouse movement are recorded, aggregated or reported. |
| **Website content** | **Borderline — declare the Office path** | See 2b below. This is the one category that genuinely needs a judgement call. |

### 2b. The borderline category: **Website content**

**This is the only answer on the form that is not a plain "no", and it deserves a written explanation rather than a bare checkbox.**

Why it is borderline: for `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt` and `.pptx`, the extension hands the document's URL to Microsoft's hosted viewer at `view.officeapps.live.com` so the document can be rendered. Chrome cannot render Office formats itself, so there is no way to offer this preview without an outside renderer. That URL is content of the page the user is on — the path of a file in a repository — so under a strict reading it is **website content leaving the device**, even though the developer collects nothing and receives nothing.

Why it is limited, and the points to state if a reviewer asks:

1. **It is click-gated.** The URL is sent only after the user presses the button labelled **"Load Microsoft viewer"**. It is never automatic, never preloaded and never sent in the background. The disclosure text is rendered on the same card as the button, before the click.
2. **It is opt-outable.** If the user switches the "Office documents" category off, those files are not previewed at all and **no URL is ever sent to Microsoft**.
3. **It is user-initiated third-party transmission, not developer collection.** The recipient is Microsoft, not the extension's author. There is no backend, no analytics endpoint and no data store anywhere in this extension.
4. **It is scoped.** Every other preview — video, audio, BMP, fonts — is fetched by the user's own browser directly from GitHub. Nothing leaves the browser-to-GitHub path, and the extension itself makes no network request at all.
5. **Private-repository nuance, worth being ready for.** For a file in a private repository, the raw URL may contain a short-lived access token. If a reviewer treats that token as credential material, the adjacent category is **Authentication information**. Recommended honest answer if asked: the extension does not collect authentication information; a short-lived file-access token can appear inside the document URL that the user explicitly chose to send to Microsoft's viewer. This should be volunteered rather than hidden, since the reviewer can read `extension/content.js` — the `view.officeapps.live.com` embed is plainly visible there.

**Recommended wording to put in the form's free-text/notes field:**

> Website content: not collected by the developer. The extension makes no network request of its own. The only third-party transmission is the Office preview: for .doc/.docx/.xls/.xlsx/.ppt/.pptx, the document's URL is passed to Microsoft's hosted viewer at view.officeapps.live.com so it can be rendered. This happens only after the user clicks a "Load Microsoft viewer" button that carries an on-screen disclosure, and never automatically. If the user disables the "Office documents" category, no URL is ever sent to Microsoft. No data is sold or shared, and no analytics or telemetry of any kind exists.

### 2c. Certifications to tick

- **"I do not sell or transfer user data to third parties, outside of the approved use cases"** — tick. No data is collected, so nothing is sold or transferred.
- **"I do not use or transfer user data for purposes that are unrelated to my item's single purpose"** — tick. The single purpose is inline preview of the supported formats.
- **"I do not use or transfer user data to determine creditworthiness or for lending purposes"** — tick.
- **Remote code** — answer **"No, I am not using remote code."** Nothing is fetched and executed at runtime; the previous third-party 3D renderer was removed precisely to satisfy this requirement.
- **Single purpose description** — enter: "Displays inline previews of supported non-code file types (video, audio, BMP images, Office documents and fonts) inside GitHub's file view instead of forcing a download."

---

## 3. Pre-publish checklist

**Listing text matches the shipped format matrix**

- [ ] The detailed description lists exactly the 20 shipped formats and the 5 categories, and nothing else.
- [ ] **No mention of 3D or `.glb` support anywhere except the explicit "does not do this" note.** The description deliberately includes that note because an older 3D feature was removed; it must be phrased as a limitation, never as a feature.
- [ ] **No claim of PDF, SVG, CSV, Markdown, TIFF or HEIC support** — the description states these are out of scope and why.
- [ ] Descriptions of the Microsoft viewer use the real button label, **"Load Microsoft viewer"**, and describe it as click-gated and category-switchable.
- [ ] Cross-check the copy against the format registry in `extension/formats.js`, which is the single source of truth, and run `tools/check-consistency.mjs` if it covers listing copy.
- [ ] **Also check `extension/manifest.json`'s `description` field.** It is shown in the browser and in some store contexts, and as of v2026.3.6 it still reads "…Fonts and 3D Models on GitHub", which no longer matches the shipped feature set. It needs to be corrected to remove the 3D claim. *(The manifest is owned by another workstream — report this, do not edit it here.)*
- [ ] The short description is re-counted after any edit and is **≤ 132 characters**.

**Privacy policy**

- [ ] The "Privacy policy URL" field points at `PRIVACY.md` as hosted on the repository: `https://github.com/Hilalum/github-raw-previewer/blob/main/PRIVACY.md`.
- [ ] That URL loads in a logged-out browser window — store reviewers must be able to read it without an account.
- [ ] The policy's statements match the extension: no data collected, both API permissions explained (`declarativeNetRequest`, `storage`), both host permissions listed (`raw.githubusercontent.com`, `media.githubusercontent.com`), and the Microsoft exception described with its opt-in click.
- [ ] The "Last updated" date in the policy is current.
- [ ] The policy URL is also added to the repository's About section and linked from the README.

**Screenshots and assets**

- [ ] Screenshots show the **real current UI** from v2026.3.6 — no mockups, no edited-in features, no 3D viewer, no PDF preview.
- [ ] At least one screenshot shows the Office consent card with the "Load Microsoft viewer" button, so the disclosure is visible in the store listing itself.
- [ ] The category switches visible in any popup screenshot match the current 5 categories and 20 formats.
- [ ] Promotional tiles and the icon use the shipped icon assets (`extension/icons/`), not the raw design source.
- [ ] No screenshot shows a private repository, a real personal account, a real token or a real private URL.

**Version**

- [ ] The version entered in the listing is **`2026.3.6`**, matching `version` in `extension/manifest.json` exactly.
- [ ] If the manifest version changes before submission, update the listing copy (section 1c) in the same pass.
- [ ] The uploaded package contains no leftover 3D code or `.glb` references.

**Icon and trademark review**

- [ ] Icon trademark review done: the icon and listing text do **not** use GitHub's Octocat mark, the GitHub wordmark or logo, or any confusingly similar artwork, and do not imply GitHub affiliation or endorsement.
- [ ] The extension name and description avoid presenting the extension as an official GitHub product; a neutrality line ("not affiliated with GitHub, Inc.") is included where the store permits it.
- [ ] "Microsoft" and "Office" are used descriptively only, to name the third-party viewer, with no Microsoft logos or product artwork.
- [ ] Any font names or sample assets used in screenshots are suitably licensed for redistribution.

**Disclosure visible before install**

- [ ] The Office/Microsoft disclosure appears **in the store listing itself**, not only inside the extension after installation: the detailed description states it plainly, and a screenshot shows the consent card.
- [ ] The data-usage form's Website content answer is filled in with the wording from 2b, not left at an unexplained "yes".
- [ ] The PRIVACY.md link is present in the listing, and clicking it from the store page reaches the section that describes the Microsoft viewer.
- [ ] Nothing in the listing implies the Office preview is automatic or that it works for private repositories.

**Final sanity pass**

- [ ] Read the whole listing once as a suspicious reviewer looking for a claim the code cannot back up.
- [ ] Confirm the only host permissions requested at install are the two GitHub file hosts, and that no new permission was added since this checklist was written.
- [ ] Confirm the extension makes zero network requests of its own (grep the package for `fetch(`/`XMLHttpRequest` outside the Microsoft iframe path).

---

## 4. Positioning

**Who it is for:** developers, maintainers and code reviewers who read repositories in the browser; anyone who shares raw asset links (a screen recording, a voice memo, a deck, a font file) with teammates and is tired of download prompts; and people who want to check a build artefact or a media file in a repo without cloning it.

**One-sentence pitch:**

> GitHub Raw Previewer makes 20 file types — video, audio, BMP images, Office documents and fonts — open inline inside GitHub's own file view, with no proxy, no servers, no tracking and about 50 KB of dependency-free code.

**Why it is credible, in three points:**

1. **Zero-click inline preview.** You stay on the GitHub page; the file just appears. No new tab, no download folder, no third-party site.
2. **No proxy and no server.** Your browser talks directly to GitHub. There is no middleman to trust, and nothing to go down.
3. **~50 KB, zero dependencies, MIT licensed.** Small enough to read end to end in one sitting — which is the point, because the one third-party exception (Microsoft's Office viewer) is easy to verify in the source.

**The honest trade-off to keep in the copy:** Office documents are the single format family that needs an outside renderer, so they are behind a click-through consent button and can be switched off entirely. Saying this up front is a feature, not a caveat — it is the difference between a listing that survives review and one that gets flagged.
