<div align="center">
  <img src="icon_full.png" alt="GitHub Raw Previewer Logo" width="160" />

  # 👁️ GitHub Raw Previewer (无缝预览增强工具)

  <p><b>解锁 GitHub 文件管理器内原生、零点击的高清媒体与办公文档秒开能力。</b></p>

  <p>
    <a href="https://github.com/Hilalum/github-raw-previewer/stargazers"><img src="https://img.shields.io/github/stars/Hilalum/github-raw-previewer?style=for-the-badge&color=ffd700&label=Stars" alt="Stars"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License: MIT"></a>
    <img src="https://img.shields.io/badge/Manifest-V3-brightgreen.svg?style=for-the-badge" alt="Manifest V3">
    <a href="#"><img src="https://img.shields.io/badge/Chrome_Web_Store-Coming_Soon-orange.svg?style=for-the-badge" alt="Chrome Web Store"></a>
    <a href="https://github.com/Hilalum/github-raw-previewer/releases"><img src="https://img.shields.io/github/v/release/Hilalum/github-raw-previewer?style=for-the-badge&color=2ea44f" alt="最新发版"></a>
  </p>

  [**English**](./README.md) • [**简体中文 (Chinese)**](./README_zh.md)
  
  <br/>
</div>

## 💡 我们试图解决什么痛点？

在日常使用 GitHub 浏览代码仓库时，一旦你点击了某些大型或特殊格式的内容（例如 MP4 高清视频、无损音频、高精度图像或微软 Office 文档），你会永远面对一个极其扎眼且空白的 "View Raw" 占位符。

更灾难的是：如果你点击这个链接，或者他人通过 `raw.githubusercontent.com` 直接发送一个文件链接给你，GitHub 服务器会自动下发强制性的 `Content-Disposition: attachment` 下载头。
于是，**仅仅为了“看一眼”内容，你这辈子就被迫将成百上千兆的垃圾文件塞满了你宝贵的电脑 `Downloads/` 下载目录**，烦不胜烦。

## 🚀 终极破局方案

**GitHub Raw Previewer** 是一款轻量、极速且安全先进的 Chrome/Edge 浏览器黑科技扩展。
它运用谷歌最现代的 V3 网络拦截接口，优雅且霸道地抹掉了 GitHub 那条蛮不讲理的“强制下载”响应头指令。更棒的是，它直接在 GitHub 的代码面板中就地注入了原生的 HTML5 视频播放器、3D 模型渲染引擎、Office Web 框架和全套字库解析器。

**全程 0 代理、极度丝滑流畅、彻底杜绝云端隐私外泄。**

## ✨ 核心特性

*   **⚡️ 开局即看 (零点击解析)：** 它神不知鬼不觉地融合替代了 GitHub 单调的占位符。当你点进仓库目标文件的瞬间，无需任何额外点击，播放器画面已然加载完毕。
*   **🛡️ 严苛的 Manifest V3 架构：** 抛弃远古的不安全权限，全部构建于最现代的 `declarativeNetRequest` API 网络请求拦截层之上。
*   **🌐 纯粹的原生物理渲染：** 拒绝低效粗糙的代理预览站。该插件直接解封你本身 Chrome/Edge 内核被封印的超清 4K、无损音轨以及通过 GPU 硬件加速解析的高清 3D 几何模块能力。
*   **🔗 优雅沉浸式的错误降级：** 遇到内网无权外联的敏感私有仓库文档，插件会聪明地收敛行为，弹出一个高颜值的系统提示栏，保底你的完美体验。

---

## 📂 支持格式大全与沉浸式体验试看区

*为了验证本插件令人惊叹的能力，只要你当前安装并开启了这款插件，请在本项目仓库中随意点击下表中你感兴趣的任意 Demo，即可直接在你的浏览器标签页中见证魔法！*

