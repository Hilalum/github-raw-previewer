# GitHub Raw Previewer

Instantly preview large PDFs, Videos, and Images on GitHub natively in the browser!  
Stop suffering from the forced `Content-Disposition: attachment` downloads on GitHub raw files.

## 🌟 Why build this?
GitHub's raw server (`raw.githubusercontent.com`) automatically sends a "download attachment" header for large files like MP4 videos, webms, and high-resolution PDFs. This means you are constantly cluttering your `Downloads/` folder with massive files just to see what they are! 

This extension utilizes the modern Chrome Manifest V3 API (`declarativeNetRequest`) to natively override GitHub's headers and elegantly injects an HTML5 player or PDF viewer directly into the GitHub repository file explorer UI.

## 📦 Features
- **Zero-click preview:** Replaces the empty "View Raw" placeholder in GitHub's Blob View with a fully functional media player or PDF viewer.
- **Native Rendering:** No laggy cross-origin proxy APIs! It relies solely on your engine's native `<video>` and PDF rendering.
- **Header overriding:** If you directly open a `https://raw.github...` link, it won't force download; it simply displays the file.

## 🛠️ Installation

1. Clone or download this repository.
2. Open Chrome/Edge and go to `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode** in the top right.
4. Click **Load unpacked** and select the folder you just downloaded.
5. Enjoy seamless GitHub browsing!

## 🤝 Contributing
Issues and Pull Requests are extremely welcome! Let's eliminate meaningless GitHub downloads together.

## 📄 License
MIT License
