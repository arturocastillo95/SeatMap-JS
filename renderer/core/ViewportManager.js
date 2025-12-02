/**
 * ViewportManager - Handles viewport transforms, fitting, and animations
 */

import * as PIXI from 'pixi.js';

export class ViewportManager {
    /**
     * @param {Object} options - Configuration
     * @param {PIXI.Application} options.app - PIXI application
     * @param {PIXI.Container} options.viewport - Viewport container
     * @param {Object} options.state - Shared state object
     * @param {Object} options.config - Configuration options
     * @param {Function} options.onUpdate - Callback after viewport changes
     */
    constructor(options) {
        this.app = options.app;
        this.viewport = options.viewport;
        this.state = options.state;
        this.config = options.config || {};
        this.onUpdate = options.onUpdate;
    }

    /**
     * Get constrained position within bounds
     * @param {number} x - Target X position
     * @param {number} y - Target Y position
     * @param {number} scale - Current scale
     * @returns {{x: number, y: number}}
     */
    getConstrainedPosition(x, y, scale) {
        if (!this.state.initialBounds) return { x, y };

        const screenWidth = this.app.screen.width;
        const screenHeight = this.app.screen.height;

        const contentWidth = this.state.initialBounds.width * scale;
        const contentHeight = this.state.initialBounds.height * scale;
        const contentLeft = this.state.initialBounds.x * scale;
        const contentTop = this.state.initialBounds.y * scale;

        let constrainedX, constrainedY;

        // Horizontal
        if (contentWidth < screenWidth) {
            const centerX = (screenWidth - contentWidth) / 2;
            constrainedX = centerX - contentLeft;
        } else {
            const minX = screenWidth - (contentLeft + contentWidth);
            const maxX = -contentLeft;
            constrainedX = Math.max(minX, Math.min(maxX, x));
        }

        // Vertical
        if (contentHeight < screenHeight) {
            const centerY = (screenHeight - contentHeight) / 2;
            constrainedY = centerY - contentTop;
        } else {
            const minY = screenHeight - (contentTop + contentHeight);
            const maxY = -contentTop;
            constrainedY = Math.max(minY, Math.min(maxY, y));
        }

        return { x: constrainedX, y: constrainedY };
    }

    /**
     * Fit the view to show all content
     * @param {boolean} animate - Whether to animate the transition
     */
    fitToView(animate = true) {
        const bounds = this.viewport.getLocalBounds();
        if (bounds.width === 0 || bounds.height === 0) return;

        const screenWidth = this.app.screen.width;
        const screenHeight = this.app.screen.height;
        const padding = this.config.padding || 0;

        let targetBounds;
        
        if (this.state.hasUnderlay) {
            // Underlay has loaded - use actual sprite bounds
            const underlayChild = this.viewport.children.find(c => c.isUnderlay);
            if (underlayChild) {
                const localBounds = underlayChild.getLocalBounds();
                targetBounds = {
                    x: underlayChild.x + (localBounds.x * underlayChild.scale.x),
                    y: underlayChild.y + (localBounds.y * underlayChild.scale.y),
                    width: localBounds.width * underlayChild.scale.x,
                    height: localBounds.height * underlayChild.scale.y
                };
            } else {
                targetBounds = bounds;
            }
        } else if (this.state.underlayBounds) {
            // Underlay is loading - use estimated bounds from JSON data
            targetBounds = this.state.underlayBounds;
        } else {
            // No underlay - use content bounds
            targetBounds = bounds;
        }

        const scaleX = (screenWidth - padding * 2) / targetBounds.width;
        const scaleY = (screenHeight - padding * 2) / targetBounds.height;
        const scale = Math.min(scaleX, scaleY, 1);

        const centerX = targetBounds.x + targetBounds.width / 2;
        const centerY = targetBounds.y + targetBounds.height / 2;
        
        const targetX = (screenWidth / 2) - (centerX * scale);
        const targetY = (screenHeight / 2) - (centerY * scale);

        // Update state
        this.state.initialScale = scale;
        this.state.initialBounds = {
            x: targetBounds.x,
            y: targetBounds.y,
            width: targetBounds.width,
            height: targetBounds.height
        };
        this.state.initialPosition = { x: targetX, y: targetY };

        if (this.viewport.children.length > 0 && animate) {
            this.animateViewport(targetX, targetY, scale);
        } else {
            this.viewport.scale.set(scale);
            this.viewport.position.set(targetX, targetY);
            if (this.onUpdate) this.onUpdate();
        }
    }

