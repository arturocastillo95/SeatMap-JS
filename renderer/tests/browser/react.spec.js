import { test, expect } from "@playwright/test";
test("shipped React example survives Strict Mode, URL changes, stale fetches and unmount", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/tests/browser/react.html");
  await page.waitForFunction(() => window.mountExample);
  const map = await page.evaluate(() => fixtures.makeMap(100));
  const next = structuredClone(map);
  next.sections[0].name = "Nuevo mapa";
  const inventory = await page.evaluate((map) => fixtures.inventory(map), next);
  let started;
  const firstRequest = new Promise((r) => (started = r));
  await page.route("**/map-first.json", async (route) => {
    started();
    await new Promise((r) => setTimeout(r, 400));
    await route.fulfill({ json: map }).catch(() => {});
  });
  await page.route("**/inventory-first.json", async (route) => {
    await new Promise((r) => setTimeout(r, 400));
    await route.fulfill({ json: inventory }).catch(() => {});
  });
  await page.route("**/map-next.json", (route) =>
    route.fulfill({ json: next }),
  );
  await page.route("**/inventory-next.json", (route) =>
    route.fulfill({ json: inventory }),
  );
  await page.evaluate(() =>
    mountExample("/map-first.json", "/inventory-first.json"),
  );
  await firstRequest;
  await page.evaluate(() =>
    mountExample("/map-next.json", "/inventory-next.json"),
  );
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.getByText("Elegir asientos", { exact: true }).click();
  await expect(page.locator('[data-seat-id="seat-0"]')).toBeEnabled();
  await expect(page.locator('[data-seat-id="seat-0"]')).toContainText(
    "Nuevo mapa",
  );
  await page.waitForTimeout(500);
  await expect(page.locator('[data-seat-id="seat-0"]')).toContainText(
    "Nuevo mapa",
  );
  await expect(page.locator(".seatmap-ui")).toHaveCount(1);
  await page.evaluate(() => unmountExample());
  await expect(page.locator("canvas,.seatmap-ui,dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});
