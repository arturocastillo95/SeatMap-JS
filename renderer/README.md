# SeatMap Renderer

A lightweight, embeddable renderer for SeatMap JS files (SMF format).

## Overview

The SeatMap Renderer is designed to display venue maps created by the SeatMap Editor without any of the editing functionality. It's optimized for embedding in web pages and can be extended for seat selection and interaction with external systems.

## Features

### Current Implementation (Phase 1 & 2)
- ✅ Load and parse SMF v2.0.0 format files
- ✅ Render sections (regular and General Admission)
- ✅ Display seats with correct positions and transformations
- ✅ Show row labels (letters/numbers)
- ✅ Display underlay images (backgrounds/blueprints)
- ✅ Special needs seat visualization (wheelchair accessible) - Always visible with high-contrast icon
- ✅ Section colors and styling
- ✅ Glow effects on seats
- ✅ Pan and zoom viewport controls
- ✅ **Seat selection with configurable limits**
- ✅ Auto-fit to viewport (100% height, centered)
- ✅ Intelligent zoom limits (can zoom in, prevents zoom out beyond initial view)
- ✅ **Smart Tooltips**: Shows pricing, location, and category with auto-positioning
- ✅ **Cart Integration**: Emits `cartChange` events with selected items (seats + GA)
- ✅ **Inventory Loading**: Supports external pricing and availability data
- ✅ **Section Zoom**: Click to zoom into specific sections
- ✅ **Semantic Zoom**: Zones fade out and seats fade in based on zoom level
- ✅ **Touch Support**: Native pinch-to-zoom and pan gestures
- ✅ **Zone Rendering**: Optimized polygon rendering for Zones
- ✅ **Comprehensive event system** (selected/deselected/limit-reached/orphan-blocked)
- ✅ **Orphan Seat Prevention**: Prevents leaving single-seat gaps when selecting
- ✅ **Fully configurable via constructor options**
- ✅ **Modular Architecture**: Clean separation of concerns with focused single-responsibility modules
- ✅ **Vite Build System**: ES and UMD bundles for flexible deployment
- ✅ **GA Quantity Selection**: Click GA sections to select ticket quantities with dialog UI
- ✅ **Unified Cart**: Combined seat + GA ticket selection with shared max limit
- ✅ **Mobile-Optimized Touch UX**: Enhanced touch interactions for mobile devices
  - Tap-to-zoom centers on tap point (not zone center)
  - Double-tap for deeper zoom
  - Gesture detection prevents accidental taps during pinch/pan
  - Larger seat hit areas for easier selection
  - Zoom requirement before seat selection to prevent accidental picks

### Future Features (Phase 3+)
- 🔄 Seat status updates (sold, reserved, available) visual styles
- 🔄 Accessibility features (Keyboard navigation)

## Installation

### NPM (Recommended)

```bash
cd renderer
npm install
```

### Build for Production

```bash
npm run build
```

This generates:
- `dist/seatmap-renderer.es.js` - ES Module (~53KB, ~14KB gzipped)
- `dist/seatmap-renderer.umd.js` - UMD for browsers (~35KB, ~11KB gzipped)

### Development Server

```bash
npm run dev
```

Opens `http://localhost:5173/dev.html` with hot module replacement.

## Usage

### Using the UMD Build (Browser)

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pixi.js/8.13.2/pixi.min.js"></script>
    <script src="dist/seatmap-renderer.umd.js"></script>
</head>
<body>
    <div id="map-container" style="width: 100%; height: 600px;"></div>
    
    <script>
        (async () => {
            const container = document.getElementById('map-container');
            const renderer = await SeatMapRenderer.SeatMapRenderer.create(container);
            
            // Load map data
            fetch('demo-venue.json')
                .then(res => res.json())
                .then(data => renderer.loadData(data));
        })();
    </script>
</body>
</html>
```

### Using ES Modules (with bundler)

```javascript
import { SeatMapRenderer } from '@seatmap-js/renderer';

const container = document.getElementById('map-container');
const renderer = await SeatMapRenderer.create(container);

