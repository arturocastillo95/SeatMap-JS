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
- ✅ **Cart Integration**: Emits `cartChange` events with selected items
- ✅ **Inventory Loading**: Supports external pricing and availability data
- ✅ **Section Zoom**: Click to zoom into specific sections
- ✅ **Semantic Zoom**: Zones fade out and seats fade in based on zoom level
- ✅ **Touch Support**: Native pinch-to-zoom and pan gestures
- ✅ **Zone Rendering**: Optimized polygon rendering for Zones
- ✅ **Comprehensive event system** (selected/deselected/limit-reached/orphan-blocked)
- ✅ **Orphan Seat Prevention**: Prevents leaving single-seat gaps when selecting
- ✅ **Fully configurable via constructor options**

### Future Features (Phase 3+)
- 🔄 Seat status updates (sold, reserved, available) visual styles
- 🔄 Accessibility features (Keyboard navigation)

## Usage

### Basic Implementation

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pixi.js/8.13.2/pixi.min.js"></script>
</head>
<body>
    <div id="map-container" style="width: 100%; height: 600px;"></div>
    
    <script type="module">
        import { SeatMapRenderer } from './SeatMapRenderer.js';
        
        const container = document.getElementById('map-container');
        
        // Use factory method for safe async initialization
        const renderer = await SeatMapRenderer.create(container);
        
        // Load map data
        fetch('venue-map.json')
            .then(res => res.json())
            .then(data => renderer.loadData(data));
    </script>
</body>
</html>
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
// Listen for cart changes
container.addEventListener('cartChange', (e) => {
    console.log('Cart updated:', e.detail);
});

// Load inventory data (optional)
renderer.loadInventory({
    seats: [
        { key: "Section 1;;A;;1", price: 150, status: "available" }
    ]
});
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
The renderer is built with separation of concerns:
- `SeatMapRenderer.js` - Main rendering engine (Canvas/PixiJS logic)
- `TooltipManager.js` - Tooltip management (DOM manipulation)

### Modern Patterns
- **Factory Pattern**: Safe async initialization via `create()` method
- **State Management**: Centralized state object for better organization
- **Resource Management**: Comprehensive cleanup via `destroy()` method
- **Separation of Concerns**: DOM and Canvas logic separated

### Lightweight
- No editing tools or UI controls
- No collision detection
- No transformation/repositioning logic
- Minimal dependencies (only PixiJS)

### Code Quality
- Full JSDoc documentation
- Memory leak prevention
- Robust data validation
- Modern JavaScript (ES6+, optional chaining, nullish coalescing)

### Future-Ready
The architecture is designed to support:
- Bidirectional communication with host page
- External seat status updates
- Custom event handlers
- Plugin system for extensions

## Development

### Testing Locally

1. Start a local server:
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx http-server
```

2. Open `http://localhost:8000/renderer/` in your browser

3. Use browser console to load a map:
```javascript
fetch('../path/to/venue-map.json')
    .then(res => res.json())
    .then(data => window.seatMapRenderer.loadData(data));
```

### Integration with Backend

The renderer can be integrated with any backend system:

```javascript
// Initialize renderer
const renderer = await SeatMapRenderer.create(container);

// Fetch map from API
const response = await fetch('/api/venues/123/map');
const mapData = await response.json();
await renderer.loadData(mapData);

// Listen for seat interactions
container.addEventListener('seat-click', async (event) => {
    const { seat, sectionId } = event.detail;
    
    // Send selection to backend
    await fetch('/api/seats/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sectionId,
            rowIndex: seat.rowIndex,
            colIndex: seat.colIndex
        })
    });
});
```

## Browser Support

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

### Zoom Limits
The renderer prevents zooming out beyond the initial fitted view to maintain a consistent starting point. Users can zoom in to see details but cannot zoom out to see more than the intended content area.

## Performance

The renderer is optimized for large venues:
- Efficiently renders 10,000+ seats
- GPU-accelerated rendering via PixiJS
- Minimal memory footprint
- Smooth pan and zoom

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

### Phase 3 (Planned)
- Pricing display
- Section filtering/highlighting
- Mobile touch gestures
- Accessibility improvements
- Zoom presets
- Mini-map navigator

### Phase 4 (Future)
- Real-time updates via WebSocket
- 3D venue visualization
- VR/AR support
- Analytics integration
