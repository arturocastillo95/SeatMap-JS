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
   * @param {Function} options.onTap - Callback when a primary press ends as a tap
   * @param {Function} options.onZoomChange - Callback when zoom changes
   * @param {Function} options.getConstrainedPosition - Position constraint function
   */
  constructor(options) {
    this.app = options.app;
    this.viewport = options.viewport;
    this.state = options.state;
    this.config = options.config || {};
    this.onTap = options.onTap;
    this.onZoomChange = options.onZoomChange;
    this.getConstrainedPosition = options.getConstrainedPosition;
    this.domContainer = options.domContainer;

    this.activePointers = new Map();

    this.tap = null;
    this.tapMaxDuration = this.config.tapMaxDuration ?? 300;
    this.tapMaxMovement = this.config.tapMaxMovement ?? 10;
    this.wheelHandler = this.wheelHandler.bind(this);
  }

  /**
   * Setup all interaction handlers
   */
  setup() {
    const stage = this.app.stage;
    stage.eventMode = "static";
    stage.hitArea = this.app.screen;

    this._cancelPointer = (e) => this.endPointer(e.pointerId);
    this._handlers = {
      pointerdown: (e) => this.onPointerDown(e),
      pointerup: (e) => this.onPointerUp(e),
      pointermove: (e) => this.onPointerMove(e),
      pointerupoutside: this._cancelPointer,
      pointerleave: this._cancelPointer,
    };
    for (const [event, handler] of Object.entries(this._handlers))
      stage.on(event, handler);

    if (this.domContainer) {
      // Pixi doesn't forward native pointer cancellation to the stage.
      this.domContainer.addEventListener("pointercancel", this._cancelPointer);
      this.domContainer.addEventListener("wheel", this.wheelHandler, {
        passive: false,
      });
    }
  }

  /**
   * Handle pointer down
   * @param {PIXI.FederatedPointerEvent} e
   */
  onPointerDown(e) {
    if (e.button !== 0) return;
    const point = { x: e.global.x, y: e.global.y };
    this.activePointers.set(e.pointerId, point);

    if (this.activePointers.size === 1) {
      this.state.lastPos = point;
      this.tap = { point, target: e.target, started: Date.now() };
    } else {
      this.tap = null;
      if (this.activePointers.size === 2) {
        this.state.lastDist = this.getDist(this.activePointers);
        this.state.lastCenter = this.getCenter(this.activePointers);
      }
    }
  }

  onPointerUp(e) {
    if (e.button !== 0 || !this.activePointers.has(e.pointerId)) return;
    const tap = this.tap;
    this.endPointer(e.pointerId);
    if (
      tap && this.app.screen.contains(e.global.x, e.global.y) &&
      Math.hypot(e.global.x - tap.point.x, e.global.y - tap.point.y) < this.tapMaxMovement
    )
      this.onTap?.(e, tap, Date.now() - tap.started < this.tapMaxDuration);
  }

  endPointer(pointerId) {
    if (!this.activePointers.delete(pointerId)) return;
    this.tap = null;
    this.state.lastDist = null;
    this.state.lastCenter = null;
    if (this.activePointers.size === 1)
      this.state.lastPos = this.activePointers.values().next().value;
  }

  onPointerMove(e) {
    if (!this.activePointers.has(e.pointerId)) return;
    const point = { x: e.global.x, y: e.global.y };
    this.activePointers.set(e.pointerId, point);

    if (this.tap) {
      if (Math.hypot(point.x - this.tap.point.x, point.y - this.tap.point.y) < this.tapMaxMovement)
        return;
      this.tap = null;
    }

    if (this.activePointers.size === 2) this.handlePinchZoom();
    else if (this.activePointers.size === 1) this.handlePan(e);
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

      const localX =
        (this.state.lastCenter.x - this.viewport.x) / this.viewport.scale.x;
      const localY =
        (this.state.lastCenter.y - this.viewport.y) / this.viewport.scale.y;

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
    if (this.viewport.scale.x <= this.state.initialScale * 1.001) {
      return;
    }

    const newPos = { x: e.global.x, y: e.global.y };
    const dx = newPos.x - this.state.lastPos.x;
    const dy = newPos.y - this.state.lastPos.y;

    const newX = this.viewport.position.x + dx;
    const newY = this.viewport.position.y + dy;

    if (this.getConstrainedPosition) {
      const constrained = this.getConstrainedPosition(
        newX,
        newY,
        this.viewport.scale.x,
      );
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
      y: (y - this.viewport.y) / this.viewport.scale.y,
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
        const centerX =
          this.state.initialBounds.x + this.state.initialBounds.width / 2;
        const centerY =
          this.state.initialBounds.y + this.state.initialBounds.height / 2;

        const targetX = screenWidth / 2 - centerX * newScale;
        const targetY = screenHeight / 2 - centerY * newScale;

        this.viewport.position.set(targetX, targetY);
      } else if (this.state.initialPosition) {
        this.viewport.position.set(
          this.state.initialPosition.x,
          this.state.initialPosition.y,
        );
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
      y: (points[0].y + points[1].y) / 2,
    };
  }

  /**
   * Cleanup
   */
  reset() {
    this.tap = null;
    this.activePointers.clear();
    if (this.state) {
      this.state.lastDist = null;
      this.state.lastCenter = null;
    }
  }

  destroy() {
    this.reset();
    if (this.app?.stage) {
      for (const [event, handler] of Object.entries(this._handlers || {}))
        this.app.stage.off(event, handler);
    }
    if (this.domContainer) {
      this.domContainer.removeEventListener("pointercancel", this._cancelPointer);
      this.domContainer.removeEventListener("wheel", this.wheelHandler);
    }
    this.app = null;
    this.viewport = null;
    this.state = null;
  }
}
