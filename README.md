# X 图片放大镜

**v1.1.2 · MIT** · [English](#english) · [下载](https://github.com/china-sorrymaker/x-image-zoom/releases/latest)

在 X（Twitter）已经打开的大图上，直接用滚轮缩放、按住左键拖动，方便看清长图细节。

**v1.1.0 改为原位缩放：无需点击“放大”，没有额外看图层，不重新加载图片。**

v1.1.2 修复背景图片容器没有 `role="img"` 时滚轮仍无效的问题。现在按实际背景图片地址识别容器，不依赖辅助功能属性或标签语言；另增加插件图标内的运行状态面板。

## 安装 / 更新

1. 从 [Releases](https://github.com/china-sorrymaker/x-image-zoom/releases/latest) 下载 `x-image-zoom-v1.1.2.zip`，然后解压；也可以直接克隆本仓库。
2. Chrome 打开 `chrome://extensions`；Edge 打开 `edge://extensions`。
3. 开启“开发者模式”，点击“加载已解压的扩展程序”。
4. 选择包含 `manifest.json` 的解压目录或仓库目录。
5. 刷新已经打开的 X 页面。

从旧版更新：用新版文件替换原安装目录的文件，在扩展管理页点击该插件的“重新加载”，**再刷新 X 页面**。无需安装 Node.js 或执行构建。

## 怎么用

1. 像平时一样点击帖子图片，打开 X 原生大图。
2. 鼠标放在图片上，**滚轮向上放大，向下缩小**，立即生效。
3. 放大后**按住鼠标左键拖动**，查看长图上下部分或图片边缘。
4. **双击图片**，或持续向下滚轮，恢复 X 原来的显示大小。

X 原来的左右切图按钮、方向键和 Esc 关闭继续使用；切图和关闭时会清除缩放。普通信息流、评论图片和头像上的滚轮仍按原网页处理，Ctrl / Command + 滚轮保留浏览器行为。

最大缩放为 X 当前显示尺寸的 12 倍。插件直接使用 X 已加载的图片，不请求另一份高清图片；可见细节取决于 X 当前加载的源文件，放大不能补回源文件本身不存在的细节。X 后续调整看图层结构时可能需要适配。

## 隐私与实现

### 运行状态（1.1.2）

在扩展管理页重新加载本目录的插件，再刷新 X。打开大图、向上滚轮后，在 Chrome 工具栏的扩展菜单中点击“X 图片放大镜”，即可查看文件版本、页面脚本版本、滚轮次数、图片识别结果及浏览器实际计算的缩放尺寸。无需控制台代码，也无需新增权限；诊断面板不读取图片地址、帖子内容或账号信息，不上传数据。

若提示当前页没有响应，请先刷新 X；旧版页面脚本不支持诊断消息，不能仅据此认定网站权限异常。

### 权限与数据

仅在 `x.com` / `twitter.com` 及其子域运行，无额外 API 权限、无统计、无数据上传。插件不修改图片的 `src` / `srcset`，不创建新的图片节点或看图弹层，只临时调整原生图片及裁剪容器的显示样式；恢复大小、切图和关闭时撤销这些样式。

采用 Chrome Manifest V3 静态内容脚本：[官方文档](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts)。

## 开发与验证

安装 Node.js 后，在仓库目录执行：

```sh
npm install
npx playwright install chromium
npm run check
npm test
```

使用已安装的 Chrome 运行测试时，可通过 `CHROME_PATH` 环境变量指定浏览器可执行文件。

自动测试使用本地构造的 X 样例页面，所有网络请求由测试响应，不访问真实账号。分别验证普通 `<img>`、带 `role="img"` 的背景容器，以及真实 X 页面中不带此属性的“背景层＋透明 `<img>`”结构。脚本在 Chrome 隔离环境运行，覆盖可见层缩放和拖拽、零新增图片请求、误点击抑制、裁剪样式恢复、滚轮 / 双击复原、原生切图 / Esc / 关闭、透明手势层、图片源变化、排除头像 / 评论 / 信息流、修饰键、窗口变化、重复注入和诊断面板。

2026-10-29 已在用户 Chrome 的真实 X 大图页验证 1.1.2：原生滚轮使可见图片宽度从约 564px 增至 912px，左键拖拽改变图片位置，向下滚轮恢复原宽度。该验证针对当时页面，X 后续结构调整及其他浏览器仍需相应验收。

手动验收：安装并刷新 X → 打开长图 → 鼠标在图上向上滚轮，应立即放大且没有新弹层或加载提示 → 拖动查看 → 向下滚轮或双击复原 → 左右切图、Esc 关闭 → 确认信息流和评论区滚动正常。

## English

**X Image Zoom** adds direct wheel zoom and drag-to-pan to X / Twitter's native image viewer, especially for tall images.

**v1.1.0 zooms the existing image in place. No extra button, viewer, or image reload.**

v1.1.2 identifies the visible background image container even when it has no `role="img"`, fixing invisible zoom in X's actual viewer. The extension icon also opens a local diagnostic panel with script version, wheel events, and computed image dimensions.

- Open a photo normally in X's native viewer.
- Scroll up over the photo to zoom in, and down to zoom out.
- Hold the left mouse button and drag to pan.
- Double-click, or scroll down to the original display size, to reset.
- Native next / previous controls, arrow keys, and Esc keep working.
- Zoom is limited to 12 times X's current displayed size. Image details depend on the source X has already loaded.

Download and extract the ZIP from [Releases](https://github.com/china-sorrymaker/x-image-zoom/releases/latest), open `chrome://extensions` or `edge://extensions`, enable Developer mode, choose **Load unpacked**, and select the folder containing `manifest.json`. Refresh X after installation. To update, replace the installed files, reload the extension, and refresh X. No build step is required.

The extension runs only on X / Twitter domains. No extra API permissions, analytics, or uploads. It does not modify image URLs or create additional image elements. Automated tests cover three rendering structures in an isolated Chrome world. Direct wheel zoom, mouse panning, and wheel reset were also verified on a live X image page in the user's Chrome on 2026-10-29. Future X layout changes and other browsers may require further verification.

Licensed under [MIT](LICENSE). This is an independent project and is not affiliated with X.
