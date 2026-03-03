<div align="center">
  <img src="icon_full.png" alt="GitHub Raw Previewer Logo" width="150" />
  <h1>GitHub Raw Previewer</h1>

  <p>在 GitHub 内部原生秒开大型文件预览，告别全家桶式的强制下载。</p>

  <p>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
    <img src="https://img.shields.io/badge/Manifest-V3-brightgreen.svg" alt="Manifest V3">
    <a href="#"><img src="https://img.shields.io/badge/Chrome_Web_Store-Coming_Soon-orange.svg" alt="Chrome Web Store"></a>
    <img src="https://img.shields.io/badge/Version-1.0.0-blue.svg" alt="Version">
  </p>

  [**English**](./README.md) • [**简体中文 (Chinese)**](./README_zh.md)
</div>

---

## 🌟 为什么开发这个插件？

GitHub 官方的文件数据服务器 (`raw.githubusercontent.com`) 为了削减成本并简化请求，默认给所有大于普通代码范畴的文件下发 "作为附件下载" (Content-Disposition: attachment) 响应头。
每次只是想临时查看一下朋友发在 issue 或仓库里的视频、PDF 甚至一个大尺寸图片，都会惨遭弹层并被迫塞满整整半个 `Downloads/` 文件夹的垃圾！

此谷歌扩展运用最尖端安全的 Chrome V3 网络拦截接口 (`declarativeNetRequest`) ，能够巧妙抹去 GitHub 这种耍流氓式的 Header 头部强制头，并为你极其优雅且超清地插入一个内置媒体渲染器！不仅再也不会莫名其妙地直接下载了，而且即开即用！

## 📦 核心功能

- **零点击解析** —— 开局一把梭！替代 GitHub 单调空白的 "View Raw" 点击框，直接把播放器塞在 GitHub 文件管理页里。
- **纯原生性能渲染** —— 远离龟速跨境服务器转发！此扩展 100% 只依靠你本机目前 Chrome / Edge 霸道的 GPU 画质原生渲染 `<video>` 或 `<iframe>` ！
- **请求头大挪移** —— 在别人口中拿到的 `https://raw.github...` 链接，原本点击就跳下载框。拥有这个插件后，在浏览器直接点开该直连网址，将不再提示下载，而是直接在当前网页丝滑预览文件本体。
- **优雅的故障隔离** —— 面对世界上完全不可能被浏览器直接打开的远古闭源文件 (比如苹果的 `.pages` 等等) 会出现一个好看的下载提醒面板以免界面报错。

## 📂 支持的格式与在线示例文件

*推荐在你安装此插件后，随意点击以下列表里的任意测试文件进行观感体验！*

| 类型 | 支持的格式后缀 | 仓库内真实示例体验链接 |
| :--- | :--- | :--- |
| **🎥 常用视频** | `.mp4`, `.webm`, `.mov` | [`test.mp4`](./test_files/test.mp4) • [`test.webm`](./test_files/test.webm) • [`test.mov`](./test_files/test.mov) |
| **🎵 音频文件** | `.mp3`, `.wav`, `.flac` | [`test.mp3`](./test_files/test.mp3) • [`test.wav`](./test_files/test.wav) • [`test.flac`](./test_files/test.flac) |
| **📄 文档** | `.pdf` | [`test.pdf`](./test_files/test.pdf) |
| **📊 Office 办公套件** | `.doc`, `.docx`, `.ppt`, `.pptx`, `.xls`, `.xlsx` | [`test.docx`](./test_files/test.docx) • [`test.pptx`](./test_files/test.pptx) • [`test.xlsx`](./test_files/test.xlsx) |
| **🖼️ 高清无损图像** | `.svg`, `.tif`, `.tiff`, `.bmp`, `.webp`, `.heic` | [`test.svg`](./test_files/test.svg) • [`test.tiff`](./test_files/test.tiff) • [`test.bmp`](./test_files/test.bmp) • [`test.webp`](./test_files/test.webp) |
| **🧊 3D 渲染模型** | `.gltf`, `.glb`, `.obj`, `.stl` | [`test.gltf`](./test_files/test.gltf) • [`test.glb`](./test_files/test.glb) • [`test.obj`](./test_files/test.obj) • [`test.stl`](./test_files/test.stl) |
| **🅰️ 网页字体包** | `.ttf`, `.otf`, `.woff`, `.woff2` | [`test.ttf`](./test_files/test.ttf) • [`test.otf`](./test_files/test.otf) • [`test.woff`](./test_files/test.woff) |
| **🍎 苹果 iWork 源文件** | `.pages`, `.numbers`, `.key` | *(仅唤起优美的苹果系统提示横幅)* |

*(说明: GitHub 其实自身已经能很好地预览 Markdown 以及 CSV 表格表格文件了，为了避免冲突卡顿，我们的插件会显式地略过这些格式不进行干预处理。)*

## 🛠️ 安装说明

1. 任意在本项目内找地方点击下载这个包为 ZIP 解压，或者执行 Clone。
2. 打开你的 Chrome / Edge 全新浏览器核心页面并前往扩展程序管理页 `chrome://extensions`。
3. 把主管理页面右上角的 **开发者模式** 选项强行开启。
4. 点左上角的第一颗按钮 **加载已解压的扩展程序**。
5. 毫不犹豫地在文件夹弹窗里指向选取你刚下载代码里存在的 `extension` 主文件目录！完成！立刻返回 Github 重刷页面看惊喜。

## 🤝 一起开发贡献

如果对功能或者体验有不爽的地方极其欢迎提出 Issues 以及各类 Pull Requests（合并请求）！让我们彻底终结毫无意义却无可奈何的各种“点击强制下载”。

## 📄 开源许可证

秉持人类代码共享互助的初心，此项目使用 [MIT License](LICENSE) 证书。
