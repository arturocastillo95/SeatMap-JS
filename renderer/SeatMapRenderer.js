import { TooltipManager } from './TooltipManager.js';

/**
 * SeatMap Renderer
 * A lightweight renderer for SeatMap JS files (SMF format).
 */

export class SeatMapRenderer {
    static CONFIG = {
        PADDING: 0,               // Padding around the map when fitting to view
        MIN_ZOOM: 0.1,            // Minimum zoom level (not used for initial fit)
        MAX_ZOOM: 5,              // Maximum zoom level
        ZOOM_SPEED: 1.1,          // Zoom speed multiplier
        BACKGROUND_COLOR: 0x0f0f13,
        SECTION_ZOOM_PADDING: 50, // Padding when zooming to a section
        ANIMATION_DURATION: 500,  // Duration of zoom animation in ms
        SEAT_RADIUS: 6,           // Default seat radius
        SEAT_RADIUS_HOVER: 12,    // Hovered seat radius
        SEAT_HOVER_SPEED: 0.35,   // Speed of hover animation (lerp factor)
        SEAT_LABEL_SIZE: 7,       // Font size for seat labels
        TOOLTIP_SPEED: 0.15,      // Tooltip fade animation speed in seconds
        UI_PADDING: 40,           // Padding for UI elements
        ZONE_FADE_RATIO: 6,       // Ratio for zone fade out duration
        ANIMATION_THRESHOLD: 0.01 // Threshold for stopping animations
    };

