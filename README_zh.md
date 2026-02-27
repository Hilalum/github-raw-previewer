# GitHub Raw Previewer

[🌍 English (英文)](README.md)

🎉 **告别强制下载！在 GitHub 网页内原生、即时预览大体积的 PDF、音频/视频（MP3/MP4/WebM/MOV）、数据文件 (CSV/XLS/XLSX/DOC/DOCX/PPT/PPTX)、iWork 套件 (Pages/Numbers/Keynote) 和高清图片！**

## 🌟 为什么需要这个插件？
经常逛 GitHub 的开发者肯定遇到过这个痛点：GitHub 用于存储原始文件的服务器（`raw.githubusercontent.com`）出于安全和带宽考虑，会对超过一定体积的 PDF 和多媒体文件强行打上 `Content-Disposition: attachment`（使其成为附件）的 HTTP 下载头。
这意味着，如果你只是想**看一眼**某项目的演示视频，或者翻两页它的说明书 PDF，你也不得不把几百兆的大文件先下载到堆积如山的 `Downloads/` 文件夹里，体验极其反人类。

**GitHub Raw Previewer** 就是为此而生！
它利用最现代化的 Chrome Manifest V3 API（`declarativeNetRequest`），在网络底层暴力抹除了 GitHub 的强制下载头，并巧妙地将 HTML5 原生播放器和 PDF 阅读器无缝注入到 GitHub 仓库的文件预览区。

## 📦 核心特性
- **零点击无感拦截：** 替代 GitHub Blob 页那个枯燥的“无法渲染 / View Raw”占位符，直接为你内嵌一个功能齐全的视频播放器或全高清的阅读器。
- **纯粹且快速的本地原生加载：** 不依赖任何可能卡顿或泄露隐私的第三方跨域抓取代理 API。我们完全信任且只使用你浏览器自带的 `<video>` 视频引擎和 PDF 解析引擎渲染文件。
- **链接拦截直达：** 哪怕你别人发给你一个 `https://raw.github...` 的直接链接，只要你安装了它，浏览器也不会发起下载动作，而是干净利落的把文件在标签页里展示出来。

## 🛠️ 安装方法 (开发者预览版)

1. 克隆或下载本仓库代码到你的电脑上。
2. 打开 Chrome / Edge 浏览器，并在地址栏输入 `chrome://extensions` (Edge 为 `edge://extensions`)。
3. 打开右上角的 **开发者模式 (Developer mode)** 开关。
4. 点击左上角的 **加载已解压的扩展程序 (Load unpacked)**，然后选择你刚刚解压的带有 `manifest.json` 的本文件夹。
5. 尽情享受丝滑无需下载的 GitHub 漫游体验吧！

## 🤝 参与贡献
本项目非常欢迎 Issue 和 Pull Request！我们目前正在征集：
- 提供更多视频格式支持。
- 提供办公文档格式（如 Word, Excel）支持。
- 更精美的插件图标和商店展示视频。

让我们携手消灭所有无意义的 GitHub 下载行为。

## 📄 开源许可证
本项目遵循 MIT License 协议开源。
