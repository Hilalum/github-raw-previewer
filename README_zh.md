<div align="center">
  <img src="icon_full.png" alt="GitHub Raw Previewer Logo" width="160" />

  # 👁️ GitHub Raw Previewer (无缝预览增强工具)

  <p><b>在 GitHub 文件管理器里直接、零点击地原生预览媒体与办公文档。</b></p>

  <p>
    <a href="https://github.com/Hilalum/github-raw-previewer/stargazers"><img src="https://img.shields.io/github/stars/Hilalum/github-raw-previewer?style=for-the-badge&color=ffd700&label=Stars" alt="Stars"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License: MIT"></a>
    <img src="https://img.shields.io/badge/Manifest-V3-brightgreen.svg?style=for-the-badge" alt="Manifest V3">
    <a href="https://chromewebstore.google.com/detail/github-raw-previewer/bojogbccnklgbfdcafbhinglmcahckmn"><img src="https://img.shields.io/badge/Chrome_Web_Store-Available_Now-green.svg?style=for-the-badge" alt="Chrome Web Store"></a>
    <a href="https://github.com/Hilalum/github-raw-previewer/releases"><img src="https://img.shields.io/github/release/Hilalum/github-raw-previewer?style=for-the-badge&color=2ea44f" alt="最新发版"></a>
  </p>

  [**English**](./README.md) • [**简体中文 (Chinese)**](./README_zh.md)

  <br/>
</div>

## 💡 我们试图解决什么痛点？

在 GitHub 上点开一个 MP4、无损音频、高分辨率图片或 Office 文档时，你看到的只有一个空白的
"View Raw" 占位符。点下去之后 `raw.githubusercontent.com` 会下发 `Content-Disposition: attachment`，
于是**仅仅为了看一眼，文件就被强制下载进了你的 `Downloads/` 目录**。

## 🚀 终极破局方案

**GitHub Raw Previewer** 是一款轻量的 Chrome/Edge 扩展（Manifest V3）：它抹掉那条强制下载的响应头，
并直接在 GitHub 的文件视图里注入原生播放器或查看器。

* 视频、音频、图片、字体全部由**你自己的浏览器直接从 GitHub 加载**——没有第三方代理中转，没有重新托管，
  也就没有任何额外的延迟。
