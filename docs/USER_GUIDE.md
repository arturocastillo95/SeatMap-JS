# User Guide

## Getting Started

### Creating Sections

#### Regular Section (with Seats)
1. Click the **Seat Rows** button in the toolbar
2. Click and drag on the canvas to define the section size
3. A confirmation dialog will appear showing the dimensions
4. Click **Keep** to create the section

#### General Admission (GA) Section
1. Click the **GA** button in the toolbar (next to Seat Rows)
2. Click and drag on the canvas to define the area size
3. The section is created immediately with grid snapping
4. You exit GA creation mode automatically

### Selecting Sections

- **Single selection:** Click on a section
- **Multiple selection:** Hold Shift and click additional sections
- **Box selection:** Click and drag on empty canvas to draw a selection rectangle

### Basic Tools

#### Pan Tool
- Click the **Pan** button or hold **Space** key
- Click and drag to move around the canvas
- Scroll wheel to zoom in/out

#### Delete
- Select one or more sections
- Press **Backspace** to delete
- Confirm deletion in the dialog

### Section Properties

When a single section is selected, the right sidebar shows different options based on section type:

#### Regular Section Properties

**Section**
- **Section Title:** Name of the section
- **Section Color:** Color picker and hex input
- **Row Labels:** None, Numbers (1,2,3), or Letters (A,B,C)
  - Position: Left, Right, or both
  - Starting Label: Custom start value
  - Flip: Reverse top-to-bottom order
  - Hidden: Gray out labels for viewer mode
- **Seat Numbering:**
  - Starting number: Custom start value
  - Flip: Reverse left-to-right direction

**Glow Controls**
- **Enable Glow:** Toggle the glow effect on/off
- **Color:** Choose the glow color
- **Opacity:** Adjust transparency (0-1)
- **Strength:** Adjust the size of the glow
- **Blur:** Adjust the softness of the glow (0-20px)

**Align Rows**
Align seats within each row (useful after deleting individual seats):
- **Left:** Align to left side
- **Center:** Center in section
- **Right:** Align to right side

**Transform**
- **Rotate:** -180° to 180°
- **Curve:** 0-100 (creates stadium-style arc)
- **Stretch Horizontal:** 0-100 (adds spacing between seats)
- **Stretch Vertical:** 0-100 (adds spacing between rows)

Each transform has a reset button to return to default (0).

#### GA Section Properties

**Section**
- **Section Title:** Name displayed in center of GA area
- **Section Color:** Color picker and hex input
- **Capacity:** Maximum number of people allowed in this area

**Outline**
- **Width:** Section width in pixels (grid-snapped)
- **Height:** Section height in pixels (grid-snapped)

**Transform**
- **Rotate:** -180° to 180° (resize handles rotate with section)

**Note:** GA sections do not have row labels, seat numbering, or stretch controls.

## Resizing GA Sections

When a single GA section is selected, interactive resize handles appear:

### Using Resize Handles

- **8 handles:** 4 corners + 4 edges
- **Corner handles:** Resize both width and height
- **Edge handles:** Resize one dimension only
- **Large hit area:** 40px for easy grabbing
- **Grid snapping:** Dimensions snap to grid increments
- **Rotation:** Handles rotate with the section

### Tips
- Drag from outside the section - handles have large hit areas
- Use width/height inputs in sidebar for precise sizing
- Handles update in real-time during drag and rotation
- Collision detection prevents overlap with other sections

## Underlay Mode

Use the Underlay feature to import venue blueprints or floor plans as background images.

### Importing an Image

**From File:**
1. Click **Underlay** in the left mode bar
2. Click **Choose Image** button
3. Select a PNG, SVG, or JPG file
4. Image appears at origin (0,0) with default settings

**From URL:**
1. Click **Underlay** in the left mode bar
2. Paste an image URL in the "Image URL" field
3. Click the download button or press Enter
4. Image is fetched and loaded at origin (0,0)

### Positioning the Underlay

