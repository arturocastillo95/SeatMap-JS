# File Format Documentation

## SMF (Seat Map Format)

SeatMap JS uses a JSON-based file format called SMF (Seat Map Format) for saving and loading venue maps.

### Current Version: 2.1.0

## Format Structure

```json
{
  "format": "SMF",
  "version": "2.1.0",
  "created": "ISO 8601 timestamp",
  "modified": "ISO 8601 timestamp",
  
  "venue": {
    "name": "Venue name",
    "location": "Venue location",
    "capacity": 1000,
    "metadata": {}
  },
  
  "canvas": {
    "width": 1920,
    "height": 1080,
    "zoom": 1.0,
    "panX": 0,
    "panY": 0
  },
  
  "underlay": {
    "dataUrl": null,
    "sourceUrl": "https://example.com/blueprint.png",
    "fileName": "blueprint.png",
    "x": 0,
    "y": 0,
    "scale": 1.0,
    "opacity": 0.5,
    "visible": true
  },
  
  "groups": [],
  "sections": [...],
  "objects": [],
  
  "metadata": {
    "software": "SeatMap JS v1.0",
    "author": "",
    "tags": [],
    "custom": {}
  }
}
```

## Section Types

### Regular Section (with Seats)

Each regular section in the `sections` array contains:

```json
{
  "id": "Section-1",
  "name": "Section A",
  "groupId": null,
  "type": "regular",
  
  "x": 100,
  "y": 100,
  "width": 500,
  "height": 300,
  
  "base": {
    "rows": 10,
    "columns": 20,
    "baseWidth": 500,
    "baseHeight": 300
  },
  
  "transform": {
    "rotation": 0,
    "curve": 0,
    "stretchH": 0,
    "stretchV": 0
  },
  
  "isZone": false,
  "points": [0, 0, 100, 0, 100, 100, 0, 100],
  
  "rowLabels": {
    "type": "letters",
    "start": "A",
    "reversed": false,
    "showLeft": true,
    "showRight": false,
    "hidden": false,
    "spacing": 20,
    "color": 16777215
  },
  
  "seatNumbering": {
    "start": 1,
    "reversed": false,
    "perRow": true
  },
  
  "seats": [
    {
      "r": 0,
      "c": 0,
      "n": "1",
      "x": 10,
      "y": 10,
      "sn": 1
    }
  ],
  
  "style": {
    "fillColor": "#4a5568",
    "seatColor": 16777215,
    "seatTextColor": 0,
    "borderColor": "#3b82f6",
    "sectionColor": 4285718,
    "fillVisible": true,
    "strokeVisible": true,
    "opacity": 1.0
  },
  
  "metadata": {}
}
```

### Zone Section Fields

Zones are a special type of section used to define areas.

- `isZone`: Boolean, true if the section is a zone.
- `zoneLabel`: String, the label text displayed in the zone.
- `showZoneLabel`: Boolean, visibility of the label.
- `showZone`: Boolean, visibility of the zone graphic.
- `fillOpacity`: Number (0-1), opacity of the zone fill.
- `points`: Array of numbers `[x1, y1, x2, y2, ...]` defining the polygon vertices relative to the section's origin. If present, these points are used to render the shape instead of width/height.

### General Admission (GA) Section Fields

GA sections are used for standing areas or general admission zones without individual seats:

```json
{
  "id": "GA-1",
  "name": "GA Floor",
  "groupId": null,
  "type": "ga",
  
  "x": 100,
  "y": 100,
  "width": 800,
  "height": 600,
  
  "base": {
    "rows": 0,
    "columns": 0,
    "baseWidth": 800,
    "baseHeight": 600
  },
  
  "ga": {
    "capacity": 500
  },
  
  "transform": {
    "rotation": 0,
    "curve": 0,
    "stretchH": 0,
    "stretchV": 0
  },
  
  "rowLabels": {
    "type": "none",
    "start": 1,
    "reversed": false,
    "showLeft": false,
    "showRight": false,
    "hidden": false
  },
  
  "seatNumbering": {
    "start": 1,
    "reversed": false,
    "perRow": true
  },
  
  "seats": [
    {
      "id": "aZ9x2kP1",
      "rowIndex": 0,
      "colIndex": 0,
      "number": "1",
      "specialNeeds": false,
      "isManualNumber": false,
      "relativeX": 10,
      "relativeY": 10,
      "baseX": 10,
      "baseY": 10
    }
  ],
  
  "style": {
    "fillColor": "#4a5568",
    "seatColor": 16777215,
    "seatTextColor": 0,
    "borderColor": "#3b82f6",
    "sectionColor": 4285718,
    "fillVisible": true,
    "strokeVisible": true,
    "opacity": 1.0
  },
  
  "metadata": {}
}
```

