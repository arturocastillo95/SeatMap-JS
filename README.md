# Venue Map JS

A modular, interactive venue seating map editor built with PixiJS 8.x, featuring advanced multi-section alignment, distribution, and collision detection.

## 📁 Project Structure

```
venue-map-js/
├── index.html                  # Main HTML file with dark-themed UI
├── js/
│   ├── main.js                 # Application entry point
│   ├── config.js               # Configuration and constants
│   ├── state.js                # Global application state
│   ├── utils.js                # Utility functions
│   ├── sectionManager.js       # Section and seat management
│   ├── toolManager.js          # Tool handling (create/delete)
│   ├── interactionManager.js   # Mouse/touch interactions with collision detection
│   ├── alignmentManager.js     # Multi-section alignment, distribution & collision system
│   ├── modeManager.js          # App mode switching (schema/seats/underlay/etc.)
│   ├── fileManager.js          # Save/Load venue maps (SMF format)
│   └── sceneSetup.js           # Grid and example section setup
├── example.html                # Original single-file version
├── example-refactored.html     # Refactored single-file version
└── learning.html               # Learning/testing file
```

## 🎯 Features

### App Modes
The app has multiple modes accessible from the left sidebar:
- **Edit Layout (Schema)**: Default mode for creating, moving, and transforming sections
- **Edit Seats**: Select and delete individual seats within sections
- **Underlay**: (Planned) Add background images
- **Venue Shape**: (Planned) Define venue boundaries
- **Pricing**: (Planned) Set pricing tiers

### Core Functionality
- **Create Sections**: Drag to draw rectangular seating sections
- **Real-time Preview**: See seat counts and dimensions while dragging
- **Smart Snapping**: Sections snap to seat/row increments
- **Multi-Selection**: Click sections to select (green border/tint), Cmd/Ctrl+click for multiple
- **Delete with Confirmation**: Backspace key removes selected sections with dialog
- **Pan & Zoom**: Space+drag to pan, scroll to zoom, double-click to zoom-to-fit
- **Interactive Seats**: Click individual seats for interaction
- **Edit Seats Mode**: Enter via sidebar to select and delete individual seats
  - Requires exactly one section to be selected before entering mode
  - Section remains selected and locked during edit mode
  - Only seats in the selected section can be edited
  - Other sections are dimmed and non-interactive
  - Click individual seats to select (green tint)
  - **Drag-to-Select**: Drag on canvas to draw selection rectangle (green) and select multiple seats
  - Hold Shift while dragging to add seats to existing selection
  - Real-time visual feedback: seats highlight as the selection rectangle passes over them
  - Press Backspace to delete selected seats
  - Press Escape or click "Edit Layout" to exit and return to schema mode
- **Tooltips**: Hover for seat/section information
- **Row Labels**: Add numbered (1,2,3...) or lettered (A,B,C...) labels to rows, position left/right or both

### Advanced Multi-Section Controls
- **Alignment Bar**: When 2+ sections are selected, a control bar appears at the bottom with 8 alignment options:
  - **Align Left**: Align all sections to leftmost edge
  - **Align Center Horizontal**: Center sections horizontally relative to their centroid
  - **Align Right**: Align all sections to rightmost edge
  - **Align Top**: Align all sections to topmost edge
  - **Align Center Vertical**: Center sections vertically relative to their centroid
  - **Align Bottom**: Align all sections to bottommost edge
  - **Distribute Horizontally**: Evenly space sections horizontally (anchors first/last, calculates dynamic gaps)
  - **Distribute Vertically**: Evenly space sections vertically (anchors first/last, calculates dynamic gaps)

### Section Transformation Controls
When a single section is selected, a sidebar panel appears with advanced transformation tools:

- **Section Title**: Editable text input to rename the section
- **Row Labels**: Add labels to rows with three type options:
  - **None**: No row labels
  - **Numbers**: Numeric labels (1, 2, 3...)
  - **Letters**: Alphabetic labels (A, B, C... Z, AA, AB...)
  - **Position**: Toggle left and/or right side labels independently
