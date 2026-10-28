(() => {
  "use strict";

  const marker = "data-x-image-zoom-extension";
  if (document.documentElement.hasAttribute(marker)) return;
  document.documentElement.setAttribute(marker, "1.1.1");

  let active = null;
  let drag = null;
  let suppressClickUntil = 0;
  let suppressClickScope = null;

  function isPhoto(image) {
    if (!(image instanceof HTMLImageElement)) return false;
    try {
      const url = new URL(image.currentSrc || image.src);
      return url.protocol === "https:" && url.hostname === "pbs.twimg.com" &&
        url.pathname.startsWith("/media/");
    } catch {
      return false;
    }
  }

  function photoAt(event) {
    const target = event.target;
    if (!(target instanceof Element) || target.closest('button, a, article, video')) return null;
    const viewer = target.closest('[role="dialog"]');
    if (!viewer) return null;
    const direct = target.closest("img") || target.closest('[role="img"], [data-testid="tweetPhoto"]')?.querySelector("img");
    if (isPhoto(direct) && !direct.closest("article")) return direct;
    if (target.closest('[role="button"]')) return null;
    // X 可能在图片前铺透明手势层，按鼠标位置找它下面已显示的照片。
    return [...viewer.querySelectorAll("img")].find(image => {
      if (!isPhoto(image) || image.closest("article")) return false;
      const rect = image.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && event.clientX >= rect.left &&
        event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    }) || null;
  }

  function source(image) {
    return `${image.currentSrc}|${image.getAttribute("src")}|${image.getAttribute("srcset")}`;
  }

  function surfaceFor(image) {
    // X 使用 role=img 容器的背景层显示照片，内部的透明 img 只保留图片语义。
    // 缩放整个图片容器，背景和透明 img 才会一起移动，普通 img 则直接缩放自身。
    return image.closest('[role="img"]') || image;
  }

  function setStyle(state, element, name, value) {
    state.styles.push({ element, name, value: element.style.getPropertyValue(name),
      priority: element.style.getPropertyPriority(name) });
    element.style.setProperty(name, value, "important");
  }

  function reset() {
    const state = active;
    if (!state) return;
    active = null;
    suppressClickUntil = 0;
    suppressClickScope = null;
    state.observer.disconnect();
    if (drag && state.surface.hasPointerCapture(drag.id)) state.surface.releasePointerCapture(drag.id);
    drag = null;
    for (const saved of state.styles.reverse()) {
      if (saved.value) saved.element.style.setProperty(saved.name, saved.value, saved.priority);
      else saved.element.style.removeProperty(saved.name);
    }
  }

  function valid() {
    if (!active) return false;
    if (!active.image.isConnected || !active.surface.isConnected || !active.viewer.isConnected || active.viewer.hidden || active.image.hidden ||
        !active.viewer.getClientRects().length || active.viewer.getAttribute("aria-hidden") === "true" ||
        source(active.image) !== active.source) {
      reset();
      return false;
    }
    return true;
  }

  function begin(image) {
    reset();
    const surface = surfaceFor(image);
    const rect = surface.getBoundingClientRect();
    if (!image.complete || !image.naturalWidth || rect.width < 1 || rect.height < 1) return null;
    const viewer = image.closest('[role="dialog"]');
    const stage = image.closest('[data-testid="swipeable-list"]') || viewer;
    const area = stage.getBoundingClientRect();
    const state = { image, surface, viewer, source: source(image), rect,
      viewport: { left: Math.max(0, area.left), top: Math.max(0, area.top),
        right: Math.min(innerWidth, area.right), bottom: Math.min(innerHeight, area.bottom) },
      scale: 1, x: 0, y: 0, styles: [] };
    // 只改现有图片的显示样式，不创建图片节点，也不改 src / srcset。
    for (const [name, value] of [["transform-origin", "center"], ["translate", "0px 0px"],
      ["scale", "1"], ["transition", "none"], ["cursor", "grab"],
      ["user-select", "none"], ["touch-action", "none"]]) {
      setStyle(state, surface, name, value);
    }
    // 原生看图布局会裁剪子元素；缩放期间解除图片到看图区域之间的裁剪。
    for (let parent = surface.parentElement; parent && parent !== viewer; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if ([style.overflowX, style.overflowY].some(value => value !== "visible")) {
        setStyle(state, parent, "overflow-x", "visible");
        setStyle(state, parent, "overflow-y", "visible");
      }
    }
    state.observer = new MutationObserver(() => { valid(); });
    state.observer.observe(viewer, { subtree: true, childList: true, attributes: true,
      attributeFilter: ["src", "srcset", "hidden", "aria-hidden"] });
    // 看图层被 React 整体移除时，也要释放当前状态及观察器。
    state.observer.observe(document.body, { childList: true, subtree: true });
    active = state;
    return state;
  }

  function paint() {
    if (!valid()) return;
    const state = active;
    const { rect, viewport, scale } = state;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const width = rect.width * scale;
    const height = rect.height * scale;
    state.x = width <= viewport.right - viewport.left ? 0 :
      Math.max(viewport.right - cx - width / 2, Math.min(viewport.left - cx + width / 2, state.x));
    state.y = height <= viewport.bottom - viewport.top ? 0 :
      Math.max(viewport.bottom - cy - height / 2, Math.min(viewport.top - cy + height / 2, state.y));
    state.surface.style.setProperty("translate", `${state.x}px ${state.y}px`, "important");
    state.surface.style.setProperty("scale", `${scale}`, "important");
  }

  window.addEventListener("wheel", event => {
    if (!event.deltaY || event.ctrlKey || event.metaKey || event.altKey) return;
    valid();
    const image = photoAt(event);
    if (!image) return;
    if (active?.image !== image && event.deltaY > 0) return;
    const state = active?.image === image ? active : begin(image);
    if (!state) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    const next = Math.max(1, Math.min(12, state.scale * Math.exp(-Math.max(-240, Math.min(240, delta)) * .002)));
    if (next === 1) { reset(); return; }
    const x = event.clientX - state.rect.left - state.rect.width / 2;
    const y = event.clientY - state.rect.top - state.rect.height / 2;
    state.x = x - (x - state.x) * next / state.scale;
    state.y = y - (y - state.y) * next / state.scale;
    state.scale = next;
    paint();
  }, { capture: true, passive: false });

  window.addEventListener("pointerdown", event => {
    if (event.button !== 0 || !valid() || photoAt(event) !== active.image) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
      offsetX: active.x, offsetY: active.y, moved: false };
    active.surface.setPointerCapture(event.pointerId);
    active.surface.style.setProperty("cursor", "grabbing", "important");
  }, true);

  window.addEventListener("pointermove", event => {
    if (!drag || event.pointerId !== drag.id || !valid()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    active.x = drag.offsetX + dx;
    active.y = drag.offsetY + dy;
    paint();
  }, true);

  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const moved = drag.moved;
    drag = null;
    if (active) {
      if (moved) {
        suppressClickUntil = performance.now() + 500;
        suppressClickScope = active.viewer;
      }
      active.surface.style.setProperty("cursor", "grab", "important");
      if (active.surface.hasPointerCapture(event.pointerId)) active.surface.releasePointerCapture(event.pointerId);
    }
    if (moved) { event.preventDefault(); event.stopImmediatePropagation(); }
  }
  window.addEventListener("pointerup", endDrag, true);
  window.addEventListener("pointercancel", endDrag, true);
  window.addEventListener("lostpointercapture", endDrag, true);

  window.addEventListener("click", event => {
    if (performance.now() < suppressClickUntil && suppressClickScope?.contains(event.target) &&
        !event.target.closest('button, a, [role="button"]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClickUntil = 0;
      return;
    }
    // 保留 X 的关闭、切图及评论操作，先撤销当前图片样式。
    if (valid() && event.target instanceof Element &&
        event.target.closest('button, a, [role="button"]')) reset();
  }, true);

  window.addEventListener("dblclick", event => {
    if (!valid() || photoAt(event) !== active.image) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    reset();
  }, true);
  window.addEventListener("keydown", event => {
    if (["Escape", "ArrowLeft", "ArrowRight"].includes(event.key)) reset();
  }, true);
  window.addEventListener("resize", reset);
  window.addEventListener("popstate", reset);
})();
