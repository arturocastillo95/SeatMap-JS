import { buildRowLabelMap } from "../core/RowLabels.js";
import { SelectionManager } from "../interaction/SelectionManager.js";

export class RendererError extends Error {
  constructor(code, message, path = "") {
    super(message);
    this.name = "RendererError";
    this.code = code;
    this.path = path;
  }
}
const fail = (message, path = "") => {
  throw new RendererError("VALIDATION_ERROR", message, path);
};
const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const finite = (v, path) => {
  if (typeof v !== "number" || !Number.isFinite(v))
    fail("Expected a finite number", path);
  return v;
};
const money = (v, path) => {
  if (!Number.isSafeInteger(v) || v < 0)
    fail("Expected nonnegative integer minor units", path);
  return v;
};
const identity = (v, path) => {
  if (typeof v !== "string" || !v.trim())
    fail("Expected a nonempty identifier", path);
  return v;
};
export const copy = (value) => structuredClone(value);
export const currencyDigits = (currency) =>
  new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
    .maximumFractionDigits;
const major = (value, digits, path) => {
  finite(value, path);
  if (value < 0) fail("Price must be nonnegative", path);
  const [mantissa, exponent = "0"] = String(value).split("e");
  const [whole, fraction = ""] = mantissa.split(".");
  let amount = BigInt(whole + fraction);
  const shift = digits + Number(exponent) - fraction.length;
  if (shift >= 0) amount *= 10n ** BigInt(shift);
  else {
    const divisor = 10n ** BigInt(-shift);
    amount = (amount + divisor / 2n) / divisor;
  }
  return money(Number(amount), path);
};
const statuses = new Set([
  "unknown",
  "available",
  "sold",
  "booked",
  "reserved",
  "unavailable",
  "sold-out",
]);