- **Align Rows**: Three alignment options for horizontal row positioning:
  - **Align Left**: Align all rows to the left edge
  - **Align Center**: Center all rows horizontally
  - **Align Right**: Align all rows to the right edge
  - **Smart Gap Preservation**: When seats are deleted, alignment maintains original grid spacing (treats missing seats as if they're still there)
  - Works after editing seats in Edit Seats mode to realign rows with gaps
- **Rotation**: Slider (-180° to 180°) to rotate the entire section with reset button
- **Curve**: Slider (0-100) to create stadium-style curved seating with intelligent limits:
  - Maintains constant seat-to-seat spacing along the arc
  - Automatically calculates safe maximum curve to prevent self-intersection
  - Uses polar coordinate transformation (arc length = radius × theta)
  - Works seamlessly with stretch transformations
- **Stretch Horizontal**: Slider (0-100) to add spacing between seat columns with reset button
- **Stretch Vertical**: Slider (0-100) to add spacing between seat rows with reset button
- **Transform Preservation**: All transformations (rotation, curve, stretch) are preserved when adding/removing row labels

### Intelligent Collision Detection
The system implements a **two-problem approach** for collision handling:

1. **Prevention (During Drag)**: Sections slide smoothly along edges when dragging would cause overlap
   - Uses original positions to calculate collision-free movement
   - Tests X and Y axes independently to enable smooth sliding
   - Never snaps to corners or blocks movement unnecessarily

2. **Separation (After Alignment/Distribution)**: Sections automatically push apart if alignment causes overlap
   - Uses Minimum Translation Vector (MTV) for optimal separation
   - Iterative relaxation ensures all collisions are resolved
   - Preserves user's alignment intent while preventing overlap

### Save & Load (SMF - Seat Map Format)
- **Save**: Click the Save button in the toolbar to export your venue map as JSON
  - Downloads a timestamped `.json` file (e.g., `venue-map-2025-11-13T12-30-00.json`)
  - Preserves all sections, transformations, and configuration
  - Format: SMF v1.0.0 (Seat Map Format) - extensible JSON structure
  - Includes: section positions, dimensions, transformations (rotation, curve, stretch), row labels, and metadata
- **Open**: Click the Open button to load a saved venue map
  - Opens file picker dialog to select `.json` file
  - Validates SMF format and version
  - Clears existing sections and restores saved state
  - Reconstructs all sections with transformations applied
  - Restores canvas zoom and pan position

### Keyboard Shortcuts
- **Space**: Hold to enable pan mode (drag canvas)
- **Backspace**: Delete selected sections (with confirmation dialog)
- **Escape**: Cancel current operation or close dialog
- **Enter**: Confirm dialog action
- **Double-click**: Zoom to fit all sections

## 🚀 Getting Started

1. Open `index.html` in a web browser (requires a local server for ES6 modules)
2. Use the toolbar to create and manage sections:
   - **Create Section**: Click to enter draw mode, drag to create
   - **Delete Section**: Click to enter delete mode, click sections to remove (or use Backspace)
3. Select multiple sections (click or Cmd/Ctrl+click) to reveal the alignment bar
4. Use alignment controls to organize sections precisely

## 🔧 Module Overview

### **config.js**
- `CONFIG`: Application settings (seat size, margins, grid size, etc.)
- `COLORS`: Color palette for all visual elements (dark theme: #0f0f13 background)

### **state.js**
- `State`: Global application state (app instance, world, sections, tool modes, drag states)
- `Elements`: DOM element references (toolbar, alignment bar, dialogs)

### **utils.js**
- Screen-to-world coordinate conversion
- Tooltip management
- Visual effects (flash animations)
- Seat dimension calculations

### **sectionManager.js**
- Section creation and deletion
- Seat generation with row/column indices
- Selection system with visual feedback (green border 0x00ff00)
- Event dispatching for selection changes (`selectionchanged` custom event)
- **Row Label System**: Dynamic row labels positioned at extremes, follows all transformations
- **Transform Engine**:
  - `applyStretchTransform()`: Adds horizontal/vertical spacing between seats
  - `applyCurveTransform()`: Polar coordinate transformation for stadium-style curves
  - `calculateMaxCurve()`: Prevents self-intersection by calculating safe curve limits
- **Align Rows Function**:
  - `alignRows()`: Aligns rows left/center/right within a section
  - Uses `colIndex` to preserve original grid structure when seats are missing
  - Calculates virtual row width including gaps from deleted seats
  - Reapplies transformations after alignment
- **Dimension Management**: Automatic bounding box recalculation after transformations

### **toolManager.js**
- Create tool (drag-to-draw sections with real-time preview)
- Delete tool (click to remove)
- Dialog management (confirmation for new sections and deletion)

### **interactionManager.js**
- Pan and zoom controls (Space+drag, scroll wheel, double-click zoom-to-fit)
- Mouse/touch event handling
- Multi-drag with collision prevention using `getPermittedDrag()`
- Tool mode routing
- **Seat Selection in Edit Seats Mode**:
  - `updateSeatSelectionRect()`: Draws green selection rectangle during drag
  - `updateLiveSelectionPreview()`: Real-time seat highlighting as rectangle passes over seats
  - `processSeatSelection()`: Finalizes seat selection on drag end
  - Uses world coordinate system for accurate collision detection
  - Supports shift-key multi-selection

### **alignmentManager.js** 🆕
**Core collision and alignment system + single-section transformation controls**
- **Alignment Functions**: 6 functions (left, right, center-h, top, bottom, center-v) using bounding box coordinates
- **Distribution Functions**: Dynamic gap calculation with 40px minimum enforcement
- **Collision Detection**:
  - `coreCollisionTest()`: Single source of truth for AABB collision detection
  - `getPermittedDrag()`: Prevention system - calculates maximum permitted movement, tests X/Y axes independently
  - `getCollisionVector()`: Calculates Minimum Translation Vector for separation
  - `resolveCollisions()`: Iterative relaxation to push overlapping sections apart
- **Event-Driven Observer**: Monitors selection changes to show/hide alignment bar and sidebar
- **Single-Section Controls**:
  - `setRowLabelType()`: Toggle between none/numbers/letters with smart position defaults
  - `toggleRowLabelPosition()`: Independent left/right label positioning
  - `setRotation()`: Rotate section with seat/label repositioning
  - `setCurve()`: Apply stadium curve with automatic safety limiting
  - `setStretchH/V()`: Add spacing between seats with transformation preservation
  - Reset buttons for quick return to defaults
- **Configuration**: `COLLISION_PADDING: 0` (sections can touch), `GAP: 40` (minimum distribution spacing)

### **modeManager.js** 🆕
**App mode switching and seat editing functionality**
- **Mode Management**:
  - `switchMode()`: Changes between schema/seats/underlay/venue-shape/pricing modes
  - `enterEditSeatsMode()`: Enables individual seat selection and editing
  - `exitEditSeatsMode()`: Returns to schema mode, clears seat selection
- **Seat Selection**:
  - `selectSeat()`: Adds seat to selection with visual highlighting (green tint)
  - `deselectSeat()`: Removes seat from selection
  - `deselectAllSeats()`: Clears all selected seats
  - `highlightSeat()`: Visual feedback for selection state
- **Seat Deletion**:
  - `deleteSelectedSeats()`: Removes selected seats from sections and display
- **UI Updates**: Manages mode button active states, hides/shows relevant panels

### **fileManager.js** 🆕
**Save/Load system using SMF (Seat Map Format) - JSON-based venue map serialization**
- **Export Functions**:
  - `exportToJSON()`: Serializes entire venue state to SMF format
  - `serializeSection()`: Converts section to JSON with all properties
  - `calculateTotalCapacity()`: Computes total seat count
  - `downloadJSON()`: Triggers browser download with timestamped filename
  - `save()`: Main save function, generates and downloads venue map
- **Import Functions**:
  - `importFromJSON()`: Deserializes SMF JSON and reconstructs venue map
  - `deserializeSection()`: Recreates section from JSON data, applies all transformations
  - `clearAllSections()`: Removes all existing sections before loading
  - `open()`: Opens file picker dialog and loads selected JSON file
- **SMF Format v1.0.0**:
  - Format metadata (version, timestamps)
  - Venue information (name, location, capacity)
  - Canvas state (zoom, pan position)
  - Section data (position, dimensions, transformations, labels, metadata)
  - Extensible structure for future features (groups, objects, custom data)
- **Error Handling**: Validates format, catches parsing errors, user-friendly error messages

### **sceneSetup.js**
- Grid background generation
- Example trapezoid section with curved seating

## 🎨 Customization

### Change Seat Spacing
Edit `CONFIG.SEAT_SIZE` in `config.js`:
```javascript
SEAT_SIZE: 15  // Increase for more spacing
```

### Change Colors
Edit the `COLORS` object in `config.js`:
```javascript
SECTION_FILL: 0xff6b6b,  // Red sections
SEAT: 0x00ff00           // Green seats
SELECTION_BORDER: 0x00ff00  // Selection border color
```

### Adjust Collision Behavior
Edit collision constants in `alignmentManager.js`:
```javascript
const CONFIG = {
  COLLISION_PADDING: 0,    // Space between sections (0 = can touch)
  PUSH_DISTANCE: 30,       // Distance to push when resolving collisions
  MAX_ITERATIONS: 20,      // Maximum collision resolution iterations
  GAP: 40                  // Minimum gap for distribution functions
};
```

### Add New Tools
1. Add a button in `index.html`
2. Create a `setupNewTool()` method in `toolManager.js`
3. Add tool logic in `handlePointerDown/Move/Up` in `interactionManager.js`

### Add New Alignment Functions
1. Add button to `.align-bar` in `index.html` with Material Symbols Light icon
2. Implement alignment logic in `alignmentManager.js`
3. Wire up event listener in `main.js`

## 📦 Dependencies

- **[PixiJS v8](https://pixijs.com/)**: 2D WebGL rendering engine
- **[Material Symbols Light](https://fonts.google.com/icons)**: Icon font (weight 300) for UI controls

## 🏗️ Technical Architecture

### Coordinate System
All alignment and collision detection uses **bounding box coordinates**:
- `section.x`, `section.y`: Top-left corner position
- `section.width`, `section.height`: Section dimensions (dynamically updated after transformations)
- Seats store both base and transformed positions:
  - `seat.baseRelativeX`, `seat.baseRelativeY`: Original positions (never modified)
  - `seat.relativeX`, `seat.relativeY`: Current positions (after transformations)
  - `seat.rowIndex`, `seat.colIndex`: Grid indices for grouping and transformations
- Transformation properties:
  - `section.rotationDegrees`: Rotation angle (-180 to 180)
  - `section.curve`: Curve amount (0-100, auto-limited per section)
  - `section.stretchH`, `section.stretchV`: Horizontal/vertical spacing additions

### Collision Detection Strategy
**Two-Problem Approach:**

1. **Prevention (During Drag):**
   - Stores original positions at drag start (`State.dragOriginalPositions`)
   - Tests X and Y axes independently for collision
   - Calculates maximum permitted movement before overlap
   - Enables smooth sliding along edges without corner snapping

2. **Separation (After Alignment):**
   - Detects all overlapping section pairs
   - Calculates Minimum Translation Vector (MTV) for each collision
   - Iteratively pushes sections apart until no overlaps remain
   - Preserves alignment intent while enforcing no-overlap constraint

### Event-Driven Updates
Selection changes trigger `selectionchanged` custom events, eliminating the need for polling. This optimizes performance and ensures the alignment bar appears/disappears instantly.

## 🔍 Development Tips

- Use browser DevTools to inspect `State` object for debugging
- Console logs show section/seat click events
- All modules use ES6 imports/exports
- Requires a local server for module loading (file:// won't work)
- The alignment bar is hidden by default and appears when 2+ sections are selected
- Collision detection uses AABB (Axis-Aligned Bounding Box) for performance

## 🌐 Running Locally

Use a simple HTTP server:

```bash
# Python 3
python -m http.server 8000

# Node.js (http-server)
npx http-server

# VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

Then open `http://localhost:8000`

## 📝 License

MIT