// Load map data
const response = await fetch('venue-map.json');
const data = await response.json();
await renderer.loadData(data);
```

### Development Import (Direct)

```html
<script type="module">
    import { SeatMapRenderer } from './SeatMapRenderer.js';
    
    const container = document.getElementById('map-container');
    const renderer = await SeatMapRenderer.create(container);
    
    fetch('demo-venue.json')
        .then(res => res.json())
        .then(data => renderer.loadData(data));
</script>
```

### With Seat Selection

```javascript
// Listen for seat selection events
container.addEventListener('seat-selected', (event) => {
    const { seat, sectionId } = event.detail;
    console.log(`Selected seat in ${sectionId}:`, seat);
});

container.addEventListener('seat-deselected', (event) => {
    const { seat, sectionId } = event.detail;
    console.log(`Deselected seat in ${sectionId}:`, seat);
});

// Listen for limit reached
container.addEventListener('selection-limit-reached', (event) => {
    alert(`You can only select ${event.detail.limit} seats.`);
});

// Listen for orphan seat prevention
container.addEventListener('orphan-seat-blocked', (event) => {
    console.log(event.detail.message); // Human-readable explanation
    console.log('Would orphan:', event.detail.orphanSeats);
});
```

### With Cart Integration

```javascript
// Listen for cart changes (includes both seats and GA tickets)
container.addEventListener('cartChange', (e) => {
    const { seats, ga, seatCount, gaCount, totalCount } = e.detail;
    console.log(`Selected: ${seatCount} seats + ${gaCount} GA tickets = ${totalCount} total`);
    console.log('Seats:', seats);
    console.log('GA:', ga);
});

// Listen for GA selection confirmations
container.addEventListener('gaSelectionConfirm', (e) => {
    console.log('GA selection confirmed:', e.detail);
});

// Load inventory data (optional)
renderer.loadInventory({
    seats: [
        { key: "Section 1;;A;;1", price: 150, status: "available" }
    ],
    ga: [
        { sectionId: "GA Section", available: 100, status: "available" }
    ]
});
```

### GA Selection API

```javascript
// Get current GA selections
const gaSelections = renderer.getGASelections();
// Returns: [{ sectionId, sectionName, quantity, pricePerItem, totalPrice }]

