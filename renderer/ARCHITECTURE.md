# SeatMap Renderer - Modular Architecture

## Overview

The SeatMapRenderer has been refactored from a ~2000 line monolithic class into a modular architecture following the Single Responsibility Principle (SRP). Each module handles a specific concern, making the codebase easier to understand, test, and maintain.

## Module Structure

```
renderer/
├── index.js                    # Barrel export for all modules
├── SeatMapRenderer.new.js      # Refactored main orchestrator (~500 lines)
├── SeatMapRenderer.js          # Original (preserved for reference)
├── TooltipManager.js           # Tooltip display management
├── core/
│   ├── TextureCache.js         # Seat texture creation & caching
│   └── ViewportManager.js      # Viewport transforms & animations
├── interaction/
│   ├── InputHandler.js         # Pan/zoom/touch input handling
│   ├── SelectionManager.js     # Seat selection & orphan detection
│   └── CartManager.js          # Cart state & events
├── rendering/
│   ├── UnderlayRenderer.js     # Underlay image rendering
│   ├── SectionRenderer.js      # Section containers & backgrounds
│   └── RowLabelRenderer.js     # Row label generation
├── ui/
│   └── UIManager.js            # Reset button, zone visibility
└── inventory/
    └── InventoryManager.js     # Inventory loading & status updates
```

## Module Responsibilities

### Core Modules

#### `TextureCache.js`
- Creates and caches seat textures by key
- Avoids recreating textures for same seat styles
- Handles texture cleanup on destroy

#### `ViewportManager.js`
- Viewport fitting and centering
- Zoom to section animations
- Position constraints to prevent over-panning
- Animation interpolation

### Interaction Modules

#### `InputHandler.js`
- Mouse/touch pan and drag
- Wheel zoom
- Pinch-to-zoom for touch devices
- Drag state management

#### `SelectionManager.js`
- Seat selection toggling
- Maximum selection limit enforcement
- Orphan seat prevention (configurable)
- Row-indexed seat lookup for adjacency detection

#### `CartManager.js`
- Tracks selected seats as cart items
- Dispatches cart-change events
- Calculates seat prices from pricing tiers

### Rendering Modules

#### `UnderlayRenderer.js`
- Loads and positions underlay images
- Handles image scaling and positioning

#### `SectionRenderer.js`
- Creates section containers with transforms
- Renders section backgrounds with rounded corners
- Renders GA (General Admission) content
- Renders Zone content with labels

#### `RowLabelRenderer.js`
- Generates row label text based on configuration
- Positions row labels (left, right, or both sides)
- Supports numeric, alphabetic, and custom labeling

### UI Modules

#### `UIManager.js`
- Creates reset/zoom-out button
- Updates button visibility based on zoom level
- Manages zone background fade on zoom

### Inventory Modules

#### `InventoryManager.js`
- Registers seats by key and ID
- Loads inventory data and applies to seats
- Updates seat visuals (color, status)
- Tracks unmatched inventory keys for debugging

## Architecture Patterns

### Dependency Injection
Modules receive their dependencies through constructor options rather than accessing global state:

```javascript
this.viewportManager = new ViewportManager({
    app: this.app,
    viewport: this.viewport,
    state: this.state,
    config: this.options,
    onUpdate: () => this.updateUIVisibility()
});
```

### Callback-Based Communication
Modules communicate with the main renderer via callbacks:

```javascript
this.inputHandler = new InputHandler({
    onZoomChange: () => this.updateUIVisibility(),
    getConstrainedPosition: (x, y, scale) => 
        this.viewportManager.getConstrainedPosition(x, y, scale)
});
```

### Explicit Cleanup
All modules implement a `destroy()` method for proper cleanup:

```javascript
destroy() {
    if (this.textureCache) this.textureCache.destroy();
    if (this.inputHandler) this.inputHandler.destroy();
    // ... cleanup all modules
}
```

## Migration Guide

### Using the New Modular Renderer

```html
<!-- Import from barrel export -->
<script type="module">
    import { SeatMapRenderer } from './index.js';
    
    const renderer = await SeatMapRenderer.create(container, options);
    await renderer.loadData(mapData);
</script>
```

### Backward Compatibility

The refactored `SeatMapRenderer` maintains the same public API:
- `SeatMapRenderer.create(container, options)` - Factory method
- `loadData(data)` - Load venue map JSON
- `loadInventory(inventoryData)` - Apply inventory status
- `fitToView()` / `centerMap()` - Reset viewport
- `zoomToSection(container)` - Zoom to specific section
- `selectedSeats` getter - Get currently selected seats
- Events: `seat-selected`, `seat-deselected`, `cart-change`, `orphan-seat-blocked`

### File Comparison

| Metric | Original | Modular |
|--------|----------|---------|
| Main class lines | ~2000 | ~500 |
| Total lines (all modules) | ~2000 | ~1400 |
| Number of files | 1 | 11 |
| Responsibilities per file | 10+ | 1-2 |

## Benefits

1. **Testability**: Each module can be unit tested in isolation
2. **Maintainability**: Changes to one feature don't affect unrelated code
3. **Readability**: Smaller, focused files are easier to understand
4. **Reusability**: Modules can potentially be reused in other contexts
5. **Debugging**: Issues are easier to locate in specific modules
6. **Collaboration**: Multiple developers can work on different modules

## Future Improvements

- Add unit tests for each module
- Consider TypeScript for better type safety
- Extract seat rendering to dedicated `SeatRenderer` module
- Add event emitter pattern for looser coupling

## Build System (Vite)

The renderer uses Vite for development and production builds.

### Development

```bash
cd renderer
npm install
npm run dev
```

Opens a dev server at `http://localhost:3000` with hot module replacement.

### Production Build

```bash
npm run build
```

Generates optimized bundles in `dist/`:
- `seatmap-renderer.es.js` - ES Module format (~53KB, ~14KB gzipped)
- `seatmap-renderer.umd.js` - UMD format for browser globals (~35KB, ~11KB gzipped)

### Usage

**ES Modules (recommended):**
```javascript
import { SeatMapRenderer } from '@seatmap-js/renderer';

const renderer = await SeatMapRenderer.create(container, options);
```

**UMD (browser global):**
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/pixi.js/8.6.6/pixi.min.js"></script>
<script src="path/to/seatmap-renderer.umd.js"></script>
<script>
    const { SeatMapRenderer } = window.SeatMapRenderer;
    const renderer = await SeatMapRenderer.create(container, options);
</script>
```

### Peer Dependencies

PIXI.js v8+ is a peer dependency and must be provided by the consuming application.

### Files

| File | Purpose |
|------|---------|
| `package.json` | NPM configuration |
| `vite.config.js` | Vite build configuration |
| `index.js` | Barrel export (entry point) |
| `index.html` | Development demo page |
| `demo-bundled.html` | UMD bundle demo page |