    static async create(container, options = {}) {
        const renderer = new SeatMapRenderer(container, options);
        await renderer.init();
        return renderer;
    }

    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            backgroundColor: SeatMapRenderer.CONFIG.BACKGROUND_COLOR,
            backgroundAlpha: 1,
            resizeTo: container,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            enableSectionZoom: false, // Default to false as requested
            enableZoneZoom: true,     // Default to true for zones
            ...options
        };

        this.app = new PIXI.Application();
        this.viewport = new PIXI.Container(); // Main container for the map content
        
        // State Management
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

        this.animatingSeats = new Set(); // Track seats currently animating
        this.seatsByKey = {}; // Lookup for seats by key
        this.selectedSeats = new Set(); // Track selected seats
        this.activePointers = new Map(); // Track active pointers for multi-touch
        
        // Bind methods
        this.updateSeatAnimations = this.updateSeatAnimations.bind(this);
        this.resizeHandler = this.resizeHandler.bind(this);
        this.wheelHandler = this.wheelHandler.bind(this);
    }

    /**
     * Initialize the PIXI application and setup the scene
     * @private
     */
    async init() {
        await this.app.init(this.options);
        this.container.appendChild(this.app.canvas);
        this.app.stage.addChild(this.viewport);

        // Create UI layer
        this.createUI();
        
        // Initialize Tooltip Manager
        this.tooltipManager = new TooltipManager({
            animationSpeed: SeatMapRenderer.CONFIG.TOOLTIP_SPEED
        });

        // Setup interaction (pan/zoom)
        this.setupInteraction();
        
        // Setup animation loop for seats
        this.app.ticker.add(this.updateSeatAnimations);
        
        // Handle window resize
        window.addEventListener('resize', this.resizeHandler);
    }

    /**
     * Handle window resize events
     * @private
     */
    resizeHandler() {
        this.app.resize();
        this.repositionUI();
    }

    /**
     * Clean up resources and event listeners
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.resizeHandler);
        this.container.removeEventListener('wheel', this.wheelHandler);
        
        // Remove ticker
        if (this.app.ticker) {
            this.app.ticker.remove(this.updateSeatAnimations);
        }
        
        // Destroy PIXI app
        this.app.destroy(true, { children: true, texture: true });
        
        // Destroy Tooltip Manager
        if (this.tooltipManager) {
            this.tooltipManager.destroy();
        }
        
        // Clear references
        this.activePointers.clear();
        this.selectedSeats.clear();
        this.animatingSeats.clear();
        this.seatsByKey = {};
        this.viewport = null;
        this.uiContainer = null;
        this.resetButton = null;
        this.tooltipManager = null;
    }

    /**
     * Create UI elements (buttons, overlays)
     * @private
     */
    createUI() {
        this.uiContainer = new PIXI.Container();
        this.app.stage.addChild(this.uiContainer);

        // Reset Zoom Button
        this.resetButton = new PIXI.Container();
        
        const bg = new PIXI.Graphics();
        bg.circle(0, 0, 20);
        bg.fill({ color: 0x333333, alpha: 0.8 });
        bg.stroke({ width: 2, color: 0xffffff, alpha: 0.8 });
        this.resetButton.addChild(bg);

        const minus = new PIXI.Graphics();
        minus.rect(-8, -1, 16, 2); // Minus sign
        minus.fill({ color: 0xffffff });
        this.resetButton.addChild(minus);

        this.resetButton.eventMode = 'static';
        this.resetButton.cursor = 'pointer';
        this.resetButton.visible = false; // Hidden by default

        this.resetButton.on('pointertap', (e) => {
            e.stopPropagation();
            this.fitToView();
        });

        this.uiContainer.addChild(this.resetButton);
        this.repositionUI();
    }

    /**
     * Reposition UI elements based on screen size
     * @private
     */
    repositionUI() {
        if (this.resetButton) {
            // Bottom left with padding
            this.resetButton.x = SeatMapRenderer.CONFIG.UI_PADDING;
            this.resetButton.y = this.app.screen.height - SeatMapRenderer.CONFIG.UI_PADDING;
        }
    }

    /**
     * Update visibility of UI elements based on zoom level
     * @private
     */
    updateUIVisibility() {
        if (this.resetButton) {
            // Show if zoomed in more than initial scale (with epsilon)
            const isZoomedIn = this.viewport.scale.x > (this.state.initialScale * 1.001);
            this.resetButton.visible = isZoomedIn;
        }
        this.updateZoneVisibility();
    }

    /**
     * Update visibility/opacity of zones based on zoom level
     * @private
     */
    updateZoneVisibility() {
        if (!this.zoneContainers || this.zoneContainers.length === 0) return;

        const currentZoom = this.viewport.scale.x;
        const startZoom = this.state.initialScale || SeatMapRenderer.CONFIG.MIN_ZOOM;
        const maxZoom = SeatMapRenderer.CONFIG.MAX_ZOOM;
        
        // Fade out completely by halfway to max zoom
        const endZoom = startZoom + (maxZoom - startZoom) / SeatMapRenderer.CONFIG.ZONE_FADE_RATIO;

        // Calculate opacity factor (1 at startZoom, 0 at endZoom)
        let opacityFactor = 1 - (currentZoom - startZoom) / (endZoom - startZoom);
        opacityFactor = Math.max(0, Math.min(1, opacityFactor));

        this.zoneContainers.forEach(container => {
            if (container.zoneBackground) {
                if (container.zoneBackground.originalAlpha === undefined) {
                     container.zoneBackground.originalAlpha = container.zoneBackground.alpha;
                }
                container.zoneBackground.alpha = container.zoneBackground.originalAlpha * opacityFactor;
            }
            
            if (container.zoneLabel) {
                 if (container.zoneLabel.originalAlpha === undefined) {
                     container.zoneLabel.originalAlpha = container.zoneLabel.alpha;
                }
                container.zoneLabel.alpha = container.zoneLabel.originalAlpha * opacityFactor;
            }
        });
    }

    /**
     * Setup interaction handlers (pan, zoom, pinch)
     * @private
     */
    setupInteraction() {
        // Simple pan and zoom implementation
        const stage = this.app.stage;
        stage.eventMode = 'static';
        stage.hitArea = this.app.screen;

        // Track active pointers for multi-touch
        // lastDist and lastCenter are now in this.state

        stage.on('pointerdown', (e) => {
            this.activePointers.set(e.pointerId, { x: e.global.x, y: e.global.y });
            
            if (this.activePointers.size === 1) {
                this.state.isDragging = true;
                this.state.lastPos = { x: e.global.x, y: e.global.y };
            } else if (this.activePointers.size === 2) {
                this.state.isDragging = false; // Stop panning when pinching starts
                this.state.lastDist = this.getDist(this.activePointers);
                this.state.lastCenter = this.getCenter(this.activePointers);
            }
        });

        const onPointerUp = (e) => {
            this.activePointers.delete(e.pointerId);
            
            if (this.activePointers.size === 0) {
                this.state.isDragging = false;
                this.state.lastDist = null;
                this.state.lastCenter = null;
            } else if (this.activePointers.size === 1) {
                // Resume panning with the remaining finger
                this.state.isDragging = true;
                const pointer = this.activePointers.values().next().value;
                this.state.lastPos = { x: pointer.x, y: pointer.y };
                this.state.lastDist = null;
            }
        };

        stage.on('pointerup', onPointerUp);
        stage.on('pointerupoutside', onPointerUp);

        stage.on('pointermove', (e) => {
            // Update pointer position
            if (this.activePointers.has(e.pointerId)) {
                this.activePointers.set(e.pointerId, { x: e.global.x, y: e.global.y });
            }

            if (this.activePointers.size === 2) {
                // Pinch to Zoom
                const newDist = this.getDist(this.activePointers);
                const newCenter = this.getCenter(this.activePointers);

                if (this.state.lastDist && newDist > 0) {
                    const scale = newDist / this.state.lastDist;
                    
                    // Calculate new scale
                    let newScale = this.viewport.scale.x * scale;
                    
                    // Apply limits
                    const minScale = this.state.initialScale || SeatMapRenderer.CONFIG.MIN_ZOOM;
                    if (newScale < minScale) newScale = minScale;
                    if (newScale > SeatMapRenderer.CONFIG.MAX_ZOOM) newScale = SeatMapRenderer.CONFIG.MAX_ZOOM;

                    // Zoom towards center
                    // Local point under center
                    const localX = (this.state.lastCenter.x - this.viewport.x) / this.viewport.scale.x;
                    const localY = (this.state.lastCenter.y - this.viewport.y) / this.viewport.scale.y;

                    this.viewport.scale.set(newScale);
                    
                    // Move viewport to keep local point at new center
                    this.viewport.position.x = newCenter.x - localX * newScale;
                    this.viewport.position.y = newCenter.y - localY * newScale;
                    
                    this.updateUIVisibility();
                }

                this.state.lastDist = newDist;
                this.state.lastCenter = newCenter;

            } else if (this.state.isDragging && this.activePointers.size === 1) {
                // Pan
                // Disable panning if at min zoom (with small epsilon)
                if (this.viewport.scale.x <= (this.state.initialScale * 1.001)) {
                    return;
                }

                const newPos = { x: e.global.x, y: e.global.y };
                const dx = newPos.x - this.state.lastPos.x;
                const dy = newPos.y - this.state.lastPos.y;

                const newX = this.viewport.position.x + dx;
                const newY = this.viewport.position.y + dy;

                // Apply constraints
                const constrained = this.getConstrainedPosition(newX, newY, this.viewport.scale.x);
                this.viewport.position.x = constrained.x;
                this.viewport.position.y = constrained.y;

                this.state.lastPos = newPos;
            }
        });

        // Zoom with wheel
        this.container.addEventListener('wheel', this.wheelHandler, { passive: false });
    }

    /**
     * Handle mouse wheel events for zooming
     * @param {WheelEvent} e 
     * @private
     */
    wheelHandler(e) {
        e.preventDefault();
        const direction = e.deltaY > 0 ? 1 / SeatMapRenderer.CONFIG.ZOOM_SPEED : SeatMapRenderer.CONFIG.ZOOM_SPEED;
        
        // Calculate zoom center
        const rect = this.container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const localPos = {
            x: (x - this.viewport.x) / this.viewport.scale.x,
            y: (y - this.viewport.y) / this.viewport.scale.y
        };

        let newScale = this.viewport.scale.x * direction;
        const minScale = this.state.initialScale || SeatMapRenderer.CONFIG.MIN_ZOOM;

        // Snap to min scale and recenter if zooming out too far
        if (newScale <= minScale) {
            newScale = minScale;
            this.viewport.scale.set(newScale);
            
            // Recalculate center for current screen size to ensure perfect centering
            if (this.state.initialBounds) {
                const screenWidth = this.app.screen.width;
                const screenHeight = this.app.screen.height;
                const centerX = this.state.initialBounds.x + this.state.initialBounds.width / 2;
                const centerY = this.state.initialBounds.y + this.state.initialBounds.height / 2;
                
                const targetX = (screenWidth / 2) - (centerX * newScale);
                const targetY = (screenHeight / 2) - (centerY * newScale);
                
                this.viewport.position.set(targetX, targetY);
            } else if (this.state.initialPosition) {
                this.viewport.position.set(this.state.initialPosition.x, this.state.initialPosition.y);
            }
            
            this.updateUIVisibility();
            return;
        }

        if (newScale <= SeatMapRenderer.CONFIG.MAX_ZOOM) {
            // Calculate new position
            const newX = x - localPos.x * newScale;
            const newY = y - localPos.y * newScale;
            
            // Apply scale
            this.viewport.scale.set(newScale);
            
            // Apply constrained position
            const constrained = this.getConstrainedPosition(newX, newY, newScale);
            this.viewport.position.x = constrained.x;
            this.viewport.position.y = constrained.y;
            
            this.updateUIVisibility();
        }
    }

    /**
     * Get constrained position within bounds
     */
    getConstrainedPosition(x, y, scale) {
        if (!this.state.initialBounds) return { x, y };

        const screenWidth = this.app.screen.width;
        const screenHeight = this.app.screen.height;

        // Calculate the scaled content dimensions and position
        const contentWidth = this.state.initialBounds.width * scale;
        const contentHeight = this.state.initialBounds.height * scale;
        const contentLeft = this.state.initialBounds.x * scale;
        const contentTop = this.state.initialBounds.y * scale;

        let constrainedX, constrainedY;

        // Horizontal Constraint
        if (contentWidth < screenWidth) {
            // Center horizontally if content is smaller than screen
            const centerX = (screenWidth - contentWidth) / 2;
            constrainedX = centerX - contentLeft;
        } else {
            // Clamp if content is larger than screen
            const minX = screenWidth - (contentLeft + contentWidth);
            const maxX = -contentLeft;
            constrainedX = Math.max(minX, Math.min(maxX, x));
        }

        // Vertical Constraint
        if (contentHeight < screenHeight) {
            // Center vertically if content is smaller than screen
            const centerY = (screenHeight - contentHeight) / 2;
            constrainedY = centerY - contentTop;
        } else {
            // Clamp if content is larger than screen
            const minY = screenHeight - (contentTop + contentHeight);
            const maxY = -contentTop;
            constrainedY = Math.max(minY, Math.min(maxY, y));
        }

        return { x: constrainedX, y: constrainedY };
    }

    /**
     * Load map data (SMF JSON)
     * @param {Object} data - The parsed JSON data
     */
    async loadData(data) {
        // Clear existing
        this.viewport.removeChildren();
        this.zoneContainers = []; // Reset zone containers list

        if (!data) {
            console.error("No data provided to loadData");
            return;
        }

        console.log("Loading map data...", data);

        // 1. Load Underlay (if present)
        if (data.underlay && data.underlay.visible !== false) {
            await this.renderUnderlay(data.underlay);
            this.state.hasUnderlay = true;
        } else {
            this.state.hasUnderlay = false;
        }

        // 2. Render Sections
        if (data.sections) {
            // Sort sections: Zones first (bottom), then others (top)
            // This ensures that zones (which are usually larger containers) don't block 
            // interaction with the seats inside them.
            const sortedSections = [...data.sections].sort((a, b) => {
                // Treat explicit zones OR generic GA sections as "zones" for layering
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

        // 3. Fit to view (ignoring saved canvas settings for consistent initial view)
        // Fit to underlay if present, otherwise fit to all sections
        this.fitToView();
    }

    /**
     * Render the underlay image
     * @param {Object} underlayData 
     * @private
     */
    async renderUnderlay(underlayData) {
        if (!underlayData.dataUrl) return;

        try {
            const texture = await PIXI.Assets.load(underlayData.dataUrl);
            const sprite = new PIXI.Sprite(texture);
            
            sprite.x = underlayData.x || 0;
            sprite.y = underlayData.y || 0;
            sprite.alpha = underlayData.opacity !== undefined ? underlayData.opacity : 1;
            
            const scale = underlayData.scale !== undefined ? underlayData.scale : 1;
            sprite.scale.set(scale);

            this.viewport.addChild(sprite);
        } catch (e) {
            console.error("Failed to load underlay image", e);
        }
    }

    /**
     * Render a single section
     * @param {Object} data - Section data
     * @private
     */
    renderSection(data) {
        const container = new PIXI.Container();
        
        const width = data.width;
        const height = data.height;

        // 1. Draw Section Background/Border
        const graphics = new PIXI.Graphics();
        container.addChild(graphics);
        
        // Style
        const style = data.style || {};
        let fillColor, fillAlpha, strokeAlpha;

        if (data.isZone) {
            fillColor = data.sectionColor ?? style.sectionColor ?? 0xcccccc;
            // Zones usually have higher opacity
            const opacity = data.fillOpacity ?? style.opacity ?? 0.5;
            fillAlpha = opacity;
            strokeAlpha = opacity > 0.8 ? 1 : opacity + 0.2; 
        } else {
            fillColor = style.sectionColor ?? 0x3b82f6;
            fillAlpha = style.fillVisible === false ? 0 : ((style.opacity ?? 1) * 0.25);
            strokeAlpha = style.strokeVisible === false ? 0 : ((style.opacity ?? 1) * 0.8);
        }
        
        // Draw Rect
        graphics.rect(0, 0, width, height);
        if (fillAlpha > 0) graphics.fill({ color: fillColor, alpha: fillAlpha });
        if (strokeAlpha > 0) graphics.stroke({ width: 2, color: fillColor, alpha: strokeAlpha });

        // Pivot (Center of the section) - MUST be set before positioning
        container.pivot.set(width / 2, height / 2);
        
        // Position: Use centerX/centerY if available (v2.0.0+), otherwise calculate from x/y
        if (data.centerX !== undefined && data.centerY !== undefined) {
            container.x = data.centerX;
            container.y = data.centerY;
        } else {
            // Legacy: x/y are top-left, so add half dimensions to get center
            container.x = data.x + width / 2;
            container.y = data.y + height / 2;
        }

        // Rotation (applied after positioning)
        if (data.transform && data.transform.rotation) {
            container.angle = data.transform.rotation;
        }

        // Store dimensions for zoom calculation
        container.sectionWidth = width;
        container.sectionHeight = height;

        // Interaction for Zoom
        // Treat explicit zones OR generic GA sections as "zones" for zoom configuration
        const isZoneOrGA = !!data.isZone || data.type === 'ga';
        const enableZoom = isZoneOrGA ? this.options.enableZoneZoom : this.options.enableSectionZoom;

        // Store reference for fading if it's a zone/GA
        if (isZoneOrGA) {
            container.zoneBackground = graphics;
            this.zoneContainers.push(container);
        }

        // Configure background graphics for interaction
        // We use the graphics object for hit testing instead of the container
        // to allow clicks to pass through empty spaces if enableZoom is false.
        graphics.hitArea = new PIXI.Rectangle(0, 0, width, height);
        
        if (enableZoom) {
            // If zoom is enabled, the background captures clicks
            graphics.eventMode = 'static';
            graphics.cursor = 'zoom-in';
            
            // Attach listener to the graphics object (or container, bubbling works)
            // Attaching to container is fine as long as graphics triggers the hit
            container.eventMode = 'static'; // Container needs to be interactive to receive bubbled events? 
                                          // Actually, if child is interactive, container receives events via bubbling.
                                          // But we can just attach to graphics to be safe and explicit.
            
            graphics.on('pointertap', (e) => {
                // Only zoom if not dragging
                if (!this.state.isDragging) {
                    e.stopPropagation();
                    this.zoomToSection(container);
                }
            });
        } else {
            // If zoom is disabled, the background should NOT capture clicks
            // so they can pass through to the Zone underneath.
            graphics.eventMode = 'none';
        }

        // 2. Render Content (Seats, GA Label, or Zone Label)
        if (data.isZone) {
            this.renderZoneContent(container, data, width, height);
        } else if (data.type === 'ga') {
            this.renderGAContent(container, data, width, height);
        } else {
            this.renderSeatsAndLabels(container, data);
        }

        this.viewport.addChild(container);
    }

    /**
     * Render GA (General Admission) content
     * @param {PIXI.Container} container 
     * @param {Object} data 
     * @param {number} width 
     * @param {number} height 
     * @private
     */
    renderGAContent(container, data, width, height) {
        // GA Label
        const text = new PIXI.Text({
            text: data.name || "GA",
            style: {
                fontFamily: 'system-ui, sans-serif',
                fontSize: 18,
                fontWeight: 'bold',
                fill: 0xffffff,
                align: 'center'
            }
        });
        text.anchor.set(0.5);
        text.x = width / 2;
        text.y = height / 2;
        container.addChild(text);
        container.zoneLabel = text;

        // Capacity
        if (data.ga && data.ga.capacity) {
            const capText = new PIXI.Text({
                text: `Capacity: ${data.ga.capacity}`,
                style: {
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: 12,
                    fill: 0xcccccc,
                    align: 'center'
                }
            });
            capText.anchor.set(0.5);
            capText.x = width / 2;
            capText.y = height / 2 + 20;
            container.addChild(capText);
        }
    }

    /**
     * Render Zone content
     * @param {PIXI.Container} container 
     * @param {Object} data 
     * @param {number} width 
     * @param {number} height 
     * @private
     */
    renderZoneContent(container, data, width, height) {
        // Zone Label
        const text = new PIXI.Text({
            text: data.zoneLabel || data.name || "Zone",
            style: {
                fontFamily: 'system-ui, sans-serif',
                fontSize: 16,
                fontWeight: 'bold',
                fill: 0x333333, // Darker text for zones as they are usually lighter background
                align: 'center'
            }
        });
        text.anchor.set(0.5);
        text.x = width / 2;
        text.y = height / 2;
        container.addChild(text);
        container.zoneLabel = text;
    }

    /**
     * Render seats and their labels for a section
     * @param {PIXI.Container} container 
     * @param {Object} data 
     * @private
     */
    renderSeatsAndLabels(container, data) {
        // Get layout shift from section data (if row labels were added)
        const layoutShiftX = data.layoutShiftX || 0;
        const layoutShiftY = data.layoutShiftY || 0;

        // Pre-calculate row labels for key generation
        const rowLabelMap = {};
        if (data.seats) {
            const rows = {};
            data.seats.forEach(seat => {
                if (!rows[seat.rowIndex]) rows[seat.rowIndex] = true;
            });
            const rowIndices = Object.keys(rows).map(Number).sort((a, b) => a - b);
            const config = data.rowLabels || { type: 'numbers' }; // Default to numbers if missing
            const totalRows = rowIndices.length;
            
            rowIndices.forEach((rowIndex, arrayIndex) => {
                const labelIndex = config.reversed ? (totalRows - 1 - arrayIndex) : arrayIndex;
                rowLabelMap[rowIndex] = this.getRowLabelText(labelIndex, config.type, config.start);
            });
        }

        // Render Seats
        if (data.seats) {
            const style = data.style || {};
            const defaultSeatColor = style.seatColor ?? 0xffffff;
            const defaultTextColor = style.seatTextColor ?? 0x000000;
            const seatStrokeColor = style.seatStrokeColor ?? 0xffffff;
            const seatStrokeWidth = style.seatStrokeWidth ?? 0;
            
            // Glow settings
            const glow = style.glow || {};
            
            data.seats.forEach(seatData => {
                const seatContainer = new PIXI.Container();
                
                // Position
                // Use relativeX/Y if available (v2.0+), otherwise baseX/Y
                let x = seatData.relativeX ?? seatData.baseX;
                let y = seatData.relativeY ?? seatData.baseY;
                
                // Apply layout shift (for row labels)
                x += layoutShiftX;
                y += layoutShiftY;
                
                seatContainer.x = x;
                seatContainer.y = y;

                // Glow (if enabled)
                if (glow.enabled) {
                    const glowGraphics = new PIXI.Graphics();
                    // Scale glow radius relative to seat radius
                    const radius = SeatMapRenderer.CONFIG.SEAT_RADIUS + ((glow.strength || 10) / 2);
                    glowGraphics.circle(0, 0, radius);
                    glowGraphics.fill({ color: glow.color || 0xffffff, alpha: glow.opacity || 0.5 });
                    
                    if (glow.blur > 0) {
                        const blurFilter = new PIXI.BlurFilter();
                        blurFilter.strength = glow.blur;
                        glowGraphics.filters = [blurFilter];
                    }
                    seatContainer.addChild(glowGraphics);
                }

                // Seat Circle
                const circle = new PIXI.Graphics();
                circle.circle(0, 0, SeatMapRenderer.CONFIG.SEAT_RADIUS);
                
                if (seatData.specialNeeds) {
                    circle.fill({ color: 0x2563eb }); // Blue for special needs
                } else {
                    circle.fill({ color: defaultSeatColor });
                }

                if (seatStrokeWidth > 0) {
                    circle.stroke({ width: seatStrokeWidth, color: seatStrokeColor });
                }

                seatContainer.addChild(circle);
                // seatContainer.circle = circle; // No longer needed for animation

                // Seat Label/Icon
                let labelText = seatData.number || "";
                
                let fontStyle = {
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: SeatMapRenderer.CONFIG.SEAT_LABEL_SIZE,
                    fontWeight: 'bold',
                    fill: defaultTextColor,
                    align: 'center'
                };

                if (seatData.specialNeeds) {
                    labelText = 'accessible_forward'; // Material Symbol name
                    fontStyle.fontFamily = 'Material Symbols Outlined';
                    fontStyle.fontSize = 14;
                    fontStyle.fontWeight = 'normal';
                    fontStyle.fill = 0xffffff; // White icon on blue background
                }

                const text = new PIXI.Text({ text: labelText, style: fontStyle });
                text.anchor.set(0.5);
                // Initially hidden and small
                text.alpha = 0;
                text.scale.set(0.5);
                seatContainer.addChild(text);
                seatContainer.text = text; // Reference for animation

                // Interaction (Click/Hover)
                seatContainer.eventMode = 'static';
                seatContainer.cursor = 'pointer';
                
                // Add data to container for event handling
                seatContainer.seatData = seatData;
                seatContainer.sectionId = data.id;
                seatContainer.selected = false;
                seatContainer.originalLabel = labelText;
                
                // Store colors for tooltip
                seatContainer.seatColor = seatData.specialNeeds ? 0x2563eb : defaultSeatColor;
                seatContainer.seatTextColor = seatData.specialNeeds ? 0xffffff : defaultTextColor;
                
                // Store section pricing for fallback
                seatContainer.sectionPricing = data.pricing;

                // Generate Key for Inventory Lookup
                const rowLabel = rowLabelMap[seatData.rowIndex] || "";
                // Key format: SectionName;;RowLabel;;SeatNumber
                const key = `${data.name};;${rowLabel};;${seatData.number}`;
                seatContainer.key = key;
                this.seatsByKey[key] = seatContainer;

                // Animation state
                seatContainer.targetScale = 1;
                seatContainer.targetTextAlpha = 0;
                seatContainer.targetTextScale = 0.5;

                seatContainer.on('pointerover', () => {
                    if (this.state.isDragging) return;
                    
                    // Show Tooltip
                    this.showTooltip(
                        seatContainer.seatData, 
                        data.name, 
                        rowLabel, 
                        data.pricing,
                        seatContainer.seatColor,
                        seatContainer.seatTextColor
                    );

                    // Dynamically update resolution based on zoom level for crisp text
                    // This improves performance by only rendering high-res text when needed
                    const zoom = this.viewport.scale.x;
                    text.resolution = Math.max(2, zoom * 2); // Ensure at least 2x for retina

                    // If selected, we are already in the "large" state, but we might want to ensure it
                    // For now, hover behavior is same as selected behavior regarding scale
                    seatContainer.targetScale = SeatMapRenderer.CONFIG.SEAT_RADIUS_HOVER / SeatMapRenderer.CONFIG.SEAT_RADIUS;
                    seatContainer.targetTextAlpha = 1;
                    seatContainer.targetTextScale = 1;
                    // Bring to front
                    seatContainer.parent.addChild(seatContainer);
                    this.animatingSeats.add(seatContainer);
                });

                seatContainer.on('pointerout', () => {
                    // Hide Tooltip
                    this.hideTooltip();

                    // Only revert if not selected
                    if (!seatContainer.selected) {
                        seatContainer.targetScale = 1;
                        seatContainer.targetTextAlpha = 0;
                        seatContainer.targetTextScale = 0.5;
                        this.animatingSeats.add(seatContainer);
                    }
                });

                seatContainer.on('pointertap', (e) => {
                    e.stopPropagation();
                    this.onSeatClick(seatContainer);
                });

                container.addChild(seatContainer);
            });
        }

        // Render Row Labels
        if (data.rowLabels && data.rowLabels.type !== 'none' && !data.rowLabels.hidden) {
            // We need to reconstruct labels based on the config if they are not explicitly stored as objects in JSON
            // The SMF format stores configuration, but not individual label objects in the 'rowLabels' array usually.
            // Wait, looking at fileManager.js, it seems rowLabels are NOT serialized as individual objects in the JSON 'sections' array.
            // The JSON has a 'rowLabels' configuration object.
            // But wait, `fileManager.js` serializeSection function:
            /*
            rowLabels: {
                type: section.rowLabelType...
                ...
            }
            */
            // It does NOT save the individual label positions. We must recalculate them or rely on the fact that
            // the renderer doesn't need to be perfect editor-replica if it's just for display, BUT
            // for accurate display we should probably regenerate them.
            // However, `SeatManager.js` generates them.
            // Let's implement a simplified label generator here.
            
            this.renderRowLabels(container, data);
        }
    }

    /**
     * Render row labels for a section
     * @param {PIXI.Container} container 
     * @param {Object} sectionData 
     * @private
     */
    renderRowLabels(container, sectionData) {
        const config = sectionData.rowLabels;
        if (!config || config.type === 'none') return;

        const seats = sectionData.seats || [];
        if (seats.length === 0) return;

        // Get layout shift
        const layoutShiftX = sectionData.layoutShiftX || 0;
        const layoutShiftY = sectionData.layoutShiftY || 0;

        // Group seats by row index
        const rows = {};
        seats.forEach(seat => {
            if (!rows[seat.rowIndex]) rows[seat.rowIndex] = [];
            rows[seat.rowIndex].push(seat);
        });

        const rowIndices = Object.keys(rows).map(Number).sort((a, b) => a - b);
        const spacing = config.spacing || 20;
        const color = config.color ?? 0xffffff;

        rowIndices.forEach((rowIndex, arrayIndex) => {
            const rowSeats = rows[rowIndex];
            // Sort by x position
            rowSeats.sort((a, b) => {
                const ax = a.relativeX ?? a.baseX;
                const bx = b.relativeX ?? b.baseX;
                return ax - bx;
            });

            // Determine label text
            const totalRows = rowIndices.length;
            const labelIndex = config.reversed ? (totalRows - 1 - arrayIndex) : arrayIndex;
            const labelText = this.getRowLabelText(labelIndex, config.type, config.start);

            const firstSeat = rowSeats[0];
            const lastSeat = rowSeats[rowSeats.length - 1];
            
            let firstX = firstSeat.relativeX ?? firstSeat.baseX;
            let firstY = firstSeat.relativeY ?? firstSeat.baseY;
            
            let lastX = lastSeat.relativeX ?? lastSeat.baseX;
            let lastY = lastSeat.relativeY ?? lastSeat.baseY;
            
            // Apply layout shift
            firstX += layoutShiftX;
            firstY += layoutShiftY;
            lastX += layoutShiftX;
            lastY += layoutShiftY;

            const style = {
                fontFamily: 'system-ui, sans-serif',
                fontSize: 14,
                fontWeight: 'bold',
                fill: color,
                align: 'center'
            };

            if (config.showLeft) {
                const text = new PIXI.Text({ text: labelText, style });
                text.anchor.set(0.5);
                text.x = firstX - 10 - spacing;
                text.y = firstY;
                if (config.hidden) text.alpha = 0.6;
                container.addChild(text);
            }

            if (config.showRight) {
                const text = new PIXI.Text({ text: labelText, style });
                text.anchor.set(0.5);
                text.x = lastX + 10 + spacing;
                text.y = lastY;
                if (config.hidden) text.alpha = 0.6;
                container.addChild(text);
            }
        });
    }

    /**
     * Generate label text based on index and type
     * @param {number} index 
     * @param {string} type 
     * @param {string|number} startValue 
     * @returns {string}
     * @private
     */
    getRowLabelText(index, type, startValue) {
        if (type === 'numbers') {
            const start = parseInt(startValue) || 1;
            return (index + start).toString();
        } else if (type === 'letters') {
            const start = startValue || 'A';
            const startCharCode = start.charCodeAt(0);
            const offset = startCharCode - 65;
            
            let labelIndex = index + offset;
            let label = '';
            
            while (labelIndex >= 0) {
                label = String.fromCharCode(65 + (labelIndex % 26)) + label;
                labelIndex = Math.floor(labelIndex / 26) - 1;
            }
            return label;
        }
        return '';
    }

    /**
     * Fit the view to show all content (underlay or sections) centered and scaled to fit viewport height
     */
    fitToView(animate = true) {
        // Use getLocalBounds to get unscaled dimensions
        const bounds = this.viewport.getLocalBounds();
        if (bounds.width === 0 || bounds.height === 0) return;

        const screenWidth = this.app.screen.width;
        const screenHeight = this.app.screen.height;

        let targetBounds;
        
        if (this.state.hasUnderlay) {
            // If we have an underlay, fit to the underlay image bounds
            const underlayChild = this.viewport.children[0]; // Underlay is first child
            if (underlayChild) {
                // Calculate bounds of underlay in viewport space
                const localBounds = underlayChild.getLocalBounds(); // Texture space
                
                targetBounds = {
                    x: underlayChild.x + (localBounds.x * underlayChild.scale.x),
                    y: underlayChild.y + (localBounds.y * underlayChild.scale.y),
                    width: localBounds.width * underlayChild.scale.x,
                    height: localBounds.height * underlayChild.scale.y
                };
            } else {
                targetBounds = bounds;
            }
        } else {
            // Otherwise fit to all sections
            targetBounds = bounds;
        }

        // Calculate scale to fit height with padding
        const scaleX = (screenWidth - SeatMapRenderer.CONFIG.PADDING * 2) / targetBounds.width;
        const scaleY = (screenHeight - SeatMapRenderer.CONFIG.PADDING * 2) / targetBounds.height;
        
        // Use the smaller scale to ensure everything fits, but don't zoom in beyond 1:1
        const scale = Math.min(scaleX, scaleY, 1);

        // Animate to the new view
        const centerX = targetBounds.x + targetBounds.width / 2;
        const centerY = targetBounds.y + targetBounds.height / 2;
        
        const targetX = (screenWidth / 2) - (centerX * scale);
        const targetY = (screenHeight / 2) - (centerY * scale);

        // Update initial state
        this.state.initialScale = scale;
        this.state.initialBounds = {
            x: targetBounds.x,
            y: targetBounds.y,
            width: targetBounds.width,
            height: targetBounds.height
        };
        this.state.initialPosition = { x: targetX, y: targetY };

        // If we are already initialized (viewport has children) and animate is true
        if (this.viewport.children.length > 0 && animate) {
             this.animateViewport(targetX, targetY, scale);
        } else {
             this.viewport.scale.set(scale);
             this.viewport.position.set(targetX, targetY);
             this.updateUIVisibility();
        }
    }

    /**
     * Legacy method - now calls fitToView
     */
    centerMap() {
        this.fitToView();
    }

    /**
     * Zoom to fit a specific section
     * @param {PIXI.Container} sectionContainer 
     */
    zoomToSection(sectionContainer) {
        const screenWidth = this.app.screen.width;
        const screenHeight = this.app.screen.height;
        const padding = SeatMapRenderer.CONFIG.SECTION_ZOOM_PADDING;

        // Calculate target scale
        // We need to account for rotation if we want to be perfect, but for now let's use the unrotated dimensions
        // or the bounding box. Using getBounds() gives global bounds which includes current viewport transform.
        // We want local bounds relative to the viewport parent, but unscaled.
        
        // Simplest approach: use the stored width/height and ignore rotation for scale calculation
        // or use the local bounds.
        const width = sectionContainer.sectionWidth;
        const height = sectionContainer.sectionHeight;

        const scaleX = (screenWidth - padding * 2) / width;
        const scaleY = (screenHeight - padding * 2) / height;
        
        // Limit max zoom
        let targetScale = Math.min(scaleX, scaleY);
        targetScale = Math.min(targetScale, SeatMapRenderer.CONFIG.MAX_ZOOM);

        // Calculate target position to center the section
        // The section's position (x,y) is its center because we set pivot to center
        const targetX = (screenWidth / 2) - (sectionContainer.x * targetScale);
        const targetY = (screenHeight / 2) - (sectionContainer.y * targetScale);

        // Animate
        this.animateViewport(targetX, targetY, targetScale);
    }

    animateViewport(targetX, targetY, targetScale) {
        const startX = this.viewport.position.x;
        const startY = this.viewport.position.y;
        const startScale = this.viewport.scale.x;
        
        const startTime = performance.now();
        const duration = SeatMapRenderer.CONFIG.ANIMATION_DURATION;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);

            const currentScale = startScale + (targetScale - startScale) * ease;
            const currentX = startX + (targetX - startX) * ease;
            const currentY = startY + (targetY - startY) * ease;

            this.viewport.scale.set(currentScale);
            this.viewport.position.set(currentX, currentY);
            
            // Update UI visibility during animation
            this.updateUIVisibility();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Ensure final values are set
                this.viewport.scale.set(targetScale);
                this.viewport.position.set(targetX, targetY);
                this.updateUIVisibility();
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Show tooltip for a seat
     * @param {Object} seatData 
     * @param {string} sectionName 
     * @param {string} rowLabel 
     * @param {Object} sectionPricing 
     * @param {number} seatColor 
     * @param {number} seatTextColor 
     * @private
     */
    showTooltip(seatData, sectionName, rowLabel, sectionPricing, seatColor, seatTextColor) {
        if (!this.tooltipManager) return;

        // Price/Category (use defaults or data from inventory, fallback to section pricing)
        const priceValue = this.getSeatPrice(seatData, sectionPricing);
        
        const price = priceValue > 0 ? `$${priceValue.toLocaleString()} MXN` : 'Not Available';
        const category = seatData.category || 'STANDARD';
        
        // Prepare content object
        const content = {
            section: sectionName,
            row: rowLabel,
            seat: seatData.number,
            price: price,
            category: category
        };

        // Apply colors
        if (seatColor !== undefined) {
            content.color = this.hexColorFromNumber(seatColor);
        }
        
        if (seatTextColor !== undefined) {
            content.textColor = this.hexColorFromNumber(seatTextColor);
        }

        this.tooltipManager.show(content);
    }

    /**
     * Hide the tooltip
     * @private
     */
    hideTooltip() {
        if (this.tooltipManager) {
            this.tooltipManager.hide();
        }
    }

    /**
     * Handle seat click events
     * @param {PIXI.Container} seatContainer 
     * @private
     */
    onSeatClick(seatContainer) {
        // Toggle selection
        seatContainer.selected = !seatContainer.selected;
        
        if (seatContainer.selected) {
            this.selectedSeats.add(seatContainer);
        } else {
            this.selectedSeats.delete(seatContainer);
        }
        
        console.log("Seat clicked:", seatContainer.seatData, "Selected:", seatContainer.selected);

        // Update visual state
        if (seatContainer.selected) {
            // Selected state: Large, visible text, checkmark
            seatContainer.targetScale = SeatMapRenderer.CONFIG.SEAT_RADIUS_HOVER / SeatMapRenderer.CONFIG.SEAT_RADIUS;
            seatContainer.targetTextAlpha = 1;
            seatContainer.targetTextScale = 1;
            seatContainer.text.text = "✓"; // Checkmark
            
            // Ensure high resolution for the checkmark
            const zoom = this.viewport.scale.x;
            seatContainer.text.resolution = Math.max(2, zoom * 2);
        } else {
            // Deselected state: Revert to hover state if mouse is over, or default if not?
            // Since this is a click, the mouse is likely still over it.
            // However, if we want to "deselect", we usually expect it to go back to normal unless hovered.
            // But since the mouse IS over it (we just clicked), it should technically stay in hover state (Large, original text).
            
            // Let's assume we want to revert to the "hover" state (Large, original text)
            seatContainer.targetScale = SeatMapRenderer.CONFIG.SEAT_RADIUS_HOVER / SeatMapRenderer.CONFIG.SEAT_RADIUS;
            seatContainer.targetTextAlpha = 1;
            seatContainer.targetTextScale = 1;
            seatContainer.text.text = seatContainer.originalLabel;
        }
        
        // Bring to front
        seatContainer.parent.addChild(seatContainer);
        this.animatingSeats.add(seatContainer);

        // Dispatch legacy event
        const event = new CustomEvent('seat-click', { 
            detail: { 
                seat: seatContainer.seatData,
                sectionId: seatContainer.sectionId,
                selected: seatContainer.selected
            } 
        });
        this.container.dispatchEvent(event);

        // Trigger cart change
        this.handleCartChange();
    }

    /**
     * Handle cart changes and dispatch events
     * @private
     */
    handleCartChange() {
        const seats = Array.from(this.selectedSeats).map(container => {
            const data = container.seatData;
            
            // Determine price: Seat specific > Section base > 0
            const price = this.getSeatPrice(data, container.sectionPricing);

            return {
                id: data.id,
                key: container.key,
                price: price,
                special: data.special || null
            };
        });

        const cartData = {
            seats: seats,
            ga: [] // GA selection not yet implemented
        };

        // Dispatch custom event
        const event = new CustomEvent('cartChange', { detail: cartData });
        this.container.dispatchEvent(event);
        console.log("Cart updated:", cartData);

        // Call callback if provided
        if (this.options.onCartChange) {
            this.options.onCartChange(cartData);
        }
    }

    /**
     * Load inventory data (prices, availability, etc.)
     * @param {Object} inventoryData - The inventory data
     */
    loadInventory(inventoryData) {
        // Validate structure
        if (!this.validateInventoryData(inventoryData)) {
            console.error('Invalid inventory data structure:', inventoryData);
            return;
        }

        console.log("Loading inventory data...", inventoryData);

        inventoryData.seats.forEach(item => {
            if (!item.key || typeof item.key !== 'string') {
                console.warn('Invalid seat item, missing key:', item);
                return;
            }

            // Key format from inventory: "SectionName;;RowLabel;;SeatNumber"
            // Note: The inventory key format must match our generated key format.
            // Our generated key: `${data.name};;${rowLabel};;${seatData.number}`
            
            const key = item.key;
            const seatContainer = this.seatsByKey[key];

            if (seatContainer) {
                // Merge inventory data into seat data
                seatContainer.seatData = { ...seatContainer.seatData, ...item };
                
                // Here you could also update visual state based on inventory
                // e.g. if (item.status === 'sold') seatContainer.alpha = 0.5;
            } else {
                // console.warn(`Seat not found for key: ${key}`);
            }
        });
    }

    validateInventoryData(data) {
        return data 
            && typeof data === 'object' 
            && Array.isArray(data.seats);
    }

    /**
     * Update seat animations (hover/selection)
     * @private
     */
    updateSeatAnimations() {
        if (this.animatingSeats.size === 0) return;

        const speed = SeatMapRenderer.CONFIG.SEAT_HOVER_SPEED;

        for (const seat of this.animatingSeats) {
            const text = seat.text;

            // Lerp CONTAINER scale
            seat.scale.x += (seat.targetScale - seat.scale.x) * speed;
            seat.scale.y += (seat.targetScale - seat.scale.y) * speed;

            // Lerp text alpha
            text.alpha += (seat.targetTextAlpha - text.alpha) * speed;
            
            // Lerp text scale
            text.scale.x += (seat.targetTextScale - text.scale.x) * speed;
            text.scale.y += (seat.targetTextScale - text.scale.y) * speed;

            // Check if animation is done (close enough)
            if (Math.abs(seat.targetScale - seat.scale.x) < SeatMapRenderer.CONFIG.ANIMATION_THRESHOLD &&
                Math.abs(seat.targetTextAlpha - text.alpha) < SeatMapRenderer.CONFIG.ANIMATION_THRESHOLD) {
                
                seat.scale.set(seat.targetScale);
                text.alpha = seat.targetTextAlpha;
                text.scale.set(seat.targetTextScale);
                this.animatingSeats.delete(seat);
            }
        }
    }

    /**
     * Calculate distance between two pointers
     * @param {Map} pointers 
     * @returns {number}
     * @private
     */
    getDist(pointers) {
        const points = Array.from(pointers.values());
        const dx = points[0].x - points[1].x;
        const dy = points[0].y - points[1].y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate center point between two pointers
     * @param {Map} pointers 
     * @returns {Object} {x, y}
     * @private
     */
    getCenter(pointers) {
        const points = Array.from(pointers.values());
        return {
            x: (points[0].x + points[1].x) / 2,
            y: (points[0].y + points[1].y) / 2
        };
    }

    /**
     * Get seat price with fallback to section pricing
     * @param {Object} seatData 
     * @param {Object} sectionPricing 
     * @returns {number}
     */
    getSeatPrice(seatData, sectionPricing) {
        return seatData.price ?? sectionPricing?.basePrice ?? 0;
    }

    /**
     * Convert number color to hex string
     * @param {number} colorNum 
     * @returns {string} Hex color string (e.g. "#ffffff")
     */
    hexColorFromNumber(colorNum) {
        return '#' + colorNum.toString(16).padStart(6, '0');
    }
}
