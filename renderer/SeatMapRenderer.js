/**
 * SeatMap Renderer
 * A lightweight, modular renderer for SeatMap JS files (SMF format).
 */

import * as PIXI from 'pixi.js';
import { TooltipManager } from './TooltipManager.js';
import { TextureCache } from './core/TextureCache.js';
import { ViewportManager } from './core/ViewportManager.js';
import { InputHandler } from './interaction/InputHandler.js';
import { SelectionManager } from './interaction/SelectionManager.js';
import { CartManager } from './interaction/CartManager.js';
import { GASelectionManager } from './interaction/GASelectionManager.js';
import { UIManager } from './ui/UIManager.js';
import { InventoryManager } from './inventory/InventoryManager.js';
import { renderUnderlay } from './rendering/UnderlayRenderer.js';
import { createSectionContainer, createSectionBackground, renderGAContent, renderZoneContent } from './rendering/SectionRenderer.js';
import { renderRowLabels, buildRowLabelMap, getRowLabelText } from './rendering/RowLabelRenderer.js';

export class SeatMapRenderer {
    static CONFIG = {
        PADDING: 0,
        MIN_ZOOM: 0.1,
        MAX_ZOOM: 2.5,
        ZOOM_SPEED: 1.1,
        BACKGROUND_COLOR: 0x0f0f13,
        SECTION_ZOOM_PADDING: 50,
        ANIMATION_DURATION: 250,
        SEAT_RADIUS: 6,
        SEAT_RADIUS_HOVER: 12,
        SEAT_HOVER_SPEED: 0.35,
        SEAT_LABEL_SIZE: 7,
        TOOLTIP_SPEED: 0.15,
        UI_PADDING: 40,
        ZONE_FADE_RATIO: 5,
        ANIMATION_THRESHOLD: 0.01,
        SEAT_TEXTURE_RESOLUTION: 4,
        BOOKED_COLOR: 0x8B8B8B,
        RESERVED_COLOR: 0xff6666,
        SPECIAL_SEAT_SCALE: 1.5,
        MAX_SELECTED_SEATS: 10,
        PREVENT_ORPHAN_SEATS: true,
        // Tap zoom behavior
        TAP_ZOOM_BOOST: 1,
        DOUBLE_TAP_ZOOM_BOOST: 1.5,
        DOUBLE_TAP_MAX_DELAY: 300,
        DOUBLE_TAP_MAX_DISTANCE: 50,
        TAP_MAX_DURATION: 300,
        TAP_MAX_MOVEMENT: 10,
        GESTURE_COOLDOWN_MS: 200,
        // Mobile selection behavior
        MOBILE_REQUIRE_ZOOM_FOR_SELECTION: true,
        MOBILE_MIN_ZOOM_FOR_SELECTION: 2.0,
        MOBILE_SEAT_HITAREA_SCALE: 1.8,
        // Progressive loading
        SEAT_CHUNK_SIZE: 200,
        DEFER_SEAT_LABELS: true
    };

