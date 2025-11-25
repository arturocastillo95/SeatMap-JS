/**
 * InputHandler - Handles pan, zoom, and touch input
 */

export class InputHandler {
    /**
     * @param {Object} options - Configuration
     * @param {PIXI.Application} options.app - PIXI application
     * @param {PIXI.Container} options.viewport - Viewport container
     * @param {Object} options.state - Shared state object
     * @param {Object} options.config - Zoom/pan configuration
     * @param {Function} options.onZoomChange - Callback when zoom changes
     * @param {Function} options.getConstrainedPosition - Position constraint function
     */
    constructor(options) {
        this.app = options.app;
        this.viewport = options.viewport;
        this.state = options.state;
        this.config = options.config || {};
        this.onZoomChange = options.onZoomChange;
        this.getConstrainedPosition = options.getConstrainedPosition;
        this.domContainer = options.domContainer;

        this.activePointers = new Map();
        
        // Gesture tracking - to distinguish taps from gestures
        this.gestureState = {
            isGesture: false,          // True if a pan/pinch gesture was detected
            startTime: 0,              // Timestamp when touch started
            startPos: null,            // Initial touch position
            totalMovement: 0,          // Total distance moved
            gestureCooldown: false     // Brief cooldown after gesture ends
        };
        
        // Double-tap detection
        this.doubleTapState = {
            lastTapTime: 0,
            lastTapPos: null,
            pendingTapTimeout: null,
            pendingTapCallback: null
        };
        
        // Thresholds for gesture detection (from config)
        this.TAP_MAX_DURATION = this.config.tapMaxDuration || 300;
        this.TAP_MAX_MOVEMENT = this.config.tapMaxMovement || 10;
        this.GESTURE_COOLDOWN_MS = this.config.gestureCooldownMs || 200;
        this.DOUBLE_TAP_MAX_DELAY = this.config.doubleTapMaxDelay || 300;
        this.DOUBLE_TAP_MAX_DISTANCE = this.config.doubleTapMaxDistance || 50;
        
        // Bind methods
        this.wheelHandler = this.wheelHandler.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
    }

    /**
     * Check if the current interaction is a valid tap (not a gesture)
     * @returns {boolean}
     */
    isValidTap() {
        if (this.gestureState.gestureCooldown) return false;
        if (this.gestureState.isGesture) return false;
        
        const duration = Date.now() - this.gestureState.startTime;
        return duration < this.TAP_MAX_DURATION && 
               this.gestureState.totalMovement < this.TAP_MAX_MOVEMENT;
    }

    /**
     * Check if the current tap is a double-tap
     * @param {Object} tapPos - Current tap position {x, y}
     * @returns {boolean}
     */
    isDoubleTap(tapPos) {
        const now = Date.now();
        const timeSinceLastTap = now - this.doubleTapState.lastTapTime;
        
        if (timeSinceLastTap > this.DOUBLE_TAP_MAX_DELAY) {
            return false;
        }
        
        if (!this.doubleTapState.lastTapPos) {
            return false;
        }
        
        const dx = tapPos.x - this.doubleTapState.lastTapPos.x;
        const dy = tapPos.y - this.doubleTapState.lastTapPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < this.DOUBLE_TAP_MAX_DISTANCE;
    }

    /**
     * Record a tap for double-tap detection
     * @param {Object} tapPos - Tap position {x, y}
     */
    recordTap(tapPos) {
        this.doubleTapState.lastTapTime = Date.now();
        this.doubleTapState.lastTapPos = { x: tapPos.x, y: tapPos.y };
    }

    /**
     * Clear double-tap state (call after processing a double-tap)
     */
    clearDoubleTap() {
        this.doubleTapState.lastTapTime = 0;
        this.doubleTapState.lastTapPos = null;
        if (this.doubleTapState.pendingTapTimeout) {
            clearTimeout(this.doubleTapState.pendingTapTimeout);
            this.doubleTapState.pendingTapTimeout = null;
        }
        this.doubleTapState.pendingTapCallback = null;
    }

    /**
     * Handle a tap with double-tap detection
     * Delays single-tap action to check for double-tap
     * @param {Object} tapPos - Tap position {x, y}
     * @param {Function} onSingleTap - Callback for single tap
     * @param {Function} onDoubleTap - Callback for double tap
     */
    handleTapWithDoubleTapDetection(tapPos, onSingleTap, onDoubleTap) {
        // Check if this is a double-tap (second tap within threshold)
        if (this.isDoubleTap(tapPos)) {
            // Cancel pending single-tap
            if (this.doubleTapState.pendingTapTimeout) {
                clearTimeout(this.doubleTapState.pendingTapTimeout);
                this.doubleTapState.pendingTapTimeout = null;
            }
            // Clear state and execute double-tap
            this.clearDoubleTap();
            onDoubleTap(tapPos);
            return;
        }
        
        // Record this tap
        this.recordTap(tapPos);
        
        // Set a timeout to execute single-tap if no second tap comes
        this.doubleTapState.pendingTapCallback = onSingleTap;
        this.doubleTapState.pendingTapTimeout = setTimeout(() => {
            this.doubleTapState.pendingTapTimeout = null;
            if (this.doubleTapState.pendingTapCallback) {
                this.doubleTapState.pendingTapCallback(tapPos);
                this.doubleTapState.pendingTapCallback = null;
            }
        }, this.DOUBLE_TAP_MAX_DELAY);
    }