// Clear all GA selections
renderer.clearGASelections();
```

### Configuration Options

```javascript
const renderer = await SeatMapRenderer.create(container, {
    // Visual Options
    backgroundColor: 0x0f0f13,
    seatRadius: 8,
    bookedColor: 0x555555,
    
    // Interaction Options
    maxSelectedSeats: 5,
    preventOrphanSeats: true,  // Prevent single-seat gaps
    enableSectionZoom: true,
    
    // Mobile/Touch Options
    tapZoomBoost: 1.3,              // Zoom multiplier for single tap
    doubleTapZoomBoost: 2.0,        // Zoom multiplier for double tap
    mobileRequireZoomForSelection: true,  // Require zoom before selection on mobile
    mobileMinZoomForSelection: 1.5,       // Min zoom ratio for selection
    mobileSeatHitareaScale: 2.0,          // Larger tap targets on mobile
    
    // Callbacks
    onSeatSelect: (data) => console.log('Selected', data),
    onSeatDeselect: (data) => console.log('Deselected', data)
});
```

### Renderer Configuration

All configuration values can be overridden via the `options` object passed to `create()`. The static `SeatMapRenderer.CONFIG` object serves as the default values:

```javascript
SeatMapRenderer.CONFIG = {
    // ... defaults ...
    MAX_SELECTED_SEATS: 10,     // Maximum number of seats that can be selected
    PREVENT_ORPHAN_SEATS: true  // Prevent leaving single-seat gaps
};
```

## Performance & Optimization

### High-Performance Rendering
The renderer uses a highly optimized rendering strategy:
- **Texture Caching**: Seat graphics are generated once and cached as textures.
- **Sprite Batching**: Seats are rendered as lightweight Sprites instead of heavy Graphics objects.
- **High-Resolution Textures**: Textures are generated at 4x resolution (`SEAT_TEXTURE_RESOLUTION`) to ensure crisp visuals even when zoomed in.

This approach significantly reduces draw calls and memory usage, enabling smooth 60fps performance even on mobile devices with 10,000+ seats.

### Stability & Error Handling
- **Graceful Initialization**: Initialization is wrapped in try-catch blocks to prevent silent failures.
- **State Management**: Internal state is rigorously reset between map loads to prevent "ghost" seats and memory leaks.
- **Race Condition Prevention**: Public methods are guarded to ensure the renderer is fully initialized before execution.
- **Ghost Touch Prevention**: Advanced pointer event handling prevents erratic behavior on touch devices.

## API Reference

### Factory Method

```javascript
await SeatMapRenderer.create(container, options)
```

**Parameters:**
- `container` (HTMLElement) - DOM element to render into
- `options` (Object) - Configuration options
  - `backgroundColor` (number) - Background color (hex)
  - `backgroundAlpha` (number) - Background opacity (0-1)
  - `antialias` (boolean) - Enable antialiasing
  - `resolution` (number) - Display resolution
  - `enableSectionZoom` (boolean) - Enable click-to-zoom on sections (default: false)
  - `enableZoneZoom` (boolean) - Enable click-to-zoom on zones (default: true)

**Returns:** `Promise<SeatMapRenderer>` - Fully initialized renderer instance

**Note**: Always use the factory method instead of directly calling `new SeatMapRenderer()` to ensure proper async initialization.

### Cleanup

```javascript
renderer.destroy()
```

**Important**: Always call `destroy()` when removing the renderer to prevent memory leaks.

### Methods

#### `loadData(data)`
Load and render a seat map from SMF JSON data.

```javascript
renderer.loadData(mapData);
```

**Parameters:**
- `data` (Object) - Parsed SMF JSON data

**Returns:** `Promise<void>`

#### `fitToView()`
Fit content to viewport with intelligent scaling and centering.

```javascript
renderer.fitToView();
```

**Behavior:**
- Fits to underlay image if present, otherwise fits to sections
- Centers content horizontally and vertically
- Scales to fit viewport height with padding
- Never zooms in beyond 1:1 ratio
- Sets minimum zoom limit to prevent zooming out further

#### `centerMap()`
Legacy method that calls `fitToView()`.

```javascript
renderer.centerMap(); // Same as fitToView()
```

### Events

#### `seat-selected`
Fired when a seat is selected.

```javascript
container.addEventListener('seat-selected', (event) => {
    const { seat, sectionId } = event.detail;
});
```

#### `seat-deselected`
Fired when a seat is deselected.

```javascript
container.addEventListener('seat-deselected', (event) => {
    const { seat, sectionId } = event.detail;
});
```

#### `selection-limit-reached`
Fired when the user tries to select more seats than allowed.

```javascript
container.addEventListener('selection-limit-reached', (event) => {
    console.log(`Limit reached: ${event.detail.limit}`);
});
```

#### `orphan-seat-blocked`
Fired when a selection/deselection is blocked because it would leave a single seat isolated.

```javascript
container.addEventListener('orphan-seat-blocked', (event) => {
    const { action, seat, sectionId, orphanSeats, message, orphanCount } = event.detail;
    console.log(message); // e.g., "Cannot select this seat: it would leave a single seat isolated (Row A, Seat 5)"
});
```

#### `gaSelectionConfirm`
Fired when a GA quantity selection is confirmed.

```javascript
container.addEventListener('gaSelectionConfirm', (event) => {
    const { sectionId, quantity, sectionData, allSelections } = event.detail;
    console.log(`Selected ${quantity} tickets for ${sectionId}`);
});
```

#### `ga-selection-change`
Fired whenever GA selections change (confirm or clear).

```javascript
container.addEventListener('ga-selection-change', (event) => {
    const { sectionId, quantity, allSelections } = event.detail;
    console.log('All GA selections:', allSelections);
});
```

## File Format Support

The renderer supports SMF (Seat Map Format) v2.0.0, which includes:

- Regular sections with individual seats
- General Admission (GA) sections
- Row labels (numbers/letters)
- Seat numbering
- Section transformations (rotation, curve, stretch)
- Special needs seats
- Underlay images
- Pricing data (stored but not displayed yet)
- Glow effects
- Custom colors per section/seat

See [FILE_FORMAT.md](../docs/FILE_FORMAT.md) for complete format specification.

## Architecture

### Modular Design

The renderer has been refactored from a ~2000-line monolith into focused, single-responsibility modules:

```
renderer/
├── SeatMapRenderer.js      # Main orchestrator (~500 lines)
├── index.js                # Barrel export
├── TooltipManager.js       # DOM tooltips
├── core/
│   ├── TextureCache.js     # Seat texture caching
│   └── ViewportManager.js  # Viewport transforms & animations
├── interaction/
│   ├── InputHandler.js     # Pan/zoom/touch input
│   ├── SelectionManager.js # Seat selection & orphan detection
│   ├── CartManager.js      # Cart state & events
│   └── GASelectionManager.js # GA quantity selection dialog
├── rendering/
│   ├── UnderlayRenderer.js # Background image rendering
│   ├── SectionRenderer.js  # Section containers & content
│   └── RowLabelRenderer.js # Row label generation
├── ui/
│   └── UIManager.js        # UI elements & zone visibility
└── inventory/
    └── InventoryManager.js # Inventory data & seat status