    static async create(container, options = {}) {
        const renderer = new SeatMapRenderer(container, options);
        await renderer.init();
        return renderer;
    }

    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            padding: SeatMapRenderer.CONFIG.PADDING,
            minZoom: SeatMapRenderer.CONFIG.MIN_ZOOM,
            maxZoom: SeatMapRenderer.CONFIG.MAX_ZOOM,
            zoomSpeed: SeatMapRenderer.CONFIG.ZOOM_SPEED,
            backgroundColor: SeatMapRenderer.CONFIG.BACKGROUND_COLOR,
            sectionZoomPadding: SeatMapRenderer.CONFIG.SECTION_ZOOM_PADDING,
            animationDuration: SeatMapRenderer.CONFIG.ANIMATION_DURATION,
            seatRadius: SeatMapRenderer.CONFIG.SEAT_RADIUS,
            seatRadiusHover: SeatMapRenderer.CONFIG.SEAT_RADIUS_HOVER,
            seatHoverSpeed: SeatMapRenderer.CONFIG.SEAT_HOVER_SPEED,
            seatLabelSize: SeatMapRenderer.CONFIG.SEAT_LABEL_SIZE,
            tooltipSpeed: SeatMapRenderer.CONFIG.TOOLTIP_SPEED,
            uiPadding: SeatMapRenderer.CONFIG.UI_PADDING,
            zoneFadeRatio: SeatMapRenderer.CONFIG.ZONE_FADE_RATIO,
            animationThreshold: SeatMapRenderer.CONFIG.ANIMATION_THRESHOLD,
            seatTextureResolution: SeatMapRenderer.CONFIG.SEAT_TEXTURE_RESOLUTION,
            bookedColor: SeatMapRenderer.CONFIG.BOOKED_COLOR,
            reservedColor: SeatMapRenderer.CONFIG.RESERVED_COLOR,
            specialSeatScale: SeatMapRenderer.CONFIG.SPECIAL_SEAT_SCALE,
            maxSelectedSeats: SeatMapRenderer.CONFIG.MAX_SELECTED_SEATS,
            preventOrphanSeats: SeatMapRenderer.CONFIG.PREVENT_ORPHAN_SEATS,
            tapZoomBoost: SeatMapRenderer.CONFIG.TAP_ZOOM_BOOST,
            doubleTapZoomBoost: SeatMapRenderer.CONFIG.DOUBLE_TAP_ZOOM_BOOST,
            doubleTapMaxDelay: SeatMapRenderer.CONFIG.DOUBLE_TAP_MAX_DELAY,
            doubleTapMaxDistance: SeatMapRenderer.CONFIG.DOUBLE_TAP_MAX_DISTANCE,
            tapMaxDuration: SeatMapRenderer.CONFIG.TAP_MAX_DURATION,
            tapMaxMovement: SeatMapRenderer.CONFIG.TAP_MAX_MOVEMENT,
            gestureCooldownMs: SeatMapRenderer.CONFIG.GESTURE_COOLDOWN_MS,
            mobileRequireZoomForSelection: SeatMapRenderer.CONFIG.MOBILE_REQUIRE_ZOOM_FOR_SELECTION,
            mobileMinZoomForSelection: SeatMapRenderer.CONFIG.MOBILE_MIN_ZOOM_FOR_SELECTION,
            mobileSeatHitareaScale: SeatMapRenderer.CONFIG.MOBILE_SEAT_HITAREA_SCALE,
            seatChunkSize: SeatMapRenderer.CONFIG.SEAT_CHUNK_SIZE,
            deferSeatLabels: SeatMapRenderer.CONFIG.DEFER_SEAT_LABELS,
            fitToSectionsPadding: 40,
            showControls: true,
            backgroundAlpha: 1,
            resizeTo: container,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            enableSectionZoom: false,
            enableZoneZoom: true,
            ...options
        };

        this.app = new PIXI.Application();
        this.viewport = new PIXI.Container();
        
        // Shared state
        this.state = {
            isDragging: false,
            lastPos: null,
            initialScale: 1,
            hasUnderlay: false,
            boundaries: null,
            lastDist: null,
            lastCenter: null,
            initialBounds: null,
            initialPosition: null,
            isTouchDevice: this.detectTouchDevice()
        };

        this.isInitialized = false;
        this.animatingSeats = new Set();
        this._resizeObserver = null;
        this._resizeTimeout = null;
        this._lastContainerSize = { width: 0, height: 0 };
        
        // Section tracking for external API
        this.sectionContainers = new Map(); // Map<sectionId, PIXI.Container>
        this.loadedData = null; // Store loaded map data for getSections()

        // Bind methods
        this.updateSeatAnimations = this.updateSeatAnimations.bind(this);
        this.resizeHandler = this.resizeHandler.bind(this);
        this.handleContainerResize = this.handleContainerResize.bind(this);
    }

    /**
     * Detect if device supports touch
     * @returns {boolean}
     */
    detectTouchDevice() {
        return ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0) || 
               (navigator.msMaxTouchPoints > 0);
    }

    async init() {
        try {
            await this.app.init(this.options);
            this.container.appendChild(this.app.canvas);
            this.app.stage.addChild(this.viewport);

            // Initialize modules
            this.textureCache = new TextureCache(this.app.renderer, {
                resolution: this.options.seatTextureResolution
            });

            this.viewportManager = new ViewportManager({
                app: this.app,
                viewport: this.viewport,
                state: this.state,
                config: this.options,
                onUpdate: () => this.updateUIVisibility()
            });

            this.inputHandler = new InputHandler({
                app: this.app,
                viewport: this.viewport,
                state: this.state,
                config: this.options,
                domContainer: this.container,
                onZoomChange: () => this.updateUIVisibility(),
                getConstrainedPosition: (x, y, scale) => 
                    this.viewportManager.getConstrainedPosition(x, y, scale)
            });
            this.inputHandler.setup();

            this.selectionManager = new SelectionManager({
                maxSelectedSeats: this.options.maxSelectedSeats,
                preventOrphanSeats: this.options.preventOrphanSeats,
                container: this.container
            });

            this.cartManager = new CartManager({
                container: this.container,
                onCartChange: this.options.onCartChange
            });

            this.gaSelectionManager = new GASelectionManager({
                container: this.container,
                maxSelectedSeats: this.options.maxSelectedSeats,
                getCurrentSelectionCount: () => this.selectionManager.getSelectionCount(),
                onConfirm: (data) => this.handleGASelectionConfirm(data),
                onCancel: () => this.handleGASelectionCancel()
            });

            // Wire up SelectionManager to know about GA selections
            this.selectionManager.setGASelectionCountGetter(
                () => this.gaSelectionManager.getTotalGASelections()
            );

            this.uiManager = new UIManager({
                app: this.app,
                config: this.options,
                onResetClick: () => this.fitToView(),
                showControls: this.options.showControls
            });
            this.uiManager.create();

            this.inventoryManager = new InventoryManager({
                config: this.options
            });

            this.tooltipManager = new TooltipManager({
                animationSpeed: this.options.tooltipSpeed
            });

            // Setup animation loop
            this.app.ticker.add(this.updateSeatAnimations);
            
            // Handle resize with ResizeObserver for container-based responsiveness
            this.setupResizeObserver();
            window.addEventListener('resize', this.resizeHandler);
            
            // Load icon font
            try {
                await document.fonts.load("300 14px 'Material Symbols Outlined'");
            } catch (e) {
                console.warn("Failed to load icon font:", e);
            }

            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize SeatMapRenderer:', error);
            throw error;
        }
    }

    /**
     * Setup ResizeObserver to watch container size changes
     */
    setupResizeObserver() {
        // Store initial size
        this._lastContainerSize = {
            width: this.container.clientWidth,
            height: this.container.clientHeight
        };

        // Use ResizeObserver for better container resize detection
        if (typeof ResizeObserver !== 'undefined') {
            this._resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const { width, height } = entry.contentRect;
                    
                    // Only handle if size actually changed
                    if (width !== this._lastContainerSize.width || 
                        height !== this._lastContainerSize.height) {
                        this._lastContainerSize = { width, height };
                        this.handleContainerResize();
                    }
                }
            });
            this._resizeObserver.observe(this.container);
        }
    }

    /**
     * Handle container resize with debouncing
     */
    handleContainerResize() {
        // Debounce resize handling to avoid excessive recalculations
        if (this._resizeTimeout) {
            clearTimeout(this._resizeTimeout);
        }

        this._resizeTimeout = setTimeout(() => {
            this.performResize();
        }, 100);
    }

    /**
     * Perform the actual resize operations
     */
    performResize() {
        if (!this.isInitialized || !this.app) return;

        // Resize PIXI application
        this.app.resize();
        
        // Reposition UI elements
        this.uiManager.repositionUI();

        // If we have content loaded, re-fit the view
        if (this.viewport.children.length > 0 && this.state.initialBounds) {
            // Calculate what the new initial scale should be
            const bounds = this.state.initialBounds;
            const screenWidth = this.app.screen.width;
            const screenHeight = this.app.screen.height;
            const padding = this.options.padding || 0;

            const scaleX = (screenWidth - padding * 2) / bounds.width;
            const scaleY = (screenHeight - padding * 2) / bounds.height;
            const newInitialScale = Math.min(scaleX, scaleY, 1);

            // Calculate zoom ratio to maintain relative zoom level
            const currentScale = this.viewport.scale.x;
            const zoomRatio = currentScale / this.state.initialScale;

            // Update initial scale
            const oldInitialScale = this.state.initialScale;
            this.state.initialScale = newInitialScale;

            // Update initial position
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            this.state.initialPosition = {
                x: (screenWidth / 2) - (centerX * newInitialScale),
                y: (screenHeight / 2) - (centerY * newInitialScale)
            };

            // If zoomed out (at or near initial view), re-fit
            if (zoomRatio <= 1.05) {
                // User was at initial view, fit again
                this.viewportManager.fitToView(false);
            } else {
                // User was zoomed in - maintain relative zoom and re-constrain
                const newScale = newInitialScale * zoomRatio;
                const constrainedScale = Math.min(Math.max(newScale, this.options.minZoom), this.options.maxZoom);
                
                // Re-center on current view center
                const viewCenterX = screenWidth / 2;
                const viewCenterY = screenHeight / 2;
                const worldCenterX = (viewCenterX - this.viewport.position.x) / currentScale;
                const worldCenterY = (viewCenterY - this.viewport.position.y) / currentScale;

                let newX = viewCenterX - (worldCenterX * constrainedScale);
                let newY = viewCenterY - (worldCenterY * constrainedScale);

                // Apply constraints
                const constrained = this.viewportManager.getConstrainedPosition(newX, newY, constrainedScale);
                
                this.viewport.scale.set(constrainedScale);
                this.viewport.position.set(constrained.x, constrained.y);
            }

            // Update UI visibility
            this.updateUIVisibility();
        }
    }

    /**
     * Legacy window resize handler
     */
    resizeHandler() {
        this.handleContainerResize();
    }

    updateUIVisibility() {
        const zoom = this.viewport.scale.x;
        this.uiManager.update(zoom, this.state.initialScale, this.options.maxZoom);
    }

    destroy() {
        this.isInitialized = false;

        // Clean up resize handling
        window.removeEventListener('resize', this.resizeHandler);
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        if (this._resizeTimeout) {
            clearTimeout(this._resizeTimeout);
            this._resizeTimeout = null;
        }
        
        if (this.app && this.app.ticker) {
            this.app.ticker.remove(this.updateSeatAnimations);
        }

        // Destroy modules
        if (this.textureCache) this.textureCache.destroy();
        if (this.inputHandler) this.inputHandler.destroy();
        if (this.selectionManager) this.selectionManager.destroy();
        if (this.cartManager) this.cartManager.destroy();
        if (this.uiManager) this.uiManager.destroy();
        if (this.inventoryManager) this.inventoryManager.destroy();
        if (this.viewportManager) this.viewportManager.destroy();
        if (this.tooltipManager) this.tooltipManager.destroy();
        
        if (this.app) {
            this.app.destroy(true, { children: true, texture: true });
            this.app = null;
        }

        this.animatingSeats.clear();
        this.viewport = null;
        this.labelsLayer = null;
    }

    async loadData(data) {
        if (!this.isInitialized) {
            console.error('SeatMapRenderer not initialized. Call init() first.');
            return;
        }

        // Clear existing content
        if (this.viewport.children.length > 0) {
            this.viewport.removeChildren().forEach(child => {
                child.destroy({ children: true, texture: false, baseTexture: false });
            });
        }

        // Reset state
        this.uiManager.clearZoneContainers();
        this.labelsLayer = new PIXI.Container();
        this.selectionManager.clearRegistrations();
        this.selectionManager.clearSelection();
        this.inventoryManager.clearRegistrations();
        this.animatingSeats.clear();
        this.sectionContainers.clear();
        
        // Cancel any pending seat rendering from previous load
        if (this._seatRenderingAbort) {
            this._seatRenderingAbort.abort = true;
        }
        this._seatRenderingAbort = { abort: false };

        if (!data) {
            console.error("No data provided to loadData");
            return;
        }

        // Store loaded data for getSections() API
        this.loadedData = data;

        console.log("Loading map data...", data);

        // Load underlay
        if (data.underlay && data.underlay.visible !== false) {
            await renderUnderlay(this.viewport, data.underlay);
            this.state.hasUnderlay = true;
        } else {
            this.state.hasUnderlay = false;
        }

        // PHASE 1: Render zones/GA sections first (instant visual feedback)
        const seatedSections = [];
        if (data.sections) {
            const sortedSections = [...data.sections].sort((a, b) => {
                const aIsZone = !!a.isZone || a.type === 'ga';
                const bIsZone = !!b.isZone || b.type === 'ga';
                if (aIsZone && !bIsZone) return -1;
                if (!aIsZone && bIsZone) return 1;
                return 0;
            });

            for (const sectionData of sortedSections) {
                const isZoneOrGA = !!sectionData.isZone || sectionData.type === 'ga';
                if (isZoneOrGA) {
                    // Render zones/GA immediately
                    this.renderSection(sectionData);
                } else {
                    // Queue seated sections for progressive loading
                    seatedSections.push(sectionData);
                }
            }
        }

        this.viewport.addChild(this.labelsLayer);
        
        // Fit to view immediately so user sees zones/GA
        this.fitToView();
        
        // Dispatch event for initial content rendered
        this.container.dispatchEvent(new CustomEvent('mapZonesLoaded', { 
            detail: { seatedSectionsCount: seatedSections.length }
        }));

        // PHASE 2: Render seated sections progressively (non-blocking)
        if (seatedSections.length > 0) {
            await this.renderSeatedSectionsProgressively(seatedSections, this._seatRenderingAbort);
        }
        
        // Move labels layer to top after all sections are rendered
        // This ensures zone labels appear above seats
        if (this.labelsLayer.parent) {
            this.viewport.addChild(this.labelsLayer); // Re-adding moves to top
        }
        
        // Dispatch event for full load complete
        this.container.dispatchEvent(new CustomEvent('mapFullyLoaded', { 
            detail: { totalSections: data.sections?.length || 0 }
        }));
    }

    /**
     * Render seated sections progressively to avoid blocking UI
     * @param {Array} sections - Array of section data
     * @param {Object} abortSignal - Object with abort flag
     */
    async renderSeatedSectionsProgressively(sections, abortSignal) {
        for (const sectionData of sections) {
            if (abortSignal.abort) return;
            
            // Render section container and background immediately
            const container = createSectionContainer(sectionData);
            const { graphics, fillColor } = createSectionBackground(sectionData);
            container.addChild(graphics);
            
            graphics.hitArea = new PIXI.Rectangle(0, 0, sectionData.width, sectionData.height);
            
            const enableZoom = this.options.enableSectionZoom;
            if (enableZoom) {
                graphics.eventMode = 'static';
                graphics.cursor = 'zoom-in';
                container.eventMode = 'static';
                
                graphics.on('pointertap', (e) => {
                    const isValidTap = this.inputHandler?.isValidTap?.() ?? !this.state.isDragging;
                    if (isValidTap) {
                        e.stopPropagation();
                        const tapPoint = { x: e.global.x, y: e.global.y };
                        const isDoubleTap = this.inputHandler?.isDoubleTap?.(tapPoint) ?? false;
                        // Only use tap-centered zoom on touch devices
                        const zoomPoint = this.state.isTouchDevice ? tapPoint : null;
                        
                        if (isDoubleTap) {
                            this.inputHandler.clearDoubleTap();
                            this.zoomToSection(container, zoomPoint, this.options.doubleTapZoomBoost);
                        } else {
                            const isZoomed = this.viewportManager?.isZoomedIn?.() ?? false;
                            if (!isZoomed) {
                                this.inputHandler?.recordTap?.(tapPoint);
                                this.zoomToSection(container, zoomPoint, this.options.tapZoomBoost);
                            } else {
                                this.inputHandler?.recordTap?.(tapPoint);
                            }
                        }
                    }
                });
            } else {
                graphics.eventMode = 'none';
            }

            this.viewport.addChild(container);
            
            // Store container reference for zoomToSectionById
            const sectionId = sectionData.id || sectionData.name;
            this.sectionContainers.set(sectionId, container);
            
            // Render seats in chunks (non-blocking)
            await this.renderSeatsChunked(container, sectionData, abortSignal);
            
            // Row labels after seats
            if (sectionData.rowLabels && sectionData.rowLabels.type !== 'none' && !sectionData.rowLabels.hidden) {
                renderRowLabels(container, sectionData);
            }
        }
        
        // Sort all rows after all seats are rendered
        this.selectionManager.sortAllRows();
    }

    /**
     * Render seats in chunks to avoid blocking UI
     * @param {PIXI.Container} container - Section container
     * @param {Object} data - Section data
     * @param {Object} abortSignal - Object with abort flag
     */
    async renderSeatsChunked(container, data, abortSignal) {
        if (!data.seats || data.seats.length === 0) return;
        
        const CHUNK_SIZE = this.options.seatChunkSize;
        const seats = data.seats;
        const totalSeats = seats.length;
        const layoutShiftX = data.layoutShiftX || 0;
        const layoutShiftY = data.layoutShiftY || 0;
        const rowLabelMap = buildRowLabelMap(seats, data.rowLabels);
        
        const style = data.style || {};
        const defaultSeatColor = style.seatColor ?? 0xffffff;
        const defaultTextColor = style.seatTextColor ?? 0x000000;
        const seatStrokeColor = style.seatStrokeColor ?? 0xffffff;
        const seatStrokeWidth = style.seatStrokeWidth ?? 0;
        const glow = style.glow || {};

        for (let i = 0; i < seats.length; i += CHUNK_SIZE) {
            if (abortSignal.abort) return;
            
            const chunk = seats.slice(i, i + CHUNK_SIZE);
            
            for (const seatData of chunk) {
                this.createSeat(container, seatData, data, {
                    layoutShiftX, layoutShiftY, rowLabelMap,
                    defaultSeatColor, defaultTextColor, seatStrokeColor, seatStrokeWidth, glow
                });
            }
            
            // Dispatch progress event
            const progress = Math.min(100, Math.round(((i + chunk.length) / totalSeats) * 100));
            this.container.dispatchEvent(new CustomEvent('seatLoadProgress', { 
                detail: { 
                    sectionName: data.name,
                    loaded: i + chunk.length, 
                    total: totalSeats,
                    progress
                }
            }));
            
            // Yield to browser between chunks (if more chunks remain)
            if (i + CHUNK_SIZE < seats.length) {
                await new Promise(resolve => requestAnimationFrame(resolve));
            }
        }
    }

    /**
     * Create a single seat (extracted for chunked rendering)
     */
    createSeat(container, seatData, sectionData, opts) {
        const { layoutShiftX, layoutShiftY, rowLabelMap, defaultSeatColor, defaultTextColor, seatStrokeColor, seatStrokeWidth, glow } = opts;
        
        const seatContainer = new PIXI.Container();
        
        let x = seatData.x ?? seatData.relativeX ?? seatData.baseX;
        let y = seatData.y ?? seatData.relativeY ?? seatData.baseY;
        x += layoutShiftX;
        y += layoutShiftY;
        
        seatContainer.x = x;
        seatContainer.y = y;

        // Glow
        if (glow.enabled) {
            const glowGraphics = new PIXI.Graphics();
            const radius = this.options.seatRadius + ((glow.strength || 10) / 2);
            glowGraphics.circle(0, 0, radius);
            glowGraphics.fill({ color: glow.color || 0xffffff, alpha: glow.opacity || 0.5 });
            if (glow.blur > 0) {
                const blurFilter = new PIXI.BlurFilter();
                blurFilter.strength = glow.blur;
                glowGraphics.filters = [blurFilter];
            }
            seatContainer.addChild(glowGraphics);
        }

        const isSpecial = seatData.sn || seatData.specialNeeds;
        const seatColor = isSpecial ? 0x2563eb : defaultSeatColor;
        
        const texture = this.textureCache.getSeatTexture(
            this.options.seatRadius, 
            seatColor, 
            seatStrokeWidth, 
            seatStrokeColor
        );
        
        const seatSprite = new PIXI.Sprite(texture);
        seatSprite.anchor.set(0.5);
        seatSprite.scale.set(1 / this.options.seatTextureResolution);
        seatContainer.addChild(seatSprite);

        // Label handling - defer creation if option enabled (saves memory/CPU)
        const labelText = seatData.n ?? seatData.number ?? "";
        const shouldDefer = this.options.deferSeatLabels && !isSpecial;
        
        if (shouldDefer) {
            // DEFERRED: Don't create text now, create on hover
            seatContainer.text = null;
            seatContainer._labelDeferred = true;
            seatContainer._labelInfo = {
                text: labelText,
                isSpecial: false,
                textColor: defaultTextColor
            };
        } else {
            // Create text immediately (special needs seats or deferring disabled)
            seatContainer._labelDeferred = false;
            seatContainer._labelInfo = {
                text: isSpecial ? 'accessible_forward' : labelText,
                isSpecial,
                textColor: isSpecial ? 0xffffff : defaultTextColor
            };
            this.createSeatLabel(seatContainer);
        }

        // Interaction setup
        seatContainer.eventMode = 'static';
        seatContainer.cursor = 'pointer';
        
        const hitRadius = this.state.isTouchDevice 
            ? this.options.seatRadius * this.options.mobileSeatHitareaScale 
            : this.options.seatRadius;
        seatContainer.hitArea = new PIXI.Circle(0, 0, hitRadius);
        
        seatContainer.seatData = seatData;
        seatContainer.sectionId = sectionData.id || sectionData.name;
        seatContainer.sectionName = sectionData.name;
        seatContainer.selected = false;
        seatContainer.originalLabel = labelText;
        seatContainer.seatColor = seatColor;
        seatContainer.seatTextColor = isSpecial ? 0xffffff : defaultTextColor;
        seatContainer.originalColor = seatColor;
        seatContainer.originalStrokeColor = seatStrokeColor;
        seatContainer.originalStrokeWidth = seatStrokeWidth;
        seatContainer.sectionPricing = sectionData.pricing;

        // Generate key
        const r = seatData.r !== undefined ? seatData.r : seatData.rowIndex;
        const rowLabel = rowLabelMap[r] || "";
        const seatNum = seatData.n ?? seatData.number;
        const key = `${sectionData.name};;${rowLabel};;${seatNum}`;
        seatContainer.key = key;
        seatContainer._rowLabel = rowLabel; // Store for hover

        // Register with managers
        this.inventoryManager.registerSeat(seatContainer, key, seatData.id);
        this.selectionManager.registerSeat(seatContainer, seatContainer.sectionId, r);

        // Animation state
        seatContainer.baseScale = isSpecial ? this.options.specialSeatScale : 1;
        seatContainer.scale.set(seatContainer.baseScale);
        seatContainer.targetScale = seatContainer.baseScale;
        seatContainer.targetTextAlpha = isSpecial ? 1 : 0;
        seatContainer.targetTextScale = isSpecial ? 0.7 : 0.5;

        // Store section data reference for hover
        seatContainer._sectionData = sectionData;
        
        // Event handlers
        seatContainer.on('pointerover', () => this.onSeatHover(seatContainer, sectionData, rowLabel, isSpecial));
        seatContainer.on('pointerout', () => this.onSeatOut(seatContainer, isSpecial));
        seatContainer.on('pointertap', (e) => {
            e.stopPropagation();
            this.onSeatClick(seatContainer);
        });

        container.addChild(seatContainer);
    }

    /**
     * Create seat label text (deferred creation)
     */
    createSeatLabel(seatContainer) {
        if (seatContainer.text) return; // Already created
        
        const info = seatContainer._labelInfo;
        if (!info) return;
        
        let fontStyle = {
            fontFamily: 'system-ui, sans-serif',
            fontSize: this.options.seatLabelSize,
            fontWeight: 'bold',
            fill: info.textColor,
            align: 'center'
        };

        if (info.isSpecial) {
            fontStyle.fontFamily = 'Material Symbols Outlined';
            fontStyle.fontSize = 14;
            fontStyle.fontWeight = '300';
            fontStyle.fill = 0xffffff;
        }

        const text = new PIXI.Text({ text: info.text, style: fontStyle });
        text.anchor.set(0.5);
        text.alpha = info.isSpecial ? 1 : 0;
        text.scale.set(info.isSpecial ? 0.7 : 0.5);
        
        seatContainer.addChild(text);
        seatContainer.text = text;
        seatContainer._labelDeferred = false;
    }

    renderSection(data) {
        const container = createSectionContainer(data);
        const { graphics, fillColor } = createSectionBackground(data);
        container.addChild(graphics);
        
        // Store container reference for zoomToSectionById
        const sectionId = data.id || data.name;
        this.sectionContainers.set(sectionId, container);

        const isZoneOrGA = !!data.isZone || data.type === 'ga';
        const enableZoom = isZoneOrGA ? this.options.enableZoneZoom : this.options.enableSectionZoom;

        if (isZoneOrGA) {
            container.zoneBackground = graphics;
            // Mark GA sections so they don't fade on zoom (only zones should fade)
            container.isGASection = data.type === 'ga' && !data.isZone;
            this.uiManager.registerZoneContainer(container);
        }

        graphics.hitArea = new PIXI.Rectangle(0, 0, data.width, data.height);
        
        if (enableZoom) {
            graphics.eventMode = 'static';
            graphics.cursor = 'zoom-in';
            container.eventMode = 'static';
            
            graphics.on('pointertap', (e) => {
                // Check for valid tap (not a gesture)
                const isValidTap = this.inputHandler?.isValidTap?.() ?? !this.state.isDragging;
                
                if (isValidTap) {
                    e.stopPropagation();
                    const tapPoint = { x: e.global.x, y: e.global.y };
                    // Only use tap-centered zoom on touch devices
                    const zoomPoint = this.state.isTouchDevice ? tapPoint : null;
                    
                    // Check for double-tap (second tap within threshold)
                    const isDoubleTap = this.inputHandler?.isDoubleTap?.(tapPoint) ?? false;
                    
                    if (isDoubleTap) {
                        // Double-tap: zoom to max
                        this.inputHandler.clearDoubleTap();
                        this.zoomToSection(container, zoomPoint, this.options.doubleTapZoomBoost);
                    } else {
                        // Single tap: only zoom if not already zoomed
                        const isZoomed = this.viewportManager?.isZoomedIn?.() ?? false;
                        if (!isZoomed) {
                            this.inputHandler?.recordTap?.(tapPoint);
                            this.zoomToSection(container, zoomPoint, this.options.tapZoomBoost);
                        } else {
                            // Already zoomed, just record for potential double-tap
                            this.inputHandler?.recordTap?.(tapPoint);
                        }
                    }
                }
            });
        } else {
            graphics.eventMode = 'none';
        }

        // Add tooltip hover and click for GA sections (non-zone)
        if (data.type === 'ga' && !data.isZone) {
            graphics.eventMode = 'static';
            graphics.cursor = 'pointer';
            container.sectionData = data; // Store data for tooltip
            
            graphics.on('pointerover', () => {
                // Don't show tooltip on touch devices
                if (!this.state.isDragging && !this.state.isTouchDevice) {
                    this.showGATooltip(data);
                }
            });
            
            graphics.on('pointerout', () => {
                this.hideTooltip();
            });
            
            // Click to open GA selection dialog
            graphics.on('pointertap', (e) => {
                // Check for valid tap (not a gesture)
                const isValidTap = this.inputHandler?.isValidTap?.() ?? !this.state.isDragging;
                
                if (isValidTap) {
                    e.stopPropagation();
                    this.hideTooltip();
                    this.gaSelectionManager.show(data);
                }
            });
        }

        // Render content
        if (data.isZone) {
            renderZoneContent(container, data, data.width, data.height, this.labelsLayer);
        } else if (data.type === 'ga') {
            renderGAContent(container, data, data.width, data.height, this.labelsLayer);
        } else {
            this.renderSeatsAndLabels(container, data);
        }

        this.viewport.addChild(container);
    }

    renderSeatsAndLabels(container, data) {
        const layoutShiftX = data.layoutShiftX || 0;
        const layoutShiftY = data.layoutShiftY || 0;
        const rowLabelMap = buildRowLabelMap(data.seats, data.rowLabels);

        if (data.seats) {
            const style = data.style || {};
            const defaultSeatColor = style.seatColor ?? 0xffffff;
            const defaultTextColor = style.seatTextColor ?? 0x000000;
            const seatStrokeColor = style.seatStrokeColor ?? 0xffffff;
            const seatStrokeWidth = style.seatStrokeWidth ?? 0;
            const glow = style.glow || {};

            data.seats.forEach(seatData => {
                const seatContainer = new PIXI.Container();
                
                let x = seatData.x ?? seatData.relativeX ?? seatData.baseX;
                let y = seatData.y ?? seatData.relativeY ?? seatData.baseY;
                x += layoutShiftX;
                y += layoutShiftY;
                
                seatContainer.x = x;
                seatContainer.y = y;

                // Glow
                if (glow.enabled) {
                    const glowGraphics = new PIXI.Graphics();
                    const radius = this.options.seatRadius + ((glow.strength || 10) / 2);
                    glowGraphics.circle(0, 0, radius);
                    glowGraphics.fill({ color: glow.color || 0xffffff, alpha: glow.opacity || 0.5 });
                    if (glow.blur > 0) {
                        const blurFilter = new PIXI.BlurFilter();
                        blurFilter.strength = glow.blur;
                        glowGraphics.filters = [blurFilter];
                    }
                    seatContainer.addChild(glowGraphics);
                }

                const isSpecial = seatData.sn || seatData.specialNeeds;
                const seatColor = isSpecial ? 0x2563eb : defaultSeatColor;
                
                const texture = this.textureCache.getSeatTexture(
                    this.options.seatRadius, 
                    seatColor, 
                    seatStrokeWidth, 
                    seatStrokeColor
                );
                
                const seatSprite = new PIXI.Sprite(texture);
                seatSprite.anchor.set(0.5);
                seatSprite.scale.set(1 / this.options.seatTextureResolution);
                seatContainer.addChild(seatSprite);

                // Label
                let labelText = seatData.n ?? seatData.number ?? "";
                let fontStyle = {
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: this.options.seatLabelSize,
                    fontWeight: 'bold',
                    fill: defaultTextColor,
                    align: 'center'
                };

                if (isSpecial) {
                    labelText = 'accessible_forward';
                    fontStyle.fontFamily = 'Material Symbols Outlined';
                    fontStyle.fontSize = 14;
                    fontStyle.fontWeight = '300';
                    fontStyle.fill = 0xffffff;
                }

                const text = new PIXI.Text({ text: labelText, style: fontStyle });
                text.anchor.set(0.5);
                text.alpha = isSpecial ? 1 : 0;
                text.scale.set(isSpecial ? 0.7 : 0.5);
                
                seatContainer.addChild(text);
                seatContainer.text = text;

                // Interaction setup
                seatContainer.eventMode = 'static';
                seatContainer.cursor = 'pointer';
                
                // Larger hit area on touch devices for easier tapping
                const hitRadius = this.state.isTouchDevice 
                    ? this.options.seatRadius * this.options.mobileSeatHitareaScale 
                    : this.options.seatRadius;
                seatContainer.hitArea = new PIXI.Circle(0, 0, hitRadius);
                
                seatContainer.seatData = seatData;
                seatContainer.sectionId = data.id || data.name;
                seatContainer.sectionName = data.name;
                seatContainer.selected = false;
                seatContainer.originalLabel = labelText;
                seatContainer.seatColor = seatColor;
                seatContainer.seatTextColor = isSpecial ? 0xffffff : defaultTextColor;
                seatContainer.originalColor = seatColor;
                seatContainer.originalStrokeColor = seatStrokeColor;
                seatContainer.originalStrokeWidth = seatStrokeWidth;
                seatContainer.sectionPricing = data.pricing;

                // Generate key
                const r = seatData.r !== undefined ? seatData.r : seatData.rowIndex;
                const rowLabel = rowLabelMap[r] || "";
                const seatNum = seatData.n ?? seatData.number;
                const key = `${data.name};;${rowLabel};;${seatNum}`;
                seatContainer.key = key;

                // Register with managers
                this.inventoryManager.registerSeat(seatContainer, key, seatData.id);
                this.selectionManager.registerSeat(seatContainer, seatContainer.sectionId, r);

                // Animation state
                seatContainer.baseScale = isSpecial ? this.options.specialSeatScale : 1;
                seatContainer.scale.set(seatContainer.baseScale);
                seatContainer.targetScale = seatContainer.baseScale;
                seatContainer.targetTextAlpha = isSpecial ? 1 : 0;
                seatContainer.targetTextScale = isSpecial ? 0.7 : 0.5;

                // Event handlers
                seatContainer.on('pointerover', () => this.onSeatHover(seatContainer, data, rowLabel, isSpecial));
                seatContainer.on('pointerout', () => this.onSeatOut(seatContainer, isSpecial));
                seatContainer.on('pointertap', (e) => {
                    e.stopPropagation();
                    this.onSeatClick(seatContainer);
                });

                container.addChild(seatContainer);
            });

            // Sort rows for adjacency detection
            this.selectionManager.sortAllRows();
        }

        // Row labels
        if (data.rowLabels && data.rowLabels.type !== 'none' && !data.rowLabels.hidden) {
            renderRowLabels(container, data);
        }
    }

    onSeatHover(seatContainer, sectionData, rowLabel, isSpecial) {
        if (this.state.isDragging) return;
        
        // Create deferred label if needed
        if (seatContainer._labelDeferred && !seatContainer.text) {
            this.createSeatLabel(seatContainer);
        }
        
        // Don't show tooltip on touch devices
        if (!this.state.isTouchDevice) {
            this.showTooltip(
                seatContainer.seatData, 
                sectionData.name, 
                rowLabel, 
                sectionData.pricing,
                seatContainer.seatColor,
                seatContainer.seatTextColor
            );
        }

        if (seatContainer.text) {
            const zoom = this.viewport.scale.x;
            seatContainer.text.resolution = Math.max(2, zoom * 2);
        }

        const status = seatContainer.seatData.status || 'available';
        if (status !== 'available') return;

        seatContainer.targetScale = this.options.seatRadiusHover / this.options.seatRadius;
        seatContainer.targetTextAlpha = 1;
        seatContainer.targetTextScale = 1;
        seatContainer.parent.addChild(seatContainer);
        this.animatingSeats.add(seatContainer);
    }

    onSeatOut(seatContainer, isSpecial) {
        this.hideTooltip();

        if (!seatContainer.selected) {
            seatContainer.targetScale = seatContainer.baseScale;
            seatContainer.targetTextAlpha = isSpecial ? 1 : 0;
            seatContainer.targetTextScale = isSpecial ? 0.7 : 0.5;
            this.animatingSeats.add(seatContainer);
        }
    }

    onSeatClick(seatContainer) {
        // Block selection during or right after gestures (pinch zoom, pan)
        if (this.inputHandler?.isGestureActive?.()) {
            console.log('Selection blocked: gesture in progress');
            return;
        }
        
        // On touch devices, require zoom before allowing selection
        if (this.state.isTouchDevice && this.options.mobileRequireZoomForSelection) {
            const currentZoom = this.viewport.scale.x;
            const initialZoom = this.state.initialScale || 1;
            const zoomRatio = currentZoom / initialZoom;
            
            if (zoomRatio < this.options.mobileMinZoomForSelection) {
                console.log(`Selection blocked on mobile: zoom in more (current: ${zoomRatio.toFixed(2)}x, required: ${this.options.mobileMinZoomForSelection}x)`);
                return;
            }
        }
        
        const result = this.selectionManager.toggleSelection(seatContainer);
        
        if (!result.success) {
            console.log(`Selection blocked: ${result.reason}`);
            return;
        }

        console.log("Seat clicked:", seatContainer.seatData, "Selected:", seatContainer.selected);

        // Create deferred label if needed
        if (seatContainer._labelDeferred && !seatContainer.text) {
            this.createSeatLabel(seatContainer);
        }

        // Update visual state
        if (seatContainer.selected) {
            seatContainer.targetScale = this.options.seatRadiusHover / this.options.seatRadius;
            seatContainer.targetTextAlpha = 1;
            seatContainer.targetTextScale = 1;
            if (seatContainer.text) {
                seatContainer.text.text = "✓";
                const zoom = this.viewport.scale.x;
                seatContainer.text.resolution = Math.max(2, zoom * 2);
            }
        } else {
            seatContainer.targetScale = this.options.seatRadiusHover / this.options.seatRadius;
            seatContainer.targetTextAlpha = 1;
            seatContainer.targetTextScale = 1;
            
            if (seatContainer.text) {
                if (seatContainer.seatData.sn || seatContainer.seatData.specialNeeds) {
                    seatContainer.text.text = 'accessible_forward';
                } else {
                    seatContainer.text.text = seatContainer.originalLabel;
                }
            }
        }
        
        seatContainer.parent.addChild(seatContainer);
        this.animatingSeats.add(seatContainer);

        // Dispatch events
        const eventData = { seat: seatContainer.seatData, sectionId: seatContainer.sectionId };
        
        if (seatContainer.selected) {
            this.container.dispatchEvent(new CustomEvent('seat-selected', { detail: eventData }));
            if (this.options.onSeatSelect) this.options.onSeatSelect(eventData);
        } else {
            this.container.dispatchEvent(new CustomEvent('seat-deselected', { detail: eventData }));
            if (this.options.onSeatDeselect) this.options.onSeatDeselect(eventData);
        }

        this.cartManager.handleCartChange(
            this.selectionManager.getSelectedSeats(),
            this.gaSelectionManager ? this.gaSelectionManager.getSelectionsArray() : []
        );
    }

    updateSeatAnimations() {
        if (this.animatingSeats.size === 0) return;

        const speed = this.options.seatHoverSpeed;

        for (const seat of this.animatingSeats) {
            const text = seat.text;

            seat.scale.x += (seat.targetScale - seat.scale.x) * speed;
            seat.scale.y += (seat.targetScale - seat.scale.y) * speed;
            
            // Handle deferred text (may be null)
            if (text) {
                text.alpha += (seat.targetTextAlpha - text.alpha) * speed;
                text.scale.x += (seat.targetTextScale - text.scale.x) * speed;
                text.scale.y += (seat.targetTextScale - text.scale.y) * speed;
            }

            const textDone = !text || Math.abs(seat.targetTextAlpha - text.alpha) < this.options.animationThreshold;
            
            if (Math.abs(seat.targetScale - seat.scale.x) < this.options.animationThreshold && textDone) {
                seat.scale.set(seat.targetScale);
                if (text) {
                    text.alpha = seat.targetTextAlpha;
                    text.scale.set(seat.targetTextScale);
                }
                this.animatingSeats.delete(seat);
            }
        }
    }

    showTooltip(seatData, sectionName, rowLabel, sectionPricing, seatColor, seatTextColor) {
        if (!this.tooltipManager) return;

        const priceValue = this.cartManager.getSeatPrice(seatData, sectionPricing);
        const status = seatData.status || 'available';
        
        let price = priceValue > 0 ? `$${priceValue.toLocaleString()} MXN` : 'Not Available';
        if (status === 'booked' || status === 'sold') price = 'BOOKED';
        else if (status === 'reserved') price = 'RESERVED';
        
        const sectionCategory = sectionName.replace(/\s*\d+$/, '').trim();
        const category = seatData.category || sectionCategory || 'STANDARD';
        const isSpecial = seatData.sn || seatData.specialNeeds;

        const content = {
            section: sectionName,
            row: rowLabel,
            seat: isSpecial ? null : (seatData.n ?? seatData.number),
            price: price,
            category: category
        };

        if (seatColor !== undefined) {
            content.color = '#' + seatColor.toString(16).padStart(6, '0');
        }
        if (seatTextColor !== undefined) {
            content.textColor = '#' + seatTextColor.toString(16).padStart(6, '0');
        }

        this.tooltipManager.show(content);
    }

    showGATooltip(data) {
        if (!this.tooltipManager) return;

        const pricing = data.pricing || {};
        const priceValue = pricing.basePrice || 0;
        let price = priceValue > 0 ? `$${priceValue.toLocaleString()} MXN` : '';
        
        const sectionName = data.name || 'GA';

        const content = {
            section: sectionName,
            row: null,
            seat: null,
            price: price,
            category: 'General Admission'
        };

        // Use section color for footer
        const style = data.style || {};
        if (style.sectionColor !== undefined) {
            content.color = '#' + style.sectionColor.toString(16).padStart(6, '0');
        }

        this.tooltipManager.show(content);
    }

    hideTooltip() {
        if (this.tooltipManager) this.tooltipManager.hide();
    }

    loadInventory(inventoryData) {
        if (!this.isInitialized) {
            console.error('SeatMapRenderer not initialized.');
            return;
        }

        const result = this.inventoryManager.loadInventory(
            inventoryData,
            (seatContainer) => this.updateSeatVisuals(seatContainer)
        );

        // Load GA inventory into GASelectionManager
        if (this.gaSelectionManager && inventoryData.ga) {
            this.gaSelectionManager.loadInventory({ ga: inventoryData.ga });
            console.log("GA inventory loaded:", inventoryData.ga.length, "sections");
        }

        console.log("Inventory loaded:", result);
    }

    updateSeatVisuals(seatContainer) {
        this.inventoryManager.updateSeatVisuals(
            seatContainer,
            (radius, color, strokeWidth, strokeColor) => 
                this.textureCache.getSeatTexture(radius, color, strokeWidth, strokeColor),
            () => this.cartManager.handleCartChange(
                this.selectionManager.getSelectedSeats(),
                this.gaSelectionManager ? this.gaSelectionManager.getSelectionsArray() : []
            )
        );
    }

    getUnmatchedInventoryKeys() {
        return this.inventoryManager.getUnmatchedKeys();
    }

    fitToView(animate = true) {
        if (!this.isInitialized) return;
        this.viewportManager.fitToView(animate);
    }

    centerMap() {
        this.fitToView();
    }

    /**
     * Fit viewport to show only sections (excluding underlay)
     * Useful for mobile where focusing on interactive content is preferred
     * @param {boolean} animate - Whether to animate the transition
     * @param {number} padding - Padding around sections (uses config default if not specified)
     */
    fitToSections(animate = true, padding = null) {
        if (!this.isInitialized) return;
        const paddingValue = padding ?? this.options.fitToSectionsPadding;
        this.viewportManager.fitToSections(animate, paddingValue);
    }

    zoomToSection(sectionContainer, tapPoint = null, zoomBoost = 1.3) {
        if (!this.isInitialized) return;
        this.viewportManager.zoomToSection(sectionContainer, tapPoint, zoomBoost);
    }

    /**
     * Zoom to a section by its ID
     * @param {string} sectionId - The section ID to zoom to
     * @param {number} zoomBoost - Optional zoom multiplier (default 1.8)
     * @returns {boolean} - True if section was found and zoomed to
     */
    zoomToSectionById(sectionId, zoomBoost = 1.8) {
        if (!this.isInitialized) return false;
        
        const container = this.sectionContainers.get(sectionId);
        if (!container) {
            console.warn(`Section with ID "${sectionId}" not found`);
            return false;
        }
        
        this.viewportManager.zoomToSection(container, null, zoomBoost);
        
        // Dispatch event for external listeners (e.g., to auto-expand mobile drawer)
        this.container.dispatchEvent(new CustomEvent('sectionZoom', {
            detail: { sectionId, container },
            bubbles: true
        }));
        
        return true;
    }

    /**
     * Get list of sections from loaded map data
     * @param {Object} options - Filter options
     * @param {boolean} options.includeZones - Include zone overlays (default false)
     * @param {boolean} options.includeGA - Include GA sections (default true)
     * @returns {Array} - Array of section objects with id, name, type, pricing
     */
    getSections(options = {}) {
        const { includeZones = false, includeGA = true } = options;
        
        if (!this.loadedData || !this.loadedData.sections) {
            return [];
        }
        
        return this.loadedData.sections
            .filter(section => {
                if (section.isZone && !includeZones) return false;
                if (section.type === 'ga' && !section.isZone && !includeGA) return false;
                return true;
            })
            .map(section => {
                // For GA sections, use sectionColor; for seated sections, use seatColor
                const isGA = section.type === 'ga';
                const colorValue = isGA 
                    ? section.style?.sectionColor 
                    : section.style?.seatColor;
                const colorHex = colorValue !== undefined 
                    ? '#' + colorValue.toString(16).padStart(6, '0')
                    : null;
                
                return {
                    id: section.id || section.name,
                    name: section.name,
                    type: section.type || 'seated',
                    isZone: !!section.isZone,
                    pricing: section.pricing || {},
                    capacity: section.ga?.capacity || section.seats?.length || 0,
                    color: colorHex
                };
            });
    }

    // GA Selection handlers
    handleGASelectionConfirm(selectionData) {
        console.log('GA selection confirmed:', selectionData);
        // Dispatch event for external handling
        this.container.dispatchEvent(new CustomEvent('gaSelectionConfirm', {
            detail: selectionData,
            bubbles: true
        }));
        // Trigger cart update
        this.cartManager.handleCartChange(
            this.selectionManager.getSelectedSeats(),
            this.gaSelectionManager.getSelectionsArray()
        );
    }

    handleGASelectionCancel() {
        console.log('GA selection cancelled');
    }

    // Get all GA selections
    getGASelections() {
        return this.gaSelectionManager ? this.gaSelectionManager.getSelectionsArray() : [];
    }

    // Clear all GA selections
    clearGASelections() {
        if (this.gaSelectionManager) {
            this.gaSelectionManager.clearAll();
            this.cartManager.handleCartChange(
                this.selectionManager.getSelectedSeats(),
                []
            );
        }
    }

    /**
     * Deselect a specific seat by its ID
     * @param {string} seatId - The seat ID to deselect
     * @returns {boolean} - True if seat was found and deselected
     */
    deselectSeat(seatId) {
        const seatContainer = this.inventoryManager.seatsById[seatId];
        if (!seatContainer || !seatContainer.selected) {
            return false;
        }

        // Reset visual state
        seatContainer.selected = false;
        const isSpecial = seatContainer.seatData?.sn || seatContainer.seatData?.specialNeeds;
        
        seatContainer.targetScale = seatContainer.baseScale;
        seatContainer.targetTextAlpha = isSpecial ? 1 : 0;
        seatContainer.targetTextScale = isSpecial ? 0.7 : 0.5;
        
        if (seatContainer.text) {
            if (isSpecial) {
                seatContainer.text.text = 'accessible_forward';
            } else {
                seatContainer.text.text = seatContainer.originalLabel || '';
            }
        }
        
        this.animatingSeats.add(seatContainer);
        
        // Remove from selection
        this.selectionManager.deselectSeat(seatContainer);
        
        // Trigger cart update
        this.cartManager.handleCartChange(
            this.selectionManager.getSelectedSeats(),
            this.gaSelectionManager.getSelectionsArray()
        );
        
        return true;
    }

    /**
     * Decrease GA selection quantity by 1 for a specific section
     * @param {string} sectionId - The section ID
     * @returns {boolean} - True if GA selection was decreased
     */
    decreaseGASelection(sectionId) {
        if (!this.gaSelectionManager) return false;
        
        const decreased = this.gaSelectionManager.decreaseSelection(sectionId);
        if (decreased) {
            // Trigger cart update
            this.cartManager.handleCartChange(
                this.selectionManager.getSelectedSeats(),
                this.gaSelectionManager.getSelectionsArray()
            );
        }
        return decreased;
    }

    /**
     * Clear all seat selections (both regular seats and GA)
     * Updates visual state and triggers cart update event
     */
    clearSelections() {
        // Get currently selected seats before clearing
        const selectedSeats = this.selectionManager.getSelectedSeats();
        
        // Reset visual state for each selected seat
        for (const seatContainer of selectedSeats) {
            seatContainer.selected = false;
            const isSpecial = seatContainer.seatData?.sn || seatContainer.seatData?.specialNeeds;
            
            // Reset to non-selected visual state
            seatContainer.targetScale = seatContainer.baseScale;
            seatContainer.targetTextAlpha = isSpecial ? 1 : 0;
            seatContainer.targetTextScale = isSpecial ? 0.7 : 0.5;
            
            // Reset text content
            if (seatContainer.text) {
                if (isSpecial) {
                    seatContainer.text.text = 'accessible_forward';
                } else {
                    seatContainer.text.text = seatContainer.originalLabel || '';
                }
            }
            
            this.animatingSeats.add(seatContainer);
        }
        
        // Clear the selection set
        this.selectionManager.clearSelection();
        
        // Clear GA selections
        if (this.gaSelectionManager) {
            this.gaSelectionManager.clearAll();
        }
        
        // Trigger cart update with empty selections
        this.cartManager.handleCartChange(new Set(), []);
        
        // Dispatch event
        this.container.dispatchEvent(new CustomEvent('selections-cleared', {
            detail: { clearedCount: selectedSeats.size },
            bubbles: true
        }));
    }

    // Legacy getters for backward compatibility
    get selectedSeats() {
        return this.selectionManager.getSelectedSeats();
    }

    get seatsByKey() {
        return this.inventoryManager.seatsByKey;
    }

    get seatsById() {
        return this.inventoryManager.seatsById;
    }
}
