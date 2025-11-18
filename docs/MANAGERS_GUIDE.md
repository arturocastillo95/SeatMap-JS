# Managers Directory

This directory contains focused, single-responsibility modules that were extracted from the monolithic `sectionManager.js` (1500+ lines).

## 📁 Module Overview

### **SectionFactory.js** (~120 lines)
**Purpose**: Section lifecycle management

**Responsibilities**:
- Creating regular sections
- Creating GA (General Admission) sections
- Registering sections in application state
- Deleting sections with proper cleanup

**Key Functions**:
- `createSection(x, y, width, height, rows, seatsPerRow)`
- `createGASection(x, y, width, height)`
- `registerSection(section)`
- `deleteSection(section)`

---

### **SeatManager.js** (~200 lines)
**Purpose**: Seat creation and management

**Responsibilities**:
- Creating seats with visual elements
- Setting up seat interaction handlers
- Managing seat numbering
- Creating and managing row labels

**Key Functions**:
- `createSeats(section, x, y, width, height, rows, seatsPerRow)`
- `setupSeatInteractions(seat)`
- `updateSeatNumbers(section)`
- `getRowLabelText(index, type, startValue)`
- `createRowLabel(text, isHidden)`

---

### **SectionInteractionHandler.js** (~180 lines)
**Purpose**: User interaction handling

**Responsibilities**:
- Setting up click/hover/right-click handlers
- Managing section selection state
- Showing/hiding selection borders
- Displaying context menus

**Key Functions**:
- `setupSectionInteractions(section)`
- `selectSection(section)`
- `deselectSection(section)`
- `deselectAll()`
- `showContextMenu(x, y, section)`

---

### **ResizeHandleManager.js** (~300 lines)
**Purpose**: GA section resize functionality

**Responsibilities**:
- Creating 8-point resize handles (4 corners + 4 edges)
- Positioning handles with rotation support
- Managing handle interactions (drag, snap to grid)
- Removing handles on deselection

**Key Functions**:
- `addResizeHandles(section)`
- `updateHandlePositions(section)`
- `removeResizeHandles(section)`
- `setupHandleInteractions(handle)`

**Features**:
- 40px hit areas for easy grabbing
- Grid snapping during resize
- Rotation-aware positioning
- Custom events for collision detection

---

### **SectionTransformations.js** (~350 lines)
**Purpose**: Geometric transformations with deleted seat support

**Responsibilities**:
- Applying stretch (horizontal/vertical) with negative value support
- Applying curve transformations (theater-style upward arc)
- Calculating safe curve limits
- Aligning rows (left/center/right)
- Preserving alignment and gaps when seats are deleted
- Recalculating section dimensions
- Rebuilding corrupted base positions from row/column indices

**Key Functions**:
- `applyStretch(section, { skipLayout })` - Apply stretch with optional dimension recalculation skip
- `applyStretchTransform(section)` - Core stretch logic preserving alignment
- `applyCurve(section, { skipLayout })` - Apply curve with optional dimension recalculation skip
- `applyCurveTransform(section)` - Core curve logic with virtual grid concept
- `calculateMaxCurve(section)`
- `alignRows(section, alignment)`
- `recalculateSectionDimensions(section)`
- `positionSeatsAndLabels(section)`
- `rebuildBasePositions(section)` - Reconstructs clean 24px grid from rowIndex/colIndex

**Virtual Grid Concept**:
All transformations treat seats as if they exist on a complete virtual grid, where deleted seats leave logical gaps but don't affect calculations. This ensures:
- Alignment (left/center/right) is preserved during transformations
- Gaps from deleted seats remain consistent
- Stretch and curve work correctly with edited sections

**Stretch Transformation Algorithm**:
```javascript
// 1. Group seats by row (baseRelativeY)
// 2. For each row independently:
//    - Sort by colIndex (not position!)
//    - Find min/max colIndex to determine virtual row width
//    - Calculate alignment offset based on section.rowAlignment
//    - Position each seat: baseX + alignmentOffset + (colIndex offset * effectiveSpacing)
// 3. Vertical: Apply stretch delta based on row array index
```