## Underlay (Background Image)

The optional `underlay` object contains background image data:

```json
{
  "dataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA...",
  "fileName": "venue-blueprint.png",
  "sourceUrl": "https://example.com/blueprint.png",
  "x": 0,
  "y": 0,
  "scale": 1.0,
  "opacity": 0.5,
  "visible": true
}
```

### Underlay Fields

- `dataUrl`: Base64-encoded image data URL. Can be `null` if `sourceUrl` is provided.
- `fileName`: Original filename for reference
- `sourceUrl`: URL to the image source. If present, `dataUrl` may be omitted to save space.
- `x`, `y`: Top-left position coordinates in world space
- `centerX`, `centerY`: Exact center position for pixel-perfect positioning (v2.0.0+)
- `scale`: Scale factor (0.1 to 5.0, where 1.0 is 100%)
- `opacity`: Transparency level (0.0 to 1.0)
- `visible`: Whether underlay is currently visible

**Notes:**
- Underlay is optional; field can be `null` or omitted if no image
- Images are Base64-encoded to keep venue maps self-contained
- `sourceUrl` is preserved for reference but not used for loading (dataUrl is used)
- Large images significantly increase file size
- Render order: Grid → Underlay → Sections → Seats

## Version History

### v2.1.0 (2025-11-20)

**New Features:**
- **Persistent Seat IDs**: Each seat now has a unique 8-character alphanumeric `id` field (e.g., "aZ9x2kP1").
- **Pricing Structure**: Sections now include a `pricing` object with `basePrice` and service fee configuration.
- **Seat Pricing**: Individual seats can override section pricing with their own `price` field (loaded via inventory).
- **Tooltip Support**: Renderer supports displaying rich tooltip data based on these fields.

### v2.0.0 (Current)

**New Features:**
- Individual seat data with row/column indices and base positions (baseX, baseY)
- Support for deleted seats (seats not in array are considered deleted)
- Row alignment preference (left/center/right) stored in `rowAlignment` field
- Exact center position (centerX, centerY) for pixel-perfect section positioning
- Row label starting point and direction
- Seat numbering starting point and direction
- **General Admission (GA) sections** with capacity-based tracking
- **Underlay support** for background images/blueprints
- Section color customization (`sectionColor` field in style)
- **Seat color customization** (`seatColor` and `seatTextColor` fields in style)
- Fill and stroke visibility toggles (`fillVisible` and `strokeVisible` in style)
- Row label spacing control (5-50px, default: 20)
- Special needs seat support (`specialNeeds` field in seat objects)
- Pricing information per section (base price and service fees)
- Row label hidden mode for viewer use
- Enhanced metadata fields for extensibility

**GA Section Features:**
- `type: "ga"` field identifies GA sections
- `ga.capacity` field for maximum occupancy
- Empty `seats` array (no individual seats)
- Supports rotation (0-360 degrees)
- Width and height can be customized

**Underlay Features:**
- Optional `underlay` object at root level
- Base64-encoded image data for portability
- Position, scale, opacity, and visibility settings
- Supports PNG, SVG, and JPG formats
- Can be null or omitted if no background image

**Breaking Changes:**
- `seats` field changed from simple count to full array
- Added `seatNumbering` object
- Enhanced `rowLabels` object with `start`, `reversed`, and `hidden` fields
- Added `type` field to distinguish section types

**Backward Compatibility:**
- Can import v1.0.0 files (automatically detected)
- v1.0.0 files are upgraded on import
- Sections without `type` field default to regular sections

### v1.0.0

Initial format with basic section, transformation, and styling support.

## Field Descriptions

### Transform Fields

- `rotation`: Rotation in degrees (-180 to 180)
- `curve`: Curve amount (0-100, creates stadium-style arc)
- `stretchH`: Horizontal spacing between seats (0-100)
- `stretchV`: Vertical spacing between rows (0-100)

### Section Type

- `type`: "regular" or "ga" (General Admission)
- Regular sections have individual seats
- GA sections are capacity-based areas without individual seats

### GA Section Fields

- `ga.capacity`: Maximum occupancy for the GA section
- `seats`: Always empty array for GA sections
- `base.rows`, `base.columns`: Always 0 for GA sections

### Row Labels (Regular Sections Only)

