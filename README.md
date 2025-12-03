# SeatMap JS

> **Version 0.1.1** | [Changelog](docs/CHANGELOG.md)

A modular, interactive venue seating map editor built with PixiJS 8.x. Create, edit, and export professional venue seating layouts with advanced alignment tools, smart collision detection, and customizable seat numbering.

## ✨ Key Features

- **Drag-to-Create Sections**: Draw rectangular seating sections with real-time preview and grid snapping
- **Join Zones**: Merge multiple zones into complex polygon shapes (L-shapes, U-shapes, etc.)
- **General Admission (GA) Sections**: Create standing/GA areas without individual seats, with capacity control and interactive resize handles
- **Edit Seats Mode**: Select and delete individual seats with drag-to-select functionality
- **Multi-Section Alignment**: Align and distribute multiple sections with intelligent collision prevention
- **Advanced Labeling**: Customize row labels (A-Z, AA-ZZ, numbers) with custom starting points, reverse ordering, and hidden mode for viewer use. Letter labels now follow the pattern A-Z, AA-ZZ, AAA-ZZZ (repeating characters).
- **Smart Seat Numbering**: Configure seat numbering with custom start values and direction control
- **Row Alignment with Gap Preservation**: Align rows while maintaining original spacing from deleted seats
- **Section Transformations**: Rotate, curve, and stretch sections with live preview
- **Interactive Resize Handles**: Resize GA sections with 8-point handles (corners and edges) that rotate with the section
- **Section Colors**: Customize background and border colors per section with color picker and hex input
- **Pricing Management**: Set base prices and service fees (fixed amount or percentage) per section
- **Context Menu**: Right-click sections for quick access to Edit Seats and Delete options
- **Save & Load**: Export/import venue maps in SMF (Seat Map Format) v2.1.0 with sparse object optimization for smaller file sizes
- **Collision Detection**: Smooth dragging with automatic edge-sliding and post-alignment separation accounting for rotated sections and resized GA areas
- **Pan & Zoom**: Space+drag to pan, scroll to zoom, zoom-to-fit with intelligent bounds calculation

## 🚀 Quick Start

1. **Run a local server** (required for ES6 modules):
   ```bash
   python -m http.server 8000
   # or
   npx http-server
   ```

2. **Open in browser**: Navigate to `http://localhost:8000`

3. **Create your first section**:
   - Click "Create Section" in the toolbar
   - Drag on canvas to draw a seating section
   - Select the section to customize labels, numbering, and transformations

4. **Learn more**: See the [User Guide](docs/USER_GUIDE.md) for detailed instructions

## 📚 Documentation

- **[User Guide](docs/USER_GUIDE.md)** - Complete guide to using SeatMap JS
- **[File Format Specification](docs/FILE_FORMAT.md)** - SMF v2.0.0 format documentation
- **[Changelog](docs/CHANGELOG.md)** - Version history and release notes
- **[Renderer Documentation](renderer/README.md)** - Embeddable map viewer
- **[Booking Demo Guide](renderer/BOOKING_DEMO.md)** - Production-ready ticket booking reference implementation

## 🏗️ Project Structure

```
venue-map-js/
├── index.html              # Main application
├── js/
│   ├── main.js            # Entry point
│   ├── config.js          # Configuration and colors
│   ├── state.js           # Global state management
│   ├── Section.js         # Type-safe Section class with validation
│   ├── sectionManager.js  # Unified section coordinator (delegates to managers)
│   ├── managers/          # Focused, single-responsibility modules
│   │   ├── SectionFactory.js           # Section creation & deletion
│   │   ├── SeatManager.js              # Seat operations
│   │   ├── SectionInteractionHandler.js # User interactions
│   │   ├── ResizeHandleManager.js      # GA resize handles
│   │   └── SectionTransformations.js   # Stretch, curve, alignment
│   ├── alignmentManager.js # Multi-section alignment & transforms
│   ├── modeManager.js     # App mode switching
│   ├── interactionManager.js # Mouse/touch interactions
│   ├── toolManager.js     # Tool handling
│   ├── fileManager.js     # Save/load (SMF format)
│   ├── utils.js           # Helper functions
│   └── sceneSetup.js      # Grid and examples
└── docs/                   # Documentation
    ├── USER_GUIDE.md      # How to use the app
    ├── FILE_FORMAT.md     # SMF specification
    ├── CHANGELOG.md       # Version history
    └── REFACTORING_GUIDE.md # Architecture & refactoring details
```