| 类型维度 | 被征服的文件格式后缀 | 点此体验仓库内置的超清样本实测 |
| :--- | :--- | :--- |
| **🎥 视网膜级媒体** | `.mp4`, `.webm`, `.mov` | [`test.mp4`](./test_files/test.mp4) • [`test.webm`](./test_files/test.webm) • [`test.mov`](./test_files/test.mov) |
| **🎵 高保真音乐** | `.mp3`, `.wav`, `.flac` | [`test.mp3`](./test_files/test.mp3) • [`test.wav`](./test_files/test.wav) • [`test.flac`](./test_files/test.flac) |
| **📄 经典出版物** | `.pdf` | [`test.pdf`](./test_files/test.pdf) |
| **📊 Office 办公套件** | `.doc`, `.docx`, `.ppt`, `.pptx`, `.xls`, `.xlsx` | [`test.docx`](./test_files/test.docx) • [`test.pptx`](./test_files/test.pptx) • [`test.xlsx`](./test_files/test.xlsx) |
| **🖼️ 高清无损及工程图** | `.tif`, `.tiff`, `.bmp`, `.heic` | [`test.tiff`](./test_files/test.tiff) • [`test.bmp`](./test_files/test.bmp) |
| **🧊 次世代互动 3D 引擎** | `.glb` | [`test.glb`](./test_files/test.glb) |
| **🅰️ Web 原生前端极客字库** | `.ttf`, `.otf`, `.woff`, `.woff2` | [`test.ttf`](./test_files/test.ttf) • [`test.otf`](./test_files/test.otf) • [`test.woff`](./test_files/test.woff) |

*(极客声明: 因为察觉到了 GitHub 官方其实自带对于 Markdown 及 CSV 数据库列表的微弱预览能力，为了保证生态和谐不干涉不冲突，我们的黑科技解析框架会非常智能地对这两种常见短平快类别执行免密通行放行。)*

---

## 🛠️ 三步上车指南

### 📥 下载 Release 最新成包
1. 点击并直达专属 [版本发布 Releases](https://github.com/Hilalum/github-raw-previewer/releases) 页面。
2. 直接下载打包完毕且纯净的 `github-raw-previewer-vX.X.X.zip`。
3. 把下载好的 ZIP 包，解压存放至你电脑上一个固定且平时绝对不会删除的稳定目录中。
4. 打开你的 Chrome 或者是新版 Edge 游览器引擎页，在地址栏敲击录入 `chrome://extensions` 或 `edge://extensions`。
5. 开启右上角至高无上权限的 **“开发者模式” (Developer mode)** 。
6. 点击左上方显目的 **加载已解压的扩展程序 (Load unpacked)**。
7. 用光标选中你刚才小心翼翼解压出来的那个唯一的 `extension` 目录夹。大功告成！

---

## 👨‍💻 技术原理解析秘境 (Geeks Only)

有人疑惑：没有服务器节点中转，它凭什么能凭空拦下拥有庞大算力集群背书的 `githubusercontent.com` 的巨头服务器直传二进制流？

答案是：我们在 `rules.json` 中配置了拥有最顶层系统网络通讯截面拦截权限的声明式网关规则。
任何发往你这台浏览器请求的大体积 Payload 数据，在进入你硬盘物理层的上一秒，其头部字段 `Content-Disposition (附件指示器)` 就会被扩展彻底抹得一干二净。而对于响应体的真实 MIME Type 却原封不动被 Chrome 高级内核识别。此时配合极其精确注入在右上角的底层 `content.js` 组件级控制端脚本代码，通过覆盖及重新挂载 DOM 挂载极客封装的 HTML 渲染外壳结构，成就了这一切。

## 🤝 如果我们的愿景引起了你的舒适

如果用得爽，它解决并干掉了你电脑中积累多年的下载文件辣鸡堆！请一定要 **右上角点击赋予它一颗 Star ⭐️**！你宝贵的心意将转化为强大的催化剂，持续滋养优化开源环境。

Issues 和 Pull Requests 大门极其敞开。
诚邀全球极客大牛一起来完善补齐剩下的冷僻解码插件（比如 PSD、CAD 还有更多工业模型等）。

## 📄 自由权利条款

本项目代码被坚硬的 [MIT License 开源许可证书](LICENSE) 紧紧包覆，所有衍生皆享有最大的宽松与自由。 
