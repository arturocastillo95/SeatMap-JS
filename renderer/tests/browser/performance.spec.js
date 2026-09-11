import { test, expect } from "@playwright/test";
for (const count of [1000, 10000])
  test(`benchmark ${count} seats`, async ({ page }, testInfo) => {
    test.skip(
      !process.env.SEATMAP_BENCHMARK,
      "Opt-in benchmark; performance depends on hardware.",
    );
    await page.goto("/tests/browser/host.html");
    await page.waitForFunction(() => window.api);
    const metrics = await page.evaluate(async (count) => {
      const start = performance.now();
      await ready(count);
      const loadMs = performance.now() - start;
      r.loadInventory(api.inventory(map));
      const begin = performance.now();
      r.selectSeat("seat-0");
      await new Promise(requestAnimationFrame);
      const selectionMs = performance.now() - begin;
      const times = [];
      let last = performance.now();
      for (let i = 0; i < 90; i++) {
        r.zoomBy(i % 2 ? 1 / 1.01 : 1.01);
        await new Promise(requestAnimationFrame);
        const now = performance.now();
        times.push(now - last);
        last = now;
      }
      const resources = r.getDiagnostics();
      r.destroy();
      return {
        count,
        loadMs,
        selectionMs,
        medianFrameMs: times.sort((a, b) => a - b)[45],
        resources,
        afterDestroy: r.getDiagnostics(),
        userAgent: navigator.userAgent,
      };
    }, count);
    console.log(JSON.stringify(metrics));
    await testInfo.attach("benchmark.json", {
      body: JSON.stringify(metrics, null, 2),
      contentType: "application/json",
    });
    expect(metrics.afterDestroy.seatViews).toBe(0);
    if (process.env.SEATMAP_ENFORCE_PERF) {
      expect(metrics.loadMs).toBeLessThan(5000);
      expect(metrics.selectionMs).toBeLessThan(100);
      expect(metrics.medianFrameMs).toBeLessThan(33);
    }
  });
