<div align="center">
  <img src="icon_full.png" alt="GitHub Raw Previewer Logo" width="150" />
  <h1>GitHub Raw Previewer</h1>

  <p>Instantly preview large files natively on GitHub, bypassing forced downloads.</p>

  <p>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
    <img src="https://img.shields.io/badge/Manifest-V3-brightgreen.svg" alt="Manifest V3">
    <a href="#"><img src="https://img.shields.io/badge/Chrome_Web_Store-Coming_Soon-orange.svg" alt="Chrome Web Store"></a>
    <img src="https://img.shields.io/badge/Version-1.0.0-blue.svg" alt="Version">
  </p>

  [**English**](./README.md) • [**简体中文 (Chinese)**](./README_zh.md)
</div>

---

## 🌟 Why build this?

GitHub's raw server (`raw.githubusercontent.com`) automatically sends a "download attachment" header for large files. This means you are constantly cluttering your `Downloads/` folder with massive files just to see what they are! 

This extension utilizes the modern Chrome Manifest V3 API (`declarativeNetRequest`) to natively override GitHub's headers and elegantly injects HTML5 players, 3D model viewers, or Office view frames directly into the GitHub repository file explorer UI.

## 📦 Features

- **Zero-click Preview:** Replaces the empty "View Raw" placeholder in GitHub's Blob View with a fully functional previewer.
- **Native Rendering:** No laggy cross-origin proxy APIs! It relies solely on your engine's native `<video>` and PDF rendering where possible.
- **Header Overriding:** If you directly open a `https://raw.github...` link, it won't force download; it simply displays the file cleanly in your browser.
- **Graceful Fallbacks:** Beautiful fallback UIs for files that absolutely cannot be rendered in-browser (like Apple iWork).

## 📂 Supported Formats & Live Demos

*Click any of the sample files below in your GitHub repository while the extension is active to see it in action!*

| Category | Supported File Extensions | Example Demo Files |
| :--- | :--- | :--- |
| **🎥 Video** | `.mp4`, `.webm`, `.mov` | [`test.mp4`](./test_files/test.mp4) • [`test.webm`](./test_files/test.webm) • [`test.mov`](./test_files/test.mov) |
| **🎵 Audio** | `.mp3`, `.wav`, `.flac` | [`test.mp3`](./test_files/test.mp3) • [`test.wav`](./test_files/test.wav) • [`test.flac`](./test_files/test.flac) |
| **📄 Document** | `.pdf` | [`test.pdf`](./test_files/test.pdf) |
| **📊 Microsoft Office** | `.doc`, `.docx`, `.ppt`, `.pptx`, `.xls`, `.xlsx` | [`test.docx`](./test_files/test.docx) • [`test.pptx`](./test_files/test.pptx) • [`test.xlsx`](./test_files/test.xlsx) |
| **🖼️ Image** | `.svg`, `.tif`, `.tiff`, `.bmp`, `.webp`, `.heic` | [`test.svg`](./test_files/test.svg) • [`test.tiff`](./test_files/test.tiff) • [`test.bmp`](./test_files/test.bmp) • [`test.webp`](./test_files/test.webp) |
| **🧊 3D Model** | `.gltf`, `.glb`, `.obj`, `.stl` | [`test.gltf`](./test_files/test.gltf) • [`test.glb`](./test_files/test.glb) • [`test.obj`](./test_files/test.obj) • [`test.stl`](./test_files/test.stl) |
| **🅰️ Web Font** | `.ttf`, `.otf`, `.woff`, `.woff2` | [`test.ttf`](./test_files/test.ttf) • [`test.otf`](./test_files/test.otf) • [`test.woff`](./test_files/test.woff) |
| **🍎 Apple iWork** | `.pages`, `.numbers`, `.key` | *(Displays custom fallback UI)* |

*(Note: GitHub natively supports CSV and Markdown previews, so our extension explicitly leaves those pristine and untouched without interference.)*

## 🛠️ Installation

1. Clone or download this repository.
2. Open Chrome/Edge and go to `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode** in the top right.
4. Click **Load unpacked** and select the `extension` folder that you just downloaded or cloned.
5. Navigate to any file above and enjoy seamless GitHub browsing!

## 🤝 Contributing

Issues and Pull Requests are extremely welcome! Let's eliminate meaningless GitHub downloads together.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
