import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/tests/browser/host.html");
  await page.waitForFunction(() => window.api);
});

test("loading initializes each seat once and preserves input data", async ({ page }) => {
  const result = await page.evaluate(async () => {
    await ready(0);
    const input = api.makeMap(1000);
    const original = JSON.stringify(input);
    let updates = 0;
    const update = r._updateSeat.bind(r);
    r._updateSeat = id => { updates++; update(id); };
    await r.loadData(input);
    const loadUpdates = updates;
    r.loadInventory(api.inventory(input));
    r.selectSeat("seat-0");
    return { loadUpdates, unchanged: original === JSON.stringify(input),
      normalizedStatus: r._map.sections[0].seats[0].status,
      selected: r._views.get("seat-0")._selectionMark.visible };
  });
  expect(result).toEqual({ loadUpdates: 1000, unchanged: true, normalizedStatus: "unknown", selected: true });
});

test("default loading yields when seat construction exhausts its time budget", async ({ page }) => {
  const result = await page.evaluate(async () => {
    await ready(0);
    const create = r._createSeat.bind(r);
    r._createSeat = (...args) => {
      create(...args);
      const start = performance.now();
      while (performance.now() - start < 1) { /* Simulate expensive seats. */ }
    };
    let viewsAtTimer;
    const timer = new Promise(resolve => setTimeout(() => {
      viewsAtTimer = r._views.size;
      resolve();
    }, 0));
    await r.loadData(api.makeMap(80));
    await timer;
    return { viewsAtTimer, total: r._views.size, ready: r._ready };
  });
  expect(result.viewsAtTimer).toBeLessThan(80);
  expect(result.total).toBe(80);
  expect(result.ready).toBe(true);
});

test("progress callbacks can abort a load without completion or leftover seats", async ({ page }) => {
  const result = await page.evaluate(async () => {
    await ready(0);
    const controller = new AbortController();
    let completed = false;
    r.container.addEventListener("seatLoadProgress", () => controller.abort(), { once: true });
    r.container.addEventListener("mapFullyLoaded", () => { completed = true; });
    const error = await r.loadData(api.makeMap(1000), { signal: controller.signal }).catch(e => e.name);
    return { error, completed, views: r._views.size, ready: r._ready };
  });
  expect(result).toEqual({ error: "AbortError", completed: false, views: 0, ready: false });
});

test("explicit chunk sizes retain fixed batch progress", async ({ page }) => {
  const progress = await page.evaluate(async () => {
    await ready(0, { seatChunkSize: 10 });
    const loaded = [];
    r.container.addEventListener("seatLoadProgress", e => loaded.push(e.detail.loaded));
    await r.loadData(api.makeMap(35));
    return loaded;
  });
  expect(progress).toEqual([10, 20, 30, 35, 35]);
});