* 唯一的例外是 Office 预览：它按文件手动加载，并且会明确标注——详见[隐私说明](#-隐私说明)。

## ✨ 核心特性

* **⚡️ 开局即看（零点击解析）**：文件一打开，占位符就被真正的播放器替换。
* **🛡️ 严苛的 Manifest V3 架构**：只有三条 `declarativeNetRequest` 规则加一个 `storage` 权限，仅此而已。
* **🌐 纯粹的原生渲染**：直接复用浏览器自己的 `<video>`/`<audio>`/图片解码管线，含 GPU 加速。
* **🔗 诚实可靠的降级**：文件无法解码（或属于私有仓库）时，给出明确提示和直接下载链接，
  而不是留给你一个空白黑框。
* **🎛️ 精细到单个后缀的控制**：在弹窗里关掉某个分类或某个后缀，改动会立即作用于已打开的标签页。

---

## 📂 支持格式大全与试看区

安装扩展后，点击下表中的任意样本即可就地看到渲染效果。

| 类型维度 | 文件格式后缀 | 仓库内置实测样本 |
| :--- | :--- | :--- |
| **🎥 视频** | `.mp4`, `.webm`, `.ogg`, `.mov` | [`test.mp4`](./test_files/test.mp4) • [`test.webm`](./test_files/test.webm) • [`test.mov`](./test_files/test.mov) |
| **🎵 音频** | `.mp3`, `.wav`, `.flac`, `.m4a`, `.aac` | [`test.mp3`](./test_files/test.mp3) • [`test.wav`](./test_files/test.wav) • [`test.flac`](./test_files/test.flac) |
| **🖼️ 图片** | `.bmp` | [`test.bmp`](./test_files/test.bmp) |
| **📊 Office 办公套件** | `.doc`, `.docx`, `.ppt`, `.pptx`, `.xls`, `.xlsx` | [`test.doc`](./test_files/test.doc) • [`test.docx`](./test_files/test.docx) • [`test.ppt`](./test_files/test.ppt) • [`test.pptx`](./test_files/test.pptx) • [`test.xls`](./test_files/test.xls) • [`test.xlsx`](./test_files/test.xlsx) |
| **🅰️ Web 字库** | `.ttf`, `.otf`, `.woff`, `.woff2` | [`test.ttf`](./test_files/test.ttf) • [`test.otf`](./test_files/test.otf) • [`test.woff`](./test_files/test.woff) • [`test.woff2`](./test_files/test.woff2) |

关于这张表的两点说明：

* `.ogg`、`.m4a`、`.aac` 同样受支持，但仓库里没有对应样本文件，所以没有试看链接。
* 字体样本使用 Adobe **Source Code Pro**，遵循 SIL Open Font License——见
  [`test_files/SourceCodePro-LICENSE.md`](./test_files/SourceCodePro-LICENSE.md)。

### 有意不支持的格式

* **PDF、SVG、CSV、Markdown 与代码文件**：GitHub 官方已经自带预览。与其和官方查看器打架，
  不如让路。
* **TIFF（`.tif`/`.tiff`）与 HEIC（`.heic`）**：Chrome 内核本身没有解码器，不额外打包解码库就无法预览，
  因此不再提供开关。
* **3D 模型（`.glb`）**：原先依赖的第三方渲染器因 Chrome 应用商店的 Manifest V3「禁止远程托管代码」
  规定而被移除。请使用 *Download* / *Open raw* 查看。

---

## 🔒 隐私说明

完整政策见 [PRIVACY.md](./PRIVACY.md)。简述如下：

* 没有服务器、没有统计、没有遥测。扩展自身不会发起任何网络请求。
* 视频、音频、图片和字体是**由你的浏览器直接从 GitHub 拉取**的，和你自己在标签页打开 raw 链接完全一样。
* **Office 文档是唯一的例外。** 它由微软的在线查看器渲染，因此加载该预览会把文件链接发送给
  `view.officeapps.live.com`。正因如此：
  * 在你对该文件点击 **Load Microsoft viewer** 之前，什么都不会发送；
  * 对于私有仓库，这个链接里可能包含一个短期有效的访问令牌。

  如果你完全不想发生这种事，把 **Office documents** 分类保持关闭即可。
* 申请的权限：`declarativeNetRequest`（仅用于在 `raw.githubusercontent.com` 与
  `media.githubusercontent.com` 上移除强制下载头）和 `storage`（记住你的开关状态）。

---

## 🛠️ 安装方式

### 通过 Chrome Web Store 安装
1. 打开 [Chrome Web Store 页面](https://chromewebstore.google.com/detail/github-raw-previewer/bojogbccnklgbfdcafbhinglmcahckmn)。
2. 点击 **添加至 Chrome**。
3. 刷新已经打开的 GitHub 页面即可使用。

### 通过 Release 手动安装
1. 在 [Releases](https://github.com/Hilalum/github-raw-previewer/releases) 下载最新的
   `github-raw-previewer-vX.X.X.zip`。
2. 解压到一个固定目录。压缩包内是 `extension/` 目录**里的内容**，因此 `manifest.json` 就在解压后
   目录的根层——要加载的就是这个目录。
3. 打开 `chrome://extensions`（或 `edge://extensions`），开启 **开发者模式**。
4. 点击 **加载已解压的扩展程序**，选择上面那个目录。
5. 刷新 GitHub 页面。

如果你使用 Edge，也可以直接装 Chrome 版本。若 Edge 阻止安装，先开启 **允许来自其他应用商店的扩展**。

### 从源码安装
```bash
git clone https://github.com/Hilalum/github-raw-previewer.git
npm run check       # 静态一致性检查（9 组，零依赖）
npm run check:dom   # 可选：拿真实 GitHub 页面校验 DOM 契约
```
然后把 `extension/` 目录作为已解压扩展加载。

---

## 👨‍💻 技术原理解析 (Geeks Only)

整个扩展是五个小文件各司其职：`rules.json`（网络层）、`content.js`（DOM 层）、
`selectors.js`（GitHub 标记契约）、`formats.js`（支持格式注册表）、`background.js`（工具栏诊断角标）。

### 真正的风险在这里：GitHub 的标记

这个扩展要读 GitHub 的 DOM，而那份 DOM 既无文档、又会随时变动。因此**所有** GitHub 选择器只存在于
一个文件里——`extension/selectors.js`——其他任何文件都不允许直接写选择器（`npm run check` 会强制这
一点，它同时禁止 `injection.css` 去隐藏契约里没有声明的元素）。

在此之上，`npm run check:dom` 会拿**真实的 GitHub 页面**（媒体 blob、字体 blob、markdown blob 各一）
去校验这份契约，并且 CI 每天跑一次——因为 GitHub 改版不会给你提交一个 commit。它不需要浏览器：承重容器
本身就存在于 GitHub 的服务端渲染 HTML 里，所以这个"金丝雀"只是普通的 `fetch` 加字符串断言。一旦
GitHub 改名，它会直接点出缺失的片段，修复就是在 `selectors.js` 里改一行。

那个 markdown 页面是**故意**放进去的：它断言我们的隐藏选择器**不会**命中 GitHub 本来就能原生预览的
页面，从而保证一个过宽的选择器永远不会悄悄把正常内容藏掉。

### 预览不了的时候，它会说出来

如果 GitHub 的标记变了，扩展不会静默失败：

* **恢复 GitHub 自己的视图。** 隐藏永远是可逆的，预渲染阶段的隐藏也会被撤掉，所以一次失败的预览
  绝不会让你对着一个空白的文件视图发呆。
* 该标签页的工具栏图标会出现一个小小的 `!` 角标，弹窗里会解释发生了什么。

这些状态全部留在你自己的机器上——任何地方都没有遥测。

### 注入生命周期

`content.js` 依赖 `chrome.storage.onChanged` 维护的配置缓存做到了**完全同步渲染**：一次 DOM 变动
不会引发任何 IPC 往返。`MutationObserver` 只做"比对路由 + 排期"这两件最便宜的事（带去抖，并设有
上限，保证持续重渲染也无法饿死任务）；而在非 blob 页面上它会被完全断开——改用每两秒一次的路由比较
替代逐次变动处理，所以在 PR、issue、设置页上的开销是零。

样式表在 `document_start` 注入，只在当前路由是受支持的 blob 页时才隐藏 GitHub 的占位符，这消除了
过去先闪一下 "View raw" 再被替换掉的问题。同时用 `preconnect` 预热到 GitHub 文件主机的连接——刻意
**没有**用投机式 `preload`，因为那会在你打开页面的瞬间就开始为一个可能几百 MB 的视频消耗带宽。

### 规则集是刻意做小的

`rules.json` 一度膨胀到十二条规则，而实测表明其中绝大多数什么都没做。下表每一条都针对
`raw.githubusercontent.com` 的真实响应头和真实 Chromium 内核验证过：

| 原本的假设 | 实测结果 | 处理 |
| :--- | :--- | :--- |
| `<video>`/`<audio>` 需要正确的 `Content-Type` | Chrome 会自行嗅探容器：`application/octet-stream` 的 mp4 照样解析播放 | 删除 webm/mov/mp3/bmp/tiff 的 Content-Type 规则 |
| `Content-Disposition: attachment` 会阻止媒体内联播放 | 媒体元素完全无视这个头 | 针对 `media`/`xmlhttprequest` 的头规则没有意义 |
| 字体需要 `font/*` 这类 MIME | GitHub 把字体当 `text/plain` 送，Chrome 照样加载 | 删除全部字体规则 |
| `excludedRegexFilter` 可以跳过 `?download=true` | **它根本不是合法的 `declarativeNetRequest` 键**，从第一天起就被静默忽略 | 换成真正生效的高优先级 `allow` 规则 |
| `urlFilter: "/*.mp4*"` 只匹配 `.mp4` | 子串匹配会连 `/clip.mp4.txt`、`/get?q=clip.mp4`、`/docs.mp4/readme.txt` 一起改写 | 全部换成锚定主机与路径的 `regexFilter` |
| `requestDomains` 把规则限制在 GitHub 域 | 该键是 Chrome 101+。旧内核会忽略它，从而把规则应用到**所有域名** | 主机写进正则本身，从根上不存在"被忽略"的可能 |

最终留下的三条，每一条都有实测依据：

1. `allow` + `?download=true`：用户明确点击下载时不动它。
2. 对两个 GitHub 文件域名的 `main_frame` 移除 `Content-Disposition`，让打开 raw 链接变成查看
   而不是下载。
3. 只对 `.mp4` 强制 `video/mp4`——GitHub 把它按 `application/octet-stream` 送，顶层导航时会变成下载。

### 为什么所有查看器都跑在扩展自己的源里

视频、音频、Office 文档和字体，全部由随扩展一起发布的小页面渲染（`viewer-media.html`、
`viewer-office.html`、`viewer-font.html`，均在 `web_accessible_resources` 中声明），再由内容脚本以
iframe 加载。

这不是风格选择。GitHub 对 blob 页面的 CSP 相当严格，直接往页面里注入播放器会被它挡掉：

| 指令 | GitHub 下发的值 | 直接注入元素的后果 |
| :--- | :--- | :--- |
| `media-src` | `github.com user-images… gist.github.com github.githubassets.com` | **没有 `raw.githubusercontent.com`** → `<video>`/`<audio>` 被拦，Chrome 报的是 `MEDIA_ELEMENT_ERROR: Format error`，看起来像编解码器问题，实际不是 |
| `font-src` | `github.githubassets.com` | 页面上下文里加载字体被拦 |
| `frame-src` | `viewscreen.githubusercontent.com notebooks.githubusercontent.com` | 指向微软查看器的 iframe 被拦 |
| `img-src` | 含 `*.githubusercontent.com` | 图片是放行的，所以仍然直接注入 |

而扩展自己源里的 iframe 受扩展自身 CSP 管辖，于是这四类全部可用，同时 GitHub 的策略**完全不被改动**：
**扩展不会修改 GitHub 自身的任何响应。** 这一点已在真实站点上验证——视频能播（readyState 4，
320×240）、音频能播、Office 查看器只在用户点击同意后才挂载。

字体样本页之所以做成打包页面而不是内联 `srcdoc`，也是同一个原因：`srcdoc` 会继承宿主页面的 CSP，
这正是老版本不得不移除所有 GitHub 页面 CSP 的原因。

### 注入生命周期

`content.js` 依赖 `chrome.storage.onChanged` 维护的配置缓存做到了**完全同步渲染**：一次 DOM 变动
不会引发任何 IPC 往返。对 GitHub 原生占位符的隐藏是可逆的：隐藏过哪些元素都会被记录，teardown 时
逐个还原——所以在页面上临时关掉某个格式，能立刻拿回 GitHub 自己的视图。

### 文件布局

| 路径 | 职责 |
| :--- | :--- |
| `extension/formats.js` | 支持哪些格式，以及各自如何渲染 |
| `extension/selectors.js` | 所有 GitHub 选择器，含验证状态与来源出处 |
| `extension/content.js` | 注入生命周期 |
| `extension/viewer-*.html` / `viewer-*.js` | 媒体、Office、字体查看器——它们必须运行在扩展自己的源里 |
| `extension/rules.json` | 三条网络规则 |
| `extension/injection.css` | 首帧前隐藏 GitHub 占位符 |
| `extension/background.js` | 工具栏诊断角标 |
| `tools/` | 零依赖检查：一致性、打包、DOM 金丝雀、自测 |

---

## 🤝 如果我们的愿景引起了你的舒适

如果用得爽，请一定 **右上角点亮一颗 Star ⭐️**。

Issues 和 Pull Requests 极其欢迎。想新增一个格式，只需要改**一张表**（`extension/formats.js`）——
弹窗、内容脚本、一致性检查和文档都会自动跟随。

## 📄 自由权利条款

本项目以 [MIT License](./LICENSE) 发布。
