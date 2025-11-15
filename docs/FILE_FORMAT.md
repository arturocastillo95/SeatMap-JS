# File Format Documentation

## SMF (Seat Map Format)

SeatMap JS uses a JSON-based file format called SMF (Seat Map Format) for saving and loading venue maps.

### Current Version: 2.0.0

## Format Structure

```json
{
  "format": "SMF",
  "version": "2.0.0",
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
  
  "rowLabels": {
    "type": "letters",
    "start": "A",
    "reversed": false,
    "showLeft": true,
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
      "rowIndex": 0,
      "colIndex": 0,
      "number": "1",
      "baseX": 10,
      "baseY": 10,
      "metadata": {}
    }
  ],
  
  "style": {
    "fillColor": "#4a5568",
    "seatColor": "#ffffff",
    "borderColor": "#3b82f6",
    "sectionColor": 4285718,
    "opacity": 1.0
  },
  
  "pricing": {
    "basePrice": 50.00,
    "serviceFee": 5.00,
    "serviceFeeEnabled": true,
    "serviceFeeType": "fixed"
  },
  
  "metadata": {}
}
```

### General Admission (GA) Section

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
  
  "seats": [],
  
  "style": {
    "fillColor": "#4a5568",
    "seatColor": "#ffffff",
    "borderColor": "#3b82f6",
    "sectionColor": 4285718,
    "opacity": 1.0
  },
  
  "pricing": {
    "basePrice": 30.00,
    "serviceFee": 3.00,
    "serviceFeeEnabled": true,
    "serviceFeeType": "fixed"
  },
  
  "metadata": {}
}
```

## Version History

### v2.0.0 (Current)

**New Features:**
- Individual seat data with row/column indices
- Support for deleted seats (seats not in array are considered deleted)
- Row label starting point and direction
- Seat numbering starting point and direction
- **General Admission (GA) sections** with capacity-based tracking
- Section color customization (`sectionColor` field in style)
- Pricing information per section (base price and service fees)
- Row label hidden mode for viewer use
- Enhanced metadata fields for extensibility

**GA Section Features:**
- `type: "ga"` field identifies GA sections
- `ga.capacity` field for maximum occupancy
- Empty `seats` array (no individual seats)
- Supports rotation (0-360 degrees)
- Width and height can be customized

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

### Seat Numbering (Regular Sections Only)

- `start`: Starting seat number (>= 1)
- `reversed`: Flip left-to-right direction
- `perRow`: Always true (seats numbered per row)

### Individual Seat Data (Regular Sections Only)

Each seat object contains:
- `rowIndex`: 0-based row index
- `colIndex`: 0-based column index
- `number`: Display number as string
- `baseX`, `baseY`: Base position relative to section
- `metadata`: Extensible custom data

### Style Fields

- `fillColor`: Section background color (hex string)
- `seatColor`: Individual seat color (hex string)
- `borderColor`: Section border color (hex string)
- `sectionColor`: Section color as numeric value (e.g., 4285718 for #3b82f6)
- `opacity`: Section opacity (0.0 to 1.0)

### Pricing Fields

- `basePrice`: Base ticket price for this section
- `serviceFee`: Service fee amount
- `serviceFeeEnabled`: Whether service fee is active
- `serviceFeeType`: "fixed" (dollar amount) or "percentage"

## Usage for Viewers

A separate viewer application can use this format to:

1. Parse the JSON file
2. Iterate through `sections` array
3. For each section:
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
4. Apply styling from `style` object (including `sectionColor`)
5. Display pricing information if needed

**Notes:** 
- Seats not present in the `seats` array have been deleted and should not be rendered
- GA sections have empty `seats` arrays and should display capacity instead
- Row labels with `hidden: true` should be rendered with reduced visibility (grayed out)

## Extensibility

All objects include a `metadata` field for custom properties:
- Venue-level metadata
- Section-level metadata
- Seat-level metadata

Future versions will maintain backward compatibility by detecting the version field and upgrading older formats automatically.
