"use strict";

const summary = document.getElementById("summary");
const details = document.getElementById("details");

async function check() {
  summary.textContent = "正在检查当前标签页…";
  details.textContent = `插件文件版本：${chrome.runtime.getManifest().version}`;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("没有活动标签页");
    let state;
    try {
      state = await chrome.tabs.sendMessage(tab.id, { type: "x-image-zoom-status" });
    } catch {
      summary.textContent = "当前页没有响应诊断请求。请在此 Chrome 的 X 页面刷新后重试；旧版脚本也不支持此检查。";
      return;
    }
    if (!state?.version) {
      summary.textContent = "未收到有效状态，请刷新 X 页面后重试。";
      return;
    }
    summary.textContent = state.result;
    details.textContent += `\n页面脚本版本：${state.version}\n收到滚轮次数：${state.wheelCount}\n最近滚轮目标：${state.target}\n看图层数量：${state.dialogs}\n帖子图片数量：${state.photos}\n正在缩放：${state.active ? "是" : "否"}\n请求倍率：${Number(state.requestedScale).toFixed(2)}\n浏览器计算倍率：${state.computedScale}\n可见层宽度：${state.initialWidth ?? "—"} → ${state.renderedWidth ?? "—"}`;
  } catch {
    summary.textContent = "暂时无法检查当前标签页，请切回 X 后重试。";
  }
}

document.getElementById("refresh").addEventListener("click", check);
check();