```

### Module Responsibilities

| Module | Responsibility |
|--------|----------------|
| `TextureCache` | Creates and caches seat textures for performance |
| `ViewportManager` | Viewport fitting, zoom animations, position constraints |
| `InputHandler` | Mouse wheel, pan, pinch-to-zoom gestures |
| `SelectionManager` | Seat selection logic, orphan seat prevention, combined limit tracking |
| `CartManager` | Cart state, price calculation, event dispatching (seats + GA) |
| `GASelectionManager` | GA ticket quantity dialog, inventory limits, selection state |
| `UnderlayRenderer` | Async background image loading and rendering |
| `SectionRenderer` | Section containers, backgrounds, GA/Zone content |
| `RowLabelRenderer` | Row label text generation and positioning |
| `UIManager` | Reset button, zone visibility based on zoom |
| `InventoryManager` | Inventory loading, seat status updates |

### Design Patterns

- **Dependency Injection**: Modules receive dependencies via constructor options
- **Factory Pattern**: Safe async initialization via `SeatMapRenderer.create()`
- **Single Responsibility**: Each module handles one concern
- **Explicit Cleanup**: All modules implement `destroy()` for memory management

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation.

## Development

### Quick Start

```bash
cd renderer
npm install
npm run dev
```

Opens `http://localhost:5173/dev.html` with hot module replacement.

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build production bundles (ES + UMD) |
| `npm run preview` | Preview production build locally |

### Testing Standalone HTML

For testing without Vite, use the UMD build:

```bash
npm run build
# Then open index.html in browser (requires a local server for CORS)
python -m http.server 8000
```

### Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Viewport Behavior

### Initial View
- **With underlay**: Fits to underlay image bounds, centered in viewport
- **Without underlay**: Fits to all sections, centered in viewport
- Always uses 100% viewport height (minus padding)
- Maintains aspect ratio
- Never zooms in beyond 1:1 scale

### Zoom Controls
- **Zoom In**: Mouse wheel up, unlimited up to `MAX_ZOOM` (5x)
- **Zoom Out**: Mouse wheel down, limited to initial fit scale
- **Pan**: Click and drag to move around
- **Reset**: Click "Center Map" button to return to initial view

## License

Same as SeatMap JS project.

## Roadmap

### Phase 1 (✅ Complete)
- Basic rendering of all section types
- SMF v2.0.0 format support
- Pan and zoom controls
- Seat click events

### Phase 2 (✅ Complete)
- Seat selection API
- Seat status visualization (available/sold/reserved)
- External data updates
- Hover tooltips
- Configurable selection limits
- **Modular architecture refactoring**
- **Vite build system**

### Phase 3 (Planned)
- Pricing display
- Section filtering/highlighting
- Accessibility improvements
- Zoom presets
- Mini-map navigator

### Phase 4 (Future)
- Real-time updates via WebSocket
- 3D venue visualization
- VR/AR support
- Analytics integration
