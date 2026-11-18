const svgElement = (name, attributes = {}) => {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
};
const color = value => typeof value === 'number' ? `#${value.toString(16).padStart(6, '0')}` : value;

/** Lightweight section overview; only the viewport rectangle changes during navigation. */
export class MiniMap {
  constructor(renderer) {
    this.r = renderer;
    this.root = document.createElement('div');
    this.root.className = 'seatmap-minimap';
    this.root.hidden = true;
    this.svg = svgElement('svg', {
      tabindex: '0', role: 'group', 'aria-label': renderer.strings.minimap,
    });
    this.svg.append(svgElement('title'));
    this.svg.firstChild.textContent = renderer.strings.minimap;
    this.scene = svgElement('g', { 'aria-hidden': 'true' });
    this.frame = svgElement('rect', { class: 'seatmap-minimap-viewport', 'aria-hidden': 'true' });
    this.svg.append(this.scene, this.frame);
    this.root.append(this.svg);
    renderer.container.append(this.root);
    this.svg.addEventListener('pointerdown', event => {
      if (event.button !== 0 || this.pointer !== undefined) return;
      event.preventDefault();
      this.svg.focus({ preventScroll: true });
      this.pointer = event.pointerId;
      this.press = { x: event.clientX, y: event.clientY, time: event.timeStamp };
      this.moved = false;
      this.svg.setPointerCapture(event.pointerId);
      const point = this.point(event);
      const center = this.center();
      this.offset = event.target === this.frame
        ? { x: center.x - point.x, y: center.y - point.y } : { x: 0, y: 0 };
      this.navigate(point.x + this.offset.x, point.y + this.offset.y);
    });
    this.svg.addEventListener('pointermove', event => {
      if (event.pointerId !== this.pointer) return;
      if (Math.hypot(event.clientX - this.press.x, event.clientY - this.press.y) > 8) this.moved = true;
      const point = this.point(event);
      this.navigate(point.x + this.offset.x, point.y + this.offset.y);
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'])
      this.svg.addEventListener(name, event => {
        if (event.pointerId !== this.pointer) return;
        const tap = name === 'pointerup' && !this.moved &&
          event.timeStamp - this.press.time < 350 &&
          Math.hypot(event.clientX - this.press.x, event.clientY - this.press.y) <= 8;
        const previous = this.lastTap;
        const doubleTap = tap && previous && previous.type === event.pointerType &&
          event.timeStamp - previous.time < 500 &&
          Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <= 20;
        this.lastTap = tap && !doubleTap
          ? { x: event.clientX, y: event.clientY, time: event.timeStamp, type: event.pointerType }
          : null;
        this.pointer = undefined;
        if (this.svg.hasPointerCapture(event.pointerId)) this.svg.releasePointerCapture(event.pointerId);
        if (doubleTap) renderer.fitToView();
      });
    this.svg.addEventListener('keydown', event => {
      this.lastTap = null;
      const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (event.key === 'Home') {
        event.preventDefault();
        renderer.fitToView();
      } else if (directions[event.key]) {
        event.preventDefault();
        const [x, y] = directions[event.key], center = this.center();
        this.navigate(center.x + x * renderer.app.screen.width / renderer.viewport.scale.x / 5,
          center.y + y * renderer.app.screen.height / renderer.viewport.scale.y / 5);
      }
    });
  }
  center() {
    const { viewport, app } = this.r;
    return { x: (app.screen.width / 2 - viewport.x) / viewport.scale.x,
      y: (app.screen.height / 2 - viewport.y) / viewport.scale.y };
  }
  point(event) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(this.svg.getScreenCTM().inverse());
  }
  navigate(x, y) {
    const r = this.r;
    r._navigated = true;
    r.viewportManager.cancelAnimation();
    r.ui.hideTooltip();
    const position = r.viewportManager.getConstrainedPosition(
      r.app.screen.width / 2 - x * r.viewport.scale.x,
      r.app.screen.height / 2 - y * r.viewport.scale.y, r.viewport.scale.x);
    r.viewport.position.set(position.x, position.y);
    r._semanticZoom();
  }
  rebuild() {
    this.lastTap = null;
    this.scene.replaceChildren();
    const r = this.r;
    if (!r._ready) { this.root.hidden = true; return; }
    const underlay = r.viewport.children.find(child => child.isUnderlay);
    if (underlay) {
      const bounds = underlay.getLocalBounds();
      this.scene.append(svgElement('image', {
        href: r._map.underlay.sourceUrl || r._map.underlay.dataUrl,
        x: underlay.x + bounds.x * underlay.scale.x,
        y: underlay.y + bounds.y * underlay.scale.y,
        width: bounds.width * underlay.scale.x, height: bounds.height * underlay.scale.y,
        opacity: underlay.alpha,
      }));
    }
    for (const view of r._sections.values()) {
      const s = view.sectionData;
      if (s.isZone && s.showZone === false) continue;
      const shape = s.points?.length
        ? svgElement('polygon', { points: s.points.join(' ') })
        : svgElement('rect', { width: s.width, height: s.height });
      shape.setAttribute('transform', `translate(${view.x} ${view.y}) rotate(${view.angle}) translate(${-view.pivot.x} ${-view.pivot.y})`);
      shape.setAttribute('fill', color(s.isZone || s.type === 'ga'
        ? (s.sectionColor ?? s.style?.sectionColor ?? 0xcccccc)
        : (s.style?.seatColor ?? s.style?.sectionColor ?? 0xcccccc)));
      shape.setAttribute('fill-opacity', s.isZone ? (s.fillOpacity ?? 0.5) : 0.75);
      this.scene.append(shape);
    }
    this.update();
  }
  update() {
    const r = this.r, b = r.state.initialBounds;
    this.root.hidden = !r._ready || !b || b.width <= 0 || b.height <= 0;
    if (this.root.hidden) return;
    // Allow a pixel of rounding error at the edges of a fully visible map.
    const { viewport, app } = r;
    this.root.hidden = b.x * viewport.scale.x + viewport.x >= -1 &&
      b.y * viewport.scale.y + viewport.y >= -1 &&
      (b.x + b.width) * viewport.scale.x + viewport.x <= app.screen.width + 1 &&
      (b.y + b.height) * viewport.scale.y + viewport.y <= app.screen.height + 1;
    this.svg.setAttribute('viewBox', `${b.x} ${b.y} ${b.width} ${b.height}`);
    const x = Math.max(b.x, -r.viewport.x / r.viewport.scale.x);
    const y = Math.max(b.y, -r.viewport.y / r.viewport.scale.y);
    const right = Math.min(b.x + b.width, (r.app.screen.width - r.viewport.x) / r.viewport.scale.x);
    const bottom = Math.min(b.y + b.height, (r.app.screen.height - r.viewport.y) / r.viewport.scale.y);
    for (const [key, value] of Object.entries({ x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) }))
      this.frame.setAttribute(key, value);
  }
  destroy() { this.root.remove(); }
}
