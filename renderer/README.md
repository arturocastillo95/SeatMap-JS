# SeatMap Renderer

A lightweight, embeddable renderer for SeatMap JS files (SMF format).

## Overview

The SeatMap Renderer is designed to display venue maps created by the SeatMap Editor without any of the editing functionality. It's optimized for embedding in web pages and can be extended for seat selection and interaction with external systems.

## Features

### Current Implementation (Phase 1)
- ✅ Load and parse SMF v2.0.0 format files
- ✅ Render sections (regular and General Admission)
- ✅ Display seats with correct positions and transformations
- ✅ Show row labels (letters/numbers)
- ✅ Display underlay images (backgrounds/blueprints)
- ✅ Special needs seat visualization (wheelchair accessible)
- ✅ Section colors and styling
- ✅ Glow effects on seats
- ✅ Pan and zoom viewport controls
- ✅ Seat click events

### Future Features (Phase 2+)
- 🔄 Seat selection (single and multi-select)
- 🔄 Seat status updates (sold, reserved, available)
- 🔄 External data communication API
- 🔄 Hover tooltips
- 🔄 Pricing display
- 🔄 Accessibility features
- 🔄 Mobile touch optimization

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
        const renderer = new SeatMapRenderer(container);
        
        // Load map data
        fetch('venue-map.json')
            .then(res => res.json())
            .then(data => renderer.loadData(data));
    </script>
</body>
</html>
```

### With Seat Selection (Coming Soon)

```javascript
// Listen for seat clicks
container.addEventListener('seat-click', (event) => {
    const { seat, sectionId } = event.detail;
    console.log(`Clicked seat in ${sectionId}:`, seat);
    
    // Send to your backend
    // fetch('/api/reserve-seat', { ... });
});
```

### Configuration Options

```javascript
const renderer = new SeatMapRenderer(container, {
    backgroundColor: 0x0f0f13,  // Dark background
    backgroundAlpha: 1,
    antialias: true,
    resolution: window.devicePixelRatio || 1
});
```

## API Reference

### Constructor

```javascript
new SeatMapRenderer(container, options)
```

**Parameters:**
- `container` (HTMLElement) - DOM element to render into
- `options` (Object) - Configuration options
  - `backgroundColor` (number) - Background color (hex)
  - `backgroundAlpha` (number) - Background opacity (0-1)
  - `antialias` (boolean) - Enable antialiasing
  - `resolution` (number) - Display resolution

### Methods

#### `loadData(data)`
Load and render a seat map from SMF JSON data.

```javascript
renderer.loadData(mapData);
```

**Parameters:**
- `data` (Object) - Parsed SMF JSON data

**Returns:** `Promise<void>`

#### `centerMap()`
Center and zoom to fit the entire map in the viewport.

```javascript
renderer.centerMap();
```

### Events

#### `seat-click`
Fired when a seat is clicked.

```javascript
container.addEventListener('seat-click', (event) => {
    const { seat, sectionId } = event.detail;
    // Handle seat click
});
```

**Event Detail:**
- `seat` (Object) - Seat data from SMF file
  - `rowIndex` (number)
  - `colIndex` (number)
  - `number` (string)
  - `specialNeeds` (boolean)
- `sectionId` (string) - ID of the section containing the seat

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
The renderer is built as a single ES6 module (`SeatMapRenderer.js`) that can be easily embedded in any web page.

### Lightweight
- No editing tools or UI controls
- No collision detection
- No transformation/repositioning logic
- Minimal dependencies (only PixiJS)

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
// Fetch map from API
const response = await fetch('/api/venues/123/map');
const mapData = await response.json();
renderer.loadData(mapData);

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

### Phase 2 (🔄 In Progress)
- Seat selection API
- Seat status visualization (available/sold/reserved)
- External data updates
- Hover tooltips

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
