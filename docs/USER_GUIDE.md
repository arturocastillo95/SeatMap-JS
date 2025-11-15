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