**Key Principles**:
- Uses `colIndex` to preserve logical grid positions (not compact array indices)
- Calculates alignment offset per row based on width difference
- Standard 24px `GRID_SPACING` defines logical structure
- `effectiveSpacing = GRID_SPACING + stretch` for visual spacing
- Processes each row independently to maintain row-specific alignment

**Curve Transformation Algorithm**:
```javascript
// 1. Find longest row (by width) and use its center as curve's vertical axis
// 2. Calculate stable logical columns for ALL seats:
//    _logicalCol = round((baseX - worldCenterX) / GRID_SPACING)
//    Uses BASE spacing (24px), not stretched spacing!
// 3. For each row:
//    rowFlatY = topBaseY + rowIndex * effectiveSpacingY
//    r = baseR + rowIndex * effectiveSpacingY
// 4. For each seat:
//    theta = (effectiveSpacingX / r) * _logicalCol
//    x = worldCenterX + r * sin(theta)
//    y = rowFlatY - r * (1 - cos(theta))  // Subtract for upward curve!
```

**Key Principles**:
- Longest row's center defines the curve's axis of symmetry
- Logical columns calculated from BASE spacing (stable across stretch values)
- `effectiveSpacingX` affects arc length spacing, not logical positions
- Subtracts `curveDY` to create upward theater-style curve
- Works correctly with left/center/right alignments

**Recent Changes (November 2024)**:
- **MAJOR REWRITE**: Complete overhaul of stretch and curve algorithms
- Stretch now preserves row alignment (left/center/right) with deleted seats
- Curve now uses longest row center as axis, maintaining alignment
- Logical columns calculated from base spacing, not stretched spacing
- Fixed curve direction (now curves upward, not downward)
- Added early exit when stretch/curve is zero (performance)
- Clearer variable names: `rowFlatY`, `curveDY`, `worldCenterX`, `_logicalCol`
- Added `skipLayout` parameter for multi-section alignment
- Added `rebuildBasePositions()` for fixing corrupted files
- Extended stretch range to -80 to 100 with MIN_SPACING enforcement

---

### **alignmentManager.js** (~1000 lines)
**Purpose**: Multi-section alignment and distribution

**Responsibilities**:
- Aligning multiple sections (left, right, top, bottom, center horizontal/vertical)
- Distributing sections evenly (horizontal/vertical)
- Collision detection and resolution during alignment
- Preserving section transformations during alignment operations

**Key Functions**:
- `alignLeft()` - Align selected sections to leftmost edge
- `alignRight()` - Align selected sections to rightmost edge
- `alignTop()` - Align selected sections to topmost edge
- `alignBottom()` - Align selected sections to bottommost edge
- `alignCenterHorizontal()` - Align selected sections to horizontal center
- `alignCenterVertical()` - Align selected sections to vertical center
- `distributeHorizontal()` - Space sections evenly along X axis
- `distributeVertical()` - Space sections evenly along Y axis

**Recent Changes**:
- **MAJOR REWRITE**: All 6 alignment methods completely rewritten to treat sections as rigid blocks
- **OLD PATTERN (REMOVED)**: Three-phase flatten/restore approach that was causing dimension recalculation
  - Step 1: Save transforms, flatten all to base positions
  - Step 2: Align flattened sections
  - Step 3: Restore transforms (caused recalculateSectionDimensions)
- **NEW PATTERN (IMPLEMENTED)**: Simple two-step rigid-block approach
  - Step 1: Apply transforms with `skipLayout: true` to prevent dimension changes
  - Step 2: Align section positions, then call `positionSeatsAndLabels()`
- **Benefits**: Sections maintain their internal row alignment (left/center/right) during multi-section operations
- **Status**: Implementation complete, awaiting testing

---

## 🎯 Design Principles

### Single Responsibility Principle (SRP)
Each manager has **one clear purpose**. Changes to one concern don't affect others.

### Low Coupling
Managers **don't depend on each other**. The unified SectionManager coordinates them.

### High Cohesion
Related functionality is **grouped together** in the same module.

