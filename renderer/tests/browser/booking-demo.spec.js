import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Exercise underlay loading without making booking tests depend on an image CDN.
test.beforeEach(async ({ page }) => {
  await page.route("https://i.postimg.cc/**", (route) => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="1329" height="1329"><rect width="1329" height="1329" fill="#eee"/></svg>',
  }));
});

async function openDemo(page, path = "/examples/booking/index.html") {
  await page.goto(path);
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator("[data-status]")).toContainText(/Recinto listo|plano de fondo/);
}

async function openPicker(page) {
  const drawer = page.locator(".drawer-toggle");
  if ((await drawer.isVisible()) && (await drawer.getAttribute("aria-expanded")) === "true")
    await drawer.click();
  const summary = page.getByText("Elegir asientos", { exact: true });
  if (!(await summary.evaluate((node) => node.parentElement.open))) await summary.click();
}

test("complete demo books accessible and GA tickets through HTML controls", async ({ page }) => {
  await openDemo(page);
  expect((await new AxeBuilder({ page }).include("#booking-demo").analyze()).violations).toEqual([]);
  await openPicker(page);
  await page.getByRole("combobox", { name: "Sección", exact: true }).selectOption("accessible-left");
  await page.locator('[data-seat-id="gtqWqUrD"]').click();
  await expect(page.locator("[data-selection-view]")).toBeVisible();
  await expect(page.locator("[data-selection-lines]")).toContainText("Asiento L1");
  await expect(page.locator("[data-total]")).toHaveText("$0.00");

  await page.getByRole("button", { name: "Volver a las secciones" }).click();
  await openPicker(page);
  await page.getByRole("combobox", { name: "Sección", exact: true }).selectOption("8BYsAYda");
  await page.getByRole("button", { name: /ZONA GENERAL · Entrada general/ }).click();
  await page.getByRole("spinbutton").fill("2");
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.locator("[data-footer-count]")).toHaveText("3 boletos");
  await expect(page.locator("[data-total]")).toHaveText("$1,000.00");

  await page.getByRole("button", { name: "Revisar selección" }).click();
  const review = page.locator("[data-review-dialog]");
  await expect(review).toContainText("Asiento L1");
  await expect(review).toContainText("2 general");
  await expect(review).toContainText("$1,000.00");
  expect((await new AxeBuilder({ page }).include("[data-review-dialog]").analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Cerrar resumen" }).click();
  await expect(page.getByRole("button", { name: "Revisar selección" })).toBeFocused();
});

test("section IDs remain distinct and cart/review follow promotions and inventory", async ({ page }) => {
  await openDemo(page);
  const duplicateNames = page.locator("[data-section-id]", { hasText: "ORO 1" });
  await expect(duplicateNames).toHaveCount(2);
  expect(await duplicateNames.evaluateAll((nodes) => nodes.map((node) => node.dataset.sectionId))).toEqual(["ORO 1", "Wc2lwx4h"]);

  await page.evaluate(() => {
    const renderer = window.bookingDemo.renderer;
    const seats = renderer.getSeats().filter((seat) => seat.sectionId === "ORO 1").slice(0, 2);
    renderer.loadInventory(
      { seats: [{ id: seats[0].id, price: 60000 }, { id: seats[1].id, price: 70000 }] },
      { mode: "patch" },
    );
  });
  await expect(page.locator('[data-section-id="ORO 1"] .section-card-price')).toContainText("Desde$600.00");

  const chosen = await page.evaluate(() => {
    const renderer = window.bookingDemo.renderer;
    const seats = renderer.getSeats().filter((seat) => seat.sectionId === "VIP 3").slice(0, 2);
    for (const seat of seats) renderer.selectSeat(seat.id);
    renderer.setSectionPromo("VIP 3", { discount: 0.5, text: "Mitad de precio" });
    return seats.map((seat) => seat.id);
  });
  await expect(page.locator("[data-total]")).toHaveText("$1,000.00");
  await page.getByRole("button", { name: "Revisar selección" }).click();
  await expect(page.locator("[data-review-dialog]")).toContainText("Ahorro");
  await page.evaluate((seatId) => {
    window.bookingDemo.renderer.loadInventory(
      { seats: [{ id: seatId, status: "sold" }] },
      { mode: "patch" },
    );
  }, chosen[0]);
  await expect(page.locator("[data-footer-count]")).toHaveText("1 boleto");
  await expect(page.locator("[data-review-dialog]")).toContainText("$500.00");

  await page.evaluate((seatId) => {
    window.bookingDemo.renderer.loadInventory(
      { seats: [{ id: seatId, status: "sold" }] },
      { mode: "patch" },
    );
  }, chosen[1]);
  await expect(page.locator("[data-review-dialog]")).not.toBeVisible();
  await expect(page.locator("[data-footer-count]")).toHaveText("0 boletos");
});

test("loading failure is recoverable and stale attempts are cleaned up", async ({ page }) => {
  let requests = 0;
  await page.route("**/demo-venue.json", (route) => {
    requests++;
    if (requests === 1) route.fulfill({ status: 503, body: "unavailable" });
    else route.continue();
  });
  await page.goto("/examples/booking/index.html");
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator("[data-status]")).toContainText(/Recinto listo|plano de fondo/);
  await page.evaluate(() => window.bookingDemo.destroy());
  await expect(page.locator("canvas,.seatmap-ui")).toHaveCount(0);
});

test("built Pages artifact opens the complete demo without external runtimes", async ({ page }) => {
  await openDemo(page, "/.pages/");
  await expect(page.locator("[data-sections] .section-card")).toHaveCount(13);
  await expect(page.locator('script[src*="pixi.min.js"]')).toHaveCount(1);
});

test("removing the last sidebar ticket restores focus to section browsing", async ({ page }) => {
  await openDemo(page);
  await page.evaluate(() => {
    const r = window.bookingDemo.renderer;
    r.selectSeat(r.getSeats().find((seat) => seat.sectionId === "accessible-left").id);
  });
  const remove = page.locator("[data-selection-lines] button");
  await remove.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-sections] button").first()).toBeFocused();
});

test("pagehide cancels a delayed retry and pageshow restores one renderer", async ({ page }) => {
  await openDemo(page);
  await page.route("**/demo-venue.json", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.continue().catch(() => {});
  });
  await page.evaluate(async () => {
    const retry = window.bookingDemo.retry();
    window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
    await retry;
  });
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await expect(page.locator("[data-status]")).toContainText(/Recinto listo|plano de fondo/);
  await expect(page.locator("canvas")).toHaveCount(1);
});

test("published legacy booking URLs redirect to the maintained demo", async ({ page }) => {
  for (const name of ["demo-booking.html", "demo-booking-bundled.html"])
    await openDemo(page, `/.pages/${name}`);
});
