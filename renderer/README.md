# SeatMap Renderer

A lightweight, embeddable renderer for SeatMap JS files (SMF format).

## Overview

The SeatMap Renderer is designed to display venue maps created by the SeatMap Editor without any of the editing functionality. It's optimized for embedding in web pages and can be extended for seat selection and interaction with external systems.

## Demo

### Booking Demo

A complete, production-ready ticket booking interface is available in two versions:

| File | Type | Description |
|------|------|-------------|
| `demo-booking.html` | ES Modules | Uses direct ES module imports (requires bundler/dev server) |
| `demo-booking-bundled.html` | UMD Build | Uses pre-built UMD bundle + CDN PixiJS (simpler deployment) |

Both demos demonstrate:

- **Responsive layout** - Desktop sidebar + mobile bottom sheet drawer
- **Section list** with colors, pricing, and sorting
- **Interactive map** with zoom-to-section
- **Selection management** with individual ticket removal
- **Purchase flow** UI with totals

See [BOOKING_DEMO.md](./BOOKING_DEMO.md) for full documentation.

```bash
npm run dev
# Open http://localhost:5173/demo-booking.html
```

For the bundled version (no dev server required after build):
```bash
npm run build
# Open demo-booking-bundled.html directly or via any HTTP server
```

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
- ✅ **Progressive Loading**: Optimized map loading for instant visual feedback
  - Zones/GA sections render first (instant visibility)
  - Seated sections render progressively in background
  - Chunked seat rendering prevents UI blocking
  - Deferred seat label creation (labels created on hover)
  - Loading progress events for UI integration
- ✅ **Responsive Viewport**: Automatically adapts to container size changes
  - ResizeObserver for container-based responsiveness
  - Debounced resize handling for performance
  - Maintains relative zoom level when resized while zoomed in
  - Re-fits content when resized at overview level

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
- `dist/seatmap-renderer.es.js` - ES Module (~107KB, ~26KB gzipped)
- `dist/seatmap-renderer.umd.js` - UMD for browsers (~71KB, ~19KB gzipped)
- `dist/renderer.css` - Tooltip styles (~1.25KB, ~0.6KB gzipped)

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
    <!-- Tooltip styles (required for tooltips) -->
    <link rel="stylesheet" href="dist/renderer.css" />
    <!-- PIXI.js peer dependency -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pixi.js/8.13.2/pixi.min.js"></script>
    <script src="dist/seatmap-renderer.umd.js"></script>
</head>
<body>
    <div id="map-container" style="width: 100%; height: 600px;"></div>
    
    <!-- Tooltip HTML (required for tooltips) -->
    <div id="seat-tooltip" class="seat-tooltip">
        <div class="tooltip-header">
            <div class="tooltip-col">
                <span class="tooltip-label">SECTION</span>
                <span class="tooltip-value" id="tt-section">--</span>
            </div>
            <div class="tooltip-col border-left">
                <span class="tooltip-label">ROW</span>
                <span class="tooltip-value" id="tt-row">--</span>
            </div>
            <div class="tooltip-col border-left">
                <span class="tooltip-label">SEAT</span>
                <span class="tooltip-value" id="tt-seat">--</span>
            </div>
        </div>
        <div class="tooltip-footer" id="tt-footer">
            <span id="tt-category">STANDARD</span>
            <span>
                <span class="tooltip-original-price" id="tt-original-price"></span>
                <span id="tt-price">$0</span>
            </span>
        </div>
        <div class="tooltip-promo" id="tt-promo">
            <span id="tt-promo-text">PROMO</span>
        </div>
    </div>
    
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
// CSS is automatically imported when using the ES module
import { SeatMapRenderer } from '@seatmap-js/renderer';

const container = document.getElementById('map-container');
const renderer = await SeatMapRenderer.create(container);

