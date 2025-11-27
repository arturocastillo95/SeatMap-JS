# Booking Demo

A complete, production-ready ticket booking interface built with plain HTML, CSS, and vanilla JavaScript that demonstrates the SeatMapRenderer's capabilities.

## Overview

The booking demo (`demo-booking.html`) showcases how to build a real-world ticket purchasing experience using the SeatMapRenderer. It's designed as a reference implementation for developers integrating the renderer into their own booking systems.

![Booking Demo Screenshot](./screenshots/booking-demo.png)

## Features

### Responsive Design
- **Desktop**: Split-panel layout with sidebar (380px) and full-width map
- **Mobile**: Bottom sheet drawer pattern with collapsible/expandable states
- **Dynamic viewport height**: Uses CSS `dvh` units and JavaScript `--real-vh` variable to handle mobile browser chrome

### Section List
- Displays all venue sections with:
  - Section color indicator (matches map seat colors)
  - Section name
  - Price with "+ cargos" (service fees) indicator
  - Selection badge when seats are selected
- **Sorting**: Toggle between highest/lowest price first
- Click to zoom to section on the map

### Interactive Map
- Full SeatMapRenderer integration
- Click sections to zoom in
- Select individual seats or GA quantities
- Custom map controls (center button)
- Auto-hide notice banner after 2 seconds

### Selection View
- Automatically appears when seats are selected
- Shows all selected tickets with:
  - Color dot matching seat/section color
  - Section name
  - Row and seat number (or "Admisión General" for GA)
  - Individual price
- Delete button to remove individual selections
- Back button to return to section list

### Purchase Footer
- Fixed footer showing:
  - Total price
  - "Revisa tu compra" link (review your purchase)
  - Purchase button with ticket count
- Smooth slide-up animation when selections exist
- Mobile: Drawer raises above footer to remain accessible

### Mobile Drawer
- **Collapsed state**: Shows event info and selection count badge
- **Expanded state**: Full section list or selection view
- Drag handle for easy access
- 24px overlap with map for seamless visual transition

## File Structure

```
renderer/
├── demo-booking.html      # Complete booking demo (standalone)
├── demo-venue.json        # Sample venue data
├── SeatMapRenderer.js     # Main renderer
└── ...
```

## Usage

### Running the Demo

```bash
cd renderer
npm run dev
# Open http://localhost:5173/demo-booking.html
```

Or serve statically after building:

```bash
npm run build
python -m http.server 8000
# Open http://localhost:8000/demo-booking.html
```

### Integration Guide

The demo shows several key integration patterns:

#### 1. Renderer Initialization

```javascript
const renderer = await SeatMapRenderer.create(container, {
    maxSelectedSeats: 10,
    enableZoneZoom: true,
    enableSectionZoom: true,
    showControls: false  // Hide default controls (we have custom ones)
});

const response = await fetch('./demo-venue.json');
const venueData = await response.json();
await renderer.loadData(venueData);
```

#### 2. Getting Section Data

```javascript
// Get all sections with their colors and pricing
const sections = renderer.getSections({ 
    includeZones: false, 
    includeGA: true 
});

// Each section includes:
// - id, name, type ('seated' or 'ga')
// - pricing: { basePrice, serviceFee, ... }
// - color: '#hex' (seat color for seated, section color for GA)
// - capacity: number of seats or GA capacity
```

#### 3. Listening for Cart Changes

```javascript
container.addEventListener('cartChange', (e) => {
    const { seats, ga, totalCount } = e.detail;
    
    // seats: Array of { id, sectionId, sectionName, row, seat, price, color }
    // ga: Array of { sectionId, sectionName, quantity, pricePerTicket, color }
    
    updateUI(e.detail);
});
```

#### 4. Programmatic Seat Management

```javascript
// Zoom to a specific section
renderer.zoomToSectionById('VIP 1', 1.0);

// Deselect a specific seat
renderer.deselectSeat(seatId);

// Decrease GA quantity by 1
renderer.decreaseGASelection(sectionId);

// Clear all selections
renderer.clearSelections();

// Fit view to all sections (with optional padding)
renderer.fitToSections(50);
```