**Drag to Move:**
- Click and drag anywhere on the image to reposition
- Real-time position updates in X/Y inputs

**Manual Position:**
- Enter exact X and Y coordinates in the input fields

### Resizing the Underlay

**Interactive Resize:**
- **8 handles:** 4 corners + 4 edges (green squares)
- **Corner handles:** Scale proportionally
- **Edge handles:** Scale in one direction
- Handles stay aligned during resize

**Scale Control:**
- Use the scale slider (10-500%)
- Click reset button to return to 100%

### Adjusting Appearance

**Opacity:**
- Slider control from 0% (transparent) to 100% (opaque)
- Useful for tracing sections over blueprints

**Visibility:**
- Toggle button to show/hide underlay
- Hidden underlays are still saved in file

### Removing Underlay

1. Click **Clear/Remove** button
2. Confirm removal
3. Underlay is deleted from the venue map

### Tips
- Underlay is only interactive in Underlay mode
- Switch to Schema mode to work on sections
- Underlay renders behind sections (layer order: Grid → Underlay → Sections)
- Images are saved as Base64 in the venue file
- Large images may increase file size significantly
- URL-loaded images are converted to Base64 for portability
- Use CORS-enabled image URLs for external loading

## Edit Zones Mode

**Note:** Edit Zones mode is for managing general areas (Zones) that contain sections.

### Creating Zones
1. Click **Edit Zones** in the left mode bar.
2. Click **Create Zone** in the toolbar.
3. Drag on the canvas to create a rectangular zone.

### Joining Zones
You can merge multiple zones into a single complex shape (e.g., L-shaped or U-shaped zones).

1. Switch to **Edit Zones** mode.
2. Create or position two or more zones so they overlap or touch.
3. Select all the zones you want to merge (Shift+Click or drag selection).
4. **Right-click** on the selection.
5. Choose **Join Zones** from the context menu.
6. The zones will be merged into a single polygon, inheriting the properties (color, label) of the first selected zone.

### Zone Properties

## Edit Seats Mode

**Note:** Edit Seats mode is only available for regular sections with individual seats. GA sections cannot enter this mode.

### Entering Edit Seats Mode

1. Select a single **regular** section
2. Click **Edit Seats** in the left mode bar
3. The section remains selected and highlighted
4. Other sections are dimmed

### Selecting Seats

- **Click:** Select individual seat
- **Shift+Click:** Add to selection
- **Drag:** Draw selection rectangle (green)
  - Seats are highlighted in real-time as you drag
- **Shift+Drag:** Add to existing selection

### Deleting Seats

1. Select one or more seats
2. Press **Backspace** to delete
3. Seats are removed immediately

### Special Needs Seats

Mark seats as wheelchair-accessible:

1. **Select seats** in Edit Seats mode (single or multiple)
2. **Seat Properties sidebar** appears on the right
3. Check **"Special Needs Seat"** checkbox
4. Selected seats turn **blue** with **accessibility icon** (♿)
5. Changes are saved in the venue file