    /**
     * Fit the view to show only sections/zones (excluding underlay)
     * Useful for mobile where focusing on interactive content is preferred
     * Pan boundaries are kept to the underlay/full content for exploration
     * @param {boolean} animate - Whether to animate the transition
     * @param {number} padding - Padding around sections (default 40)
     */
    fitToSections(animate = true, padding = 40) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let foundSections = false;

        for (const child of this.viewport.children) {
            // Skip underlay and labels layer
            if (child.isUnderlay || child.isLabelsLayer) continue;
            
            // Include all section containers (both regular sections and zones)
            // They all have sectionWidth/sectionHeight properties
            if (child.sectionWidth !== undefined && child.sectionHeight !== undefined) {
                // Note: child.x/y is the CENTER position (due to pivot), not top-left
                // So we need to calculate the actual bounds
                const halfWidth = child.sectionWidth / 2;
                const halfHeight = child.sectionHeight / 2;
                const left = child.x - halfWidth;
                const top = child.y - halfHeight;
                const right = child.x + halfWidth;
                const bottom = child.y + halfHeight;
                
                minX = Math.min(minX, left);
                minY = Math.min(minY, top);
                maxX = Math.max(maxX, right);
                maxY = Math.max(maxY, bottom);
                foundSections = true;
            }
        }

        if (!foundSections) {
            // Fallback to regular fitToView if no sections found
            this.fitToView(animate);
            return;
        }