/** Validate and normalize a cloned map before replacing the current scene. */
export function normalizeMap(input, { currency = "MXN" } = {}) {
  if (!object(input)) fail("Expected an SMF object");
  if (input.format !== "SMF" || !/^2\.(0|1)\.\d+$/.test(input.version))
    fail("Supported SMF versions are 2.0 and 2.1");
  if (!Array.isArray(input.sections))
    fail("Expected sections array", "sections");
  const map = copy(input),
    ids = new Set(),
    keys = new Set(),
    sectionIds = new Set();
  const digits = currencyDigits(currency);
  map.sections.forEach((s, si) => {
    const path = `sections[${si}]`;
    if (!object(s)) fail("Expected section object", path);
    s.id = identity(s.id ?? s.name, `${path}.id`);
    if (sectionIds.has(s.id)) fail("Duplicate section ID", path);
    sectionIds.add(s.id);
    s.name = String(s.name ?? s.id);
    s.type ??= "regular";
    if (!["regular", "ga"].includes(s.type))
      fail("Unsupported section type", path);
    for (const k of ["width", "height"])
      if (finite(s[k], `${path}.${k}`) <= 0)
        fail("Dimension must be positive", path);
    for (const k of ["x", "y"]) s[k] = finite(s[k] ?? 0, `${path}.${k}`);
    for (const k of ["centerX", "centerY", "layoutShiftX", "layoutShiftY"])
      if (s[k] !== undefined) finite(s[k], `${path}.${k}`);
    if (s.transform?.rotation !== undefined)
      finite(s.transform.rotation, `${path}.transform.rotation`);
    if (
      s.points !== undefined &&
      (!Array.isArray(s.points) ||
        s.points.length < 6 ||
        s.points.length % 2 ||
        !s.points.every(Number.isFinite))
    )
      fail("Invalid polygon", path);
    if (s.rowLabels !== undefined && !object(s.rowLabels))
      fail("Invalid row labels", path);
    if (
      s.rowLabels?.start !== undefined &&
      !["string", "number"].includes(typeof s.rowLabels.start)
    )
      fail("Invalid row label start", path);
    if (
      s.rowLabels?.type === "letters" &&
      s.rowLabels.start !== undefined &&
      (typeof s.rowLabels.start !== "string" ||
        !/^[A-Z]+$/.test(s.rowLabels.start))
    )
      fail("Letter rows require an uppercase start label", path);
    if (
      s.rowLabels?.type &&
      !["letters", "numbers", "none"].includes(s.rowLabels.type)
    )
      fail("Invalid row label type", path);
    s.pricing = {
      ...s.pricing,
      basePrice: major(
        s.pricing?.basePrice ?? 0,
        digits,
        `${path}.pricing.basePrice`,
      ),
    };
    s.seats ??= [];
    if (!Array.isArray(s.seats)) fail("Expected seats array", path);
    if (s.seats.length && (s.type === "ga" || s.isZone))
      fail("GA and zone sections cannot contain seats", path);
    s.seats.forEach((seat, i) => {
      if (!object(seat)) fail("Expected seat object", `${path}.seats[${i}]`);
      seat.r = finite(seat.r ?? seat.rowIndex ?? 0, path);
      seat.c = finite(seat.c ?? seat.columnIndex ?? i, path);
      if (
        !Number.isSafeInteger(seat.r) ||
        seat.r < 0 ||
        !Number.isSafeInteger(seat.c) ||
        seat.c < 0
      )
        fail("Invalid seat row or column", path);
      seat.x = finite(seat.x ?? seat.relativeX ?? seat.baseX, path);
      seat.y = finite(seat.y ?? seat.relativeY ?? seat.baseY, path);
      seat.n = String(seat.n ?? seat.number ?? seat.seatNumber ?? seat.c + 1);
      seat.sn = Boolean(seat.sn || seat.specialNeeds);
    });
    const rows = buildRowLabelMap(s.seats, s.rowLabels);
    s.seats.forEach((seat) => {
      seat.rowLabel = rows[seat.r] || String(seat.r + 1);
      seat.key = `${s.name};;${seat.rowLabel};;${seat.n}`;
      seat.id = identity(
        seat.id ?? `legacy:${JSON.stringify([s.id, seat.r, seat.n])}`,
        path,
      );
      if (ids.has(seat.id)) fail("Duplicate seat ID", path);
      if (keys.has(seat.key)) fail("Ambiguous inventory key", path);
      ids.add(seat.id);
      keys.add(seat.key);
      seat.price =
        seat.price === undefined
          ? s.pricing.basePrice
          : major(seat.price, digits, path);
      seat.status = "unknown";
    });
  });
  if (map.underlay) {
    if (!object(map.underlay)) fail("Invalid underlay");
    for (const k of ["x", "y", "scale", "opacity", "width", "height"])
      if (map.underlay[k] !== undefined)
        finite(map.underlay[k], `underlay.${k}`);
    for (const k of ["sourceUrl", "dataUrl"])
      if (
        map.underlay[k] !== undefined &&
        map.underlay[k] !== null &&
        typeof map.underlay[k] !== "string"
      )
        fail("Invalid image URL");
    if (map.underlay.scale !== undefined && map.underlay.scale <= 0)
      fail("Underlay scale must be positive");
  }
  return map;
}