**Visual Indicators:**
- Regular seats: Gray with seat number
- Special needs seats: Blue (#2563eb) with accessibility icon

**Features:**
- Toggle on/off for individual or multiple seats
- Indeterminate checkbox state when selection has mixed types
- Persists through file save/load
- Icon uses Material Symbols font (accessible_forward)

### Exiting Edit Seats Mode

- Press **ESC** key
- Click another mode button (Edit Layout, etc.)
- The section remains selected

### After Deleting Seats

When seats are deleted, gaps appear in rows. Use **Align Rows** to:
- Redistribute remaining seats
- Maintain original spacing (gaps preserved)
- Center or align to desired position

## Multi-Section Alignment

When 2+ sections are selected, the alignment bar appears at the bottom:

### Horizontal Alignment
- **Left:** Align left edges
- **Center H:** Align horizontal centers
- **Right:** Align right edges

### Vertical Alignment
- **Top:** Align top edges
- **Center V:** Align vertical centers
- **Bottom:** Align bottom edges

### Distribution
- **Distribute H:** Even horizontal spacing
- **Distribute V:** Even vertical spacing

## Saving and Loading

### Save
1. Click **Save** button in toolbar
2. File downloads as `venue-map-YYYY-MM-DD.json`
3. Uses SMF (Seat Map Format) v2.0.0

### Open
1. Click **Open** button in toolbar
2. Select a `.json` file
3. Current map is cleared
4. Selected map is loaded

**Note:** The file format includes:
- All sections (regular and GA) with positions and transformations
- Individual seat data (supporting deleted seats)
- GA section capacity data
- Row label and seat numbering configurations
- Section colors and pricing information
- Underlay images (Base64-encoded with position, scale, opacity)
- Canvas zoom and pan state

## Keyboard Shortcuts

- **Space:** Hold to activate Pan mode (temporary, won't trigger when typing in input fields)
- **Backspace:** Delete selected sections or seats (won't trigger when typing in input fields)
- **ESC:** Exit Edit Seats mode, Pricing mode, or GA creation mode
- **Shift:** Add to selection (with click or drag)
- **Right-Click:** Open context menu on sections (Edit Seats / Delete)

## Tips

### Choosing Section Types
- **Regular Sections:** Use for assigned seating with individual seat numbers
- **GA Sections:** Use for standing areas, dance floors, lawn areas, or general admission zones

### Working with GA Sections
- Use capacity to track maximum occupancy
- Resize with handles or width/height inputs
- Rotate to match venue layout
- Section name displays in center for easy identification
- Perfect for outdoor venues, festivals, or flexible spaces

### Working with Curved Sections (Regular)
1. Create a standard section
2. Adjust **Curve** slider (0-100)
3. Higher values create more pronounced arcs
4. Curve is auto-limited to prevent self-intersection

### Creating Staggered Seating (Regular)
1. Apply **Stretch Vertical** to add row spacing
2. Optionally use **Curve** for stadium effect
3. Adjust **Stretch Horizontal** for seat spacing

### Custom Row Labeling (Regular)
- Start from any number: 5, 6, 7...
- Start from any letter: C, D, E...
- Reverse for countdown: Z, Y, X...
- Combine reversed with custom start
- Use hidden mode for viewer applications

### Seat Numbering Patterns (Regular)
- Normal (start=1): 1, 2, 3, 4...
- Reversed (start=1): 4, 3, 2, 1
- Odd numbers only: Delete even seats, start=1
- Even numbers only: Delete odd seats, start=2

### After Editing Seats (Regular)
Always use **Align Rows** after deleting seats to:
- Clean up the layout
- Maintain visual consistency
- Prepare for export/presentation

## Troubleshooting

### Selection box not visible
- The section may be rotated or transformed
- Try using Edit Seats mode to see individual seats

### Cannot enter Edit Seats mode
- Ensure exactly one section is selected
- Edit Seats button will be grayed out otherwise

### Deleted seats reappear after loading
- Ensure you saved after deleting seats
- Old v1.0.0 files don't support deleted seats
- Re-save with current version (v2.0.0)

### Labels outside bounding box
- Use Align Rows after adding/removing labels
- This recalculates the section dimensions

## Advanced Features

### Future Viewer Integration
The SMF format is designed for use with separate viewer applications:
- Complete seat and section data
- All styling and positioning information
- Transformation data for accurate rendering
- Extensible metadata fields

Files exported from SeatMap JS can be imported into custom viewers or booking systems.

### Editing Seats

1. Select a single section
2. Click the **Edit Seats** button in the left sidebar (grid icon)
3. The view will zoom into the section
4. Click individual seats to select them (Shift+Click for multiple)

#### Seat Actions
- **Delete:** Press Backspace/Delete key to remove selected seats
- **Special Needs:** Toggle the wheelchair icon in the sidebar to mark as accessible
- **Manual Numbering:** Select a single seat and enter a custom number in the "Seat Number" field
  - This overrides the automatic numbering sequence
  - The custom number is preserved even if you change the section's numbering settings
