import { bookingDemoConfig } from "./config.js";

const icon = (name) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#i-${name}`);
  svg.append(use);
  return svg;
};

const ticketWord = (count) => `${count} boleto${count === 1 ? "" : "s"}`;

function defaultMapLoader(url, signal) {
  return fetch(url, { signal }).then((response) => {
    if (!response.ok) throw new Error(`No se pudo cargar el recinto (${response.status}).`);
    return response.json();
  });
}

/**
 * Start the complete booking demo without reaching into renderer or Pixi internals.
 * Returns lifecycle controls that are also useful to deterministic browser tests.
 */
export async function initBookingDemo({
  SeatMapRenderer,
  root,
  inventoryLoader,
  mapLoader = defaultMapLoader,
  config = bookingDemoConfig,
}) {
  if (!root) throw new Error("El elemento raíz de la demostración es obligatorio.");
  const host = root.querySelector("#seatmap-container");
  const status = root.querySelector("[data-status]");
  const live = root.querySelector("[data-live]");
  const sidebar = root.querySelector(".demo-sidebar");
  const drawer = root.querySelector(".drawer-toggle");
  const sectionsNode = root.querySelector("[data-sections]");
  const browserView = root.querySelector("[data-section-browser]");
  const selectionView = root.querySelector("[data-selection-view]");
  const selectionLines = root.querySelector("[data-selection-lines]");
  const sectionSummaries = root.querySelector("[data-section-summaries]");
  const eventDialog = root.querySelector("[data-event-dialog]");
  const reviewDialog = root.querySelector("[data-review-dialog]");
  const reviewContent = root.querySelector("[data-review-content]");
  const footer = root.querySelector("[data-purchase-footer]");
  const reviewButton = root.querySelector("[data-review]");
  const clearButton = root.querySelector("[data-clear]");
  const sortButton = root.querySelector("[data-sort]");
  let renderer = null;
  let controller = null;
  let attempt = 0;
  let destroyed = false;
  let sortDirection = "desc";
  let selectionFilter = "all";
  let lastCartCount = 0;
  let underlayWarning = "";
  let eventReturnFocus = null;
  let reviewReturnFocus = null;
  const removers = [];
  const frames = new Set();
  function schedule(callback) {
    const id = requestAnimationFrame(() => {
      frames.delete(id);
      if (!destroyed) callback();
    });
    frames.add(id);
  }

  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    removers.push(() => target.removeEventListener(type, handler, options));
  };
  const setText = (selector, value) =>
    root.querySelectorAll(selector).forEach((node) => { node.textContent = value; });
  setText("[data-event-title]", config.event.title);
  setText("[data-event-short-date]", config.event.shortDate);
  setText("[data-event-date]", config.event.date);
  setText("[data-event-doors]", config.event.doors);
  setText("[data-event-venue]", config.event.venue);
  setText("[data-event-description]", config.event.description);

  function announce(message) {
    live.textContent = "";
    schedule(() => { live.textContent = message; });
  }

  function showStatus(message, { error = false, retry = false } = {}) {
    status.hidden = false;
    status.classList.toggle("error", error);
    status.replaceChildren(document.createTextNode(message));
    if (retry) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "plain-button retry-button";
      button.textContent = "Reintentar";
      button.addEventListener("click", () => start());
      status.append(button);
    }
  }

  function priceRange(section, seats) {
    if (section.type === "ga") return { minimum: section.pricing.basePrice, mixed: false };
    const prices = seats.filter((seat) => seat.sectionId === section.id).map((seat) => seat.price);
    const unique = [...new Set(prices)];
    return { minimum: unique.length ? Math.min(...unique) : section.pricing.basePrice, mixed: unique.length > 1 };
  }

  function sectionSelectionCount(cart, sectionId) {
    return cart.seats.filter((seat) => seat.sectionId === sectionId).length +
      cart.ga.filter((line) => line.sectionId === sectionId).reduce((sum, line) => sum + line.quantity, 0);
  }

  function restoreFocus(container, marker) {
    if (!marker) return;
    const candidate = [...container.querySelectorAll("button")].find(
      (button) => button.dataset.focusKey === marker,
    );
    (candidate ?? container.querySelector("button") ?? root.querySelector("[data-selection-back]"))?.focus();
  }

  function renderSections(cart = renderer?.getCart()) {
    if (!renderer || !cart) return;
    const focusKey = sectionsNode.contains(document.activeElement)
      ? document.activeElement.dataset.focusKey
      : null;
    const seats = renderer.getSeats();
    const rows = renderer.getSections().filter((section) => !section.isZone).map((section) => ({
      section,
      range: priceRange(section, seats),
    }));
    rows.sort((a, b) => {
      const price = sortDirection === "desc"
        ? b.range.minimum - a.range.minimum
        : a.range.minimum - b.range.minimum;
      return price || a.section.name.localeCompare(b.section.name, config.locale) ||
        a.section.id.localeCompare(b.section.id, config.locale);
    });
    sectionsNode.replaceChildren();
    for (const { section, range } of rows) {
      const count = sectionSelectionCount(cart, section.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "section-card";
      button.dataset.sectionId = section.id;
      button.dataset.focusKey = `section:${section.id}`;
      const iconBox = document.createElement("span");
      iconBox.className = "section-card-icon";
      iconBox.append(icon(section.type === "ga" ? "users" : "seat"));
      const details = document.createElement("span");
      const name = document.createElement("span");
      name.className = "section-card-name";
      name.textContent = section.name;
      const type = document.createElement("span");
      type.className = "section-card-type";
      type.textContent = `${section.type === "ga" ? "Admisión general" : `${section.seatCount} asientos`}${count ? ` · ${count} seleccionado${count === 1 ? "" : "s"}` : ""}`;
      details.append(name, type);
      const price = document.createElement("span");
      price.className = "section-card-price";
      const prefix = document.createElement("small");
      prefix.textContent = range.mixed ? "Desde" : "Precio";
      price.append(prefix, document.createTextNode(renderer.formatPrice(range.minimum)));
      button.append(iconBox, details, price);
      button.addEventListener("click", () => {
        renderer.zoomToSectionById(section.id);
        if (count) showSelection(section.id);
      });
      sectionsNode.append(button);
    }
    restoreFocus(sectionsNode, focusKey);
  }

  function amountNode(line) {
    const wrapper = document.createElement("span");
    if ((line.savings ?? line.originalTotal - line.totalPrice) > 0) {
      const original = document.createElement("del");
      original.textContent = renderer.formatPrice(line.originalPrice ?? line.originalTotal);
      wrapper.append(original);
    }
    wrapper.append(document.createTextNode(renderer.formatPrice(line.totalPrice)));
    return wrapper;
  }

  function showSelection(sectionId = "all") {
    selectionFilter = sectionId;
    browserView.hidden = true;
    selectionView.hidden = false;
    renderSelection(renderer.getCart());
  }

  function showBrowser({ focus = false } = {}) {
    selectionView.hidden = true;
    browserView.hidden = false;
    if (focus) sectionsNode.querySelector("button")?.focus();
  }

  function renderSelection(cart) {
    if (selectionView.hidden) return;
    const focusKey = selectionLines.contains(document.activeElement)
      ? document.activeElement.dataset.focusKey
      : null;
    const seatLines = cart.seats.filter((line) => selectionFilter === "all" || line.sectionId === selectionFilter);
    const gaLines = cart.ga.filter((line) => selectionFilter === "all" || line.sectionId === selectionFilter);
    selectionLines.replaceChildren();
    root.querySelector("[data-selection-count]").textContent = ticketWord(
      seatLines.length + gaLines.reduce((sum, line) => sum + line.quantity, 0),
    );
    const addLine = ({ key, title, meta, amount, remove }) => {
      const row = document.createElement("div");
      row.className = "ticket-line";
      const copy = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = title;
      const detail = document.createElement("span");
      detail.className = "ticket-line-meta";
      detail.textContent = meta;
      copy.append(strong, detail);
      const price = amountNode(amount);
      price.classList.add("ticket-price");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "remove-button";
      button.dataset.focusKey = key;
      button.setAttribute("aria-label", `Quitar ${title}, ${meta}`);
      button.append(icon("trash"));
      button.addEventListener("click", remove);
      row.append(copy, price, button);
      selectionLines.append(row);
    };
    for (const line of seatLines) addLine({
      key: `seat:${line.id}`,
      title: line.sectionName,
      meta: `Fila ${line.row} · Asiento ${line.seat}`,
      amount: line,
      remove: () => handleResult(renderer.deselectSeat(line.id)),
    });
    for (const line of gaLines) addLine({
      key: `ga:${line.sectionId}`,
      title: line.sectionName,
      meta: `Admisión general · ${line.quantity}`,
      amount: { ...line, totalPrice: line.totalPrice, originalTotal: line.originalTotal },
      remove: () => handleResult(renderer.setGAQuantity(line.sectionId, Math.max(0, line.quantity - 1))),
    });
    sectionSummaries.replaceChildren();
    for (const [sectionId, summary] of Object.entries(cart.sectionSummaries)) {
      if (selectionFilter !== "all" && sectionId !== selectionFilter) continue;
      const section = renderer.getSections().find((item) => item.id === sectionId);
      const row = document.createElement("div");
      row.className = "summary-row";
      const label = document.createElement("span");
      label.textContent = `${section?.name ?? sectionId} (${summary.quantity})`;
      const value = document.createElement("strong");
      value.textContent = renderer.formatPrice(summary.totalPrice);
      row.append(label, value);
      sectionSummaries.append(row);
    }
    if (cart.totalSavings > 0) {
      const savings = document.createElement("div");
      savings.className = "summary-row savings";
      savings.append(document.createTextNode("Ahorro"), document.createTextNode(`−${renderer.formatPrice(cart.totalSavings)}`));
      sectionSummaries.append(savings);
    }
    restoreFocus(selectionLines, focusKey);
  }

  function renderReview(cart) {
    reviewContent.replaceChildren();
    const list = document.createElement("ul");
    list.className = "review-lines";
    for (const line of cart.seats) {
      const item = document.createElement("li");
      item.className = "review-line";
      item.append(document.createTextNode(`${line.sectionName} · Fila ${line.row} · Asiento ${line.seat}`), document.createTextNode(renderer.formatPrice(line.totalPrice)));
      list.append(item);
    }
    for (const line of cart.ga) {
      const item = document.createElement("li");
      item.className = "review-line";
      item.append(document.createTextNode(`${line.sectionName} · ${line.quantity} general`), document.createTextNode(renderer.formatPrice(line.totalPrice)));
      list.append(item);
    }
    reviewContent.append(list);
    if (cart.totalSavings > 0) {
      const original = document.createElement("div");
      original.className = "summary-row";
      original.append(document.createTextNode("Precio original"), document.createTextNode(renderer.formatPrice(cart.grandOriginalTotal)));
      const savings = document.createElement("div");
      savings.className = "summary-row savings";
      savings.append(document.createTextNode("Ahorro"), document.createTextNode(`−${renderer.formatPrice(cart.totalSavings)}`));
      reviewContent.append(original, savings);
    }
    const total = document.createElement("div");
    total.className = "summary-row review-total";
    total.append(document.createTextNode("Total"), document.createTextNode(renderer.formatPrice(cart.grandTotal)));
    reviewContent.append(total);
  }

  function renderCart(cart) {
    const removedFocus = selectionLines.contains(document.activeElement);
    const count = cart.totalCount;
    root.querySelector("[data-total]").textContent = renderer.formatPrice(cart.grandTotal);
    root.querySelector("[data-footer-count]").textContent = ticketWord(count);
    root.querySelector("[data-mobile-count]").textContent = ticketWord(count);
    root.querySelector("[data-selection-count]").textContent = ticketWord(count);
    footer.classList.toggle("visible", count > 0);
    root.classList.toggle("has-selection", count > 0);
    clearButton.disabled = count === 0;
    reviewButton.disabled = count === 0;
    renderSections(cart);
    if (lastCartCount === 0 && count > 0) {
      showSelection("all");
      if (window.matchMedia("(max-width: 768px)").matches) {
        sidebar.classList.add("expanded");
        drawer.setAttribute("aria-expanded", "true");
      }
    }
    else if (count === 0) {
      showBrowser({ focus: removedFocus });
      if (reviewDialog.open) closeReview();
    } else renderSelection(cart);
    if (reviewDialog.open) {
      renderReview(cart);
      announce("Se actualizó tu selección. Revisa las cantidades y el total.");
    }
    lastCartCount = count;
  }

  function handleResult(result) {
    if (result?.success) return;
    const messages = {
      "orphan-prevention": "La selección dejaría un asiento aislado.",
      "limit-reached": `Puedes seleccionar hasta ${config.maxTickets} boletos.`,
      unavailable: "La localidad ya no está disponible.",
      "not-found": "No se encontró la localidad.",
      preview: "La selección está desactivada en vista previa.",
    };
    const message = messages[result?.reason] ?? "No fue posible cambiar la selección.";
    showStatus(message, { error: true });
    announce(message);
  }

  function openEvent(event) {
    eventReturnFocus = event.currentTarget;
    eventDialog.showModal();
    root.querySelector("[data-close-event]").focus();
  }
  function closeEvent() {
    if (eventDialog.open) eventDialog.close();
  }
  function openReview() {
    const cart = renderer.getCart();
    if (!cart.totalCount) return;
    reviewReturnFocus = reviewButton;
    renderReview(cart);
    reviewDialog.showModal();
    root.querySelector("[data-close-review]").focus();
  }
  function closeReview() {
    if (reviewDialog.open) reviewDialog.close();
  }

  async function start() {
    if (destroyed) return;
    const ownAttempt = ++attempt;
    controller?.abort();
    renderer?.destroy();
    renderer = null;
    controller = new AbortController();
    const signal = controller.signal;
    let instance = null;
    underlayWarning = "";
    lastCartCount = 0;
    selectionFilter = "all";
    footer.classList.remove("visible");
    root.classList.remove("has-selection");
    clearButton.disabled = true;
    reviewButton.disabled = true;
    root.querySelector("[data-total]").textContent = new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.currency,
    }).format(0);
    root.querySelector("[data-footer-count]").textContent = "0 boletos";
    root.querySelector("[data-mobile-count]").textContent = "0 boletos";
    sectionsNode.replaceChildren();
    selectionLines.replaceChildren();
    sectionSummaries.replaceChildren();
    if (reviewDialog.open) reviewDialog.close();
    showBrowser();
    showStatus("Preparando el mapa…");
    try {
      instance = await SeatMapRenderer.create(host, {
        mode: "booking",
        locale: config.locale,
        currency: config.currency,
        maxSelectedSeats: config.maxTickets,
        preventOrphanSeats: true,
        signal,
      });
      if (destroyed || signal.aborted || ownAttempt !== attempt) {
        instance.destroy();
        return;
      }
      renderer = instance;
      const mapUrl = root.dataset.mapUrl || config.mapUrl;
      const map = await mapLoader(mapUrl, signal);
      if (destroyed || ownAttempt !== attempt) return;
      await instance.loadData(map, { signal });
      if (destroyed || ownAttempt !== attempt) return;
      const inventory = await inventoryLoader(instance, map, signal);
      if (destroyed || ownAttempt !== attempt) return;
      renderer.loadInventory(inventory, { mode: "snapshot" });
      renderCart(renderer.getCart());
      showStatus(underlayWarning || "Recinto listo. Elige una sección o usa el selector accesible.");
      window.dispatchEvent(new CustomEvent("booking-demo-ready"));
    } catch (error) {
      instance?.destroy();
      if (error.name === "AbortError" || destroyed || ownAttempt !== attempt) return;
      renderer?.destroy();
      renderer = null;
      showStatus(error.message || "No se pudo iniciar la demostración.", { error: true, retry: true });
    }
  }

  listen(host, "seatLoadProgress", (event) => {
    if (event.detail.total) showStatus(`Cargando localidades: ${event.detail.percent}%`);
  });
  listen(host, "cartChange", (event) => renderer && renderCart(event.detail));
  listen(host, "renderer-diagnostic", (event) => {
    if (event.detail.code === "UNDERLAY_FAILED") {
      underlayWarning = "El plano de fondo no cargó; el mapa sigue disponible.";
      showStatus(underlayWarning);
    }
  });
  listen(host, "renderer-error", (event) => {
    if (event.detail.code !== "RENDER_ERROR") showStatus(event.detail.message, { error: true });
  });
  for (const eventName of ["selection-limit-reached", "selection-blocked", "orphan-seat-blocked"])
    listen(host, eventName, (event) => handleResult(event.detail));
  root.querySelectorAll("[data-open-event]").forEach((button) => listen(button, "click", openEvent));
  listen(root.querySelector("[data-close-event]"), "click", closeEvent);
  listen(eventDialog, "close", () => {
    const target = eventReturnFocus;
    eventReturnFocus = null;
    schedule(() => target?.isConnected && target.focus());
  });
  listen(reviewButton, "click", openReview);
  listen(root.querySelector("[data-close-review]"), "click", closeReview);
  listen(reviewDialog, "close", () => {
    const target = reviewButton.disabled
      ? (sidebar.classList.contains("expanded") ? drawer : sectionsNode.querySelector("button"))
      : reviewReturnFocus;
    reviewReturnFocus = null;
    schedule(() => target?.isConnected && target.focus());
  });
  listen(clearButton, "click", () => renderer?.clearSelections());
  listen(root.querySelector("[data-selection-back]"), "click", () => showBrowser({ focus: true }));
  listen(sortButton, "click", () => {
    sortDirection = sortDirection === "desc" ? "asc" : "desc";
    sortButton.querySelector("span").textContent = `Precio: ${sortDirection === "desc" ? "mayor a menor" : "menor a mayor"}`;
    renderSections();
  });
  listen(drawer, "click", () => {
    const expanded = !sidebar.classList.contains("expanded");
    sidebar.classList.toggle("expanded", expanded);
    drawer.setAttribute("aria-expanded", String(expanded));
  });
  listen(window, "pagehide", () => {
    attempt++;
    controller?.abort();
    renderer?.destroy();
    renderer = null;
  });
  listen(window, "pageshow", (event) => { if (event.persisted && !destroyed) start(); });

  await start();
  return {
    get renderer() { return renderer; },
    retry: start,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      attempt++;
      for (const frame of frames) cancelAnimationFrame(frame);
      frames.clear();
      controller?.abort();
      renderer?.destroy();
      renderer = null;
      for (const remove of removers.splice(0)) remove();
      closeEvent();
      closeReview();
    },
  };
}
