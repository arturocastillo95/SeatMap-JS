/**
 * UIManager - Handles UI elements like reset button and zone visibility
 */

import * as PIXI from 'pixi.js';

export class UIManager {
    /**
     * @param {Object} options - Configuration
     * @param {PIXI.Application} options.app - PIXI application
     * @param {Object} options.config - UI configuration
     * @param {Function} options.onResetClick - Reset button callback
     * @param {boolean} options.showControls - Whether to show UI controls (default: true)
     */
    constructor(options) {
        this.app = options.app;
        this.config = options.config || {};
        this.onResetClick = options.onResetClick;
        this.showControls = options.showControls !== false; // Default to true
        
        this.uiContainer = null;
        this.resetButton = null;
        this.zoneContainers = [];
    }

    /**
     * Create UI elements
     */
    create() {
        this.uiContainer = new PIXI.Container();
        this.app.stage.addChild(this.uiContainer);

        // Only create reset button if showControls is enabled
        if (this.showControls) {
            // Reset Zoom Button
            this.resetButton = new PIXI.Container();
            
            const bg = new PIXI.Graphics();
            bg.circle(0, 0, 20);
            bg.fill({ color: 0x333333, alpha: 0.8 });
            bg.stroke({ width: 2, color: 0xffffff, alpha: 0.8 });
            this.resetButton.addChild(bg);

            const minus = new PIXI.Graphics();
            minus.rect(-8, -1, 16, 2);
            minus.fill({ color: 0xffffff });
            this.resetButton.addChild(minus);

            this.resetButton.eventMode = 'static';
            this.resetButton.cursor = 'pointer';
            this.resetButton.visible = false;

            this.resetButton.on('pointertap', (e) => {
                e.stopPropagation();
                if (this.onResetClick) this.onResetClick();
            });

            this.uiContainer.addChild(this.resetButton);
        }
        
        this.repositionUI();
    }

    /**
     * Reposition UI elements based on screen size
     */
    repositionUI() {
        if (this.resetButton) {
            const padding = this.config.uiPadding || 40;
            this.resetButton.x = padding;
            this.resetButton.y = this.app.screen.height - padding;
        }
    }

    /**
     * Update reset button visibility based on zoom level
     * @param {number} currentZoom - Current zoom level
     * @param {number} initialScale - Initial scale
     */
    updateResetButtonVisibility(currentZoom, initialScale) {
        if (this.resetButton) {
            const isZoomedIn = currentZoom > (initialScale * 1.001);
            this.resetButton.visible = isZoomedIn;
        }
    }

    /**
     * Register a zone container for visibility management
     * @param {PIXI.Container} container
     */
    registerZoneContainer(container) {
        this.zoneContainers.push(container);
    }

    /**
     * Clear registered zone containers
     */
    clearZoneContainers() {
        this.zoneContainers = [];
    }

    /**
     * Update zone visibility/opacity based on zoom level
     * @param {number} currentZoom - Current zoom level
     * @param {number} initialScale - Initial scale
     * @param {number} maxZoom - Maximum zoom level
     */
    updateZoneVisibility(currentZoom, initialScale, maxZoom) {
        if (this.zoneContainers.length === 0) return;

        const zoneFadeRatio = this.config.zoneFadeRatio || 5;
        const startZoom = initialScale || 0.1;
        const endZoom = startZoom + (maxZoom - startZoom) / zoneFadeRatio;

        let opacityFactor = 1 - (currentZoom - startZoom) / (endZoom - startZoom);
        opacityFactor = Math.max(0, Math.min(1, opacityFactor));

        this.zoneContainers.forEach(container => {
            // Skip fading for GA sections - they should remain visible at all zoom levels
            if (container.isGASection) return;
            
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
     * Update all UI based on zoom state
     * @param {number} currentZoom
     * @param {number} initialScale
     * @param {number} maxZoom
     */
    update(currentZoom, initialScale, maxZoom) {
        this.updateResetButtonVisibility(currentZoom, initialScale);
        this.updateZoneVisibility(currentZoom, initialScale, maxZoom);
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.uiContainer) {
            this.uiContainer.destroy({ children: true });
            this.uiContainer = null;
        }
        this.resetButton = null;
        this.zoneContainers = [];
        this.app = null;
    }
}
