import { test, expect } from "@playwright/test";

for (const count of [1000, 10000])
  test(`loading ${count} seats`, async ({ page }, testInfo) => {
    test.skip(!process.env.SEATMAP_BENCHMARK, "Opt-in hardware-dependent benchmark.");
    await page.goto("/tests/browser/host.html");
    await page.waitForFunction(() => window.api);
    const metrics = await page.evaluate(async count => {
      const { normalizeMap } = await import("/booking/BookingStore.js");
      await ready(0);
      const json = JSON.stringify(api.makeMap(count));
      let start = performance.now();
      const input = JSON.parse(json);
      const parseMs = performance.now() - start;
      start = performance.now();
      normalizeMap(input);
      const normalizeMs = performance.now() - start;
      let storeMs = 0, seatUpdates = 0, fits = 0;
      const load = r._store.load.bind(r._store);
      r._store.load = map => {
        const begin = performance.now();
        load(map);
        storeMs += performance.now() - begin;
      };
      const update = r._updateSeat.bind(r);
      r._updateSeat = id => { seatUpdates++; update(id); };
      const fit = r.viewportManager.fitToView.bind(r.viewportManager);
      r.viewportManager.fitToView = (...args) => { fits++; return fit(...args); };
      start = performance.now();
      await r.loadData(input);
      const loadMs = performance.now() - start;
      const views = r.getDiagnostics().seatViews;
      r.destroy();
      return { count, parseMs, normalizeMs, storeMs, loadMs, seatUpdates, fits, views };
    }, count);
    console.log(JSON.stringify(metrics));
    await testInfo.attach("loading.json", { body: JSON.stringify(metrics, null, 2), contentType: "application/json" });
    expect(metrics.views).toBe(count);
  });
