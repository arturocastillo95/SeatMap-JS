import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/tests/browser/host.html");
  await page.waitForFunction(() => window.api);
});

test("selection and GA changes update only affected seat views", async ({ page }) => {
  const result = await page.evaluate(async () => {
    await ready(100);
    map.sections.push({ id: "ga", name: "GA", type: "ga", x: 0, y: 600, width: 100, height: 100 });
    await r.loadData(map);
    r.loadInventory(api.inventory(map));
    const updates = [];
    const updateSeat = r._updateSeat.bind(r);
    r._updateSeat = id => { updates.push(id); updateSeat(id); };
    let selectedEvent;
    r.container.addEventListener("seat-selected", e => { selectedEvent = e.detail.seat; });
    r.selectSeat("seat-0");
    r.selectSeat("seat-1");
    const selected = r._views.get("seat-0")._selectionMark.visible;
    r.setGAQuantity("ga", 1);
    r.setSectionPromo("section-0", { discount: 0.1 });
    r.clearGASelections();
    r.clearSelections();
    const selectionUpdates = [...updates];
    updates.length = 0;
    r.loadInventory({ seats: [{ id: "seat-2", status: "sold" }] }, { mode: "patch" });
    return {
      selectionUpdates, inventoryUpdates: updates, selected,
      cleared: !r._views.get("seat-0")._selectionMark.visible,
      soldCursor: r._views.get("seat-2").cursor,
      selectedEvent, count: r.getCart().totalCount,
    };
  });
  expect(result.selectionUpdates).toEqual(["seat-0", "seat-1", "seat-0", "seat-1"]);
  expect(result.inventoryUpdates).toEqual(["seat-2"]);
  expect(result.selected).toBe(true);
  expect(result.cleared).toBe(true);
  expect(result.soldCursor).toBe("not-allowed");
  expect(result.selectedEvent).toMatchObject({ id: "seat-1", selected: true });
  expect(result.count).toBe(0);
});

test("picker snapshots only its page, preserves filters and refreshes them on reload", async ({ page }) => {
  const result = await page.evaluate(async () => {
    await ready(1100);
    r.loadInventory(api.inventory(map));
    let snapshots = 0;
    const snapshot = r._store.seatSnapshot.bind(r._store);
    r._store.seatSnapshot = seat => { snapshots++; return snapshot(seat); };
    r.ui.renderResults();
    const firstPageSnapshots = snapshots;
    const option = r.ui.filter.options[1];
    r.selectSeat("seat-0");
    const sameOption = option === r.ui.filter.options[1];
    r.ui.filter.value = "section-1";
    r.ui.page = 1;
    r.ui.renderResults();
    const secondPage = [...r.ui.list.querySelectorAll("button")].map(b => b.dataset.seatId);
    const replacement = api.makeMap(100);
    replacement.sections[0].name = "Renamed";
    await r.loadData(replacement);
    return { firstPageSnapshots, sameOption, secondPage,
      filter: r.ui.filter.value, options: [...r.ui.filter.options].map(o => o.text) };
  });
  expect(result.firstPageSnapshots).toBe(50);
  expect(result.sameOption).toBe(true);
  expect(result.secondPage).toHaveLength(50);
  expect(result.secondPage[0]).toBe("seat-1050");
  expect(result.filter).toBe("");
  expect(result.options).toEqual(["Todas las secciones", "Renamed"]);
});

test("search-only picker skips empty searches and retains matching results", async ({ page }) => {
  const result = await page.evaluate(async () => {
    await ready(1000, { seatPickerSearchOnly: true });
    let snapshots = 0;
    const snapshot = r._store.seatSnapshot.bind(r._store);
    r._store.seatSnapshot = seat => { snapshots++; return snapshot(seat); };
    r.ui.renderResults();
    const emptySnapshots = snapshots;
    const emptyCount = r.ui.list.children.length;
    r.ui.search.value = "A 1";
    r.ui.renderResults();
    return { emptySnapshots, emptyCount, ids: [...r.ui.list.querySelectorAll("button")].map(b => b.dataset.seatId) };
  });
  expect(result.emptySnapshots).toBe(0);
  expect(result.emptyCount).toBe(0);
  expect(result.ids).toContain("seat-0");
});