### Easy Testing
Each manager can be **tested independently** without complex setup.

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────┐
│      Unified SectionManager             │
│      (sectionManagerNew.js)             │
│                                         │
│  Coordinates and delegates to:          │
└────────────┬────────────────────────────┘
             │
             ├──────────┐
             │          │
    ┌────────▼─────┐   ├──────────────┐
    │ Section      │   │              │
    │ Factory      │   │  Seat        │
    │              │   │  Manager     │
    └──────────────┘   └──────────────┘
             │
             ├──────────────────────┐
             │                      │
    ┌────────▼──────────┐  ┌───────▼──────────┐
    │ Interaction       │  │  Resize Handle   │
    │ Handler           │  │  Manager         │
    └───────────────────┘  └──────────────────┘
             │
    ┌────────▼──────────┐
    │ Transformations   │
    │                   │
    └───────────────────┘
```

---

## 🔌 Usage Examples

### Creating a Section
```javascript
import { SectionFactory } from './managers/SectionFactory.js';

const section = SectionFactory.createSection(100, 100, 200, 150, 5, 10);
SectionFactory.registerSection(section);
```

### Adding Seats
```javascript
import { SeatManager } from './managers/SeatManager.js';

SeatManager.createSeats(section, 100, 100, 200, 150, 5, 10);
SeatManager.setupSeatInteractions(seat);
```

### Handling Interactions
```javascript
import { SectionInteractionHandler } from './managers/SectionInteractionHandler.js';

SectionInteractionHandler.setupSectionInteractions(section);
SectionInteractionHandler.selectSection(section);
```

### Adding Resize Handles (GA sections)
```javascript
import { ResizeHandleManager } from './managers/ResizeHandleManager.js';

ResizeHandleManager.addResizeHandles(gaSection);
ResizeHandleManager.updateHandlePositions(gaSection);
```

### Applying Transformations
```javascript
import { SectionTransformations } from './managers/SectionTransformations.js';

section.stretchH = 5;
section.stretchV = 3;
SectionTransformations.applyStretch(section);

section.curve = 25;
SectionTransformations.applyCurve(section);
```

---

## 🧪 Testing

Each manager can be unit tested:

```javascript
// Test SectionFactory
import { SectionFactory } from './managers/SectionFactory.js';
const section = SectionFactory.createSection(0, 0, 100, 100, 5, 10);
assert(section instanceof Section);

// Test SeatManager
import { SeatManager } from './managers/SeatManager.js';
const labelText = SeatManager.getRowLabelText(0, 'letters', 'A');
assert(labelText === 'A');

// Test transformations
import { SectionTransformations } from './managers/SectionTransformations.js';
const maxCurve = SectionTransformations.calculateMaxCurve(section);
assert(maxCurve > 0 && maxCurve <= 100);
```

---

## 📚 Related Documentation

- **Main Refactoring Guide**: `../docs/REFACTORING_GUIDE.md`
- **Migration Checklist**: `../MIGRATION_CHECKLIST.md`
- **Section Class**: `../Section.js` (type-safe with validation)
- **Visual Config**: `../config.js` (VISUAL_CONFIG constants)

---

## 🔄 Backward Compatibility

The unified `SectionManager` maintains **100% backward compatibility**.

All existing code continues to work:
```javascript
// Old code still works!
import { SectionManager } from './sectionManagerNew.js';

const section = SectionManager.createSection(0, 0, 200, 150, 5, 10);
SectionManager.selectSection(section);
SectionManager.applyStretch(section);
```

Internally, it delegates to the appropriate manager.

---

## 🚀 Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **File Size** | 1500+ lines | ~150-350 per module |
| **Responsibility** | Everything | Single purpose |
| **Testing** | Difficult | Easy (isolated) |
| **Navigation** | Hard to find code | Clear module names |
| **Maintenance** | High risk | Low risk |
| **Coupling** | Tight | Loose |

---

## 📞 Questions?

Refer to:
- Code comments in each file
- `docs/REFACTORING_GUIDE.md` for detailed info
- Git commit history for context

---

**Last Updated**: November 15, 2025
