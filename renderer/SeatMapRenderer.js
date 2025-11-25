import { TooltipManager } from './TooltipManager.js';

/**
 * SeatMap Renderer
 * A lightweight renderer for SeatMap JS files (SMF format).
 */

export class SeatMapRenderer {
    static CONFIG = {
        PADDING: 0,               // Padding around the map when fitting to view
        MIN_ZOOM: 0.1,            // Minimum zoom level (not used for initial fit)
        MAX_ZOOM: 3,              // Maximum zoom level
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
        ZONE_FADE_RATIO: 5,       // Ratio for zone fade out duration
        ANIMATION_THRESHOLD: 0.01, // Threshold for stopping animations
        SEAT_TEXTURE_RESOLUTION: 4, // Resolution multiplier for seat textures
        BOOKED_COLOR: 0x8B8B8B,   // Gray for booked seats
        RESERVED_COLOR: 0xff6666, // Lighter Red for reserved seats
        SPECIAL_SEAT_SCALE: 1.5,  // Scale for special needs seats
        MAX_SELECTED_SEATS: 10     // Maximum number of seats that can be selected
    };

    static async create(container, options = {}) {
        const renderer = new SeatMapRenderer(container, options);
        await renderer.init();
        return renderer;
    }

    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            // Configuration Defaults
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

            // PIXI Application Options & Others
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

        this.isInitialized = false;

