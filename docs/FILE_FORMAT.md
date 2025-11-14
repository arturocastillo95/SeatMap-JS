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

## Section Object

Each section in the `sections` array contains:

```json
{
  "id": "Section-1",
  "name": "Section A",
  "groupId": null,
  
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
    "showRight": false
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
    "opacity": 1.0
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
- Enhanced metadata fields for extensibility

**Breaking Changes:**
- `seats` field changed from simple count to full array
- Added `seatNumbering` object
- Enhanced `rowLabels` object with `start` and `reversed` fields

**Backward Compatibility:**
- Can import v1.0.0 files (automatically detected)
- v1.0.0 files are upgraded on import

### v1.0.0

Initial format with basic section, transformation, and styling support.

## Field Descriptions

### Transform Fields

- `rotation`: Rotation in degrees (-180 to 180)
- `curve`: Curve amount (0-100, creates stadium-style arc)
- `stretchH`: Horizontal spacing between seats (0-100)
- `stretchV`: Vertical spacing between rows (0-100)

### Row Labels

- `type`: "none", "numbers", or "letters"
- `start`: Starting value (number >= 1 or letter A-Z)
- `reversed`: Flip top-to-bottom order
- `showLeft`: Display labels on left side
- `showRight`: Display labels on right side

### Seat Numbering

- `start`: Starting seat number (>= 1)
- `reversed`: Flip left-to-right direction
- `perRow`: Always true (seats numbered per row)

### Individual Seat Data

Each seat object contains:
- `rowIndex`: 0-based row index
- `colIndex`: 0-based column index
- `number`: Display number as string
- `baseX`, `baseY`: Base position relative to section
- `metadata`: Extensible custom data

## Usage for Viewers

A separate viewer application can use this format to:

1. Parse the JSON file
2. Iterate through `sections` array
3. For each section, render seats from the `seats` array
4. Apply transformations from `transform` object
5. Display row labels based on `rowLabels` configuration
6. Apply styling from `style` object

**Note:** Seats not present in the `seats` array have been deleted and should not be rendered.

## Extensibility

All objects include a `metadata` field for custom properties:
- Venue-level metadata
- Section-level metadata
- Seat-level metadata

Future versions will maintain backward compatibility by detecting the version field and upgrading older formats automatically.
