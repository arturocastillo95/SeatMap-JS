import { test, expect } from "@playwright/test";

const sectionId = "section-2";
const seatId = "seat-2459";

async function loadLargeMap(page) {
  await page.goto("/tests/browser/host.html");
  await page.waitForFunction(() => window.api);
  await page.evaluate(async (sectionId) => {
    await ready(10000);
    r.loadInventory(api.inventory(map));
    r.zoomToSectionById(sectionId);
  }, sectionId);
}

function seatPoint(page) {
  return page.evaluate((seatId) => {
    const p = r._views.get(seatId).getGlobalPosition();
    const rect = r.app.canvas.getBoundingClientRect();
    return { x: p.x + rect.left, y: p.y + rect.top };
  }, seatId);
}

function selectedSeats(page) {
  return page.evaluate(() => r.getCart().seats.map(seat => seat.id));
}

test("large-map mouse navigation preserves hover and selection through drag and wheel zoom", async ({ page, isMobile }, testInfo) => {
  test.skip(isMobile, "Mouse navigation is covered in the desktop projects.");
  await loadLargeMap(page);
  let point = await seatPoint(page);
  await page.mouse.move(point.x, point.y);
  await expect(page.locator(".seatmap-tooltip")).toBeVisible();
  await page.mouse.click(point.x, point.y);
  await expect.poll(() => selectedSeats(page)).toEqual([seatId]);
  expect(await page.evaluate((id) => r._views.get(id)._selectionMark.visible, seatId)).toBe(true);
  const before = await page.evaluate(() => r.viewport.x);
  await page.mouse.down();
  await page.mouse.move(point.x + 60, point.y + 30, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => r.viewport.x)).toBeGreaterThan(before);
  expect(await selectedSeats(page)).toEqual([seatId]);

  const beforeWheel = await page.evaluate(() => r.viewport.scale.x);
  await page.mouse.wheel(0, -100);
  await expect.poll(() => page.evaluate(() => r.viewport.scale.x)).toBeGreaterThan(beforeWheel);
  await page.evaluate((sectionId) => {
    r.fitToView(false);
    r.zoomToSectionById(sectionId);
  }, sectionId);
  await expect.poll(() => page.evaluate(() => r.inputHandler.gestureState.gestureCooldown)).toBe(false);
  point = await seatPoint(page);
  await page.mouse.move(point.x, point.y);
  await page.mouse.click(point.x, point.y);
  await expect.poll(() => selectedSeats(page)).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("large-map-navigation.png") });
});

test("large-map touch navigation preserves the selected seat through a swipe", async ({ page, browserName, isMobile }) => {
  test.skip(browserName !== "chromium" || !isMobile, "Uses native Chromium touch gestures.");
  await loadLargeMap(page);
  let point = await seatPoint(page);
  await page.touchscreen.tap(point.x, point.y);
  await expect.poll(() => selectedSeats(page)).toEqual([seatId]);

  const before = await page.evaluate(() => r.viewport.x);
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: point.x + 60, y: point.y + 30 }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } finally {
    await cdp.detach();
  }
  await expect.poll(() => page.evaluate(() => r.viewport.x)).toBeGreaterThan(before);
  expect(await selectedSeats(page)).toEqual([seatId]);

  await expect.poll(() => page.evaluate(() => r.inputHandler.gestureState.gestureCooldown)).toBe(false);
  point = await seatPoint(page);
  await page.touchscreen.tap(point.x, point.y);
  await expect.poll(() => selectedSeats(page)).toEqual([]);
});
