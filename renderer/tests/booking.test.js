import { test } from "node:test";
import assert from "node:assert/strict";
import { BookingStore, normalizeMap } from "../booking/BookingStore.js";
export const fixture = () => ({
  format: "SMF",
  version: "2.1.0",
  sections: [
    {
      id: "s",
      name: "Different name",
      type: "regular",
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      rowLabels: { type: "letters", start: "Z" },
      pricing: { basePrice: 1.25 },
      seats: [0, 1, 2, 3].map((i) => ({
        id: `s${i}`,
        r: 0,
        c: i,
        n: String(12 - i),
        x: i * 20,
        y: 10,
        sn: i === 3 ? 1 : 0,
      })),
    },
    {
      id: "ga",
      name: "Floor",
      type: "ga",
      x: 0,
      y: 100,
      width: 100,
      height: 100,
      pricing: { basePrice: 2 },
    },
  ],
});
const setup = (options = {}) => {
  const s = new BookingStore({ preventOrphanSeats: false, ...options });
  s.load(normalizeMap(fixture(), s.options));
  return s;
};
test("requires inventory; normalizes labels, special metadata and minor units", () => {
  const s = setup();
  assert.equal(s.selectSeat("s0").success, false);
  const a = s.getSeats()[0];
  assert.equal(a.seat, "12");
  assert.equal(a.row, "Z");
  assert.equal(a.price, 125);
  assert.equal(s.getSeats()[3].special, true);
  s.loadInventory({ seats: [{ id: "s0", status: "available" }] });
  assert.equal(s.selectSeat("s0").success, true);
  const snap = s.getSeats();
  snap[0].price = 999;
  assert.equal(s.getSeats()[0].price, 125);
});
test("mixed prices sum and cheapest eligible seats become free by section ID", () => {
  const s = setup();
  s.loadInventory({
    seats: [100, 200, 300].map((price, i) => ({
      id: `s${i}`,
      status: "available",
      price,
    })),
  });
  for (let i = 0; i < 3; i++) s.selectSeat(`s${i}`);
  assert.equal(s.getCart().grandTotal, 600);
  s.setPromos({ s: { buyX: 2, getY: 1 } });
  assert.equal(s.getCart().grandTotal, 500);
  assert.equal(s.getCart().seats.find((x) => x.id === "s0").totalPrice, 0);
  assert.equal(s.getCart().totalSavings, 100);
});
test("inventory reconciles seats and GA atomically; snapshot and patch differ", () => {
  const s = setup();
  s.loadInventory({
    seats: [{ id: "s0", status: "available" }],
    ga: [{ sectionId: "ga", available: 10 }],
  });
  s.selectSeat("s0");
  s.setGAQuantity("ga", 5);
  assert.throws(() =>
    s.loadInventory({
      seats: [
        { id: "s0", status: "sold" },
        { id: "s1", price: -1 },
      ],
    }),
  );
  assert.equal(s.getCart().seatCount, 1);
  const result = s.loadInventory(
    {
      seats: [{ id: "s0", status: "sold" }],
      ga: [{ sectionId: "ga", available: 0 }],
    },
    { mode: "patch" },
  );
  assert.equal(s.getCart().totalCount, 0);
  assert.equal(result.adjusted.length, 2);
  assert.equal(s.setGAQuantity("ga", 5).success, false);
  s.loadInventory(
    { seats: [{ id: "s1", status: "available" }] },
    { mode: "patch" },
  );
  assert.equal(s.getSeats()[0].status, "sold");
  s.loadInventory({ ga: [] });
  assert.equal(s.getSeats()[1].status, "unknown");
});
test("validates duplicate identities, keys, geometry, currency and promotions", () => {
  const map = fixture();
  map.sections[0].seats[1].id = "s0";
  assert.throws(() => normalizeMap(map));
  map.sections[0].seats[1].id = "s1";
  map.sections[0].seats[1].n = "12";
  assert.throws(() => normalizeMap(map));
  const s = setup();
  assert.throws(() => s.loadInventory({ currency: "USD", seats: [] }));
  assert.throws(() => s.setPromos({ s: { discount: 2 } }));
  assert.throws(() => s.setPromos({ s: { discount: 0.2, buyX: 2, getY: 1 } }));
  assert.throws(() => normalizeMap(null));
  assert.throws(() => normalizeMap({ ...fixture(), sections: {} }));
});
test("combined limits, preview and orphan prevention use the same store", () => {
  const s = setup({ maxSelectedSeats: 2 });
  s.loadInventory({
    seats: [{ id: "s0", status: "available" }],
    ga: [{ sectionId: "ga", available: 10 }],
  });
  s.setGAQuantity("ga", 2);
  assert.equal(s.selectSeat("s0").reason, "limit-reached");
  const p = setup({ mode: "preview" });
  p.loadInventory({ seats: [{ id: "s0", status: "available" }] });
  assert.equal(p.selectSeat("s0").success, false);
  const o = setup({ preventOrphanSeats: true });
  o.loadInventory({
    seats: [0, 1, 2].map((i) => ({ id: `s${i}`, status: "available" })),
  });
  o.selectSeat("s0");
  assert.equal(o.selectSeat("s2").reason, "orphan-prevention");
});
test("fractional discounts round per item and mutations invalidate totals", () => {
  const s = setup();
  s.loadInventory({ seats: [{ id: "s0", status: "available", price: 101 }] });
  s.selectSeat("s0");
  s.setPromos({ s: { discount: 0.5 } });
  assert.equal(s.getCart().grandTotal, 51);
  s.loadInventory({ seats: [{ id: "s0", price: 201 }] }, { mode: "patch" });
  assert.equal(s.getCart().grandTotal, 101);
  s.setPromos({ s: null });
  assert.equal(s.getCart().grandTotal, 201);
});
test("major-unit conversion rounds decimal half cents and stable legacy identities", () => {
  const map = fixture();
  delete map.sections[0].seats[0].id;
  map.sections[0].pricing.basePrice = 1.005;
  const first = normalizeMap(map),
    second = normalizeMap(map);
  assert.equal(first.sections[0].seats[0].price, 101);
  assert.equal(first.sections[0].seats[0].id, second.sections[0].seats[0].id);
});
test("equal-price free items use stable IDs and malformed GA is atomic", () => {
  const s = setup();
  s.loadInventory({
    seats: [0, 1, 2].map((i) => ({
      id: `s${i}`,
      status: "available",
      price: 100,
    })),
  });
  for (const id of ["s2", "s1", "s0"]) s.selectSeat(id);
  s.setPromos({ s: { buyX: 2, getY: 1 } });
  assert.equal(s.getCart().seats.find((x) => x.id === "s0").totalPrice, 0);
  assert.throws(() =>
    s.loadInventory({
      seats: [{ id: "s0", status: "sold" }],
      ga: [{ sectionId: "ga", available: -1 }],
    }),
  );
  assert.equal(s.getCart().seatCount, 3);
});
test("row labels beyond Z and reversed order are shared by every snapshot", () => {
  const m = fixture();
  m.sections[0].rowLabels = { type: "letters", start: "AA", reversed: true };
  m.sections[0].seats[1].r = 1;
  const n = normalizeMap(m);
  assert.equal(n.sections[0].seats[0].rowLabel, "AB");
  assert.equal(n.sections[0].seats[1].rowLabel, "AA");
});
test("GA quantity promotions use minor units and the shared total", () => {
  const s = setup();
  s.loadInventory({ ga: [{ sectionId: "ga", available: 10, price: 125 }] });
  s.setGAQuantity("ga", 3);
  s.setPromos({ ga: { buyX: 2, getY: 1 } });
  assert.equal(s.getCart().grandTotal, 250);
  assert.equal(s.getCart().ga[0].freeItems, 1);
});
test("overflowing totals roll back inventory and promotion changes", () => {
  const s = setup();
  s.loadInventory({
    seats: [0, 1].map((i) => ({
      id: `s${i}`,
      status: "available",
      price: 100,
    })),
  });
  s.selectSeat("s0");
  s.selectSeat("s1");
  assert.throws(() =>
    s.loadInventory(
      { seats: [{ id: "s0", price: Number.MAX_SAFE_INTEGER }] },
      { mode: "patch" },
    ),
  );
  assert.equal(s.getCart().grandTotal, 200);
  assert.throws(() =>
    s.setPromos({ s: { discountedPrice: Number.MAX_SAFE_INTEGER } }),
  );
  assert.equal(s.getCart().grandTotal, 200);
});
test("GA percentage quote agrees with its payable total", () => {
  const s = setup();
  s.loadInventory({ ga: [{ sectionId: "ga", available: 3, price: 100 }] });
  s.setGAQuantity("ga", 2);
  s.setPromos({ ga: { discount: 0.2 } });
  const line = s.getCart().ga[0];
  assert.equal(line.pricePerTicket, 80);
  assert.equal(line.totalPrice, 160);
});
