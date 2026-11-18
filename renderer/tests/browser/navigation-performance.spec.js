import { test, expect } from "@playwright/test";

// Compare configurations on the same fixture, including Pixi's pointer-event path.
for (const variant of ["baseline", "render-group", "render-group-events"])
  test(`navigation 10000 seats: ${variant}`, async ({ page }, testInfo) => {
    test.skip(!process.env.SEATMAP_BENCHMARK, "Opt-in hardware-dependent benchmark.");
    await page.goto("/tests/browser/host.html");
    await page.waitForFunction(() => window.api);
    const metrics = await page.evaluate(async variant => {
      await ready(10000);
      r.loadInventory(api.inventory(map));
      r.viewport.isRenderGroup = variant !== "baseline";
      r.app.renderer.events.features.globalMove = variant !== "render-group-events";
      for (const view of r._views.values())
        view.interactiveChildren = variant !== "render-group-events";
      r.zoomBy(2);
      r.app.stop();
      const canvas = r.app.canvas;
      const rect = canvas.getBoundingClientRect();
      const pointer = (type, x, buttons = 1) => canvas.dispatchEvent(new PointerEvent(type, {
        bubbles: true, pointerId: 1, pointerType: "mouse", isPrimary: true,
        clientX: rect.left + x, clientY: rect.top + 325, button: 0, buttons,
      }));
      const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
      const results = {};
      for (const action of ["pan", "zoom"]) {
        const renderTimes = [], inputTimes = [], frameTimes = [];
        pointer("pointerdown", 450);
        let last = performance.now();
        for (let i = 0; i < 70; i++) {
          const begin = performance.now();
          if (action === "pan") pointer("pointermove", i % 2 ? 450 : 455);
          else r.zoomBy(i % 2 ? 1 / 1.01 : 1.01);
          const inputMs = performance.now() - begin;
          const renderStart = performance.now();
          r.app.render();
          const renderMs = performance.now() - renderStart;
          await new Promise(requestAnimationFrame);
          const now = performance.now();
          if (i >= 10) {
            inputTimes.push(inputMs);
            renderTimes.push(renderMs);
            frameTimes.push(now - last);
          }
          last = now;
        }
        pointer("pointerup", 450, 0);
        results[action] = { inputMs: median(inputTimes), renderMs: median(renderTimes), frameMs: median(frameTimes) };
      }
      r.destroy();
      return { variant, ...results, afterDestroy: r.getDiagnostics(), userAgent: navigator.userAgent };
    }, variant);
    console.log(JSON.stringify(metrics));
    await testInfo.attach("navigation.json", { body: JSON.stringify(metrics, null, 2), contentType: "application/json" });
    expect(metrics.afterDestroy.seatViews).toBe(0);
  });
