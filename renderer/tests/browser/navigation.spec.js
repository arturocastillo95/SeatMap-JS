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

function seatPoint(page, id = seatId) {
  return page.evaluate((seatId) => {
    const p = r._views.get(seatId).getGlobalPosition();
    const rect = r.app.canvas.getBoundingClientRect();
    return { x: p.x + rect.left, y: p.y + rect.top };
  }, id);
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

  point = await seatPoint(page);
  await page.touchscreen.tap(point.x, point.y);
  await expect.poll(() => selectedSeats(page)).toEqual([]);
});

test("clicking a neighbor selects it when a selected seat visually overlaps it", async ({ page, isMobile }) => {
  test.skip(isMobile, "Mouse selection is covered in the desktop projects.");
  await page.goto("/tests/browser/host.html");
  await page.waitForFunction(() => window.api);
  await page.evaluate(async () => {
    await ready(0);
    const closeSeats = api.makeMap(520);
    const section = closeSeats.sections[0];
    section.transform = { rotation: 25 };
    section.layoutShiftX = 15;
    section.seats[499].x = section.seats[498].x + 12;
    await r.loadData(closeSeats);
    r.loadInventory(api.inventory(closeSeats));
    r.zoomBy(2.5);
  });
  const first = await seatPoint(page, "seat-498");
  const second = await seatPoint(page, "seat-499");
  await page.mouse.click(second.x, second.y);
  await page.mouse.click(first.x, first.y);
  expect(await selectedSeats(page)).toEqual(["seat-499", "seat-498"]);
  await page.mouse.click(second.x, second.y);
  expect(await selectedSeats(page)).toEqual(["seat-498"]);
});

test("touch seat selection works after one zoom tap and tolerates drift toward a neighbor", async ({ page, browserName, isMobile }) => {
  test.skip(browserName !== "chromium" || !isMobile, "Uses native Chromium touch gestures.");
  await page.goto("/tests/browser/host.html");
  await page.waitForFunction(() => window.api);
  await page.evaluate(async () => {
    await ready(520);
    r.loadInventory(api.inventory(map));
  });
  const overviewPoint = await seatPoint(page, "seat-499");
  await page.touchscreen.tap(overviewPoint.x, overviewPoint.y);
  expect(await selectedSeats(page)).toEqual([]);

  const first = await seatPoint(page, "seat-498");
  const second = await seatPoint(page, "seat-499");
  await page.touchscreen.tap(second.x, second.y);
  expect(await selectedSeats(page)).toEqual(["seat-499"]);

  const position = await page.evaluate(() => r.viewport.x);
  const cdp = await page.context().newCDPSession(page);
  const between = (fraction) => ({
    x: first.x + (second.x - first.x) * fraction,
    y: first.y,
  });
  try {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [between(0.37)] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [between(0.79)] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    expect(await selectedSeats(page)).toEqual(["seat-499", "seat-498"]);
    expect(await page.evaluate(() => r.viewport.x)).toBe(position);

    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [second] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  } finally {
    await cdp.detach();
  }
  expect(await selectedSeats(page)).toEqual(["seat-499", "seat-498"]);
  await page.touchscreen.tap(second.x, second.y);
  expect(await selectedSeats(page)).toEqual(["seat-498"]);
});