        this.animatingSeats = new Set(); // Track seats currently animating
        this.seatsByKey = {}; // Lookup for seats by key
        this.seatsById = {}; // Lookup for seats by ID
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
        try {
            this.textureCache = {}; // Initialize texture cache
            await this.app.init(this.options);
            this.container.appendChild(this.app.canvas);
            this.app.stage.addChild(this.viewport);

            // Create UI layer
            this.createUI();
            
            // Initialize Tooltip Manager
            this.tooltipManager = new TooltipManager({
                animationSpeed: this.options.tooltipSpeed
            });

            // Setup interaction (pan/zoom)
            this.setupInteraction();
            
            // Setup animation loop for seats
            this.app.ticker.add(this.updateSeatAnimations);
            
            // Handle window resize
            window.addEventListener('resize', this.resizeHandler);
            
            // Wait for Material Symbols font to load (weight 300 as specified in HTML)
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
        this.isInitialized = false;

        // Destroy cached textures
        if (this.textureCache) {
            Object.values(this.textureCache).forEach(texture => texture.destroy(true));
            this.textureCache = {};
        }

        // Remove event listeners
        window.removeEventListener('resize', this.resizeHandler);
        if (this.container) {
            this.container.removeEventListener('wheel', this.wheelHandler);
        }
        
        // Remove ticker
        if (this.app && this.app.ticker) {
            this.app.ticker.remove(this.updateSeatAnimations);
        }
        
        // Destroy PIXI app
        if (this.app) {
            this.app.destroy(true, { children: true, texture: true });
            this.app = null;
        }
        
        // Destroy Tooltip Manager
        if (this.tooltipManager) {
            this.tooltipManager.destroy();
            this.tooltipManager = null;
        }
        
        // Clear references
        if (this.activePointers) this.activePointers.clear();
        if (this.selectedSeats) this.selectedSeats.clear();
        if (this.animatingSeats) this.animatingSeats.clear();
        
        this.seatsByKey = {};
        this.seatsById = {};
        this.viewport = null;
        this.labelsLayer = null;
        this.uiContainer = null;
        this.resetButton = null;
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
            this.resetButton.x = this.options.uiPadding;
            this.resetButton.y = this.app.screen.height - this.options.uiPadding;
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
        const startZoom = this.state.initialScale || this.options.minZoom;
        const maxZoom = this.options.maxZoom;
        
        // Fade out completely by halfway to max zoom
        const endZoom = startZoom + (maxZoom - startZoom) / this.options.zoneFadeRatio;

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

        // Handle pointer cancellation and leaving to prevent ghost touches
        stage.on('pointercancel', (e) => {
            this.activePointers.delete(e.pointerId);
            this.state.isDragging = false;
            this.state.lastDist = null;
            this.state.lastCenter = null;
        });

        stage.on('pointerleave', (e) => {
            this.activePointers.delete(e.pointerId);
            if (this.activePointers.size === 0) {
                this.state.isDragging = false;
            }
        });

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
                    const minScale = this.state.initialScale || this.options.minZoom;
                    if (newScale < minScale) newScale = minScale;
                    if (newScale > this.options.maxZoom) newScale = this.options.maxZoom;

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
        const direction = e.deltaY > 0 ? 1 / this.options.zoomSpeed : this.options.zoomSpeed;
        
        // Calculate zoom center
        const rect = this.container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const localPos = {
            x: (x - this.viewport.x) / this.viewport.scale.x,
            y: (y - this.viewport.y) / this.viewport.scale.y
        };

        let newScale = this.viewport.scale.x * direction;
        const minScale = this.state.initialScale || this.options.minZoom;

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

        if (newScale <= this.options.maxZoom) {
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
        if (!this.isInitialized) {
            console.error('SeatMapRenderer not initialized. Call init() first.');
            return;
        }

        // Clear existing content and ensure proper cleanup of PIXI objects and listeners
        if (this.viewport.children.length > 0) {
            this.viewport.removeChildren().forEach(child => {
                child.destroy({ children: true, texture: false, baseTexture: false });
            });
        }
        
        this.zoneContainers = []; // Reset zone containers list
        this.labelsLayer = new PIXI.Container(); // Create labels layer
        
        // Reset state to prevent memory leaks and ghost interactions
        this.seatsByKey = {};
        this.seatsById = {};
        this.animatingSeats.clear();
        this.selectedSeats.clear();

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

        // Add labels layer to viewport last so it is on top of everything
        this.viewport.addChild(this.labelsLayer);

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
        if (!underlayData.dataUrl && !underlayData.sourceUrl) return;

        try {
            const urlToLoad = underlayData.sourceUrl || underlayData.dataUrl;
            const texture = await PIXI.Assets.load(urlToLoad);
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
        
        // Draw Shape (Polygon or Rect)
        if (data.points && data.points.length > 0) {
            graphics.poly(data.points);
        } else {
            graphics.rect(0, 0, width, height);
        }
        
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
        text.eventMode = 'none'; // Ensure clicks pass through to seats/background

        if (this.labelsLayer) {
            // Position in global viewport coordinates
            text.x = container.x;
            text.y = container.y;
            text.rotation = container.rotation;
            this.labelsLayer.addChild(text);
        } else {
            text.x = width / 2;
            text.y = height / 2;
            container.addChild(text);
        }

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
            capText.eventMode = 'none'; // Ensure clicks pass through
            
            if (this.labelsLayer) {
                capText.x = 0;
                capText.y = 20;
                text.addChild(capText);
            } else {
                capText.x = width / 2;
                capText.y = height / 2 + 20;
                container.addChild(capText);
            }
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
        const fontSize = data.labelFontSize || 16;
        const fontColor = data.labelColor !== undefined ? data.labelColor : 0x333333;
        const offsetX = data.labelOffsetX || 0;
        const offsetY = data.labelOffsetY || 0;

        const text = new PIXI.Text({
            text: data.zoneLabel || data.name || "Zone",
            style: {
                fontFamily: 'system-ui, sans-serif',
                fontSize: fontSize,
                fontWeight: 'bold',
                fill: fontColor,
                align: 'center'
            }
        });
        text.anchor.set(0.5);
        text.eventMode = 'none'; // Ensure clicks pass through to seats/background

        if (this.labelsLayer) {
            // Position in global viewport coordinates
            // We need to rotate the offset to match the container's rotation
            const rotation = container.rotation;
            const cos = Math.cos(rotation);
            const sin = Math.sin(rotation);
            
            // Rotate offset vector
            const rotatedOffsetX = offsetX * cos - offsetY * sin;
            const rotatedOffsetY = offsetX * sin + offsetY * cos;

            text.x = container.x + rotatedOffsetX;
            text.y = container.y + rotatedOffsetY;
            text.rotation = rotation;
            this.labelsLayer.addChild(text);
        } else {
            text.x = (width / 2) + offsetX;
            text.y = (height / 2) + offsetY;
            container.addChild(text);
        }

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
                const r = seat.r !== undefined ? seat.r : seat.rowIndex;
                if (r !== undefined) rows[r] = true;
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
                // Support optimized keys x, y
                let x = seatData.x ?? seatData.relativeX ?? seatData.baseX;
                let y = seatData.y ?? seatData.relativeY ?? seatData.baseY;
                
                // Apply layout shift (for row labels)
                x += layoutShiftX;
                y += layoutShiftY;
                
                seatContainer.x = x;
                seatContainer.y = y;

                // Glow (if enabled)
                if (glow.enabled) {
                    const glowGraphics = new PIXI.Graphics();
                    // Scale glow radius relative to seat radius
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

                // Determine special needs status early for styling
                const isSpecial = seatData.sn || seatData.specialNeeds;

                // Seat Sprite (Optimized)
                const seatColor = isSpecial ? 0x2563eb : defaultSeatColor;
                const texture = this.createSeatTexture(
                    this.options.seatRadius, 
                    seatColor, 
                    seatStrokeWidth, 
                    seatStrokeColor
                );
                
                const seatSprite = new PIXI.Sprite(texture);
                seatSprite.anchor.set(0.5);
                const resolution = this.options.seatTextureResolution || 4;
                seatSprite.scale.set(1 / resolution);
                seatContainer.addChild(seatSprite);

                // Seat Label/Icon
                let labelText = seatData.n ?? seatData.number ?? "";
                
                let fontStyle = {
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: this.options.seatLabelSize,
                    fontWeight: 'bold',
                    fill: defaultTextColor,
                    align: 'center'
                };

                if (isSpecial) {
                    labelText = 'accessible_forward'; // Material Symbol name
                    fontStyle.fontFamily = 'Material Symbols Outlined';
                    fontStyle.fontSize = 14;
                    fontStyle.fontWeight = '300'; // Match the loaded weight
                    fontStyle.fill = 0xffffff; // White icon on blue background
                }

                const text = new PIXI.Text({ text: labelText, style: fontStyle });
                text.anchor.set(0.5);
                
                // Initial visibility state
                if (isSpecial) {
                    // Special needs icon always visible
                    text.alpha = 1;
                    // Scale down slightly to fit the smaller seats in renderer (radius 6 vs 10 in editor)
                    // 14px font on 12px diameter seat needs scaling
                    text.scale.set(0.7); 
                } else {
                    // Regular labels hidden until hover
                    text.alpha = 0;
                    text.scale.set(0.5);
                }
                
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
                seatContainer.seatColor = isSpecial ? 0x2563eb : defaultSeatColor;
                seatContainer.seatTextColor = isSpecial ? 0xffffff : defaultTextColor;
                
                // Store original styles for status updates
                seatContainer.originalColor = seatContainer.seatColor;
                seatContainer.originalStrokeColor = seatStrokeColor;
                seatContainer.originalStrokeWidth = seatStrokeWidth;
                
                // Store section pricing for fallback
                seatContainer.sectionPricing = data.pricing;

                // Generate Key for Inventory Lookup
                const r = seatData.r !== undefined ? seatData.r : seatData.rowIndex;
                const rowLabel = rowLabelMap[r] || "";
                const seatNum = seatData.n ?? seatData.number;
                // Key format: SectionName;;RowLabel;;SeatNumber
                const key = `${data.name};;${rowLabel};;${seatNum}`;
                seatContainer.key = key;
                this.seatsByKey[key] = seatContainer;

                // Store by ID if available
                if (seatData.id) {
                    this.seatsById[seatData.id] = seatContainer;
                }

                // Animation state
                seatContainer.baseScale = isSpecial ? this.options.specialSeatScale : 1;
                seatContainer.scale.set(seatContainer.baseScale);
                seatContainer.targetScale = seatContainer.baseScale;
                
                // Default target state depends on special needs
                seatContainer.targetTextAlpha = isSpecial ? 1 : 0;
                seatContainer.targetTextScale = isSpecial ? 0.7 : 0.5;

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

                    // Check status - only animate if available
                    const status = seatContainer.seatData.status || 'available';
                    if (status !== 'available') return;

                    // If selected, we are already in the "large" state, but we might want to ensure it
                    // For now, hover behavior is same as selected behavior regarding scale
                    seatContainer.targetScale = this.options.seatRadiusHover / this.options.seatRadius;
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
                        seatContainer.targetScale = seatContainer.baseScale;
                        // Revert to default state (visible for special needs, hidden for others)
                        seatContainer.targetTextAlpha = isSpecial ? 1 : 0;
                        seatContainer.targetTextScale = isSpecial ? 0.7 : 0.5;
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
            const r = seat.r !== undefined ? seat.r : seat.rowIndex;
            if (!rows[r]) rows[r] = [];
            rows[r].push(seat);
        });

        const rowIndices = Object.keys(rows).map(Number).sort((a, b) => a - b);
        const spacing = config.spacing || 20;
        const color = config.color ?? 0xffffff;

        rowIndices.forEach((rowIndex, arrayIndex) => {
            const rowSeats = rows[rowIndex];
            // Sort by x position
            rowSeats.sort((a, b) => {
                const ax = a.x ?? a.relativeX ?? a.baseX;
                const bx = b.x ?? b.relativeX ?? b.baseX;
                return ax - bx;
            });

            // Determine label text
            const totalRows = rowIndices.length;
            const labelIndex = config.reversed ? (totalRows - 1 - arrayIndex) : arrayIndex;
            const labelText = this.getRowLabelText(labelIndex, config.type, config.start);

            const firstSeat = rowSeats[0];
            const lastSeat = rowSeats[rowSeats.length - 1];
            
            let firstX = firstSeat.x ?? firstSeat.relativeX ?? firstSeat.baseX;
            let firstY = firstSeat.y ?? firstSeat.relativeY ?? firstSeat.baseY;
            
            let lastX = lastSeat.x ?? lastSeat.relativeX ?? lastSeat.baseX;
            let lastY = lastSeat.y ?? lastSeat.relativeY ?? lastSeat.baseY;
            
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
                text.eventMode = 'none'; // Ensure clicks pass through
                if (config.hidden) text.alpha = 0.6;
                container.addChild(text);
            }

            if (config.showRight) {
                const text = new PIXI.Text({ text: labelText, style });
                text.anchor.set(0.5);
                text.x = lastX + 10 + spacing;
                text.y = lastY;
                text.eventMode = 'none'; // Ensure clicks pass through
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
        if (!this.isInitialized) return;

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
        const scaleX = (screenWidth - this.options.padding * 2) / targetBounds.width;
        const scaleY = (screenHeight - this.options.padding * 2) / targetBounds.height;
        
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
        if (!this.isInitialized) return;

        const screenWidth = this.app.screen.width;
        const screenHeight = this.app.screen.height;
        const padding = this.options.sectionZoomPadding;

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
        targetScale = Math.min(targetScale, this.options.maxZoom);

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
        const duration = this.options.animationDuration;

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
        const status = seatData.status || 'available';
        
        let price = priceValue > 0 ? `$${priceValue.toLocaleString()} MXN` : 'Not Available';
        
        if (status === 'booked' || status === 'sold') {
            price = 'BOOKED';
        } else if (status === 'reserved') {
            price = 'RESERVED';
        }
        
        // Generate category name from section name (remove trailing numbers)
        // e.g. "VIP 3" -> "VIP", "ORO 2" -> "ORO"
        const sectionCategory = sectionName.replace(/\s*\d+$/, '').trim();
        const category = seatData.category || sectionCategory || 'STANDARD';
        
        // Determine special needs status
        const isSpecial = seatData.sn || seatData.specialNeeds;

        // Prepare content object
        const content = {
            section: sectionName,
            row: rowLabel,
            seat: isSpecial ? null : (seatData.n ?? seatData.number),
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
        // Check status
        const status = seatContainer.seatData.status || 'available';
        if (status !== 'available') {
            console.log(`Seat ${seatContainer.seatData.id} is ${status}, ignoring click.`);
            return;
        }

        // Check limit if trying to select
        if (!seatContainer.selected && this.selectedSeats.size >= this.options.maxSelectedSeats) {
            console.warn(`Selection limit reached (${this.options.maxSelectedSeats} seats).`);
            const event = new CustomEvent('selection-limit-reached', { 
                detail: { limit: this.options.maxSelectedSeats } 
            });
            this.container.dispatchEvent(event);
            return;
        }

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
            seatContainer.targetScale = this.options.seatRadiusHover / this.options.seatRadius;
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
            seatContainer.targetScale = this.options.seatRadiusHover / this.options.seatRadius;
            seatContainer.targetTextAlpha = 1;
            seatContainer.targetTextScale = 1;
            
            // Restore original label (icon for special needs, number for others)
            if (seatContainer.seatData.sn || seatContainer.seatData.specialNeeds) {
                seatContainer.text.text = 'accessible_forward';
            } else {
                seatContainer.text.text = seatContainer.originalLabel;
            }
        }
        
        // Bring to front
        seatContainer.parent.addChild(seatContainer);
        this.animatingSeats.add(seatContainer);

        // Dispatch specific select/deselect events
        const interactionEventData = {
            seat: seatContainer.seatData,
            sectionId: seatContainer.sectionId
        };

        if (seatContainer.selected) {
            this.container.dispatchEvent(new CustomEvent('seat-selected', { detail: interactionEventData }));
            if (this.options.onSeatSelect) {
                this.options.onSeatSelect(interactionEventData);
            }
        } else {
            this.container.dispatchEvent(new CustomEvent('seat-deselected', { detail: interactionEventData }));
            if (this.options.onSeatDeselect) {
                this.options.onSeatDeselect(interactionEventData);
            }
        }

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
                special: data.sn || data.specialNeeds || data.special || null
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
        if (!this.isInitialized) {
            console.error('SeatMapRenderer not initialized. Call init() first.');
            return;
        }

        // Validate structure
        if (!this.validateInventoryData(inventoryData)) {
            console.error('Invalid inventory data structure:', inventoryData);
            return;
        }

        console.log("Loading inventory data...", inventoryData);

        // Reset unmatched keys tracking
        this._unmatchedKeys = [];

        inventoryData.seats.forEach(item => {
            if (!item.key && !item.id) {
                console.warn('Invalid seat item, missing key or id:', item);
                return;
            }

            let seatContainer;
            let lookupKey;

            if (item.id) {
                seatContainer = this.seatsById[item.id];
                lookupKey = item.id;
            } else {
                // Fallback to key
                seatContainer = this.seatsByKey[item.key];
                lookupKey = item.key;
            }

            if (seatContainer) {
                // Merge inventory data into seat data
                seatContainer.seatData = { ...seatContainer.seatData, ...item };
                
                // Update visuals based on status
                this.updateSeatVisuals(seatContainer);
            } else {
                console.warn(`Seat not found for lookup: ${lookupKey}`);
                this._unmatchedKeys.push(lookupKey);
            }
        });

        if (this._unmatchedKeys.length > 0) {
            console.warn(`Found ${this._unmatchedKeys.length} unmatched inventory keys. Call getUnmatchedInventoryKeys() for details.`);
        }
    }

    /**
     * Get list of inventory keys that didn't match any seat
     * @returns {string[]}
     */
    getUnmatchedInventoryKeys() {
        return this._unmatchedKeys || [];
    }

    validateInventoryData(data) {
        return data 
            && typeof data === 'object' 
            && Array.isArray(data.seats);
    }

    /**
     * Create or retrieve a cached texture for a seat
     * @param {number} radius 
     * @param {number} color 
     * @param {number} strokeWidth 
     * @param {number} strokeColor 
     * @returns {PIXI.Texture}
     * @private
     */
    createSeatTexture(radius, color, strokeWidth, strokeColor) {
        const resolution = this.options.seatTextureResolution || 4;
        const key = `seat-${radius}-${color}-${strokeWidth}-${strokeColor}-res${resolution}`;
        if (this.textureCache[key]) return this.textureCache[key];

        const scaledRadius = radius * resolution;
        const scaledStroke = strokeWidth * resolution;

        const gr = new PIXI.Graphics();
        gr.circle(0, 0, scaledRadius);
        gr.fill({ color: color });
        if (strokeWidth > 0) {
            gr.stroke({ width: scaledStroke, color: strokeColor });
        }

        // Render this graphic to a texture
        const texture = this.app.renderer.generateTexture(gr);
        this.textureCache[key] = texture;
        return texture;
    }

    /**
     * Update seat animations (hover/selection)
     * @private
     */
    updateSeatAnimations() {
        if (this.animatingSeats.size === 0) return;

        const speed = this.options.seatHoverSpeed;

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
            if (Math.abs(seat.targetScale - seat.scale.x) < this.options.animationThreshold &&
                Math.abs(seat.targetTextAlpha - text.alpha) < this.options.animationThreshold) {
                
                seat.scale.set(seat.targetScale);
                text.alpha = seat.targetTextAlpha;
                text.scale.set(seat.targetTextScale);
                this.animatingSeats.delete(seat);
            }
        }
    }

    /**
     * Update visual state of a seat based on its status
     * @param {PIXI.Container} seatContainer 
     * @private
     */
    updateSeatVisuals(seatContainer) {
        const status = seatContainer.seatData.status || 'available';
        
        let color = seatContainer.originalColor;
        let strokeColor = seatContainer.originalStrokeColor;
        let strokeWidth = seatContainer.originalStrokeWidth;
        let cursor = 'pointer';

        if (status === 'booked' || status === 'sold') {
            color = this.options.bookedColor;
            cursor = 'not-allowed';
            strokeWidth = 0; // Remove outline
        } else if (status === 'reserved') {
            color = this.options.reservedColor;
            cursor = 'not-allowed'; 
            strokeWidth = 0; // Remove outline
        }

        // Update texture
        const texture = this.createSeatTexture(
            this.options.seatRadius,
            color,
            strokeWidth,
            strokeColor
        );
        
        // Update the sprite texture
        const sprite = seatContainer.children.find(c => c instanceof PIXI.Sprite);
        if (sprite) {
            sprite.texture = texture;
        } else {
            console.warn("Sprite not found for seat", seatContainer);
        }

        // Handle Glow - hide if not available
        const glowGraphics = seatContainer.children.find(c => c instanceof PIXI.Graphics);
        if (glowGraphics) {
            glowGraphics.visible = (status === 'available');
        }

        // Update interactivity
        // Always allow interaction for tooltips, but change cursor to indicate status
        seatContainer.eventMode = 'static';
        seatContainer.cursor = cursor;

        // Handle selection if status changed to non-interactive (booked/reserved)
        if (status !== 'available' && seatContainer.selected) {
            // Deselect without triggering click event logic if possible, 
            // but onSeatClick handles visual toggle and cart update.
            // We need to manually deselect here to avoid triggering the click handler logic which we will guard
            seatContainer.selected = false;
            this.selectedSeats.delete(seatContainer);
            
            // Reset visual state
            seatContainer.targetScale = seatContainer.baseScale || 1;
            if (seatContainer.seatData.sn || seatContainer.seatData.specialNeeds) {
                seatContainer.text.text = 'accessible_forward';
            } else {
                seatContainer.text.text = seatContainer.originalLabel;
            }
            
            // Trigger cart update to remove it
            this.handleCartChange();
        }
        
        // Update tooltip color reference so tooltip shows correct status color
        seatContainer.seatColor = color;
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
