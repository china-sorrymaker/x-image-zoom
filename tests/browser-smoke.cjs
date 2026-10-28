const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

// 本地复现 X 的裁剪容器、透明手势层、评论区和原生切图，不访问真实账号。
(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
    headless: true
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    const mediaRequests = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", request => {
      if (new URL(request.url()).hostname === "pbs.twimg.com") mediaRequests.push(request.url());
    });
    await page.route("**/*", route => {
      if (new URL(route.request().url()).hostname === "pbs.twimg.com") {
        return route.fulfill({ contentType: "image/svg+xml", body:
          '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="6000"><rect width="800" height="6000" fill="#345"/><text x="20" y="150" font-size="50" fill="white">LONG IMAGE</text></svg>' });
      }
      return route.fulfill({ contentType: "text/html", body: `<!doctype html><html><body style="margin:0">
        <article><img id="feed" src="https://pbs.twimg.com/media/feed?name=small" width="80" height="300"></article>
        <div id="viewer" role="dialog" style="position:fixed;inset:0;background:#111;color:white;display:flex">
          <div id="stage" data-testid="swipeable-list" style="width:960px;height:900px;display:flex;align-items:center;justify-content:center;overflow:hidden">
            <div id="clip" data-testid="tweetPhoto" style="position:relative;width:100px;height:750px;overflow:hidden">
              <img id="long" src="https://pbs.twimg.com/media/long?format=jpg&name=large" width="100" height="750" style="cursor:crosshair !important;transform:translateZ(0)">
            </div>
          </div>
          <aside style="width:320px;position:relative;z-index:2;background:#222">
            <button id="next">Next</button><button id="close">Close</button>
            <img id="avatar" src="https://pbs.twimg.com/profile_images/avatar.jpg" width="80" height="80">
            <article><img id="comment" src="https://pbs.twimg.com/media/comment?name=small" width="100" height="200"></article>
          </aside>
        </div>
        <script>
          window.nativeClicks=0;window.nativeWheels=0;window.nativeKeys=0;
          const img=document.querySelector('#long');const viewer=document.querySelector('#viewer');
          img.addEventListener('click',()=>window.nativeClicks++);
          document.addEventListener('wheel',()=>window.nativeWheels++,{passive:true});
          document.querySelector('#next').onclick=()=>img.src='https://pbs.twimg.com/media/second?format=jpg&name=large';
          document.querySelector('#close').onclick=()=>viewer.hidden=true;
          document.addEventListener('keydown',event=>{
            window.nativeKeys++;
            if(event.key==='Escape') viewer.hidden=true;
          });
        </script></body></html>` });
    });
    await page.goto("https://x.com/fixture/status/1/photo/1");
    const script = path.resolve(__dirname, "../content.js");
    await page.addScriptTag({ path: script });
    const image = page.locator("#long");
    const scale = () => image.evaluate(el => Number(el.style.scale || 1));
    async function wheel(delta, x = 480, y = 450) {
      const previous = await scale();
      await page.mouse.move(x, y);
      await page.mouse.wheel(0, delta);
      await page.waitForFunction(({ previous, delta }) => {
        const value = Number(document.querySelector('#long').style.scale || 1);
        return delta < 0 ? value > previous : value < previous || value === 1;
      }, { previous, delta });
    }
    const originalSource = await image.getAttribute("src");
    const initialRequests = mediaRequests.length;
    await image.click();
    assert.equal(await page.evaluate(() => window.nativeClicks), 1, "native click preserved");
    await wheel(-180);
    assert.ok((await image.boundingBox()).width > 140, "first wheel immediately enlarges existing image");
    assert.equal(mediaRequests.length, initialRequests, "zoom makes no new image requests");
    assert.equal(await image.getAttribute("src"), originalSource, "src unchanged");
    assert.equal(await page.locator('dialog').count(), 0, "no extension viewer created");
    assert.equal(await page.locator('img').count(), 4, "no cloned image created");
    assert.equal(await page.locator('#clip').evaluate(el => getComputedStyle(el).overflowX), "visible", "zoom escapes native clipping");
    assert.equal(await page.evaluate(() => window.nativeWheels), 0, "zoom wheel does not reach native carousel");

    const beforeDrag = await image.boundingBox();
    const clicksBeforeDrag = await page.evaluate(() => window.nativeClicks);
    await page.mouse.move(480, 450);
    await page.mouse.down();
    await page.mouse.move(480, 250, { steps: 5 });
    await page.mouse.up();
    assert.ok((await image.boundingBox()).y < beforeDrag.y - 50, "long image pans vertically within viewport bounds");
    assert.equal(await page.evaluate(() => window.nativeClicks), clicksBeforeDrag, "drag does not trigger native image click");
    await page.mouse.dblclick(480, 450);
    assert.equal(await scale(), 1, "double click resets");
    assert.equal(await image.evaluate(el => el.style.getPropertyValue('cursor')), "crosshair");
    assert.equal(await image.evaluate(el => el.style.getPropertyPriority('cursor')), "important");
    assert.equal(await image.evaluate(el => el.style.transform), "translateZ(0px)", "existing transform preserved");
    assert.equal(await page.locator('#clip').evaluate(el => getComputedStyle(el).overflowX), "hidden", "clipping restored");

    await wheel(-240);
    await wheel(240);
    assert.equal(await scale(), 1, "wheel down returns to native size");
    await wheel(-160);
    const currentScale = await scale();
    for (const id of ["avatar", "comment", "next"]) {
      const handled = await page.locator(`#${id}`).evaluate(el => !el.dispatchEvent(new WheelEvent('wheel', {
        deltaY: -100, clientX: 1000, clientY: 100, bubbles: true, cancelable: true
      })));
      assert.equal(handled, false, `${id} wheel is not intercepted`);
      assert.equal(await scale(), currentScale);
    }
    const modifierHandled = await image.evaluate(el => !el.dispatchEvent(new WheelEvent('wheel', {
      deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true
    })));
    assert.equal(modifierHandled, false, "browser pinch / ctrl-wheel not intercepted");
    await page.locator('#next').click();
    await page.waitForFunction(() => document.querySelector('#long').complete);
    assert.equal(await scale(), 1, "native next resets zoom");
    assert.match(await image.getAttribute('src'), /second/);

    // 原生 React 复用同一个 img 切换 src，观察器也应恢复样式。
    await wheel(-100);
    await image.evaluate(el => { el.src = 'https://pbs.twimg.com/media/third?name=large'; });
    await page.waitForFunction(() => !document.querySelector('#long').style.scale);
    await page.waitForFunction(() => document.querySelector('#long').complete);

    // 透明手势层盖住 img 时仍能直接滚轮缩放。
    await page.locator('#clip').evaluate(el => {
      const overlay = document.createElement('div');
      overlay.id = 'gesture'; overlay.style.cssText = 'position:absolute;inset:0';
      el.append(overlay);
    });
    await wheel(-100);
    await page.keyboard.press('Escape');
    assert.equal(await scale(), 1);
    assert.equal(await page.evaluate(() => window.nativeKeys), 1, "Escape is delivered to native viewer");
    assert.equal(await page.locator('#viewer').evaluate(el => el.hidden), true);

    const feedHandled = await page.locator('#feed').evaluate(el => !el.dispatchEvent(new WheelEvent('wheel', {
      deltaY: -100, bubbles: true, cancelable: true
    })));
    assert.equal(feedHandled, false, "feed scrolling preserved");
    await page.locator('#viewer').evaluate(el => { el.hidden = false; });
    await wheel(-100);
    await page.locator('#close').click();
    assert.equal(await scale(), 1, "native close restores image");
    await page.locator('#viewer').evaluate(el => { el.hidden = false; });
    await wheel(-100);
    await page.setViewportSize({ width: 1280, height: 850 });
    assert.equal(await scale(), 1, "resize restores geometry");
    await page.addScriptTag({ path: script });
    await wheel(-100);
    assert.ok(await scale() < 1.3, "duplicate injection does not multiply wheel handlers");
    await page.locator('#viewer').evaluate(el => el.remove());
    assert.equal(await page.locator('#x-image-zoom-extension').count(), 0);
    assert.deepEqual(errors, [], "no browser runtime errors");
    console.log('PASS: immediate native zoom, zero reloads/clones/dialogs, pointer pan, clipping restoration, drag click suppression, double-click/wheel reset, native controls/Escape, source changes, transparent overlay, comment/avatar/feed exclusion, modifiers, resize, duplicate injection, DOM cleanup.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
