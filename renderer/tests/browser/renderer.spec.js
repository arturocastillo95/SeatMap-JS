import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.goto("/tests/browser/host.html");
  await page.waitForFunction(() => window.api);
});
test("seated-only fitting, keyboard booking, inventory reconciliation and accessible controls", async ({
  page,
}) => {
  await page.evaluate(async () => {
    await ready();
    r.loadInventory(api.inventory(map));
  });
  await expect(page.locator("canvas")).toBeVisible();
  expect(
    await page.evaluate(() => r.state.initialBounds.width),
  ).toBeGreaterThan(0);
  await page.getByText("Elegir asientos", { exact: true }).click();
  const seat = page.locator('[data-seat-id="seat-0"]');
  await seat.focus();
  await page.keyboard.press("Enter");
  await expect(seat).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => r.getCart().totalCount)).toBe(1);
  const changes = await page.evaluate(() => {
    let n = 0;
    document.querySelector("#map").addEventListener("cartChange", () => n++);
    r.loadInventory(
      { seats: [{ id: "seat-0", status: "sold" }] },
      { mode: "patch" },
    );
    return { n, count: r.getCart().totalCount };
  });
  expect(changes).toEqual({ n: 1, count: 0 });
  expect(
    (await new AxeBuilder({ page }).include(".seatmap-ui").analyze())
      .violations,
  ).toEqual([]);
});
test("maintained demo venue loads with selectable accessible seats and GA", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    await ready(0);
    const venue = await fetch("/demo-venue.json").then((response) =>
      response.json(),
    );
    delete venue.underlay;
    await r.loadData(venue);
    r.loadInventory(api.inventory(venue));
    const accessible = r.getSeats().filter((seat) => seat.special);
    const ga = r.getSections().find((section) => section.id === "8BYsAYda");
    const selection = r.selectSeat(accessible[0].id);
    return {
      seats: r.getSeats().length,
      sections: r.getSections().length,
      accessible: accessible.map((seat) => seat.seat),
      selected: {
        success: selection.success,
        selected: selection.selected,
      },
      totalCount: r.getCart().totalCount,
      ga: { type: ga.type, isZone: ga.isZone },
      icon: {
        width: Number(r._views.get(accessible[0].id)._icon.width.toFixed(1)),
        height: Number(r._views.get(accessible[0].id)._icon.height.toFixed(1)),
      },
    };
  });
  expect(result).toEqual({
    seats: 863,
    sections: 16,
    accessible: ["L1", "L2", "L3", "L4", "L5", "R1", "R2", "R3", "R4", "R5"],
    selected: { success: true, selected: true },
    totalCount: 1,
    ga: { type: "ga", isZone: false },
    icon: { width: 9.6, height: 9.6 },
  });
});
test("GA dialog revalidates inventory, contains focus and restores it", async ({
  page,
}) => {
  await page.evaluate(async () => {
    await ready(0);
    map.sections.push({
      id: "ga",
      name: "Pista",
      type: "ga",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
    await r.loadData(map);
    r.loadInventory({ ga: [{ sectionId: "ga", available: 5 }] });
  });
  await page.getByText("Elegir asientos", { exact: true }).click();
  const opener = page.getByRole("button", { name: /Pista/ });
  await opener.click();
  const input = page.getByRole("spinbutton");
  await input.fill("5");
  await page.evaluate(() =>
    r.loadInventory(
      { ga: [{ sectionId: "ga", available: 0 }] },
      { mode: "patch" },
    ),
  );
  await expect(input).toHaveValue("0");
  expect(
    (await new AxeBuilder({ page }).include("dialog").analyze()).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(opener).toBeFocused();
});
test("new loads supersede old loads; destroying a chunked load rejects without page errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const result = await page.evaluate(async () => {
    await ready(0, { seatChunkSize: 10 });
    let complete = 0;
    document
      .querySelector("#map")
      .addEventListener("mapFullyLoaded", () => complete++);
    const old = r.loadData(api.makeMap(1000)).catch((e) => e.name);
    await r.loadData(api.makeMap(20));
    const oldResult = await old;
    const pending = r.loadData(api.makeMap(1000)).catch((e) => e.name);
    r.destroy();
    r.destroy();
    return {
      oldResult,
      last: await pending,
      complete,
      diag: r.getDiagnostics(),
    };
  });
  expect(result.oldResult).toBe("AbortError");
  expect(result.last).toBe("AbortError");
  expect(result.complete).toBe(1);
  expect(result.diag.seatViews).toBe(0);
  expect(errors).toEqual([]);
});
test("invalid maps preserve the previous scene and hidden containers fit after showing", async ({
  page,
}) => {
  await page.evaluate(async () => {
    document.querySelector("#map").style.display = "none";
    await ready(100);
    try {
      await r.loadData({ sections: [] });
    } catch {}
    document.querySelector("#map").style.display = "block";
  });
  await expect
    .poll(() => page.evaluate(() => r.state.initialBounds?.width ?? 0))
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => r.getSeats().length)).toBe(100);
  await page.evaluate(
    () => (document.querySelector("#map").style.width = "400px"),
  );
  await expect.poll(() => page.evaluate(() => r.app.screen.width)).toBe(400);
});
test("underlays are shared safely and late images cannot attach to a new map", async ({
  page,
}) => {
  await page.route("**/delayed.svg", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="gray"/></svg>',
    });
  });
  const result = await page.evaluate(async () => {
    await ready(0);
    const first = api.makeMap(10);
    first.underlay = { sourceUrl: "/delayed.svg" };
    const pending = r.loadData(first).catch((e) => e.name);
    await r.loadData(api.makeMap(20));
    const canceled = await pending;
    const other = await api.SeatMapRenderer.create(
      document.querySelector("#other"),
    );
    await Promise.all([r.loadData(first), other.loadData(first)]);
    r.destroy();
    const valid = !other.viewport.children.find((c) => c.isUnderlay).texture
      .destroyed;
    other.destroy();
    return { canceled, valid, images: other.getDiagnostics().sharedImages };
  });
  expect(result).toEqual({ canceled: "AbortError", valid: true, images: 0 });
});
test("multiple instances and 20 mount/load/destroy cycles release owned resources", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    for (let i = 0; i < 20; i++) {
      const r = await api.SeatMapRenderer.create(
        document.querySelector("#map"),
      );
      await r.loadData(api.makeMap(100));
      r.zoomBy(1.2);
      r.destroy();
      const d = r.getDiagnostics();
      if (d.seatViews || d.textures || d.highlightFrames || d.sharedImages)
        throw Error("Resources retained");
    }
    const a = await api.SeatMapRenderer.create(document.querySelector("#map"));
    const b = await api.SeatMapRenderer.create(
      document.querySelector("#other"),
    );
    await Promise.all([
      a.loadData(api.makeMap(10)),
      b.loadData(api.makeMap(10)),
    ]);
    a.destroy();
    const count = document.querySelectorAll(".seatmap-ui").length;
    b.destroy();
    return {
      count,
      remaining: document.querySelectorAll("canvas,.seatmap-ui,dialog").length,
    };
  });
  expect(result).toEqual({ count: 1, remaining: 0 });
});
test("abort during initialization cleans up and does not leave DOM", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const c = new AbortController();
    const pending = api.SeatMapRenderer.create(document.querySelector("#map"), {
      signal: c.signal,
    }).catch((e) => e.name);
    c.abort();
    return await pending;
  });
  expect(result).toBe("AbortError");
  await page.waitForTimeout(300);
  await expect(page.locator("canvas")).toHaveCount(0);
});
test("pointer drag does not select seats", async ({ page }) => {
  await page.evaluate(async () => {
    await ready(100);
    r.loadInventory(api.inventory(map));
  });
  await page.mouse.move(40, 40);
  await page.mouse.down();
  await page.mouse.move(150, 100, { steps: 8 });
  await page.mouse.up();
  expect(await page.evaluate(() => r.getCart().totalCount)).toBe(0);
});
test("failed initialization leaves no DOM and reduced motion cancels viewport movement", async ({
  page,
}) => {
  const failure = await page.evaluate(async () => {
    const prototype = api.PIXI.Application.prototype,
      original = prototype.init;
    prototype.init = async () => {
      throw Error("GPU unavailable");
    };
    try {
      await api.SeatMapRenderer.create(document.querySelector("#map"));
    } catch (e) {
      return e.message;
    } finally {
      prototype.init = original;
    }
  });
  expect(failure).toBe("GPU unavailable");
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(async () => {
    await ready(100, { animationDuration: 500 });
    r.zoomBy(2);
  });
  expect(await page.evaluate(() => r.getDiagnostics().viewportAnimation)).toBe(
    false,
  );
});
test("failed underlay emits a diagnostic and settles with section bounds", async ({
  page,
}) => {
  await page.route("**/missing.svg", (route) =>
    route.fulfill({ status: 404, body: "missing" }),
  );
  const result = await page.evaluate(async () => {
    await ready(0);
    const map = api.makeMap(10);
    map.underlay = { sourceUrl: "/missing.svg" };
    const diagnostics = [];
    document
      .querySelector("#map")
      .addEventListener("renderer-diagnostic", (e) =>
        diagnostics.push(e.detail.code),
      );
    await r.loadData(map);
    return {
      diagnostics,
      bounds: r.state.initialBounds.width,
      ready: r.getDiagnostics().ready,
    };
  });
  expect(result.diagnostics).toContain("UNDERLAY_FAILED");
  expect(result.bounds).toBeGreaterThan(0);
  expect(result.ready).toBe(true);
});
test("touch pinch zoom does not select a seat", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "touch",
    "Chromium CDP native touch test",
  );
  await page.evaluate(async () => {
    await ready(100);
    r.loadInventory(api.inventory(map));
  });
  const before = await page.evaluate(() => r.viewport.scale.x);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: 120, y: 300, id: 0 },
      { x: 220, y: 300, id: 1 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: 70, y: 300, id: 0 },
      { x: 270, y: 300, id: 1 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  expect(await page.evaluate(() => r.viewport.scale.x)).toBeGreaterThan(before);
  expect(await page.evaluate(() => r.getCart().totalCount)).toBe(0);
});
test("built UMD example loads the packed runtime and self-hosted Pixi", async ({
  page,
}, testInfo) => {
  await page.route("https://i.postimg.cc/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1329" height="1329"/>',
    }),
  );
  await page.goto("/.pages/examples/index.html");
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator("#status")).toHaveText("Recinto listo.");
  await page.getByText("Elegir asientos", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Sección", exact: true })
    .selectOption("accessible-left");
  await expect(page.locator('[data-seat-id="gtqWqUrD"]')).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath("example.png"),
    fullPage: true,
  });
});
test("picker pages, filters, searches and preserves focus after removing a selection", async ({
  page,
}) => {
  await page.evaluate(async () => {
    await ready(1200);
    r.loadInventory(api.inventory(map));
  });
  await page.getByText("Elegir asientos", { exact: true }).click();
  await expect(page.locator("[data-seat-id]")).toHaveCount(50);
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.locator('[data-seat-id="seat-50"]')).toBeVisible();
  await page
    .getByRole("combobox", { name: "Sección", exact: true })
    .selectOption("section-1");
  await expect(page.locator('[data-seat-id="seat-1000"]')).toBeVisible();
  await page.getByRole("searchbox").fill("A 1");
  await expect(page.locator('[data-seat-id="seat-1000"]')).toBeVisible();
  await expect(page.locator('[data-seat-id="seat-1001"]')).toHaveCount(0);
  await page.locator('[data-seat-id="seat-1000"]').click();
  const remove = page.getByRole("button", { name: /Quitar:/ });
  await remove.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("summary")).toBeFocused();
});
test("visible prices refresh with inventory/promotions and orphan frames stop on destroy", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.evaluate(async () => {
    await ready(10, { preventOrphanSeats: true, animationDuration: 250 });
    r.loadInventory(api.inventory(map));
    const seat = r._store.seatSnapshot(r._store.seats.get("seat-1"));
    r.ui.showTooltip(seat, { x: 50, y: 50 });
    r.setSectionPromo("section-0", { discount: 0.5 });
  });
  await expect(page.locator(".seatmap-tooltip")).toContainText("$75.00");
  await page.evaluate(() =>
    r.loadInventory(
      { seats: [{ id: "seat-1", price: 20000 }] },
      { mode: "patch" },
    ),
  );
  await expect(page.locator(".seatmap-tooltip")).toContainText("$100.00");
  const result = await page.evaluate(() => {
    r.selectSeat("seat-1");
    const result = r.selectSeat("seat-3");
    const active = r.getDiagnostics().highlightFrames;
    r.destroy();
    return {
      reason: result.reason,
      active,
      remaining: r.getDiagnostics().highlightFrames,
    };
  });
  expect(result.reason).toBe("orphan-prevention");
  expect(result.active).toBeGreaterThan(0);
  expect(result.remaining).toBe(0);
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
});
test("initialization failure after GPU allocation destroys the allocated renderer", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const prototype = api.PIXI.Application.prototype,
      original = prototype.init;
    let destroyed = 0;
    prototype.init = async function (options) {
      await original.call(this, options);
      const dispose = this.renderer.destroy.bind(this.renderer);
      this.renderer.destroy = (...args) => {
        destroyed++;
        return dispose(...args);
      };
      throw Error("Plugin initialization failed");
    };
    let message;
    try {
      await api.SeatMapRenderer.create(document.querySelector("#map"));
    } catch (e) {
      message = e.message;
    } finally {
      prototype.init = original;
    }
    return {
      destroyed,
      message,
      nodes: document.querySelectorAll("canvas,.seatmap-ui").length,
    };
  });
  expect(result).toEqual({
    destroyed: 1,
    message: "Plugin initialization failed",
    nodes: 0,
  });
});