    /**
     * Check if a gesture is currently in progress or recently ended
     * @returns {boolean}
     */
    isGestureActive() {
        return this.gestureState.isGesture || this.gestureState.gestureCooldown;
    }

    /**
     * Setup all interaction handlers
     */
    setup() {
        const stage = this.app.stage;
        stage.eventMode = 'static';
        stage.hitArea = this.app.screen;

        stage.on('pointerdown', (e) => this.onPointerDown(e));
        stage.on('pointerup', this.onPointerUp);
        stage.on('pointerupoutside', this.onPointerUp);
        stage.on('pointercancel', (e) => this.onPointerCancel(e));
        stage.on('pointerleave', (e) => this.onPointerLeave(e));
        stage.on('pointermove', (e) => this.onPointerMove(e));

        // Wheel zoom
        if (this.domContainer) {
            this.domContainer.addEventListener('wheel', this.wheelHandler, { passive: false });
        }
    }

    /**
     * Handle pointer down
     * @param {PIXI.FederatedPointerEvent} e
     */
    onPointerDown(e) {
        this.activePointers.set(e.pointerId, { x: e.global.x, y: e.global.y });
        
        if (this.activePointers.size === 1) {
            this.state.isDragging = true;
            this.state.lastPos = { x: e.global.x, y: e.global.y };
            
            // Initialize gesture tracking for tap detection
            this.gestureState.isGesture = false;
            this.gestureState.startTime = Date.now();
            this.gestureState.startPos = { x: e.global.x, y: e.global.y };
            this.gestureState.totalMovement = 0;
        } else if (this.activePointers.size === 2) {
            // Multi-touch = gesture, not a tap
            this.gestureState.isGesture = true;
            this.state.isDragging = false;
            this.state.lastDist = this.getDist(this.activePointers);
            this.state.lastCenter = this.getCenter(this.activePointers);
        }
    }

    /**
     * Handle pointer up
     * @param {PIXI.FederatedPointerEvent} e
     */
    onPointerUp(e) {
        this.activePointers.delete(e.pointerId);
        
        if (this.activePointers.size === 0) {
            // If a gesture occurred, set a brief cooldown to prevent accidental taps
            if (this.gestureState.isGesture) {
                this.gestureState.gestureCooldown = true;
                setTimeout(() => {
                    this.gestureState.gestureCooldown = false;
                }, this.GESTURE_COOLDOWN_MS);
            }
            
            this.state.isDragging = false;
            this.state.lastDist = null;
            this.state.lastCenter = null;
        } else if (this.activePointers.size === 1) {
            this.state.isDragging = true;
            const pointer = this.activePointers.values().next().value;
            this.state.lastPos = { x: pointer.x, y: pointer.y };
            this.state.lastDist = null;
        }
    }

    /**
     * Handle pointer cancel
     * @param {PIXI.FederatedPointerEvent} e
     */
    onPointerCancel(e) {
        this.activePointers.delete(e.pointerId);
        this.state.isDragging = false;
        this.state.lastDist = null;
        this.state.lastCenter = null;
    }

    /**
     * Handle pointer leave
     * @param {PIXI.FederatedPointerEvent} e
     */
    onPointerLeave(e) {
        this.activePointers.delete(e.pointerId);
        if (this.activePointers.size === 0) {
            this.state.isDragging = false;
        }
    }

    /**
     * Handle pointer move
     * @param {PIXI.FederatedPointerEvent} e
     */
    onPointerMove(e) {
        if (this.activePointers.has(e.pointerId)) {
            const oldPos = this.activePointers.get(e.pointerId);
            const newPos = { x: e.global.x, y: e.global.y };
            
            // Track total movement for tap detection
            if (this.gestureState.startPos && this.activePointers.size === 1) {
                const dx = newPos.x - this.gestureState.startPos.x;
                const dy = newPos.y - this.gestureState.startPos.y;
                this.gestureState.totalMovement = Math.sqrt(dx * dx + dy * dy);
                
                // Mark as gesture if movement exceeds threshold
                if (this.gestureState.totalMovement >= this.TAP_MAX_MOVEMENT) {
                    this.gestureState.isGesture = true;
                }
            }
            
            this.activePointers.set(e.pointerId, newPos);
        }

        if (this.activePointers.size === 2) {
            this.handlePinchZoom();
        } else if (this.state.isDragging && this.activePointers.size === 1) {
            this.handlePan(e);
        }
    }

