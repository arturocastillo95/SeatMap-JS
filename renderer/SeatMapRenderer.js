import * as PIXI from "pixi.js";
import {
  BookingStore,
  normalizeMap,
  RendererError,
  copy,
  currencyDigits,
} from "./booking/BookingStore.js";
import { TextureCache } from "./core/TextureCache.js";
import { ViewportManager } from "./core/ViewportManager.js";
import { InputHandler } from "./interaction/InputHandler.js";
import {
  renderUnderlay,
  sharedImageCount,
} from "./rendering/UnderlayRenderer.js";
import {
  createSectionContainer,
  createSectionBackground,
  renderGAContent,
  renderZoneContent,
} from "./rendering/SectionRenderer.js";
import { renderRowLabels } from "./rendering/RowLabelRenderer.js";
import {
  abortable,
  checkSignal,
  abortError,
  nextFrame,
} from "./core/Lifecycle.js";
import { createAccessibleIcon } from "./assets/accessibleIcon.js";
import { MapUI, spanishStrings } from "./ui/MapUI.js";

export class SeatMapRenderer {
  static async create(container, options = {}) {
    checkSignal(options.signal);
    const instance = new SeatMapRenderer(container, options);
    const initialization = instance.init();
    try {
      await abortable(initialization, options.signal);
      checkSignal(options.signal);
      return instance;
    } catch (error) {
      instance.destroy();
      initialization.then(
        () => instance.destroy(),
        () => {},
      );
      throw error;
    }
  }
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      mode: "booking",
      locale: "es-MX",
      currency: "MXN",
      maxSelectedSeats: 10,
      preventOrphanSeats: true,
      seatRadius: 6,
      seatChunkSize: 200,
      seatTextureResolution: 4,
      seatLabelSize: 8,
      bookedColor: 0x8b8b8b,
      reservedColor: 0xff6666,
      backgroundColor: 0x0f0f13,
      padding: 12,
      minZoom: 0.01,
      maxZoom: 5,
      zoomSpeed: 1.1,
      animationDuration: 250,
      sectionZoomPadding: 30,
      enableZoneZoom: true,
      enableSectionZoom: true,
      mobileRequireZoomForSelection: true,
      mobileMinZoomForSelection: 2,
      mobileSeatHitareaScale: 1.8,
      showGrid: true,
      gridSize: 30,
      gridColor: 0x1a1a22,
      gridLineWidth: 1,
      orphanHighlightEnabled: true,
      ...options,
    };
    for (const k of [
      "seatRadius",
      "seatChunkSize",
      "seatTextureResolution",
      "gridSize",
      "maxZoom",
    ]) {
      if (!Number.isFinite(this.options[k]) || this.options[k] <= 0)
        throw new RendererError("VALIDATION_ERROR", `${k} must be positive`);
    }
    if (!Number.isSafeInteger(this.options.seatChunkSize))
      throw new RendererError(
        "VALIDATION_ERROR",
        "seatChunkSize must be an integer",
      );
    this.strings = { ...spanishStrings, ...options.strings };
    this._priceFormatter = new Intl.NumberFormat(this.options.locale, {
      style: "currency",
      currency: this.options.currency,
    });
    this._priceDivisor = 10 ** currencyDigits(this.options.currency);
    this._store = new BookingStore(this.options);
    this._views = new Map();
    this._sections = new Map();
    this._highlights = new Set();
    this._generation = 0;
    this._destroyed = false;
    this.isInitialized = false;
    this._ready = false;
  }
  async init() {
    if (!this.container?.appendChild)
      throw new RendererError(
        "INVALID_CONTAINER",
        "An HTMLElement container is required",
      );
    this.app = new PIXI.Application();
    try {
      await this.app.init({
        backgroundColor: this.options.backgroundColor,
        backgroundAlpha: this.options.backgroundAlpha ?? 1,
        antialias: this.options.antialias ?? true,
        resolution:
          this.options.resolution ?? Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        width: Math.max(1, this.container.clientWidth),
        height: Math.max(1, this.container.clientHeight),
      });
      this._appReady = true;
      if (this._destroyed) {
        this.app.destroy(true, { children: true, texture: false });
        this.app = null;
        throw abortError();
      }
      this._motion = window.matchMedia("(prefers-reduced-motion: reduce)");
      this._motionHandler = () => {
        this.options.animationDuration = this._motion.matches
          ? 0
          : (this._animationDuration ?? 250);
        if (this._motion.matches) {
          this.viewportManager?.cancelAnimation();
          this._clearHighlights();
        }
      };
      this._animationDuration = this.options.animationDuration;
      this._motionHandler();
      this._motion.addEventListener("change", this._motionHandler);
      this.container.appendChild(this.app.canvas);
      this.app.canvas.classList.add("seatmap-canvas");
      this.app.canvas.setAttribute("aria-hidden", "true");
      this.viewport = new PIXI.Container();
      this.app.stage.addChild(this.viewport);
      this.state = {
        initialScale: 1,
        initialBounds: null,
        initialPosition: null,
        hasUnderlay: false,
        isDragging: false,
        isTouchDevice: navigator.maxTouchPoints > 0,
      };
      this.textureCache = new TextureCache(this.app.renderer, {
        resolution: this.options.seatTextureResolution,
      });
      this.viewportManager = new ViewportManager({
        app: this.app,
        viewport: this.viewport,
        state: this.state,
        config: this.options,
        onUpdate: () => this._semanticZoom(),
      });
      this.inputHandler = new InputHandler({
        app: this.app,
        viewport: this.viewport,
        state: this.state,
        config: this.options,
        domContainer: this.app.canvas,
        onZoomChange: () => {
          this._navigated = true;
          this.viewportManager.cancelAnimation();
          this._semanticZoom();
        },
        getConstrainedPosition: (x, y, s) =>
          this.viewportManager.getConstrainedPosition(x, y, s),
      });
      this.inputHandler.setup();
      this._pointerDown = () => {
        this._navigated = true;
        this.viewportManager.cancelAnimation();
      };
      this.app.canvas.addEventListener("pointerdown", this._pointerDown);
      this.ui = new MapUI(this);
      this._resize = () => {
        clearTimeout(this._resizeTimer);
        this._resizeTimer = setTimeout(() => this._performResize(), 100);
      };
      this._observer = new ResizeObserver(this._resize);
      this._observer.observe(this.container);
      this.isInitialized = true;
      this._performResize();
    } catch (error) {
      // Pixi can allocate its renderer before an application plugin fails.
      // Application.destroy assumes all plugins initialized, so dispose only
      // resources that exist when init itself did not complete.
      if (!this._appReady && this.app) {
        this.app.ticker?.stop();
        if (this.app.cancelResize) {
          this.app.resizeTo = null;
          this.app.cancelResize();
        }
        this.app.ticker?.destroy();
        this.app.stage?.destroy({ children: true, texture: false });
        this.app.renderer?.destroy(true);
        this.app = null;
      }
      this.destroy();
      throw error;
    }
  }
  _emit(name, detail) {
    this.container?.dispatchEvent(
      new CustomEvent(name, { detail: copy(detail) }),
    );
  }
  _diagnostic(code, message, extra = {}) {
    this._emit("renderer-diagnostic", { code, message, ...extra });
  }
  _error(error) {
    if (error.name !== "AbortError")
      this._emit("renderer-error", {
        code: error.code ?? "RENDER_ERROR",
        message: error.message,
        path: error.path ?? "",
      });
    return error;
  }
  _requireReady() {
    if (this._destroyed || !this._ready)
      throw new RendererError("NOT_READY", "Wait for loadData() to complete");
  }
  _clearHighlights() {
    for (const h of this._highlights) {
      cancelAnimationFrame(h.frame);
      if (!h.view.destroyed) h.view.tint = 0xffffff;
    }
    this._highlights.clear();
  }
  _clearScene() {
    this.viewportManager?.cancelAnimation();
    this.inputHandler?.reset();
    this._clearHighlights();
    this.ui?.closeDialog();
    this.ui?.hideTooltip();
    if (this.viewport)
      for (const child of this.viewport.removeChildren()) {
        child.releaseAsset?.();
        child.destroy({ children: true, texture: false });
      }
    this._views.clear();
    this._sections.clear();
    this.viewport?.position.set(0, 0);
    this.viewport?.scale.set(1);
    this.textureCache?.clear();
    this._store.reset();
    this._unmatched = [];
    this._ready = false;
    if (this.state) {
      this.state.initialBounds = null;
      this.state.initialPosition = null;
      this.state.initialScale = 1;
      this.state.hasUnderlay = false;
      this.state.underlayBounds = null;
    }
  }
  async loadData(input, { signal } = {}) {
    if (!this.isInitialized || this._destroyed)
      throw this._error(
        new RendererError("NOT_READY", "Renderer is not initialized"),
      );
    let map;
    try {
      checkSignal(signal);
      map = normalizeMap(input, this.options);
    } catch (e) {
      throw this._error(e);
    }
    this._loadController?.abort();
    const controller = new AbortController();
    this._loadController = controller;
    const generation = ++this._generation;
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const current = () => {
      checkSignal(controller.signal);
      if (this._destroyed || generation !== this._generation)
        throw abortError();
    };
    this._clearScene();
    this._navigated = false;
    this._store.load(map);
    this._map = map;
    this.ui.refresh();
    let underlay;
    try {
      current();
      this._labels = new PIXI.Container();
      this._labels.isLabelsLayer = true;
      this.viewport.addChild(this._labels);
      if (
        map.underlay?.visible !== false &&
        (map.underlay?.sourceUrl || map.underlay?.dataUrl)
      ) {
        underlay = renderUnderlay(this.viewport, map.underlay, {
          signal: controller.signal,
        })
          .then((sprite) => {
            current();
            this.state.hasUnderlay = Boolean(sprite);
            return sprite;
          })
          .catch((error) => {
            if (error.name === "AbortError") return null;
            if (generation === this._generation && !this._destroyed)
              this._diagnostic("UNDERLAY_FAILED", error.message);
            return null;
          });
      }
      const sorted = [...map.sections].sort(
        (a, b) =>
          Number(Boolean(b.isZone || b.type === "ga")) -
          Number(Boolean(a.isZone || a.type === "ga")),
      );
      const total = map.sections.reduce((n, s) => n + s.seats.length, 0);
      let loaded = 0;
      for (const section of sorted.filter((s) => s.isZone || s.type === "ga"))
        this._renderSection(section);
      this._emit("mapZonesLoaded", {
        zoneCount: sorted.filter((s) => s.isZone || s.type === "ga").length,
      });
      current();
      for (const section of sorted.filter(
        (s) => !s.isZone && s.type !== "ga",
      )) {
        current();
        const view = this._renderSection(section);
        for (
          let i = 0;
          i < section.seats.length;
          i += this.options.seatChunkSize
        ) {
          current();
          for (const seat of section.seats.slice(
            i,
            i + this.options.seatChunkSize,
          )) {
            this._createSeat(view, seat, section);
            loaded++;
          }
          this._emit("seatLoadProgress", {
            loaded,
            total,
            percent: total ? Math.round((loaded / total) * 100) : 100,
          });
          if (loaded < total) await nextFrame(controller.signal);
        }
        current();
        if (section.rowLabels?.type !== "none" && !section.rowLabels?.hidden)
          renderRowLabels(view, section);
      }
      current();
      this.viewport.addChild(this._labels);
      if (!this._navigated) this.fitToView(false);
      await underlay;
      current();
      if (!this._navigated) this.fitToView(false);
      this._ready = true;
      this._sync();
      current();
      this._emit("seatLoadProgress", { loaded: total, total, percent: 100 });
      current();
      this._emit("mapFullyLoaded", { totalSections: map.sections.length });
    } catch (error) {
      if (generation === this._generation && !this._destroyed) {
        controller.abort();
        this._clearScene();
        this._map = null;
        this.ui.refresh();
      }
      throw this._error(error);
    } finally {
      signal?.removeEventListener("abort", abort);
    }
  }
  _renderSection(section) {
    const view = createSectionContainer(section),
      { graphics } = createSectionBackground(section);
    view.addChild(graphics);
    view.sectionData = section;
    this._sections.set(section.id, view);
    this.viewport.addChild(view);
    if (section.isZone) {
      if (section.showZoneLabel !== false)
        renderZoneContent(
          view,
          section,
          section.width,
          section.height,
          this._labels,
        );
      graphics.visible = section.showZone !== false;
    } else if (section.type === "ga")
      renderGAContent(
        view,
        section,
        section.width,
        section.height,
        this._labels,
      );
    graphics.eventMode = "static";
    graphics.cursor = "pointer";
    graphics.on("pointertap", (e) => {
      if (!this.inputHandler.isValidTap()) return;
      e.stopPropagation();
      if (section.type === "ga" && !section.isZone) {
        if (this._ready && this.options.mode === "booking")
          this.ui.openGA(section.id);
      } else if (
        section.isZone
          ? this.options.enableZoneZoom
          : this.options.enableSectionZoom
      )
        this.zoomToSectionById(section.id, e.global);
    });
    return view;
  }
  _createSeat(parent, data, section) {
    const view = new PIXI.Container();
    view.position.set(
      data.x + (section.layoutShiftX ?? 0),
      data.y + (section.layoutShiftY ?? 0),
    );
    view.eventMode = "static";
    view.hitArea = new PIXI.Circle(
      0,
      0,
      this.options.seatRadius *
        (this.state.isTouchDevice ? this.options.mobileSeatHitareaScale : 1),
    );
    const style = section.style ?? {};
    view._color = data.sn ? 0x2563eb : (style.seatColor ?? 0xffffff);
    view._strokeColor = style.seatStrokeColor ?? 0xffffff;
    view._strokeWidth = style.seatStrokeWidth ?? 0;
    if (style.glow?.enabled) {
      const g = new PIXI.Graphics()
        .circle(0, 0, this.options.seatRadius + (style.glow.strength ?? 10) / 2)
        .fill({
          color: style.glow.color ?? view._color,
          alpha: style.glow.opacity ?? 0.3,
        });
      view._glow = g;
      view.addChild(g);
    }
    const sprite = new PIXI.Sprite();
    sprite.anchor.set(0.5);
    sprite.scale.set(1 / this.options.seatTextureResolution);
    view.addChild(sprite);
    view._sprite = sprite;
    if (data.sn) {
      let texture = this.textureCache.get("accessible");
      if (!texture) {
        texture = createAccessibleIcon(this.app.renderer);
        this.textureCache.set("accessible", texture);
      }
      const icon = new PIXI.Sprite(texture);
      icon.anchor.set(0.5);
      view.addChild(icon);
    }
    view.on("pointertap", (e) => {
      e.stopPropagation();
      if (this.inputHandler.isGestureActive() || !this._ready) return;
      if (
        this.state.isTouchDevice &&
        this.options.mobileRequireZoomForSelection &&
        this.viewport.scale.x / this.state.initialScale <
          this.options.mobileMinZoomForSelection
      ) {
        this.zoomToSectionById(section.id, e.global);
        return;
      }
      this._attempt(() =>
        this._setSeat(data.id, !this._store.seats.get(data.id).selected),
      );
    });
    view.on("pointerover", (e) => {
      const seat = this._store.seats.get(data.id);
      if (!seat) return;
      this.ui.showTooltip(this._store.seatSnapshot(seat), e.global);
      if (!view._label && !data.sn) {
        view._label = new PIXI.Text({
          text: data.n,
          style: {
            fontFamily: "system-ui",
            fontSize: this.options.seatLabelSize,
            fill: style.seatTextColor ?? 0x000000,
          },
        });
        view._label.anchor.set(0.5);
        view.addChild(view._label);
      }
      if (view._label) view._label.visible = true;
    });
    view.on("pointerout", () => {
      this.ui.hideTooltip();
      if (view._label) view._label.visible = false;
    });
    this._views.set(data.id, view);
    parent.addChild(view);
    this._updateSeat(data.id);
  }
  _updateSeat(id) {
    const view = this._views.get(id),
      seat = this._store.seats.get(id);
    if (!view || !seat) return;
    const status = seat.seatData.status,
      color = seat.selected
        ? 0x15803d
        : status === "available"
          ? view._color
          : status === "reserved"
            ? this.options.reservedColor
            : this.options.bookedColor;
    view._sprite.texture = this.textureCache.getSeatTexture(
      this.options.seatRadius,
      color,
      view._strokeWidth,
      view._strokeColor,
    );
    if (view._glow) view._glow.visible = status === "available";
    view.cursor = status === "available" ? "pointer" : "not-allowed";
    view.alpha = status === "unknown" ? 0.5 : 1;
  }
  _semanticZoom() {
    if (!this.viewport) return;
    const ratio = this.viewport.scale.x / (this.state.initialScale || 1);
    for (const view of this._sections.values())
      if (view.sectionData.isZone) {
        view.alpha = Math.max(0, Math.min(1, 2 - ratio));
        view.eventMode = view.alpha === 0 ? "none" : "auto";
        if (view.zoneLabel) view.zoneLabel.alpha = view.alpha;
      }
  }
  _sync() {
    for (const id of this._views.keys()) this._updateSeat(id);
    this.ui?.refresh();
    this._semanticZoom();
    const cart = this.getCart();
    this._emit("cartChange", cart);
    this.options.onCartChange?.(copy(cart));
  }
  _attempt(fn) {
    try {
      return fn();
    } catch (error) {
      this.ui?.announce(error.message);
      throw this._error(error);
    }
  }
  _setSeat(id, selected) {
    this._requireReady();
    const result = this._store.selectSeat(id, selected);
    if (result.success) {
      this._sync();
      const seat = this._store.getSeats().find((s) => s.id === id);
      this._emit(selected ? "seat-selected" : "seat-deselected", {
        seat,
        sectionId: seat.sectionId,
      });
      (selected ? this.options.onSeatSelect : this.options.onSeatDeselect)?.(
        copy(seat),
      );
    } else {
      this.ui.announce(this.strings[result.reason] ?? this.strings.unavailable);
      this._emit(
        result.reason === "orphan-prevention"
          ? "orphan-seat-blocked"
          : result.reason === "limit-reached"
            ? "selection-limit-reached"
            : "selection-blocked",
        result,
      );
      this._highlight(result.orphanSeats ?? []);
    }
    return result;
  }
  _highlight(seats) {
    if (
      this.options.animationDuration === 0 ||
      !this.options.orphanHighlightEnabled
    )
      return;
    for (const seat of seats) {
      const view = this._views.get(seat.id);
      if (!view) continue;
      const h = { view, frame: null },
        start = performance.now();
      this._highlights.add(h);
      const animate = (now) => {
        if (view.destroyed) return;
        view.tint = now - start < 700 ? 0xff6b6b : 0xffffff;
        if (now - start < 700) h.frame = requestAnimationFrame(animate);
        else this._highlights.delete(h);
      };
      h.frame = requestAnimationFrame(animate);
    }
  }
  getSeats() {
    return this._store.getSeats();
  }
  getCart() {
    return this._store.getCart();
  }
  getSections() {
    return [...this._store.sections.values()].map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      isZone: !!s.isZone,
      seatCount: s.seats.length,
      pricing: copy(s.pricing),
    }));
  }
  selectSeat(id) {
    return this._attempt(() => this._setSeat(id, true));
  }
  deselectSeat(id) {
    return this._attempt(() => this._setSeat(id, false));
  }
  clearSelections() {
    return this._attempt(() => {
      this._requireReady();
      this._store.clearSelections();
      this._sync();
      this._emit("selections-cleared", {});
    });
  }
  setGAQuantity(id, quantity) {
    return this._attempt(() => {
      this._requireReady();
      const result = this._store.setGAQuantity(id, quantity);
      if (result.success) {
        this._sync();
        const detail = {
          sectionId: id,
          quantity,
          allSelections: this.getGASelections(),
        };
        this._emit("ga-selection-change", detail);
        this._emit("gaSelectionConfirm", detail);
      } else this.ui.announce(this.strings.unavailable);
      return result;
    });
  }
  getGASelections() {
    return this.getCart().ga;
  }
  decreaseGASelection(id) {
    const g = this._store.ga.get(id);
    return g?.quantity
      ? this.setGAQuantity(id, g.quantity - 1)
      : { success: false, reason: "not-found" };
  }
  clearGASelections() {
    this._requireReady();
    for (const g of this._store.ga.values()) g.quantity = 0;
    this._sync();
    this._emit("ga-selection-change", { allSelections: [] });
  }
  loadInventory(data, options) {
    return this._attempt(() => {
      this._requireReady();
      const result = this._store.loadInventory(data, options);
      this._unmatched = result.unmatched;
      this._sync();
      if (result.adjusted.length) this.ui.announce(this.strings.adjusted);
      if (result.unmatched.length)
        this._diagnostic(
          "UNMATCHED_INVENTORY",
          "Inventory identifiers did not match the map",
          { identifiers: result.unmatched },
        );
      return result;
    });
  }
  getUnmatchedInventoryKeys() {
    return [...(this._unmatched ?? [])];
  }
  setSectionPromo(id, promo) {
    return this.setSectionPromos({ [id]: promo });
  }
  setSectionPromos(promos) {
    return this._attempt(() => {
      this._requireReady();
      this._store.setPromos(
        Array.isArray(promos)
          ? Object.fromEntries(promos.map((p) => [p.sectionId, p]))
          : promos,
      );
      this._sync();
    });
  }
  getSectionPromo(id) {
    return copy(this._store.promos.get(id) ?? null);
  }
  clearSectionPromo(id) {
    return this.setSectionPromo(id, null);
  }
  clearAllPromos() {
    this._requireReady();
    this._store.promos.clear();
    this._sync();
  }
  formatPrice(price) {
    return this._priceFormatter.format(price / this._priceDivisor);
  }
  fitToView(animate = true) {
    if (
      !this.isInitialized ||
      !this.container.clientWidth ||
      !this.container.clientHeight
    )
      return;
    this.viewportManager.fitToView(animate);
    this._semanticZoom();
  }
  centerMap() {
    this.fitToView();
  }
  fitToSections(animate = true) {
    const had = this.state.hasUnderlay;
    this.state.hasUnderlay = false;
    const underlay = this.viewport.children.find((x) => x.isUnderlay);
    if (underlay) this.viewport.removeChild(underlay);
    this.fitToView(animate);
    if (underlay) this.viewport.addChildAt(underlay, 0);
    this.state.hasUnderlay = had;
  }
  zoomToSectionById(id, tapPoint) {
    const section = this._sections.get(id);
    if (!section) return false;
    this._navigated = true;
    this.viewportManager.zoomToSection(section, tapPoint);
    return true;
  }
  zoomBy(factor) {
    this._navigated = true;
    this.viewportManager.zoomToPoint(
      { x: this.app.screen.width / 2, y: this.app.screen.height / 2 },
      Math.max(1, (this.viewport.scale.x * factor) / this.state.initialScale),
    );
  }
  _performResize() {
    if (
      !this.isInitialized ||
      this._destroyed ||
      !this.container.clientWidth ||
      !this.container.clientHeight
    )
      return;
    const scale = this.viewport.scale.x,
      ratio = scale / (this.state.initialScale || 1),
      center = {
        x: (this.app.screen.width / 2 - this.viewport.x) / scale,
        y: (this.app.screen.height / 2 - this.viewport.y) / scale,
      };
    this.app.renderer.resize(
      this.container.clientWidth,
      this.container.clientHeight,
    );
    this._renderGrid();
    this.fitToView(false);
    if (this._navigated && ratio > 1.05) {
      const next = Math.min(
        this.options.maxZoom,
        this.state.initialScale * ratio,
      );
      this.viewport.scale.set(next);
      const p = this.viewportManager.getConstrainedPosition(
        this.app.screen.width / 2 - center.x * next,
        this.app.screen.height / 2 - center.y * next,
        next,
      );
      this.viewport.position.set(p.x, p.y);
    }
  }
  _renderGrid() {
    this._grid?.destroy();
    this._grid = null;
    if (!this.options.showGrid) return;
    const g = new PIXI.Graphics();
    for (let x = 0; x < this.app.screen.width; x += this.options.gridSize)
      g.moveTo(x, 0).lineTo(x, this.app.screen.height);
    for (let y = 0; y < this.app.screen.height; y += this.options.gridSize)
      g.moveTo(0, y).lineTo(this.app.screen.width, y);
    g.stroke({
      width: this.options.gridLineWidth,
      color: this.options.gridColor,
    });
    this._grid = g;
    this.app.stage.addChildAt(g, 0);
  }
  setGridVisible(show) {
    this.options.showGrid = Boolean(show);
    if (this.isInitialized) this._renderGrid();
  }
  setGridColor(color) {
    this.options.gridColor = color;
    if (this.isInitialized) this._renderGrid();
  }
  getDiagnostics() {
    return {
      initialized: this.isInitialized,
      ready: this._ready,
      seatViews: this._views.size,
      sections: this._sections.size,
      textures: this.textureCache?.size ?? 0,
      sharedImages: sharedImageCount(),
      highlightFrames: this._highlights.size,
      viewportAnimation: !!this.viewportManager?._frame,
    };
  }
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.isInitialized = false;
    this._generation++;
    this._loadController?.abort();
    clearTimeout(this._resizeTimer);
    this._observer?.disconnect();
    this._motion?.removeEventListener("change", this._motionHandler);
    this._clearScene();
    this.inputHandler?.destroy();
    this.viewportManager?.destroy();
    this.ui?.destroy();
    this.textureCache?.destroy();
    if (this._appReady && this.app) {
      this.app.canvas.removeEventListener("pointerdown", this._pointerDown);
      this.app.destroy(true, { children: true, texture: false });
      this.app = null;
    }
    this._store.reset();
    this._map = null;
    this.viewport = null;
    this._labels = null;
    this._grid = null;
    this._unmatched = [];
    this.ui = null;
    this.inputHandler = null;
    this.viewportManager = null;
    this.textureCache = null;
    this._observer = null;
    this._motion = null;
    this._loadController = null;
    this.container = null;
  }
}
