<div align="center">
  <img src="icon_full.png" alt="GitHub Raw Previewer Logo" width="160" />

  # 👁️ GitHub Raw Previewer

  <p><b>Unlock native, zero-click media and document previews directly inside GitHub's file explorer.</b></p>

  <p>
    <a href="https://github.com/Hilalum/github-raw-previewer/stargazers"><img src="https://img.shields.io/github/stars/Hilalum/github-raw-previewer?style=for-the-badge&color=ffd700&label=Stars" alt="Stars"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License: MIT"></a>
    <img src="https://img.shields.io/badge/Manifest-V3-brightgreen.svg?style=for-the-badge" alt="Manifest V3">
    <a href="#"><img src="https://img.shields.io/badge/Chrome_Web_Store-Coming_Soon-orange.svg?style=for-the-badge" alt="Chrome Web Store"></a>
    <a href="https://github.com/Hilalum/github-raw-previewer/releases"><img src="https://img.shields.io/github/v/release/Hilalum/github-raw-previewer?style=for-the-badge&color=2ea44f" alt="Latest Release"></a>
  </p>

  [**English**](./README.md) • [**简体中文 (Chinese)**](./README_zh.md)
  
  <br/>
</div>

## 💡 The Problem

When you click on large files (like MP4s, MP3s, high-res images, or Microsoft Office documents) on GitHub, you are met with a frustrating "View Raw" placeholder. If you attempt to view it, GitHub's `raw.githubusercontent.com` server enforces a `Content-Disposition: attachment` header, which immediately triggers a **forced download**.

This clutters your computer's `Downloads/` directory and wastes time, especially when you just want a quick preview.

## 🚀 The Solution

**GitHub Raw Previewer** is a lightweight, blazing-fast Chrome/Edge extension that transparently overrides GitHub's aggressive download headers. It intelligently injects native HTML5 players, 3D renderers, Document Viewers, and Font Previewers right into GitHub's file explorer UI. 

**Zero third-party proxies. No lag. Maximum privacy.**

## ✨ Core Features

*   **⚡️ Zero-Click Inline Preview:** Seamlessly replaces GitHub's native empty container. You browse your repository, and the file is just *there*, rendering beautifully.
*   **🛡️ Chrome Manifest V3:** Built entirely on the rigorous security and performance standards of Manifest V3 using the modern `declarativeNetRequest` API.
*   **🌐 True Native Rendering:** Renders 4K video, lossless audio, and complex 3D models utilizing your browser's core rendering engine (GPU accelerated).
*   **🔗 Smart Fallbacks:** Gracefully handles encrypted private repositories with dedicated fallback UI panels.

---

## 📂 Supported Formats & Live Demos

*To experience the magic, install the extension and click any of the live test files below to see them instantly render in your browser.*

| Category | Formats | Try the Live Demo |
| :--- | :--- | :--- |
| **🎥 High-Def Video** | `.mp4`, `.webm`, `.mov` | [`test.mp4`](./test_files/test.mp4) • [`test.webm`](./test_files/test.webm) • [`test.mov`](./test_files/test.mov) |
| **🎵 Lossless Audio** | `.mp3`, `.wav`, `.flac` | [`test.mp3`](./test_files/test.mp3) • [`test.wav`](./test_files/test.wav) • [`test.flac`](./test_files/test.flac) |
| **📄 Standard Documents** | `.pdf` | [`test.pdf`](./test_files/test.pdf) |
| **📊 Microsoft Office** | `.doc`, `.docx`, `.ppt`, `.pptx`, `.xls`, `.xlsx` | [`test.docx`](./test_files/test.docx) • [`test.pptx`](./test_files/test.pptx) • [`test.xlsx`](./test_files/test.xlsx) |
| **🖼️ Complex Images** | `.svg`, `.tif`, `.tiff`, `.bmp`, `.webp`, `.heic` | [`test.svg`](./test_files/test.svg) • [`test.tiff`](./test_files/test.tiff) • [`test.bmp`](./test_files/test.bmp) • [`test.webp`](./test_files/test.webp) |
| **🧊 Native 3D Models** | `.gltf`, `.glb`, `.obj`, `.stl` | [`test.gltf`](./test_files/test.gltf) • [`test.glb`](./test_files/test.glb) • [`test.obj`](./test_files/test.obj) • [`test.stl`](./test_files/test.stl) |
| **🅰️ Web Typography** | `.ttf`, `.otf`, `.woff`, `.woff2` | [`test.ttf`](./test_files/test.ttf) • [`test.otf`](./test_files/test.otf) • [`test.woff`](./test_files/test.woff) |

*(Note: GitHub natively supports CSV and Markdown previews, so our extension explicitly leaves those pristine and untouched without interference.)*

---

## 🛠️ Quick Installation

### 📥 Install via Release (.zip)
1. Go to the [Releases](https://github.com/Hilalum/github-raw-previewer/releases) page.
2. Download the latest `github-raw-previewer-vX.X.X.zip`.
3. Extract the ZIP file to a permanent folder on your machine.
4. Open Chrome/Edge and navigate to `chrome://extensions` or `edge://extensions`.
5. Enable **Developer mode** in the top-right corner.
6. Click **Load unpacked** and select the extracted `extension` folder.
7. You're done! Refresh your GitHub tabs.

---

## 👨‍💻 Under the Hood (For Developers)

How does it perform this routing without proxy servers? We utilize Chrome's `declarativeNetRequest` rule engine.

When the browser requests a file from `raw.githubusercontent.com`, our static `rules.json` intercepts the response headers at the network layer and strips out `Content-Disposition`, allowing Chrome to interpret the payload natively as `video/mp4`, `application/pdf`, etc. We then use content scripts to dynamically swap GitHub's placeholder DOM with a `<video>` tag, `<model-viewer>` component, or an `<iframe>`.

## 🤝 Contributing & Feedback

If you enjoy this extension, please **star it ⭐️**! It helps the project immensely.

Contributions, issues, and feature requests are welcome. Feel free to check the [issues page](https://github.com/Hilalum/github-raw-previewer/issues). Let's evolve this into the ultimate GitHub browsing companion.

## 📄 License

This repository is distributed under the [MIT License](LICENSE). 
