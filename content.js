(() => {
  "use strict";

  if (document.getElementById("x-image-zoom-extension")) return;

  // 只处理帖子原图，避免把头像、表情或视频封面当成照片。
  function mediaUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === "pbs.twimg.com" &&
        url.pathname.startsWith("/media/") ? url : null;
    } catch {
      return null;
    }
  }

  function imageFrom(target) {
    if (!(target instanceof Element)) return null;
    const image = target.closest("img") || target.closest('[data-testid="tweetPhoto"]')?.querySelector("img");
    return image && mediaUrl(image.currentSrc || image.src) ? image : null;
  }

  function originalUrl(source) {
    const url = mediaUrl(source);
    if (!url) return source;
    url.pathname = url.pathname.replace(/:(?:thumb|small|medium|large|orig)$/, "");
    url.searchParams.set("name", "orig");
    return url.href;
  }

  const host = document.createElement("div");
  host.id = "x-image-zoom-extension";
  host.style.cssText = "all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host { color-scheme: dark; }
      * { box-sizing: border-box; }
      button, a { font: 14px/1.2 system-ui, sans-serif; }
      button { border: 1px solid #ffffff30; background: #202734; color: #fff;
        padding: 10px 14px; border-radius: 10px; cursor: pointer; }
      button:hover, a:hover { background: #344155; }
      button:focus-visible, a:focus-visible { outline: 2px solid #70bdff; outline-offset: 2px; }
      button:disabled { opacity: .35; cursor: default; }
      [hidden] { display: none !important; }
      .entry { position: fixed; pointer-events: auto; z-index: 1; background: #101722e8;
        box-shadow: 0 2px 12px #0008; }
      dialog { position: fixed; inset: 0; width: 100vw; height: 100dvh; max-width: none;
        max-height: none; border: 0; padding: 0; margin: 0; background: #090d14f5;
        color: #fff; pointer-events: auto; font: 14px/1.5 system-ui, sans-serif; }
      dialog::backdrop { background: #000c; }
      .viewer { height: 100%; display: flex; flex-direction: column; }
      header { display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
        padding: 12px 16px; border-bottom: 1px solid #ffffff18; background: #101722; }
      .title { margin-right: auto; font-weight: 600; }
      output { min-width: 58px; text-align: center; font-variant-numeric: tabular-nums; }
      a { color: #c6e6ff; text-decoration: none; padding: 10px 12px; border-radius: 10px; }
      .stage { position: relative; overflow: hidden; flex: 1; min-height: 0;
        touch-action: none; user-select: none; cursor: grab; }
      .stage.dragging { cursor: grabbing; }
      .photo { position: absolute; left: 50%; top: 50%; max-width: none; max-height: none;
        object-fit: contain; transform-origin: center; pointer-events: none; }
      .status { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
        padding: 14px 20px; border-radius: 12px; background: #101722e8; text-align: center; }
      footer { padding: 9px 16px; text-align: center; color: #abb8ca; background: #101722; }
      @media (max-width: 640px) { header { gap: 5px; padding: 8px; } button, a { padding: 9px; }
        .title { width: 100%; } footer { font-size: 12px; } }
    </style>
    <button class="entry" type="button" hidden title="打开图片放大镜">＋ 放大</button>
    <dialog aria-label="X 图片放大镜">
      <div class="viewer">
        <header>
          <span class="title">X 图片放大镜 <span class="counter"></span></span>
          <button type="button" data-action="previous" aria-label="上一张">←</button>
          <button type="button" data-action="next" aria-label="下一张">→</button>
          <button type="button" data-action="out" aria-label="缩小">−</button>
          <output aria-label="缩放比例">100%</output>
          <button type="button" data-action="in" aria-label="放大">＋</button>
          <button type="button" data-action="fit">适应窗口</button>
          <button type="button" data-action="width">适应宽度</button>
          <button type="button" data-action="actual">原始大小</button>
          <a target="_blank" rel="noopener noreferrer">打开原图 ↗</a>
          <button type="button" data-action="close" aria-label="关闭放大镜">关闭 ✕</button>
        </header>
        <div class="stage">
          <img class="photo" alt="放大的帖子图片" draggable="false" hidden>
          <div class="status" role="status" aria-live="polite"></div>
        </div>
        <footer>滚轮缩放 · 按住左键拖拽 · 双击切换原始大小 / 适应窗口 · ← → 切图 · Esc 关闭</footer>
      </div>
    </dialog>`;
  document.documentElement.append(host);

  const entry = shadow.querySelector(".entry");
  const dialog = shadow.querySelector("dialog");
  const stage = shadow.querySelector(".stage");
  const photo = shadow.querySelector(".photo");
  const status = shadow.querySelector(".status");
  const output = shadow.querySelector("output");
  const originalLink = shadow.querySelector("a");
  let hoveredImage = null;
  let images = [];
  let index = 0;
  let scale = 1;
  let fitScale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let drag = null;
  let loaded = false;
  let loadId = 0;
  let previousFocus = null;
  let overflow = "";
  let overflowPriority = "";
  let pendingZoom = 1;
  let pointerX = -1;
  let pointerY = -1;

  function paint() {
    if (!loaded) return;
    const bounds = stage.getBoundingClientRect();
    const maxX = Math.max(0, (photo.naturalWidth * scale - bounds.width) / 2);
    const maxY = Math.max(0, (photo.naturalHeight * scale - bounds.height) / 2);
    offsetX = Math.max(-maxX, Math.min(maxX, offsetX));
    offsetY = Math.max(-maxY, Math.min(maxY, offsetY));
    photo.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    output.textContent = `${Math.round(scale * 100)}%`;
  }

  function fit() {
    if (!loaded) return;
    const bounds = stage.getBoundingClientRect();
    fitScale = Math.min(Math.max(1, bounds.width - 40) / photo.naturalWidth,
      Math.max(1, bounds.height - 40) / photo.naturalHeight, 1);
    scale = fitScale;
    offsetX = offsetY = 0;
    paint();
  }

  function zoom(factor, clientX, clientY) {
    if (!loaded) return;
    const bounds = stage.getBoundingClientRect();
    const x = (clientX ?? bounds.left + bounds.width / 2) - bounds.left - bounds.width / 2;
    const y = (clientY ?? bounds.top + bounds.height / 2) - bounds.top - bounds.height / 2;
    const next = Math.max(Math.min(fitScale, .05), Math.min(12, scale * factor));
    offsetX = x - (x - offsetX) * next / scale;
    offsetY = y - (y - offsetY) * next / scale;
    scale = next;
    paint();
  }

  function showImage() {
    const id = ++loadId;
    loaded = false;
    drag = null;
    stage.classList.remove("dragging");
    photo.hidden = true;
    status.hidden = false;
    status.textContent = "正在加载原图…";
    output.textContent = "—";
    shadow.querySelector(".counter").textContent = `${index + 1} / ${images.length}`;
    shadow.querySelector('[data-action="previous"]').disabled = index === 0;
    shadow.querySelector('[data-action="next"]').disabled = index === images.length - 1;
    const item = images[index];
    const original = originalUrl(item.src);
    originalLink.href = original;
    let triedFallback = false;
    photo.onload = () => {
      if (id !== loadId || !dialog.open) return;
      loaded = true;
      photo.style.width = `${photo.naturalWidth}px`;
      photo.style.height = `${photo.naturalHeight}px`;
      photo.alt = item.alt || "放大的帖子图片";
      photo.hidden = false;
      status.hidden = true;
      fit();
      zoom(pendingZoom);
      pendingZoom = 1;
    };
    photo.onerror = () => {
      if (id !== loadId || !dialog.open) return;
      if (!triedFallback && original !== item.src) {
        triedFallback = true;
        status.textContent = "原图暂不可用，正在加载页面图片…";
        photo.src = item.src;
      } else {
        status.textContent = "图片加载失败，可点“打开原图”重试。";
      }
    };
    photo.src = original;
  }

  function open(image, factor = 1) {
    if (dialog.open) return;
    const scope = image.closest("article") || image.closest('[role="dialog"]');
    const candidates = scope ? [...scope.querySelectorAll("img")] : [image];
    const seen = new Set();
    images = candidates.filter(img => mediaUrl(img.currentSrc || img.src)).map(img => ({
      src: img.currentSrc || img.src, alt: img.alt
    })).filter(item => {
      const key = originalUrl(item.src);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    index = images.findIndex(item => originalUrl(item.src) === originalUrl(image.currentSrc || image.src));
    if (index < 0) return;
    entry.hidden = true;
    previousFocus = document.activeElement;
    overflow = document.documentElement.style.getPropertyValue("overflow");
    overflowPriority = document.documentElement.style.getPropertyPriority("overflow");
    document.documentElement.style.setProperty("overflow", "hidden", "important");
    pendingZoom = factor;
    dialog.showModal();
    shadow.querySelector('[data-action="close"]').focus();
    showImage();
  }

  function close() {
    if (!dialog.open) return;
    ++loadId;
    loaded = false;
    drag = null;
    photo.onload = photo.onerror = null;
    photo.removeAttribute("src");
    dialog.close();
    if (overflow) document.documentElement.style.setProperty("overflow", overflow, overflowPriority);
    else document.documentElement.style.removeProperty("overflow");
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }

  function navigate(step) {
    if (index + step < 0 || index + step >= images.length) return;
    index += step;
    pendingZoom = 1;
    showImage();
  }

  function actual() {
    if (!loaded) return;
    scale = 1;
    offsetX = offsetY = 0;
    paint();
  }

  function fitWidth() {
    if (!loaded) return;
    const bounds = stage.getBoundingClientRect();
    scale = Math.min(12, Math.max(1, bounds.width - 40) / photo.naturalWidth);
    offsetX = 0;
    // 长图按宽度展开后，从顶部开始阅读。
    offsetY = Math.max(0, (photo.naturalHeight * scale - bounds.height) / 2);
    paint();
  }

  const actions = { close, fit, width: fitWidth, actual, in: () => zoom(1.25), out: () => zoom(.8),
    previous: () => navigate(-1), next: () => navigate(1) };
  shadow.addEventListener("click", event => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action) actions[action]();
  });
  entry.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
  });
  entry.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    if (hoveredImage?.isConnected) open(hoveredImage);
  });
  dialog.addEventListener("cancel", event => { event.preventDefault(); close(); });

  function updateEntry(target) {
    if (dialog.open || target === host) return;
    const image = imageFrom(target);
    if (!image) { entry.hidden = true; return; }
    const rect = image.getBoundingClientRect();
    if (rect.width < 60 || rect.height < 60) { entry.hidden = true; return; }
    hoveredImage = image;
    entry.style.left = `${Math.max(8, Math.min(innerWidth - 90, rect.right - 90))}px`;
    entry.style.top = `${Math.max(8, rect.top + 8)}px`;
    entry.hidden = false;
  }
  function trackPointer(event) {
    pointerX = event.clientX;
    pointerY = event.clientY;
    updateEntry(event.target);
  }
  document.addEventListener("pointerover", trackPointer, true);
  document.addEventListener("pointermove", trackPointer, true);
  document.addEventListener("scroll", () => {
    entry.hidden = true;
    requestAnimationFrame(() => updateEntry(document.elementFromPoint(pointerX, pointerY)));
  }, true);

  // 原生单击看图仍由 X 处理；只在其看图层滚轮时接管缩放。
  document.addEventListener("wheel", event => {
    if (dialog.open || !event.deltaY) return;
    const image = imageFrom(event.target);
    if (!image?.closest('[role="dialog"]')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open(image, event.deltaY < 0 ? 1.25 : .8);
  }, { capture: true, passive: false });

  stage.addEventListener("wheel", event => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.deltaY) return;
    const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    zoom(Math.exp(-Math.max(-240, Math.min(240, delta)) * .002), event.clientX, event.clientY);
  }, { passive: false });
  stage.addEventListener("dblclick", event => {
    event.preventDefault();
    if (Math.abs(scale - fitScale) < .001 && fitScale < 1) actual();
    else fit();
  });
  stage.addEventListener("pointerdown", event => {
    if (event.button !== 0 || !loaded) return;
    event.preventDefault();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, offsetX, offsetY };
    stage.setPointerCapture(event.pointerId);
    stage.classList.add("dragging");
  });
  stage.addEventListener("pointermove", event => {
    if (!drag || event.pointerId !== drag.id) return;
    offsetX = drag.offsetX + event.clientX - drag.x;
    offsetY = drag.offsetY + event.clientY - drag.y;
    paint();
  });
  function endDrag(event) {
    if (drag?.id !== event.pointerId) return;
    drag = null;
    stage.classList.remove("dragging");
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener("lostpointercapture", endDrag);

  document.addEventListener("keydown", event => {
    if (!dialog.open || event.ctrlKey || event.metaKey || event.altKey) return;
    const action = { Escape: close, ArrowLeft: () => navigate(-1), ArrowRight: () => navigate(1),
      "+": () => zoom(1.25), "=": () => zoom(1.25), "-": () => zoom(.8), "0": fit }[event.key];
    if (!action) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    action();
  }, true);
  window.addEventListener("resize", () => { entry.hidden = true; if (dialog.open) fit(); });
})();