- `type`: "none", "numbers", or "letters"
- `start`: Starting value (number >= 1 or letter A-Z)
- `reversed`: Flip top-to-bottom order
- `showLeft`: Display labels on left side
- `showRight`: Display labels on right side
- `hidden`: Gray out labels for viewer mode (still rendered but less visible)
- `spacing`: Distance in pixels between row labels and seats (5-50, default: 20)
- `color`: Label text color as hex number (default: 16777215 / #ffffff white)

### Seat Numbering (Regular Sections Only)

- `start`: Starting seat number (>= 1)
- `reversed`: Flip left-to-right direction
- `perRow`: Always true (seats numbered per row)

### Individual Seat Data (Regular Sections Only)

**Optimized Sparse Format (v2.1.0+):**
To reduce file size, seat objects use short keys and omit default values:
- `r`: Row Index (integer)
- `c`: Column Index (integer)
- `n`: Seat Number (string)
- `x`: Base X Position (integer)
- `y`: Base Y Position (integer)
- `sn`: Special Needs (1 if true, omitted if false)
- `mn`: Manual Number (1 if true, omitted if false)
- `id`: Unique Seat ID (string, 8 chars)

**Legacy Format (v2.0.0):**
- `rowIndex`: 0-based row index
- `colIndex`: 0-based column index
- `number`: Display number as string
- `baseX`, `baseY`: Base position relative to section
- `specialNeeds`: Boolean
- `metadata`: Custom data

**Note:** The renderer supports both formats for backward compatibility.

**Important:** The `number` field preserves the exact seat numbering, which is critical when seats have been deleted. For example, if seats 1, 2, and 5 remain after deleting 3 and 4, the numbers "1", "2", "5" are preserved exactly. Do not recalculate seat numbers from position - always restore from saved data.

**Special Needs Seats:**
- When `specialNeeds: true`, the seat should be rendered with:
  - Blue color (#2563eb)
  - Accessibility icon instead of seat number
  - Clear visual distinction from regular seats

### Style Fields

- `fillColor`: Section background color (hex string) - legacy field
- `seatColor`: Individual seat circle color as numeric value (e.g., 16777215 for #ffffff/white) - defaults to white for backward compatibility
- `seatTextColor`: Individual seat text color as numeric value (e.g., 0 for #000000/black) - defaults to black for backward compatibility
- `borderColor`: Section border color (hex string) - legacy field
- `sectionColor`: Section color as numeric value (e.g., 4285718 for #3b82f6)
- `fillVisible`: Whether section background is visible (boolean, default: true)
- `strokeVisible`: Whether section border is visible (boolean, default: true)
- `opacity`: Section opacity (0.0 to 1.0)

### Glow Fields

- `enabled`: Whether glow effect is active (boolean)
- `color`: Glow color as numeric value
- `opacity`: Glow opacity (0.0 to 1.0)
- `strength`: Size of the glow radius
- `blur`: Gaussian blur amount (0-20)

### Pricing Fields

- `basePrice`: Base ticket price for this section
- `serviceFee`: Service fee amount
- `serviceFeeEnabled`: Whether service fee is active
- `serviceFeeType`: "fixed" (dollar amount) or "percentage"

## Usage for Viewers

A separate viewer application can use this format to:

1. Parse the JSON file
2. **Render underlay (if present):**
   - Check if `underlay` object exists and `visible` is true
   - Load image from `dataUrl` (Base64-encoded)
   - Position at `x`, `y` coordinates
   - Apply `scale` and `opacity` settings
   - Render below all other elements (grid → underlay → sections)
3. Iterate through `sections` array
4. For each section:
   - Check `type` field to determine section type
   - **For regular sections:**
     - Render seats from the `seats` array
     - Apply transformations (rotation, curve, stretch)
     - Display row labels based on `rowLabels` configuration (respect `hidden` flag)
   - **For GA sections:**
     - Render as rectangular area without individual seats
     - Display section name centered in the area
     - Show capacity from `ga.capacity` field
     - Apply rotation if specified
5. Apply styling from `style` object (including `sectionColor`)
6. Display pricing information if needed

**Notes:** 
- Seats not present in the `seats` array have been deleted and should not be rendered
- GA sections have empty `seats` arrays and should display capacity instead
- Row labels with `hidden: true` should be rendered with reduced visibility (grayed out)
- Underlay can be `null` or omitted if no background image is present
- Underlay should render behind all sections but above the grid

## Extensibility

All objects include a `metadata` field for custom properties:
- Venue-level metadata
- Section-level metadata
- Seat-level metadata

Future versions will maintain backward compatibility by detecting the version field and upgrading older formats automatically.
