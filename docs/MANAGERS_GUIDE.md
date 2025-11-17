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
**Purpose**: Geometric transformations

**Responsibilities**:
- Applying stretch (horizontal/vertical)
- Applying curve transformations
- Calculating safe curve limits
- Aligning rows (left/center/right)
- Recalculating section dimensions

**Key Functions**:
- `applyStretch(section)`
- `applyCurve(section)`
- `calculateMaxCurve(section)`
- `alignRows(section, alignment)`
- `recalculateSectionDimensions(section)`
- `positionSeatsAndLabels(section)`

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