## 🎯 Core Concepts

### App Modes
- **Edit Layout (Schema)**: Create, move, and transform sections (default mode)
- **Edit Zones**: Create and manage zones (areas containing sections) without interference from other elements
- **Edit Seats**: Select and delete individual seats within a section
- **Pricing**: Configure ticket pricing with base prices and service fees per section
- More modes planned: Underlay, Venue Shape

### Section Types

#### Regular Sections (with Seats)
- Individual seat management with grid-based layout
- Row labels (numbers/letters) and custom seat numbering
- Transformations: rotation, curve, horizontal/vertical stretch
- Row alignment with gap preservation for deleted seats

#### General Admission (GA) Sections
- Standing or open areas without individual seats
- Capacity-based (no seat grid)
- Width/height controls with grid snapping
- Interactive 8-point resize handles (corners + edges)
- Center-aligned section label
- Supports rotation (handles rotate with section)
- No row labels, seat numbering, or stretch controls

### Section Transformations
When a single section is selected, customize:
- **Section Color**: Choose custom background and border color with color picker or hex input
- **Row Labels** (Regular sections): Numbers or letters (A-Z, AA-ZZ) with custom start, flip direction, and position (left/right/hidden)
- **Seat Numbering** (Regular sections): Custom starting number and left-to-right/right-to-left order
- **Capacity** (GA sections): Set maximum occupancy for general admission areas
- **Size** (GA sections): Width and height controls with interactive resize handles
- **Zone Label Position** (Zone sections): Fine-tune the X/Y offset of zone labels relative to the center
- **Align Rows** (Regular sections): Left/center/right alignment with gap preservation for deleted seats
- **Rotation**: -180° to 180° with live preview (handles rotate for GA sections)
- **Curve** (Regular sections): Stadium-style curved seating with auto-calculated safety limits
- **Stretch** (Regular sections): Horizontal and vertical spacing between seats

### Multi-Section Alignment
Select 2+ sections to access:
- Align left, center, right, top, middle, bottom
- Distribute horizontally or vertically with automatic gap calculation
- Intelligent collision resolution preserves alignment intent

### File Format (SMF)
Export venue maps to JSON format:
- **Version 2.0.0**: Includes individual seat data, custom labels, transformations
- **Backward Compatible**: Reads v1.0.0 files
- **Viewer-Ready**: Complete data for read-only venue map viewers

## 🏛️ Architecture

SeatMap JS follows **SOLID principles** with a modular architecture:

- **Type-safe Section class** - Built-in validation prevents runtime errors
- **Single-responsibility modules** - Each manager handles one concern (~150-350 lines)
- **Centralized configuration** - No magic numbers, easy customization
- **Loose coupling** - Modules don't depend on each other
- **Easy testing** - Each manager can be tested independently

See [Refactoring Guide](docs/REFACTORING_GUIDE.md) for architectural details.

## 📦 Dependencies

- [PixiJS v8](https://pixijs.com/) - 2D WebGL rendering
- [Material Symbols Light](https://fonts.google.com/icons) - Icon font

## 🎨 Customization

Edit `js/config.js` to customize:
- Seat size and spacing
- Color scheme (dark theme by default)
- Grid configuration

See the [User Guide](docs/USER_GUIDE.md#advanced-features) for customization examples.

## ⌨️ Keyboard Shortcuts

- **Space**: Hold to pan canvas
- **Backspace**: Delete selected sections/seats
- **Escape**: Exit Edit Seats mode, exit Pricing mode, or cancel operation
- **Shift+Click**: Add to section selection (multi-select)
- **Shift+Drag**: Add to seat selection in Edit Seats mode
- **Right-Click**: Open context menu on sections (Edit Seats / Delete Section)

## 🐛 Known Issues

- Requires local server for ES6 modules (won't work with `file://`)
- Browser zoom affects coordinate precision (use app's zoom controls)

## 📝 License

MIT

---

**Made with PixiJS** | [Report Issues](https://github.com/yourusername/venue-map-js/issues) | [View Documentation](docs/USER_GUIDE.md)
