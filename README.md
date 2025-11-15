# SeatMap JS

A modular, interactive venue seating map editor built with PixiJS 8.x. Create, edit, and export professional venue seating layouts with advanced alignment tools, smart collision detection, and customizable seat numbering.

## ✨ Key Features

- **Drag-to-Create Sections**: Draw rectangular seating sections with real-time preview
- **Edit Seats Mode**: Select and delete individual seats with drag-to-select functionality
- **Multi-Section Alignment**: Align and distribute multiple sections with intelligent collision prevention
- **Advanced Labeling**: Customize row labels (A-Z, AA-ZZ, numbers) with custom starting points, reverse ordering, and hidden mode for viewer use
- **Smart Seat Numbering**: Configure seat numbering with custom start values and direction control
- **Row Alignment with Gap Preservation**: Align rows while maintaining original spacing from deleted seats
- **Section Transformations**: Rotate, curve, and stretch sections with live preview
- **Section Colors**: Customize background and border colors per section with color picker
- **Pricing Management**: Set base prices and service fees (fixed amount or percentage) per section
- **Context Menu**: Right-click sections for quick access to Edit Seats and Delete options
- **Save & Load**: Export/import venue maps in SMF (Seat Map Format) v2.0.0 with backward compatibility
- **Collision Detection**: Smooth dragging with automatic edge-sliding and post-alignment separation accounting for rotated sections
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

## 🏗️ Project Structure

```
venue-map-js/
├── index.html              # Main application
├── js/
│   ├── main.js            # Entry point
│   ├── config.js          # Configuration and colors
│   ├── state.js           # Global state management
│   ├── sectionManager.js  # Section and seat operations
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
    └── CHANGELOG.md       # Version history
```

## 🎯 Core Concepts

### App Modes
- **Edit Layout (Schema)**: Create, move, and transform sections (default mode)
- **Edit Seats**: Select and delete individual seats within a section
- **Pricing**: Configure ticket pricing with base prices and service fees per section
- More modes planned: Underlay, Venue Shape

### Section Transformations
When a single section is selected, customize:
- **Section Color**: Choose custom background and border color with color picker or hex input
- **Row Labels**: Numbers or letters (A-Z, AA-ZZ) with custom start, flip direction, and position (left/right/hidden)
- **Seat Numbering**: Custom starting number and left-to-right/right-to-left order
- **Align Rows**: Left/center/right alignment with gap preservation for deleted seats
- **Rotation**: -180° to 180° with live preview
- **Curve**: Stadium-style curved seating with auto-calculated safety limits
- **Stretch**: Horizontal and vertical spacing between seats

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