        const sectionsBounds = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };

        const screenWidth = this.app.screen.width;
        const screenHeight = this.app.screen.height;

        const scaleX = (screenWidth - padding * 2) / sectionsBounds.width;
        const scaleY = (screenHeight - padding * 2) / sectionsBounds.height;
        const scale = Math.min(scaleX, scaleY, this.config.maxZoom || 2.5);

        const centerX = sectionsBounds.x + sectionsBounds.width / 2;
        const centerY = sectionsBounds.y + sectionsBounds.height / 2;
        
        const targetX = (screenWidth / 2) - (centerX * scale);
        const targetY = (screenHeight / 2) - (centerY * scale);

        // Calculate underlay bounds for pan constraints (if underlay exists)
        // This allows users to pan around the full map, not just the sections
        let constraintBounds = sectionsBounds;
        if (this.state.hasUnderlay) {
            const underlayChild = this.viewport.children.find(c => c.isUnderlay);
            if (underlayChild) {
                const localBounds = underlayChild.getLocalBounds();
                constraintBounds = {
                    x: underlayChild.x + (localBounds.x * underlayChild.scale.x),
                    y: underlayChild.y + (localBounds.y * underlayChild.scale.y),
                    width: localBounds.width * underlayChild.scale.x,
                    height: localBounds.height * underlayChild.scale.y
                };
            }
        } else if (this.state.underlayBounds) {
            // Underlay is loading - use estimated bounds from JSON data
            constraintBounds = this.state.underlayBounds;
        }

        // Update state - use underlay bounds for constraints, but scale based on sections
        this.state.initialScale = scale;
        this.state.initialBounds = constraintBounds; // Pan limits based on underlay
        this.state.initialPosition = { x: targetX, y: targetY };

        if (animate) {
            this.animateViewport(targetX, targetY, scale);
        } else {
            this.viewport.scale.set(scale);
            this.viewport.position.set(targetX, targetY);
            if (this.onUpdate) this.onUpdate();
        }
    }

    /**
     * Check if viewport is zoomed in (beyond initial fit)
     * @returns {boolean}
     */
    isZoomedIn() {
        const currentScale = this.viewport.scale.x;
        const initialScale = this.state.initialPosition?.scale || 1;
        // Consider zoomed in if scale is significantly larger than initial
        return currentScale > initialScale * 1.3;
    }

    /**
     * Zoom to fit a specific section, optionally centered on a tap point
     * @param {PIXI.Container} sectionContainer
     * @param {Object} [tapPoint] - Optional tap coordinates {x, y} in screen space
     * @param {number} [zoomBoost=1.3] - Multiplier to zoom in beyond section fit (1.0 = fit exactly, 1.5 = 50% more zoom)
     */
    zoomToSection(sectionContainer, tapPoint = null, zoomBoost = 1.3) {
        const screenWidth = this.app.screen.width;
        const screenHeight = this.app.screen.height;
        const padding = this.config.sectionZoomPadding || 50;

        const width = sectionContainer.sectionWidth;
        const height = sectionContainer.sectionHeight;

        const scaleX = (screenWidth - padding * 2) / width;
        const scaleY = (screenHeight - padding * 2) / height;
        
        // Calculate base scale to fit section, then apply zoom boost
        let targetScale = Math.min(scaleX, scaleY) * zoomBoost;
        targetScale = Math.min(targetScale, this.config.maxZoom || 3);

        let targetX, targetY;
        
        if (tapPoint) {
            // Zoom centered on tap point
            // Convert tap point from screen coords to world coords
            const worldX = (tapPoint.x - this.viewport.position.x) / this.viewport.scale.x;
            const worldY = (tapPoint.y - this.viewport.position.y) / this.viewport.scale.y;
            
            // Calculate position so that world point stays at tap screen position
            targetX = tapPoint.x - (worldX * targetScale);
            targetY = tapPoint.y - (worldY * targetScale);
        } else {
            // Default: center on section's center point
            // Section containers have pivot set to center, so x/y IS the center position
            const sectionCenterX = sectionContainer.x;
            const sectionCenterY = sectionContainer.y;
            
            targetX = (screenWidth / 2) - (sectionCenterX * targetScale);
            targetY = (screenHeight / 2) - (sectionCenterY * targetScale);
        }

        // Apply constraints to prevent empty space at edges
        const constrained = this.getConstrainedPosition(targetX, targetY, targetScale);
        targetX = constrained.x;
        targetY = constrained.y;

        this.animateViewport(targetX, targetY, targetScale);
    }

    /**
     * Zoom to a point (for double-tap zoom without a section)
     * @param {Object} tapPoint - Tap coordinates {x, y} in screen space
     * @param {number} [zoomLevel=2.0] - Target zoom multiplier relative to initial scale
     */
    zoomToPoint(tapPoint, zoomLevel = 2.0) {
        const initialScale = this.state.initialPosition?.scale || 1;
        let targetScale = initialScale * zoomLevel;
        targetScale = Math.min(targetScale, this.config.maxZoom || 3);

        // Convert tap point from screen coords to world coords
        const worldX = (tapPoint.x - this.viewport.position.x) / this.viewport.scale.x;
        const worldY = (tapPoint.y - this.viewport.position.y) / this.viewport.scale.y;
        
        // Calculate position so that world point stays at tap screen position
        let targetX = tapPoint.x - (worldX * targetScale);
        let targetY = tapPoint.y - (worldY * targetScale);

        // Apply constraints to prevent empty space at edges
        const constrained = this.getConstrainedPosition(targetX, targetY, targetScale);
        targetX = constrained.x;
        targetY = constrained.y;

        this.animateViewport(targetX, targetY, targetScale);
    }

    /**
     * Animate viewport to target position and scale
     * @param {number} targetX
     * @param {number} targetY
     * @param {number} targetScale
     */
    animateViewport(targetX, targetY, targetScale) {
        const startX = this.viewport.position.x;
        const startY = this.viewport.position.y;
        const startScale = this.viewport.scale.x;
        
        const startTime = performance.now();
        const duration = this.config.animationDuration || 500;

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
            
            if (this.onUpdate) this.onUpdate();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.viewport.scale.set(targetScale);
                this.viewport.position.set(targetX, targetY);
                if (this.onUpdate) this.onUpdate();
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Get current zoom level
     * @returns {number}
     */
    getZoom() {
        return this.viewport.scale.x;
    }

    /**
     * Check if zoomed in from initial
     * @returns {boolean}
     */
    isZoomedIn() {
        return this.viewport.scale.x > (this.state.initialScale * 1.001);
    }

    /**
     * Cleanup
     */
    destroy() {
        this.app = null;
        this.viewport = null;
        this.state = null;
    }
}
