# X 图片放大镜

**v1.1.0 · MIT** · [English](#english) · [下载](https://github.com/china-sorrymaker/x-image-zoom/releases/latest)

在 X（Twitter）已经打开的大图上，直接用滚轮缩放、按住左键拖动，方便看清长图细节。

**v1.1.0 改为原位缩放：无需点击“放大”，没有额外看图层，不重新加载图片。**

## 安装 / 更新

1. 从 [Releases](https://github.com/china-sorrymaker/x-image-zoom/releases/latest) 下载 `x-image-zoom-v1.1.0.zip`，然后解压；也可以直接克隆本仓库。
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

测试使用本地构造的 X 样例页面，所有网络请求由测试响应，不访问真实账号。覆盖即时原位缩放、零新增图片请求、拖拽及误点击抑制、原生裁剪样式恢复、滚轮 / 双击复原、原生切图 / Esc / 关闭、透明手势层、图片源变化、头像 / 评论 / 信息流排除、修饰键、窗口变化和重复注入。它不等于真实 X 页面或扩展安装验收。

手动验收：安装并刷新 X → 打开长图 → 鼠标在图上向上滚轮，应立即放大且没有新弹层或加载提示 → 拖动查看 → 向下滚轮或双击复原 → 左右切图、Esc 关闭 → 确认信息流和评论区滚动正常。

## English

**X Image Zoom** adds direct wheel zoom and drag-to-pan to X / Twitter's native image viewer, especially for tall images.

**v1.1.0 zooms the existing image in place. No extra button, viewer, or image reload.**

- Open a photo normally in X's native viewer.
- Scroll up over the photo to zoom in, and down to zoom out.
- Hold the left mouse button and drag to pan.
- Double-click, or scroll down to the original display size, to reset.
- Native next / previous controls, arrow keys, and Esc keep working.
- Zoom is limited to 12 times X's current displayed size. Image details depend on the source X has already loaded.

Download and extract the ZIP from [Releases](https://github.com/china-sorrymaker/x-image-zoom/releases/latest), open `chrome://extensions` or `edge://extensions`, enable Developer mode, choose **Load unpacked**, and select the folder containing `manifest.json`. Refresh X after installation. To update, replace the installed files, reload the extension, and refresh X. No build step is required.

The extension runs only on X / Twitter domains. No extra API permissions, analytics, or uploads. It does not modify image URLs or create additional image elements. Browser smoke tests use a local fixture; live X behavior needs manual verification after installation.

Licensed under [MIT](LICENSE). This is an independent project and is not affiliated with X.