#### 5. Handling Resize

```javascript
// Renderer automatically handles resize via ResizeObserver
// For custom logic, listen for resize:
window.addEventListener('resize', () => {
    // Your custom resize logic
    renderer.fitToSections(50);
});
```

## Configuration Options

### SeatMapRenderer Options Used

| Option | Value | Description |
|--------|-------|-------------|
| `maxSelectedSeats` | 10 | Maximum tickets (seats + GA combined) |
| `enableZoneZoom` | true | Allow zooming into zones |
| `enableSectionZoom` | true | Allow zooming into sections |
| `showControls` | false | Hide default map controls |

### CSS Variables

The demo uses CSS custom properties for theming:

```css
:root {
    --primary: #3b82f6;
    --primary-dark: #2563eb;
    --gray-50 through --gray-900: Gray scale
    --danger: #ef4444;
    --radius: 12px;
    --drawer-collapsed-height: 180px;
    --drawer-expanded-height: 50vh;
}
```

## API Methods Used

### SeatMapRenderer Methods

| Method | Description |
|--------|-------------|
| `SeatMapRenderer.create(container, options)` | Factory method for initialization |
| `loadData(venueData)` | Load venue JSON data |
| `getSections(options)` | Get section list with colors |
| `zoomToSectionById(id, boost)` | Zoom to specific section |
| `fitToSections(padding)` | Fit all sections in view |
| `deselectSeat(seatId)` | Remove specific seat from selection |
| `decreaseGASelection(sectionId)` | Reduce GA quantity by 1 |
| `clearSelections()` | Clear all selections |
| `destroy()` | Clean up renderer |

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `cartChange` | `{ seats, ga, totalCount }` | Selection changed |
| `sectionZoom` | `{ sectionId }` | Zoomed to section |
| `mapFullyLoaded` | `{ totalSections }` | Map finished loading |

## Mobile Considerations

### Viewport Height Fix

Mobile browsers have dynamic toolbars that affect `vh` units. The demo handles this:

```javascript
function setRealVH() {
    const vh = window.innerHeight;
    document.documentElement.style.setProperty('--real-vh', `${vh}px`);
}
window.addEventListener('resize', setRealVH);
```

### Drawer States

- **Collapsed**: 180px height, shows event info
- **Expanded**: 50vh max height, shows full content
- **With footer**: Drawer raises 70px to stay above purchase footer

### Touch Interactions

- Tap section card → zoom to section
- Tap on map → standard renderer interactions
- Swipe drawer handle → expand/collapse
- Tap delete button → remove selection

## Customization

### Changing the Event Info

Edit the HTML in `demo-booking.html`:

```html
<div class="event-info">
    <div class="event-title">Your Event Name</div>
    <div class="event-details">
        <span class="material-symbols-outlined">calendar_month</span>
        Date
    </div>
    ...
</div>
```

### Changing Colors

Update CSS variables or the section colors in your venue JSON:

```json
{
    "style": {
        "seatColor": 14785812,
        "sectionColor": 6278736
    }
}
```

### Adding Service Fees

The demo shows "+ cargos" but doesn't calculate them. To add:

```javascript
function calculateTotal() {
    let total = 0;
    cart.seats.forEach(seat => {
        const serviceFee = seat.price * 0.10; // 10% fee
        total += seat.price + serviceFee;
    });
    // ... similar for GA
    return total;
}
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+
- Chrome Mobile

## Known Limitations

1. **No real payment processing** - Demo only shows UI flow
2. **No seat availability** - All seats shown as available
3. **No real-time updates** - Static data only
4. **Single venue** - Loads demo-venue.json only

## Related Documentation

- [SeatMapRenderer README](./README.md) - Full renderer documentation
- [Architecture Guide](./ARCHITECTURE.md) - Module structure
- [File Format](../docs/FILE_FORMAT.md) - SMF format specification
