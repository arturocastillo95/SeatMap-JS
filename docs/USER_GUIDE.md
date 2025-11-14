# User Guide

## Getting Started

### Creating Your First Section

1. Click the **Seat Rows** button in the toolbar
2. Click and drag on the canvas to define the section size
3. A confirmation dialog will appear showing the dimensions
4. Click **Keep** to create the section

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

When a single section is selected, the right sidebar shows:

#### Section
- **Section Title:** Name of the section
- **Row Labels:** None, Numbers (1,2,3), or Letters (A,B,C)
  - Position: Left, Right, or both
  - Starting Label: Custom start value
  - Flip: Reverse top-to-bottom order
- **Seat Numbering:**
  - Starting number: Custom start value
  - Flip: Reverse left-to-right direction

#### Align Rows
Align seats within each row (useful after deleting individual seats):
- **Left:** Align to left side
- **Center:** Center in section
- **Right:** Align to right side

#### Transform
- **Rotate:** -180° to 180°
- **Curve:** 0-100 (creates stadium-style arc)
- **Stretch Horizontal:** 0-100 (adds spacing between seats)
- **Stretch Vertical:** 0-100 (adds spacing between rows)

Each transform has a reset button to return to default (0).

## Edit Seats Mode

### Entering Edit Seats Mode

1. Select a single section
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
- All sections with positions and transformations
- Individual seat data (supporting deleted seats)
- Row label and seat numbering configurations
- Canvas zoom and pan state

## Keyboard Shortcuts

- **Space:** Hold to activate Pan mode (temporary)
- **Backspace:** Delete selected sections or seats
- **ESC:** Exit Edit Seats mode or cancel create mode
- **Shift:** Add to selection (with click or drag)

## Tips

### Working with Curved Sections
1. Create a standard section
2. Adjust **Curve** slider (0-100)
3. Higher values create more pronounced arcs
4. Curve is auto-limited to prevent self-intersection

### Creating Staggered Seating
1. Apply **Stretch Vertical** to add row spacing
2. Optionally use **Curve** for stadium effect
3. Adjust **Stretch Horizontal** for seat spacing

### Custom Row Labeling
- Start from any number: 5, 6, 7...
- Start from any letter: C, D, E...
- Reverse for countdown: Z, Y, X...
- Combine reversed with custom start

### Seat Numbering Patterns
- Normal (start=1): 1, 2, 3, 4...
- Reversed (start=1): 4, 3, 2, 1
- Odd numbers only: Delete even seats, start=1
- Even numbers only: Delete odd seats, start=2

### After Editing Seats
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