// Load map data
const response = await fetch('venue-map.json');
const data = await response.json();
await renderer.loadData(data);
```

> **Note:** The ES module automatically imports the tooltip CSS. Make sure your bundler (Vite, Webpack, etc.) is configured to handle CSS imports. You still need to add the tooltip HTML structure to your page - see the React example below or the UMD example above.

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

### Promotions API

Display discounts, promotions, or special offers on sections. Promos appear in the tooltip with a customizable banner. Supports percentage discounts, fixed prices, and quantity-based promos (2x1, 3x1).

```javascript
// Percentage discount (20% off)
renderer.setSectionPromo('VIP 1', {
    id: 'summer-sale',           // Unique ID for tracking
    text: '20% OFF',             // Banner text
    discount: 0.20,              // 20% discount (decimal)
    color: '#16a34a'             // Green banner
});

// Fixed discounted price
renderer.setSectionPromo('VIP 2', {
    id: 'early-bird',
    text: 'EARLY BIRD',
    discountedPrice: 500         // Fixed price regardless of base price
});

// 2x1 promo (buy 2, get 1 free)
renderer.setSectionPromo('ORO 1', {
    id: '2x1-holiday',
    text: '2x1',
    color: '#7c3aed',            // Purple banner
    buyX: 2,                     // Buy this many
    getY: 1                      // Get this many free
});

// 3x1 promo (buy 3, get 1 free)
renderer.setSectionPromo('ORO 2', {
    id: '3x1-special',
    text: '3x1',
    buyX: 3,
    getY: 1
});

// Set promos for multiple sections at once (object format)
renderer.setSectionPromos({
    'VIP 1': { id: 'promo-vip', text: '25% OFF', discount: 0.25 },
    'VIP 2': { id: 'promo-2x1', text: '2x1', buyX: 2, getY: 1 },
    'GA Floor': { id: 'early-bird', text: 'EARLY BIRD', discountedPrice: 500 }
});

// Set promos using array format (sectionId in each promo object)
renderer.setSectionPromos([
    { sectionId: 'VIP 1', id: 'promo-vip', text: '25% OFF', discount: 0.25 },
    { sectionId: 'VIP 2', id: 'promo-2x1', text: '2x1', buyX: 2, getY: 1 },
    { sectionId: 'GA Floor', id: 'early-bird', text: 'EARLY BIRD', discountedPrice: 500 }
]);

// Clear a single section's promo
renderer.clearSectionPromo('section-id');

// Clear all promos
renderer.clearAllPromos();

// Get promo for a section (returns undefined if none)
const promo = renderer.getSectionPromo('section-id');
```

**Promo Object Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `sectionId` | string | Section ID (required when using array format) |
| `id` | string | Unique promo identifier for tracking (returned in cart data) |
| `text` | string | Text shown in the promo banner |
| `color` | string | Banner background color (default: `#dc2626` red) |
| `textColor` | string | Banner text color (default: `#ffffff` white) |
| `discount` | number | Percentage discount as decimal (0.20 = 20% off) |
| `discountedPrice` | number | Fixed discounted price (alternative to `discount`) |
| `buyX` | number | Buy X items (for quantity-based promos) |
| `getY` | number | Get Y items free (used with `buyX`) |

**Promo Types:**

1. **Percentage Discount** (`discount`): Each item is discounted by the percentage. Tooltip shows original price struck through.

2. **Fixed Price** (`discountedPrice`): Each item costs the fixed price. Tooltip shows original price struck through.

3. **Quantity-Based** (`buyX` + `getY`): Buy X items, get Y free. Examples:
   - `buyX: 2, getY: 1` → 2x1 (buy 2 get 1 free, pay for 2 of every 3)
   - `buyX: 3, getY: 1` → 3x1 (buy 3 get 1 free, pay for 3 of every 4)
   - `buyX: 1, getY: 1` → Buy one get one free (pay for 1 of every 2)

**Cart Data with Promos:**

When promos are active, the `cartChange` event includes promo details:

```javascript
container.addEventListener('cartChange', (e) => {
    const cart = e.detail;
    
    // Individual seats include promo info
    cart.seats.forEach(seat => {
        console.log(seat.price);           // Discounted price (or base for quantity promos)
        console.log(seat.originalPrice);   // Original price (null for quantity promos)
        console.log(seat.promoId);         // Your promo ID
        console.log(seat.isQuantityPromo); // true for 2x1, 3x1, etc.
    });
    
    // Section summaries show quantity-based calculations
    console.log(cart.sectionSummaries);
    // {
    //   'VIP 1': {
    //     quantity: 6,
    //     paidItems: 4,      // Only pay for 4 with 2x1
    //     freeItems: 2,      // 2 free items
    //     totalPrice: 4000,  // 4 × $1000
    //     originalTotal: 6000,
    //     promoId: '2x1-holiday'
    //   }
    // }
    
    // Grand totals
    console.log(cart.grandTotal);        // Total after all discounts
    console.log(cart.grandOriginalTotal); // Total before discounts
    console.log(cart.totalSavings);       // Amount saved
});
```

### Configuration Options

```javascript
const renderer = await SeatMapRenderer.create(container, {
    // Visual Options
    backgroundColor: 0x0f0f13,
    seatRadius: 8,
    bookedColor: 0x555555,
    
    // Grid Background (visual enhancement behind the map)
    showGrid: true,               // Show/hide grid background
    gridColor: 0x333333,          // Grid line color
    gridSize: 50,                 // Grid cell size in pixels
    gridLineWidth: 1,             // Grid line thickness
    
    // Interaction Options
    maxSelectedSeats: 5,
    preventOrphanSeats: true,  // Prevent single-seat gaps
    enableSectionZoom: true,
    
    // Orphan Seat Highlight Animation
    orphanHighlightEnabled: true,       // Enable visual feedback when orphan blocked
    orphanHighlightColor: 0xff6b6b,     // Warning highlight color (coral red)
    orphanHighlightDuration: 1500,      // Animation duration in ms
    orphanHighlightPulseScale: 1.3,     // Scale factor for pulse effect
    
    // Mobile/Touch Options
    tapZoomBoost: 1.3,              // Zoom multiplier for single tap
    doubleTapZoomBoost: 2.0,        // Zoom multiplier for double tap
    mobileRequireZoomForSelection: true,  // Require zoom before selection on mobile
    mobileMinZoomForSelection: 1.5,       // Min zoom ratio for selection
    mobileSeatHitareaScale: 2.0,          // Larger tap targets on mobile
    
    // Progressive Loading Options
    seatChunkSize: 200,             // Seats rendered per animation frame
    deferSeatLabels: true,          // Create seat labels on hover (not upfront)
    
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

#### `setGridVisible(show)`
Show or hide the background grid at runtime.

```javascript
renderer.setGridVisible(true);  // Show grid
renderer.setGridVisible(false); // Hide grid
```

#### `setGridColor(color)`
Change the grid color at runtime.

```javascript
renderer.setGridColor(0x444444); // Change to darker gray
```

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
Fired when a selection/deselection is blocked because it would leave a single seat isolated. Orphan seats automatically receive a visual highlight animation (configurable via `orphanHighlightEnabled`).

```javascript
container.addEventListener('orphan-seat-blocked', (event) => {
    const { action, seat, sectionId, orphanSeats, orphanSeatContainers, message, orphanCount } = event.detail;
    console.log(message); // e.g., "Cannot select this seat: it would leave a single seat isolated (Row A, Seat 5)"
    // orphanSeatContainers: PIXI containers for orphan seats (for custom animations)
    // Note: Default highlight animation runs automatically unless orphanHighlightEnabled: false
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

#### `mapZonesLoaded`
Fired when zones/GA sections are rendered (Phase 1 of progressive loading).

```javascript
container.addEventListener('mapZonesLoaded', (event) => {
    console.log(`Zones loaded: ${event.detail.zoneCount} zones`);
    // Map is now visible with zones, seats loading in background
});
```

#### `seatLoadProgress`
Fired during progressive seat loading with progress updates.

```javascript
container.addEventListener('seatLoadProgress', (event) => {
    const { loaded, total, percent } = event.detail;
    console.log(`Loading seats: ${percent}%`);
});
```

#### `mapFullyLoaded`
Fired when all sections (including all seats) are fully rendered.

```javascript
container.addEventListener('mapFullyLoaded', (event) => {
    console.log(`Map fully loaded: ${event.detail.totalSections} sections`);
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
