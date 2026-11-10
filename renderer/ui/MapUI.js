export const spanishStrings = {
  picker: "Elegir asientos",
  controls: "Controles del mapa",
  searchPrompt: "Escribe una fila o un asiento para buscar.",
  section: "Sección",
  allSections: "Todas las secciones",
  search: "Buscar fila o asiento",
  previous: "Anterior",
  next: "Siguiente",
  page: "Página",
  selected: "Seleccionados",
  empty: "Sin resultados",
  zoomIn: "Acercar",
  zoomOut: "Alejar",
  reset: "Centrar mapa",
  row: "Fila",
  seat: "Asiento",
  special: "Accesible",
  available: "Disponible",
  unknown: "Sin inventario",
  sold: "Vendido",
  booked: "Vendido",
  reserved: "Reservado",
  unavailable: "No disponible",
  "sold-out": "Agotado",
  preview: "Vista previa",
  "limit-reached": "Se alcanzó el límite de selección",
  "orphan-prevention": "La selección dejaría un asiento aislado",
  adjusted: "La disponibilidad cambió. Se ajustó tu selección.",
  quantity: "Cantidad",
  confirm: "Confirmar",
  cancel: "Cancelar",
  quantityPromo: "Compra {buyX} y recibe {getY} gratis",
  remove: "Quitar",
  loading: "Cargando mapa",
  total: "Total",
  ga: "Entrada general",
  close: "Cerrar",
};
const el = (tag, text, cls) => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
};
export class MapUI {
  constructor(renderer) {
    this.r = renderer;
    this.s = renderer.strings;
    this.page = 0;
    this.root = el("div", undefined, "seatmap-ui");
    this.root.lang = renderer.options.locale;
    this.toolbar = el("div", undefined, "seatmap-toolbar");
    this.toolbar.classList.add("seatmap-map-controls");
    this.toolbar.setAttribute("role", "group");
    this.toolbar.setAttribute("aria-label", this.s.controls);
    for (const [key, action] of [
      ["zoomIn", () => renderer.zoomBy(1.3)],
      ["zoomOut", () => renderer.zoomBy(1 / 1.3)],
      ["reset", () => renderer.fitToView()],
    ]) {
      const button = this.button(this.s[key], () => { this.hideTooltip(); action(); });
      button.dataset.mapAction = key;
      button.setAttribute("aria-label", this.s[key]);
      button.title = this.s[key];
      const glyph = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      glyph.setAttribute("viewBox", "0 0 24 24");
      glyph.setAttribute("aria-hidden", "true");
      glyph.classList.add("seatmap-control-icon");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", key === "zoomIn" ? "M5 12h14M12 5v14" : key === "zoomOut" ? "M5 12h14" : "M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4M9 9h6v6H9z");
      glyph.append(path);
      button.replaceChildren(glyph);
      if (key === "reset") button.append(el("span", this.s[key]));
      else button.classList.add("seatmap-zoom-button");
      this.toolbar.append(button);
    }
    this.root.append(this.toolbar);
    this.details = el("details");
    const summary = el("summary", this.s.picker);
    if (renderer.options.seatPickerSearchOnly) {
      const searchIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      searchIcon.setAttribute("viewBox", "0 0 24 24");
      searchIcon.setAttribute("aria-hidden", "true");
      searchIcon.classList.add("seatmap-control-icon");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M21 21l-5-5m2-6a8 8 0 1 1-16 0 8 8 0 0 1 16 0");
      searchIcon.append(path);
      summary.prepend(searchIcon);
    }
    this.details.append(summary);
    this.filter = el("select");
    this.search = el("input");
    this.search.type = "search";
    this.search.placeholder = this.s.search;
    this.searchPrompt = el("p", this.s.searchPrompt, "seatmap-search-prompt");
    this.details.append(this.searchPrompt);
    this.details.append(
      this.label(this.s.section, this.filter),
      this.label(this.s.search, this.search),
    );
    this.filter.addEventListener("change", () => {
      this.page = 0;
      this.renderResults();
    });
    this.search.addEventListener("input", () => {
      this.page = 0;
      this.renderResults();
    });
    this.list = el("ul", undefined, "seatmap-results");
    this.details.append(this.list);
    this.pages = el("div", undefined, "seatmap-toolbar");
    this.previous = this.button(this.s.previous, () => {
      this.page--;
      this.renderResults();
    });
    this.next = this.button(this.s.next, () => {
      this.page++;
      this.renderResults();
    });
    this.pageLabel = el("span");
    this.pages.append(this.previous, this.pageLabel, this.next);
    this.details.append(this.pages);
    this.selection = el("div", undefined, "seatmap-selection");
    this.details.append(this.selection);
    this.root.append(this.details);
    this.live = el("div", undefined, "seatmap-sr-only");
    this.live.setAttribute("role", "status");
    this.live.setAttribute("aria-live", "polite");
    this.root.append(this.live);
    this.tooltip = el("div", undefined, "seatmap-tooltip");
    this.tooltip.setAttribute("role", "tooltip");
    this.tooltip.hidden = true;
    this.dialog = el("dialog", undefined, "seatmap-dialog");
    this.dialog.setAttribute("aria-label", this.s.ga);
    this.dialogTitle = el("h2");
    this.quantity = el("input");
    this.quantity.type = "number";
    this.quantity.min = "0";
    this.quantity.step = "1";
    this.dialogMessage = el("p");
    this.dialogMessage.setAttribute("role", "status");
    this.confirm = this.button(this.s.confirm, () => {
      const result = this.r.setGAQuantity(
        this.gaId,
        Number(this.quantity.value),
      );
      if (result.success) this.closeDialog();
      else {
        this.updateDialog();
        this.dialogMessage.textContent = this.s.adjusted;
      }
    });
    this.dialog.append(
      this.dialogTitle,
      this.label(this.s.quantity, this.quantity),
      this.dialogMessage,
      this.button(this.s.cancel, () => this.closeDialog()),
      this.confirm,
    );
    this.dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      this.closeDialog();
    });
    this.r.container.classList.add("seatmap-host");
    this.r.container.append(this.root, this.tooltip, this.dialog);
    this.refresh();
  }
  button(text, fn) {
    const b = el("button", text);
    b.type = "button";
    b.addEventListener("click", () => {
      try {
        fn();
      } catch (e) {
        this.announce(e.message);
      }
    });
    return b;
  }
  label(text, input) {
    const label = el("label", text);
    label.append(input);
    return label;
  }
  announce(message) {
    this.live.textContent = message;
  }
  refresh() {
    const focusedSummary = this.selection.contains(document.activeElement);
    const selectedFilter = this.filter.value;
    this.filter.replaceChildren(new Option(this.s.allSections, ""));
    for (const section of this.r.getSections().filter((s) => !s.isZone))
      this.filter.append(new Option(section.name, section.id));
    this.filter.value = selectedFilter;
    if (this.filter.selectedIndex < 0) this.filter.selectedIndex = 0;
    this.renderResults();
    this.updateDialog();
    if (this.tooltipSeatId) {
      const seat = this.r._store.seats.get(this.tooltipSeatId);
      if (seat)
        this.showTooltip(this.r._store.seatSnapshot(seat), this.tooltipPoint);
      else this.hideTooltip();
    }
    const cart = this.r.getCart();
    this.selection.replaceChildren(
      el(
        "p",
        `${this.s.selected}: ${cart.totalCount} · ${this.s.total}: ${this.r.formatPrice(cart.grandTotal)}`,
      ),
    );
    for (const seat of cart.seats)
      this.selection.append(
        this.button(
          `${this.s.remove}: ${seat.sectionName} / ${seat.row} / ${seat.seat}`,
          () => this.r.deselectSeat(seat.id),
        ),
      );
    for (const g of cart.ga)
      this.selection.append(
        this.button(`${this.s.remove}: ${g.sectionName} (${g.quantity})`, () =>
          this.r.decreaseGASelection(g.sectionId),
        ),
      );
    if (focusedSummary)
      (
        this.selection.querySelector("button") ??
        this.details.querySelector("summary")
      ).focus();
    this.root.setAttribute("aria-busy", String(!this.r._ready));
    if (this.r._ready) this.announce(`${this.s.selected}: ${cart.totalCount}`);
  }
  renderResults() {
    const focused = document.activeElement?.dataset?.seatId;
    const query = this.search.value
        .trim()
        .toLocaleLowerCase(this.r.options.locale),
      section = this.filter.value;
    const searchOnly = this.r.options.seatPickerSearchOnly;
    const isGA = this.r._store.ga.has(section);
    this.searchPrompt.hidden = !searchOnly || Boolean(query) || isGA;
    this.search.parentElement.hidden = Boolean(searchOnly && isGA);
    const seats = this.r
      .getSeats()
      .filter(
        (s) =>
          (!searchOnly || Boolean(query)) &&
          (!section || s.sectionId === section) &&
          (!query ||
            `${s.row} ${s.seat}`
              .toLocaleLowerCase(this.r.options.locale)
              .includes(query)),
      );
    const pages = Math.max(1, Math.ceil(seats.length / 50));
    this.page = Math.max(0, Math.min(this.page, pages - 1));
    this.list.replaceChildren();
    for (const seat of seats.slice(this.page * 50, this.page * 50 + 50)) {
      const quote = this.r._store.quoteSeat(seat.id);
      const text = `${seat.sectionName} · ${this.s.row} ${seat.row} · ${this.s.seat} ${seat.seat}${seat.special ? " · " + this.s.special : ""} · ${this.r.formatPrice(quote?.totalPrice ?? seat.price)} · ${this.s[seat.status] ?? this.s.unavailable}`;
      const b = this.button(text, () => {
        const result = seat.selected
          ? this.r.deselectSeat(seat.id)
          : this.r.selectSeat(seat.id);
        if (result.success) this.r.zoomToSectionById(seat.sectionId);
      });
      b.dataset.seatId = seat.id;
      b.setAttribute("aria-pressed", String(seat.selected));
      b.disabled =
        !this.r._ready ||
        this.r.options.mode === "preview" ||
        seat.status !== "available";
      const item = el("li");
      item.append(b);
      this.list.append(item);
    }
    if (!seats.length && (!searchOnly || (query && !isGA))) this.list.append(el("li", this.s.empty));
    for (const g of this.r._store.ga.values())
      if ((!section || g.sectionId === section) && (!searchOnly || section || query)) {
        const item = el("li"),
          b = this.button(
            `${g.sectionName} · ${this.s.ga} · ${this.r.formatPrice(g.price)}`,
            () => this.openGA(g.sectionId),
          );
        b.dataset.gaId = g.sectionId;
        b.disabled = !this.r._ready || this.r.options.mode === "preview";
        item.append(b);
        this.list.append(item);
      }
    this.pages.hidden = searchOnly && pages <= 1;
    this.selection.hidden = Boolean(searchOnly);
    this.pageLabel.textContent = `${this.s.page} ${this.page + 1} / ${pages}`;
    this.previous.disabled = this.page === 0;
    this.next.disabled = this.page === pages - 1;
    if (focused)
      for (const b of this.list.querySelectorAll("button"))
        if (b.dataset.seatId === focused) b.focus();
  }
  openGA(id) {
    this.gaId = id;
    this.returnGaId = id;
    this.returnFocus =
      [...this.list.querySelectorAll("button")].find(
        (b) => b.dataset.gaId === id,
      ) ?? document.activeElement;
    this.dialogTitle.textContent =
      this.r._store.ga.get(id)?.sectionName ?? this.s.ga;
    this.quantity.value = String(this.r._store.ga.get(id)?.quantity ?? 0);
    this.updateDialog();
    this.dialog.showModal();
    this.quantity.focus();
  }
  updateDialog() {
    if (!this.gaId) return;
    const max = this.r._store.maxGA(this.gaId);
    this.quantity.max = String(max);
    if (Number(this.quantity.value) > max) {
      this.quantity.value = String(max);
      this.dialogMessage.textContent = this.s.adjusted;
    } else this.dialogMessage.textContent = `${this.s.available}: ${max}`;
  }
  closeDialog() {
    if (this.dialog?.open) this.dialog.close();
    this.gaId = null;
    if (this.returnFocus?.isConnected) this.returnFocus.focus();
    else if (this.returnGaId) {
      const button = [...this.list.querySelectorAll("button")].find(
        (b) => b.dataset.gaId === this.returnGaId,
      );
      (button ?? this.details.querySelector("summary")).focus();
    }
    this.returnFocus = null;
    this.returnGaId = null;
  }
  showTooltip(seat, point) {
    this.tooltipSeatId = seat.id;
    this.tooltipPoint = { x: point.x, y: point.y };
    const quote = this.r._store.quoteSeat(seat.id);
    const promo = quote?.promo;
    const promoText =
      promo?.text ??
      (promo?.buyX
        ? this.s.quantityPromo
            .replace("{buyX}", promo.buyX)
            .replace("{getY}", promo.getY)
        : "");
    const bounds = this.r.app.canvas.getBoundingClientRect();
    const heading = el("strong", seat.sectionName, "seatmap-tooltip-title");
    const location = el("div", `${this.s.row} ${seat.row} · ${this.s.seat} ${seat.seat}`, "seatmap-tooltip-location");
    const price = el("strong", this.r.formatPrice(quote?.totalPrice ?? seat.price), "seatmap-tooltip-price");
    const status = el("span", this.s[seat.status] ?? this.s.unavailable, "seatmap-tooltip-status");
    status.dataset.status = seat.status;
    const footer = el("div", undefined, "seatmap-tooltip-footer");
    footer.append(price, status);
    this.tooltip.replaceChildren(heading, location, footer);
    if (promoText) this.tooltip.append(el("div", promoText, "seatmap-tooltip-promo"));
    this.tooltip.hidden = false;
    const width = this.tooltip.offsetWidth;
    const height = this.tooltip.offsetHeight;
    const x = bounds.left + point.x;
    const y = bounds.top + point.y;
    const left = x + 16 + width <= window.innerWidth - 8 ? x + 16 : x - width - 16;
    const top = y + 16 + height <= window.innerHeight - 8 ? y + 16 : y - height - 16;
    this.tooltip.style.left = `${Math.max(8, Math.min(window.innerWidth - width - 8, left))}px`;
    this.tooltip.style.top = `${Math.max(8, Math.min(window.innerHeight - height - 8, top))}px`;
  }
  hideTooltip() {
    this.tooltipSeatId = null;
    this.tooltipPoint = null;
    this.tooltip.hidden = true;
  }
  destroy() {
    this.closeDialog();
    this.root.remove();
    this.tooltip.remove();
    this.dialog.remove();
    this.r.container.classList.remove("seatmap-host");
  }
}
