import { test, expect } from "@playwright/test";

test("large-map navigation preserves seat hover, selection and drag behavior", async ({ page }, testInfo) => {
  await page.goto("/tests/browser/host.html");
  await page.waitForFunction(() => window.api);
  await page.evaluate(async () => {
    await ready(10000);
    r.loadInventory(api.inventory(map));
    r.zoomToSectionById("section-2");
  });
  const seatPoint = () => page.evaluate(() => {
    const p = r._views.get("seat-2459").getGlobalPosition();
    const rect = r.app.canvas.getBoundingClientRect();
    return { x: p.x + rect.left, y: p.y + rect.top };
  });
  let point = await seatPoint();
  await page.mouse.move(point.x, point.y);
  await expect(page.locator(".seatmap-tooltip")).toBeVisible();
  await page.mouse.click(point.x, point.y);
  expect(await page.evaluate(() => r.getCart().seats.map(s => s.id))).toEqual(["seat-2459"]);
  expect(await page.evaluate(() => r._views.get("seat-2459")._selectionMark.visible)).toBe(true);
  const before = await page.evaluate(() => r.viewport.x);
  await page.mouse.down();
  await page.mouse.move(point.x + 60, point.y + 30, { steps: 6 });
  await page.mouse.up();
  expect(await page.evaluate(() => r.viewport.x)).toBeGreaterThan(before);
  expect(await page.evaluate(() => r.getCart().totalCount)).toBe(1);
  await page.mouse.wheel(0, -100);
  await page.evaluate(() => r.fitToView(false));
  await page.evaluate(() => r.zoomToSectionById("section-2"));
  point = await seatPoint();
  await expect.poll(() => page.evaluate(() => r.inputHandler.gestureState.gestureCooldown)).toBe(false);
  await page.mouse.move(point.x, point.y);
  await page.mouse.click(point.x, point.y);
  expect(await page.evaluate(() => r.getCart().totalCount)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath("large-map-navigation.png") });
});
