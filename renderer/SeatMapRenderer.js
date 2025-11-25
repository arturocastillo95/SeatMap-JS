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
        ANIMATION_DURATION: 500,
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
        PREVENT_ORPHAN_SEATS: true
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
            initialPosition: null
        };

        this.isInitialized = false;
        this.animatingSeats = new Set();

        // Bind methods
        this.updateSeatAnimations = this.updateSeatAnimations.bind(this);
        this.resizeHandler = this.resizeHandler.bind(this);
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
                onResetClick: () => this.fitToView()
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
            
            // Handle resize
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

    resizeHandler() {
        this.app.resize();
        this.uiManager.repositionUI();
    }

    updateUIVisibility() {
        const zoom = this.viewport.scale.x;
        this.uiManager.update(zoom, this.state.initialScale, this.options.maxZoom);
    }

    destroy() {
        this.isInitialized = false;

        window.removeEventListener('resize', this.resizeHandler);
        
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

        if (!data) {
            console.error("No data provided to loadData");
            return;
        }

        console.log("Loading map data...", data);

        // Load underlay
        if (data.underlay && data.underlay.visible !== false) {
            await renderUnderlay(this.viewport, data.underlay);
            this.state.hasUnderlay = true;
        } else {
            this.state.hasUnderlay = false;
        }

        // Render sections (zones first for layering)
        if (data.sections) {
            const sortedSections = [...data.sections].sort((a, b) => {
                const aIsZone = !!a.isZone || a.type === 'ga';
                const bIsZone = !!b.isZone || b.type === 'ga';
                if (aIsZone && !bIsZone) return -1;
                if (!aIsZone && bIsZone) return 1;
                return 0;
            });

            for (const sectionData of sortedSections) {
                this.renderSection(sectionData);
            }
        }

        this.viewport.addChild(this.labelsLayer);
        this.fitToView();
    }

    renderSection(data) {
        const container = createSectionContainer(data);
        const { graphics, fillColor } = createSectionBackground(data);
        container.addChild(graphics);

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
                if (!this.state.isDragging) {
                    e.stopPropagation();
                    this.zoomToSection(container);
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
                if (!this.state.isDragging) {
                    this.showGATooltip(data);
                }
            });
            
            graphics.on('pointerout', () => {
                this.hideTooltip();
            });
            
            // Click to open GA selection dialog
            graphics.on('pointertap', (e) => {
                if (!this.state.isDragging) {
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
                seatContainer.seatData = seatData;
                seatContainer.sectionId = data.id || data.name;
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
        
        this.showTooltip(
            seatContainer.seatData, 
            sectionData.name, 
            rowLabel, 
            sectionData.pricing,
            seatContainer.seatColor,
            seatContainer.seatTextColor
        );

        const zoom = this.viewport.scale.x;
        seatContainer.text.resolution = Math.max(2, zoom * 2);

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
        const result = this.selectionManager.toggleSelection(seatContainer);
        
        if (!result.success) {
            console.log(`Selection blocked: ${result.reason}`);
            return;
        }

        console.log("Seat clicked:", seatContainer.seatData, "Selected:", seatContainer.selected);

        // Update visual state
        if (seatContainer.selected) {
            seatContainer.targetScale = this.options.seatRadiusHover / this.options.seatRadius;
            seatContainer.targetTextAlpha = 1;
            seatContainer.targetTextScale = 1;
            seatContainer.text.text = "✓";
            const zoom = this.viewport.scale.x;
            seatContainer.text.resolution = Math.max(2, zoom * 2);
        } else {
            seatContainer.targetScale = this.options.seatRadiusHover / this.options.seatRadius;
            seatContainer.targetTextAlpha = 1;
            seatContainer.targetTextScale = 1;
            
            if (seatContainer.seatData.sn || seatContainer.seatData.specialNeeds) {
                seatContainer.text.text = 'accessible_forward';
            } else {
                seatContainer.text.text = seatContainer.originalLabel;
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
            text.alpha += (seat.targetTextAlpha - text.alpha) * speed;
            text.scale.x += (seat.targetTextScale - text.scale.x) * speed;
            text.scale.y += (seat.targetTextScale - text.scale.y) * speed;

            if (Math.abs(seat.targetScale - seat.scale.x) < this.options.animationThreshold &&
                Math.abs(seat.targetTextAlpha - text.alpha) < this.options.animationThreshold) {
                seat.scale.set(seat.targetScale);
                text.alpha = seat.targetTextAlpha;
                text.scale.set(seat.targetTextScale);
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

    zoomToSection(sectionContainer) {
        if (!this.isInitialized) return;
        this.viewportManager.zoomToSection(sectionContainer);
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
