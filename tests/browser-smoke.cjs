const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

// 全部请求由本地样例响应；验证交互，不访问 X 账号或真实帖子。
(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
    headless: true
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.hostname === "pbs.twimg.com") {
        if (url.pathname.includes("fallback") && url.searchParams.get("name") === "orig") {
          return route.fulfill({ status: 404, body: "missing original" });
        }
        return route.fulfill({ contentType: "image/svg+xml", body:
          '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="6000"><rect width="800" height="6000" fill="#345"/><text x="40" y="100" font-size="40" fill="white">LONG IMAGE</text></svg>' });
      }
      return route.fulfill({ contentType: "text/html", body: `<!doctype html>
        <html style="overflow:auto !important"><body style="margin:0;background:#111;color:white">
        <button id="focus">Native viewer</button><img id="avatar" src="https://pbs.twimg.com/profile_images/avatar.jpg" width="80" height="80">
        <div role="dialog" style="display:flex;gap:20px">
          <img id="long" src="https://pbs.twimg.com/media/long?format=jpg&name=large" width="100" height="750" alt="Long image">
          <img id="second" src="https://pbs.twimg.com/media/second?format=jpg&name=small" width="80" height="600">
        </div><article id="feed"></article>
        <script>window.nativeClicks=0;document.querySelector('#long').onclick=()=>window.nativeClicks++;</script>
        </body></html>` });
    });
    await page.goto("https://x.com/fixture/status/1/photo/1");
    const script = path.resolve(__dirname, "../content.js");
    await page.addScriptTag({ path: script });
    const host = page.locator("#x-image-zoom-extension");
    const dialog = host.locator("dialog");
    const photo = host.locator(".photo");
    const button = action => host.locator(`[data-action="${action}"]`);
    async function ready() {
      await page.waitForFunction(() => {
        const root = document.querySelector("#x-image-zoom-extension").shadowRoot;
        return root.querySelector("dialog").open && !root.querySelector(".photo").hidden;
      });
    }
    const percentage = async () => parseInt(await host.locator("output").textContent(), 10);

    await page.locator("#long").click();
    assert.equal(await page.evaluate(() => window.nativeClicks), 1, "native click preserved");
    assert.equal(await dialog.evaluate(el => el.open), false);
    await page.locator("#avatar").hover();
    assert.equal(await host.locator(".entry").isVisible(), false, "avatars excluded");

    await page.locator("#focus").focus();
    await page.locator("#long").hover();
    await host.locator(".entry").click();
    await ready();
    assert.match(await photo.getAttribute("src"), /name=orig/);
    assert.ok(await percentage() < 20, "long image initially fits viewport");
    await button("width").click();
    assert.ok(await percentage() > 100, "long image expands to viewport width");
    const bounds = await photo.boundingBox();
    const stageBounds = await host.locator(".stage").boundingBox();
    assert.ok(Math.abs(bounds.y - stageBounds.y) < 2, "fit width starts at top");
    const beforeDrag = await photo.getAttribute("style");
    await page.mouse.move(600, 400);
    await page.mouse.down();
    await page.mouse.move(600, 200, { steps: 5 });
    await page.mouse.up();
    assert.notEqual(await photo.getAttribute("style"), beforeDrag, "drag moves long image");
    const beforeZoom = await percentage();
    await page.mouse.wheel(0, -180);
    await page.waitForFunction(n => parseInt(document.querySelector("#x-image-zoom-extension").shadowRoot.querySelector("output").textContent) > n, beforeZoom);
    await button("actual").click();
    assert.equal(await percentage(), 100);
    await button("next").click();
    await ready();
    assert.match(await photo.getAttribute("src"), /\/second\?/);
    await page.keyboard.press("Escape");
    assert.equal(await dialog.evaluate(el => el.open), false);
    assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue("overflow")), "auto");
    assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyPriority("overflow")), "important");
    assert.equal(await page.evaluate(() => document.activeElement.id), "focus");

    await page.locator("#long").hover();
    await page.mouse.wheel(0, -100);
    await ready();
    assert.ok(await percentage() > 13, "native viewer wheel opens zoom");
    await button("close").click();

    await page.evaluate(() => {
      const img = document.createElement("img");
      img.id = "dynamic";
      img.src = "https://pbs.twimg.com/media/fallback?format=jpg&name=small";
      img.width = 100;
      img.height = 200;
      document.querySelector("#feed").append(img);
    });
    await page.locator("#dynamic").hover();
    await host.locator(".entry").click();
    await ready();
    assert.match(await photo.getAttribute("src"), /name=small/, "original failure falls back to page image");
    await button("close").click();
    await page.addScriptTag({ path: script });
    assert.equal(await host.count(), 1, "duplicate injection ignored");
    console.log("PASS: native click, avatar exclusion, original image, long-image fit width/top, drag, wheel zoom, 100%, gallery, close/focus/scroll restoration, native wheel entry, dynamic feed, fallback, duplicate injection.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