    /**
     * Handle pinch zoom gesture
     */
    handlePinchZoom() {
        const newDist = this.getDist(this.activePointers);
        const newCenter = this.getCenter(this.activePointers);

        if (this.state.lastDist && newDist > 0) {
            const scale = newDist / this.state.lastDist;
            let newScale = this.viewport.scale.x * scale;
            
            const minScale = this.state.initialScale || this.config.minZoom || 0.1;
            const maxZoom = this.config.maxZoom || 3;
            
            // Clamp scale
            if (newScale < minScale) newScale = minScale;
            if (newScale > maxZoom) newScale = maxZoom;

            const localX = (this.state.lastCenter.x - this.viewport.x) / this.viewport.scale.x;
            const localY = (this.state.lastCenter.y - this.viewport.y) / this.viewport.scale.y;

            this.viewport.scale.set(newScale);
            
            let newX = newCenter.x - localX * newScale;
            let newY = newCenter.y - localY * newScale;

            // Apply position constraints to prevent empty space at edges
            if (this.getConstrainedPosition) {
                const constrained = this.getConstrainedPosition(newX, newY, newScale);
                this.viewport.position.x = constrained.x;
                this.viewport.position.y = constrained.y;
            } else {
                this.viewport.position.x = newX;
                this.viewport.position.y = newY;
            }
            
            if (this.onZoomChange) this.onZoomChange();
        }

        this.state.lastDist = newDist;
        this.state.lastCenter = newCenter;
    }

    /**
     * Handle pan gesture
     * @param {PIXI.FederatedPointerEvent} e
     */
    handlePan(e) {
        // Disable panning if at min zoom
        if (this.viewport.scale.x <= (this.state.initialScale * 1.001)) {
            return;
        }

        const newPos = { x: e.global.x, y: e.global.y };
        const dx = newPos.x - this.state.lastPos.x;
        const dy = newPos.y - this.state.lastPos.y;

        const newX = this.viewport.position.x + dx;
        const newY = this.viewport.position.y + dy;

        if (this.getConstrainedPosition) {
            const constrained = this.getConstrainedPosition(newX, newY, this.viewport.scale.x);
            this.viewport.position.x = constrained.x;
            this.viewport.position.y = constrained.y;
        } else {
            this.viewport.position.x = newX;
            this.viewport.position.y = newY;
        }

        this.state.lastPos = newPos;
    }

    /**
     * Handle mouse wheel zoom
     * @param {WheelEvent} e
     */
    wheelHandler(e) {
        e.preventDefault();
        
        const zoomSpeed = this.config.zoomSpeed || 1.1;
        const direction = e.deltaY > 0 ? 1 / zoomSpeed : zoomSpeed;
        
        const rect = this.domContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const localPos = {
            x: (x - this.viewport.x) / this.viewport.scale.x,
            y: (y - this.viewport.y) / this.viewport.scale.y
        };

        let newScale = this.viewport.scale.x * direction;
        const minScale = this.state.initialScale || this.config.minZoom || 0.1;

        // Snap to min scale and recenter
        if (newScale <= minScale) {
            newScale = minScale;
            this.viewport.scale.set(newScale);
            
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
            
            if (this.onZoomChange) this.onZoomChange();
            return;
        }

        const maxZoom = this.config.maxZoom || 3;
        if (newScale <= maxZoom) {
            const newX = x - localPos.x * newScale;
            const newY = y - localPos.y * newScale;
            
            this.viewport.scale.set(newScale);
            
            if (this.getConstrainedPosition) {
                const constrained = this.getConstrainedPosition(newX, newY, newScale);
                this.viewport.position.x = constrained.x;
                this.viewport.position.y = constrained.y;
            } else {
                this.viewport.position.set(newX, newY);
            }
            
            if (this.onZoomChange) this.onZoomChange();
        }
    }

    /**
     * Calculate distance between two pointers
     * @param {Map} pointers
     * @returns {number}
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
     * @returns {{x: number, y: number}}
     */
    getCenter(pointers) {
        const points = Array.from(pointers.values());
        return {
            x: (points[0].x + points[1].x) / 2,
            y: (points[0].y + points[1].y) / 2
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.domContainer) {
            this.domContainer.removeEventListener('wheel', this.wheelHandler);
        }
        this.activePointers.clear();
        this.app = null;
        this.viewport = null;
        this.state = null;
    }
}
