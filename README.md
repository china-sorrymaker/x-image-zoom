# X 图片放大镜

**v1.0.0 · MIT** · [English](#english)

在电脑 Chrome / Edge 的 X（Twitter）网页放大帖子图片。解决“点开大图后，长图仍被缩得太小，看不清细节”的问题。

保留 X 原生单击看图，增加滚轮缩放、拖拽移动和长图适应宽度。无需登录插件，无额外 API 权限，不上传数据；图片仍从 X 的图片服务器加载。

## 安装

1. 从本仓库的 **Releases** 下载 `x-image-zoom-v1.0.0.zip`，然后解压；也可以直接克隆本仓库。
2. Chrome 打开 `chrome://extensions`；Edge 打开 `edge://extensions`。
3. 开启“开发者模式”，点击“加载已解压的扩展程序”。
4. 选择解压后的目录或克隆的仓库目录，其中应直接包含 `manifest.json`。
5. 刷新已经打开的 X 页面。

使用插件无需安装 Node.js 或执行构建。更新时替换文件，在扩展管理页点“重新加载”，然后刷新 X 页面。

## 使用与手动验收

- 帖子图片原来的单击看图功能保留。
- 鼠标移到帖子图片上，右上角出现“＋ 放大”，点击进入放大镜。
- 在 X 原生看图层，把鼠标放在图片上滚动滚轮，也可以进入放大镜。
- 滚轮向上放大、向下缩小，最大为原图的 1200%；按住左键拖拽查看边缘细节。
- 长图点击“适应宽度”，图片按窗口宽度展开并从顶部显示，再按住左键向上拖动阅读下面内容。
- 工具栏支持加减、适应窗口、适应宽度、原始大小（100%）、打开原图。
- 双击切换原始大小与适应窗口；同帖多图用左右按钮或方向键切换。
- `Esc` / 关闭按钮退出放大镜；从 X 原生看图层进入时，会回到原生看图层。
- 确认头像、视频、普通页面滚动、X 原有点击行为没有被接管。
- 持续向下刷出新帖子，再测试“放大”按钮，无需再次刷新。

优先加载 X 提供的原图；失败时尝试页面图片。放大无法补回源文件本身不存在的细节。X 改动网页结构后，原生看图层的滚轮入口可能需要适配，此时可使用图片上的“放大”按钮。

插件只在 `x.com` / `twitter.com` 及其子域运行。代码使用 Chrome Manifest V3 的静态内容脚本机制：[官方文档](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts)。

## 开发与验证

安装 Node.js 后，在仓库目录执行：

```sh
npm install
npx playwright install chromium
npm run check
npm test
```

使用已安装的 Chrome 运行测试时，可通过 `CHROME_PATH` 环境变量指定浏览器可执行文件。

测试使用本地构造的 X 样例页面，所有请求均由测试响应，不访问真实账号。覆盖原生点击保留、头像排除、原图加载、长图适应宽度及顶部定位、拖拽、滚轮缩放、多图切换、焦点及滚动状态恢复、动态帖子和原图失败回退。它不等于真实 X 页面或扩展安装验收，真实页面请按上面的使用步骤手动验证。

## English

**X Image Zoom** is a lightweight Chrome / Edge extension for viewing details in X / Twitter images, especially tall images that remain too small in the native viewer.

- Keeps X's normal click-to-view behavior.
- Hover over a post image and click **＋ 放大**, or scroll over an image in X's native viewer, to open the zoom viewer.
- Scroll to zoom up to 1200% of the source image; drag with the left mouse button to pan.
- **适应宽度** fits a tall image to the window width and starts at the top.
- **适应窗口** fits the whole image; **原始大小** displays it at 100%.
- Use arrow buttons / keys to switch images, or Esc to close.
- Requests the original image where available, with a fallback to the page image.

Download and extract the ZIP from **Releases**, open `chrome://extensions` or `edge://extensions`, enable Developer mode, choose **Load unpacked**, and select the folder containing `manifest.json`. Refresh X after installation. No build step is required.

The extension runs only on X / Twitter domains, has no analytics or data uploads, and loads images from X's image server. The interface is currently in Chinese. Source image resolution and future X layout changes can affect the result.

Licensed under [MIT](LICENSE). This is an independent project and is not affiliated with X.