/** Pure booking model. The selection algorithm operates on plain records, never scene objects. */
export class BookingStore {
  constructor(options = {}) {
    this.options = {
      mode: "booking",
      currency: "MXN",
      maxSelectedSeats: 10,
      preventOrphanSeats: true,
      ...options,
    };
    if (!["booking", "preview"].includes(this.options.mode))
      fail("Invalid renderer mode");
    if (
      !Number.isSafeInteger(this.options.maxSelectedSeats) ||
      this.options.maxSelectedSeats < 1
    )
      fail("Invalid selection limit");
    currencyDigits(this.options.currency);
    this.reset();
  }
  reset() {
    this.selection?.destroy();
    this.seats = new Map();
    this.keys = new Map();
    this.sections = new Map();
    this.ga = new Map();
    this.promos = new Map();
    this.selection = new SelectionManager({
      ...this.options,
      orphanHighlightEnabled: false,
    });
    this.selection.setGASelectionCountGetter(() =>
      [...this.ga.values()].reduce((n, x) => n + x.quantity, 0),
    );
    this.ready = false;
  }
  load(map) {
    this.reset();
    for (const section of map.sections) {
      this.sections.set(section.id, section);
      if (section.type === "ga" && !section.isZone)
        this.ga.set(section.id, {
          sectionId: section.id,
          sectionName: section.name,
          available: 0,
          status: "unknown",
          quantity: 0,
          price: section.pricing.basePrice,
          basePrice: section.pricing.basePrice,
        });
      for (const data of section.seats) {
        const seat = {
          seatData: copy(data),
          sectionId: section.id,
          sectionName: section.name,
          selected: false,
          x: data.x,
          basePrice: data.price,
        };
        this.seats.set(data.id, seat);
        this.keys.set(data.key, data.id);
        this.selection.registerSeat(seat, section.id, data.r);
      }
    }
    this.selection.sortAllRows();
    this.ready = true;
  }
  requireReady() {
    if (!this.ready)
      throw new RendererError(
        "NOT_READY",
        "Load a map before updating booking state",
      );
  }
  seatSnapshot(s) {
    const d = s.seatData;
    return {
      id: d.id,
      key: d.key,
      sectionId: s.sectionId,
      sectionName: s.sectionName,
      row: d.rowLabel,
      seat: d.n,
      special: d.sn,
      price: d.price,
      status: d.status,
      selected: s.selected,
    };
  }
  getSeats() {
    return [...this.seats.values()].map((s) => this.seatSnapshot(s));
  }
  selectSeat(id, selected = true) {
    this.requireReady();
    const seat = this.seats.get(id);
    if (!seat) return { success: false, reason: "not-found" };
    if (this.options.mode !== "booking")
      return { success: false, reason: "preview" };
    if (seat.selected === selected) return { success: true, selected };
    const wasSelected = seat.selected;
    const result = this.selection.toggleSelection(seat);
    if (result.success) {
      try {
        this.getCart();
      } catch (error) {
        if (wasSelected) this.selection.select(seat);
        else this.selection.deselect(seat);
        throw error;
      }
    }
    return {
      ...result,
      orphanSeats: result.orphanSeats?.map((s) => this.seatSnapshot(s)),
    };
  }
  maxGA(id) {
    const g = this.ga.get(id);
    return !g || g.status !== "available"
      ? 0
      : Math.max(
          0,
          Math.min(
            g.available,
            this.options.maxSelectedSeats -
              this.selection.getSelectionCount() -
              [...this.ga.values()].reduce(
                (n, x) => n + (x === g ? 0 : x.quantity),
                0,
              ),
          ),
        );
  }
  setGAQuantity(id, quantity) {
    this.requireReady();
    if (!Number.isSafeInteger(quantity) || quantity < 0)
      fail("Invalid GA quantity");
    const g = this.ga.get(id);
    if (!g) return { success: false, reason: "not-found" };
    if (this.options.mode !== "booking")
      return { success: false, reason: "preview" };
    if (quantity > this.maxGA(id))
      return { success: false, reason: "unavailable", max: this.maxGA(id) };
    const previous = g.quantity;
    g.quantity = quantity;
    try {
      this.getCart();
    } catch (error) {
      g.quantity = previous;
      throw error;
    }
    return { success: true, quantity };
  }
  clearSelections() {
    this.selection.clearSelection();
    for (const g of this.ga.values()) g.quantity = 0;
  }
  loadInventory(data, { mode = "snapshot" } = {}) {
    this.requireReady();
    if (!object(data) || !["snapshot", "patch"].includes(mode))
      fail("Invalid inventory or update mode");
    if (data.currency !== undefined && data.currency !== this.options.currency)
      fail("Inventory currency differs from renderer currency");
    if (data.seats === undefined && data.ga === undefined)
      fail("Expected seats or ga array");
    const updates = [],
      unmatched = [],
      seen = new Set();
    for (const kind of ["seats", "ga"]) {
      if (data[kind] === undefined) continue;
      if (!Array.isArray(data[kind])) fail(`Expected ${kind} array`);
      for (const item of data[kind]) {
        if (!object(item)) fail("Invalid inventory item");
        if (
          item.currency !== undefined &&
          item.currency !== this.options.currency
        )
          fail("Inventory currency differs");
        if (item.price !== undefined) money(item.price, "price");
        if (item.status !== undefined && !statuses.has(item.status))
          fail("Invalid inventory status");
        let id;
        if (kind === "seats") {
          if (item.id !== undefined) identity(item.id, "id");
          if (item.key !== undefined) identity(item.key, "key");
          if (item.id === undefined && item.key === undefined)
            fail("Seat needs id or key");
          id = item.id ?? this.keys.get(item.key);
          if (item.id && item.key && this.keys.get(item.key) !== item.id)
            fail("Conflicting seat id and key");
        } else {
          id = identity(item.sectionId ?? item.id, "sectionId");
          if (item.available !== undefined) money(item.available, "available");
          if (item.capacity !== undefined) money(item.capacity, "capacity");
          if (item.total !== undefined) money(item.total, "total");
        }
        const token = `${kind}:${id ?? item.key}`;
        if (seen.has(token)) fail("Duplicate inventory entry");
        seen.add(token);
        const target = (kind === "seats" ? this.seats : this.ga).get(id);
        if (!target) unmatched.push(item.id ?? item.key ?? item.sectionId);
        else updates.push({ kind, id, item });
      }
    }
    // Validate the resulting monetary totals before exposing the transaction.
    const previousSeats = [...this.seats.values()].map((seat) => [
      seat,
      seat.seatData.status,
      seat.seatData.price,
      seat.selected,
    ]);
    const previousGA = [...this.ga.values()].map((g) => [g, { ...g }]);
    const previousSelected = new Set(this.selection.getSelectedSeats());
    // All item validation has completed. No writes occur above this point.
    if (mode === "snapshot") {
      for (const s of this.seats.values()) {
        s.seatData.status = "unknown";
        s.seatData.price = s.basePrice;
      }
      for (const g of this.ga.values()) {
        g.available = 0;
        g.status = "unknown";
        g.price = g.basePrice;
      }
    }
    for (const { kind, id, item } of updates) {
      if (kind === "seats") {
        const d = this.seats.get(id).seatData;
        if (item.price !== undefined) d.price = item.price;
        if (item.status !== undefined) d.status = item.status;
      } else {
        const g = this.ga.get(id);
        g.available = item.available ?? item.capacity ?? g.available;
        g.status =
          item.status ??
          (item.available !== undefined || item.capacity !== undefined
            ? "available"
            : g.status);
        if (item.price !== undefined) g.price = item.price;
      }
    }
    const adjusted = [];
    for (const s of this.seats.values())
      if (s.selected && s.seatData.status !== "available") {
        this.selection.deselect(s);
        adjusted.push(s.seatData.id);
      }
    for (const g of this.ga.values()) {
      const max = this.maxGA(g.sectionId);
      if (g.quantity > max) {
        g.quantity = max;
        adjusted.push(g.sectionId);
      }
    }
    try {
      this.getCart();
    } catch (error) {
      for (const [seat, status, price, selected] of previousSeats) {
        seat.seatData.status = status;
        seat.seatData.price = price;
        seat.selected = selected;
      }
      for (const [g, previous] of previousGA) Object.assign(g, previous);
      this.selection.selectedSeats = previousSelected;
      throw error;
    }
    return {
      success: true,
      matched: updates.map((x) => x.id),
      unmatched,
      adjusted,
    };
  }
  setPromos(promos) {
    this.requireReady();
    if (!object(promos)) fail("Expected promotions by section ID");
    const changes = [];
    for (const [id, p] of Object.entries(promos)) {
      if (!this.sections.has(id)) fail("Unknown section ID", id);
      if (p === null) {
        changes.push([id, null]);
        continue;
      }
      if (!object(p)) fail("Invalid promotion", id);
      const quantity = p.buyX !== undefined || p.getY !== undefined;
      if (
        Number(quantity) +
          Number(p.discount !== undefined) +
          Number(p.discountedPrice !== undefined) !==
        1
      )
        fail("Choose exactly one promotion type", id);
      if (
        quantity &&
        (!Number.isSafeInteger(p.buyX) ||
          p.buyX < 1 ||
          !Number.isSafeInteger(p.getY) ||
          p.getY < 1 ||
          !Number.isSafeInteger(p.buyX + p.getY))
      )
        fail("Invalid quantity promotion", id);
      if (
        p.discount !== undefined &&
        (!Number.isFinite(p.discount) || p.discount < 0 || p.discount > 1)
      )
        fail("Invalid discount", id);
      if (p.discountedPrice !== undefined) money(p.discountedPrice, id);
      changes.push([id, copy(p)]);
    }
    const previousPromos = new Map(this.promos);
    for (const [id, p] of changes) {
      if (p === null) this.promos.delete(id);
      else this.promos.set(id, p);
    }
    try {
      this.getCart();
    } catch (error) {
      this.promos = previousPromos;
      throw error;
    }
  }
  unitPrice(basePrice, promo) {
    return promo?.discount !== undefined
      ? Math.round(basePrice * (1 - promo.discount))
      : (promo?.discountedPrice ?? basePrice);
  }
  quoteSeat(id) {
    const seat = this.seats.get(id);
    if (!seat) return null;
    const promo = this.promos.get(seat.sectionId);
    const line = seat.selected
      ? this.getCart().seats.find((s) => s.id === id)
      : null;
    return {
      originalPrice: seat.seatData.price,
      totalPrice:
        line?.totalPrice ?? this.unitPrice(seat.seatData.price, promo),
      promo: copy(promo ?? null),
    };
  }
  getCart() {
    const seats = [...this.selection.getSelectedSeats()].map((s) => ({
      ...this.seatSnapshot(s),
      quantity: 1,
    }));
    const ga = [...this.ga.values()]
      .filter((g) => g.quantity > 0)
      .map((g) => ({
        sectionId: g.sectionId,
        sectionName: g.sectionName,
        quantity: g.quantity,
        price: g.price,
      }));
    const sectionSummaries = Object.create(null);
    for (const id of new Set([...seats, ...ga].map((x) => x.sectionId))) {
      const lines = seats.filter((s) => s.sectionId === id),
        g = ga.find((g) => g.sectionId === id),
        p = this.promos.get(id);
      // GA is homogeneous; expand only up to the configured selection limit.
      const units = g
        ? Array.from({ length: g.quantity }, (_, i) => ({
            id: `${id}:${i}`,
            price: g.price,
          }))
        : lines;
      const freeCount = p?.buyX
        ? Math.floor(units.length / (p.buyX + p.getY)) * p.getY
        : 0;
      const free = new Set(
        [...units]
          .sort(
            (a, b) =>
              a.price - b.price || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
          )
          .slice(0, freeCount)
          .map((x) => x.id),
      );
      for (const u of units) {
        u.originalPrice = u.price;
        u.totalPrice = free.has(u.id) ? 0 : this.unitPrice(u.price, p);
        u.promoId = p?.id ?? null;
        u.savings = u.originalPrice - u.totalPrice;
      }
      const totalPrice = units.reduce((n, x) => n + x.totalPrice, 0),
        originalTotal = units.reduce((n, x) => n + x.originalPrice, 0);
      if (
        !Number.isSafeInteger(totalPrice) ||
        !Number.isSafeInteger(originalTotal)
      )
        fail("Cart exceeds safe monetary range");
      sectionSummaries[id] = {
        quantity: units.length,
        totalPrice,
        originalTotal,
        freeItems: freeCount,
        paidItems: units.length - freeCount,
        promoId: p?.id ?? null,
      };
      if (g)
        Object.assign(g, {
          pricePerTicket: this.unitPrice(g.price, p),
          totalPrice,
          originalTotal,
          freeItems: freeCount,
          paidItems: g.quantity - freeCount,
          promoId: p?.id ?? null,
        });
    }
    const seatsTotal = seats.reduce((n, x) => n + x.totalPrice, 0),
      gaTotal = ga.reduce((n, x) => n + x.totalPrice, 0);
    const grandOriginalTotal = Object.values(sectionSummaries).reduce(
        (n, x) => n + x.originalTotal,
        0,
      ),
      grandTotal = seatsTotal + gaTotal;
    if (
      !Number.isSafeInteger(grandTotal) ||
      !Number.isSafeInteger(grandOriginalTotal)
    )
      fail("Cart exceeds safe monetary range");
    return {
      currency: this.options.currency,
      seats,
      ga,
      sectionSummaries,
      seatCount: seats.length,
      gaCount: ga.reduce((n, x) => n + x.quantity, 0),
      totalCount: seats.length + ga.reduce((n, x) => n + x.quantity, 0),
      seatsTotal,
      gaTotal,
      grandTotal,
      grandOriginalTotal,
      totalSavings: grandOriginalTotal - grandTotal,
    };
  }
}
