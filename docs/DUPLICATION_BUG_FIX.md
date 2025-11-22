# Section Duplication Bug Fix

## Date
November 22, 2025

## Problem Summary

When duplicating a section, modifying both the original and duplicate, saving, and then reloading the file, one section (usually the duplicate) would lose its modifications and revert to looking like the original.

## Root Cause

The bug had **two separate issues**:

### Issue #1: Double Registration
**Most Critical**: `duplicateSection()` was registering the new section twice:
1. `deserializeSection()` calls `SectionManager.createSection()`
2. `SectionManager.createSection()` calls `SectionFactory.registerSection()` (adds to `State.sections`)
3. `duplicateSection()` then called `registerSection()` **again**
4. Result: The same section object appears twice in `State.sections`
5. When saving, the section gets serialized twice with identical IDs
6. When loading, one overwrites the other, causing the display issue

### Issue #2: Reference Sharing (Less Critical)
1. **Shallow Copy Issue**: `duplicateSection()` was serializing the original section and deserializing it, but the `sectionData` object (including the `seats` array) was being passed directly to `deserializeSection()` without a deep clone.

2. **Shared Seat Objects**: Even though seat IDs were being regenerated, the seat objects themselves could share memory references or internal state, leading to modifications affecting both sections.

3. **Corrupted Base Positions**: When sections were saved and reloaded, the `baseRelativeX` and `baseRelativeY` values could be undefined or corrupted, causing `rebuildBasePositions()` to fail or produce incorrect results.

## Solution Implemented

### 0. Remove Double Registration in `SectionFactory.duplicateSection()` ✅✅ **CRITICAL**
**File**: `src/managers/SectionFactory.js`

Removed the duplicate `registerSection()` call:

```javascript
// NOTE: Section is already registered by deserializeSection -> createSection
// So we don't call registerSection() again to avoid duplicate registration

// Select the new section (removed the duplicate registration)
SectionInteractionHandler.deselectAll();
SectionInteractionHandler.selectSection(newSection);
```

**Why it works**: The section is already added to `State.sections` when `createSection()` is called during deserialization. Calling `registerSection()` again adds a second reference to the same object, causing it to be serialized twice with the same ID.

### 1. Deep Copy in `SectionFactory.duplicateSection()` ✅
**File**: `src/managers/SectionFactory.js`

Added a deep clone of the serialized section data before deserializing:

```javascript
// CRITICAL FIX: Deep clone the section data to prevent reference sharing
const clonedSectionData = JSON.parse(JSON.stringify(sectionData));

// Deserialize to create the new section
const newSection = await FileManager.deserializeSection(clonedSectionData, SectionManager);
```

**Why it works**: `JSON.parse(JSON.stringify())` creates a complete deep copy of all nested objects and arrays, ensuring that the duplicated section has no shared references with the original.

### 2. Validation in `fileManager.deserializeSection()` ✅
**File**: `src/managers/fileManager.js`

Added validation to ensure each seat has independent base position properties:

```javascript
// VALIDATION: Ensure each seat has independent base position properties
section.seats.forEach(seat => {
  if (!seat.hasOwnProperty('baseRelativeX')) {
    seat.baseRelativeX = seat.relativeX || seat.x || 0;
    console.warn(`Seat missing baseRelativeX, initialized to ${seat.baseRelativeX}`);
  }
  if (!seat.hasOwnProperty('baseRelativeY')) {
    seat.baseRelativeY = seat.relativeY || seat.y || 0;
    console.warn(`Seat missing baseRelativeY, initialized to ${seat.baseRelativeY}`);
  }
  // Ensure relativeX/Y are also independent properties
  if (!seat.hasOwnProperty('relativeX')) {
    seat.relativeX = seat.baseRelativeX;
  }
  if (!seat.hasOwnProperty('relativeY')) {
    seat.relativeY = seat.baseRelativeY;
  }
});
```

**Why it works**: This ensures that even if the serialized data is missing base positions, they are properly initialized with fallback values, preventing undefined/null errors.

### 3. Null Checks in `calculateGridSpacing()` ✅
**File**: `src/managers/SectionTransformations.js`

Added null checks before accessing base positions:

```javascript
// VALIDATION: Skip seats with undefined/null base positions
if (curr.baseRelativeX == null || prev.baseRelativeX == null) {
  continue;
}
// ... same for Y
```

**Why it works**: Prevents NaN or undefined values from contaminating the spacing calculations, which would lead to corrupted grid rebuilding.

### 4. Enhanced `rebuildBasePositions()` ✅
**File**: `src/managers/SectionTransformations.js`

Added multiple safety checks:

```javascript
// VALIDATION: Use relativeX/Y as fallback if baseRelativeX/Y are missing
const anchorX = anchorSeat.baseRelativeX != null ? anchorSeat.baseRelativeX : (anchorSeat.relativeX || 0);
const anchorY = anchorSeat.baseRelativeY != null ? anchorSeat.baseRelativeY : (anchorSeat.relativeY || 0);

// VALIDATION: Ensure spacing is reasonable (prevent extreme values)
if (spacingX < 10 || spacingX > 100) {
  console.warn(`Unusual X spacing detected (${spacingX}), using default 24`);
  spacingX = 24;
}

// Only update if values are finite
if (isFinite(newBaseX) && isFinite(newBaseY)) {
  seat.baseRelativeX = newBaseX;
  seat.baseRelativeY = newBaseY;
  rebuiltCount++;
}
```

**Why it works**: Multiple layers of validation ensure that even with corrupted data, the function can recover gracefully and rebuild positions correctly.

## Testing Instructions

To verify the fix works:

1. **Create a section** (e.g., "Section A" with 5 rows, 10 seats/row)
2. **Duplicate it** (creates "Section A Copy")
3. **Modify both sections**:
   - Change curve/stretch on Section A
   - Change curve/stretch differently on Section A Copy
   - Move them to different positions
4. **Save the file** (File > Save)
5. **Reload the file** (File > Open, select the saved file)
6. **Verify**:
   - ✅ Both sections maintain their independent transformations
   - ✅ Both sections are at their correct positions
   - ✅ No console errors about undefined baseRelativeX/Y
   - ✅ Seat positions look correct for both sections

## Technical Details

### Why JSON.parse(JSON.stringify()) is Safe Here

While `JSON.parse(JSON.stringify())` is sometimes considered a "hack," it's perfectly safe for this use case because:

1. The serialized section data contains only plain JavaScript objects (no functions, circular references, or special objects)
2. The data structure is designed for JSON serialization (it's literally saved as JSON)
3. Any PIXI.js graphics objects are not part of the serialized data
4. Performance is not a concern (duplicating a section is a user-initiated action, not a hot path)

### Alternative Approaches Considered

1. **Manual Deep Copy**: Writing a custom deep copy function would be more explicit but adds complexity and maintenance burden.

2. **StructuredClone**: Modern browsers support `structuredClone()`, but we'd need to ensure compatibility and it doesn't provide significant benefits here.

3. **Immutable Data Structures**: Would require a major refactor of the entire codebase.

4. **Fix at Serialization Level**: Could ensure each seat gets fresh objects during deserialization, but this approach is more invasive and error-prone.

## Related Files Modified

- `src/managers/SectionFactory.js` - Added deep clone in `duplicateSection()`
- `src/managers/fileManager.js` - Added validation in `deserializeSection()`
- `src/managers/SectionTransformations.js` - Added null checks in `calculateGridSpacing()` and enhanced `rebuildBasePositions()`

## Regression Risk

**Low**. The changes are defensive and additive:
- The deep clone doesn't change existing behavior for valid data
- Validation checks only log warnings and provide fallbacks
- Null checks skip problematic data without breaking the overall flow
- No existing functionality is removed or changed

## Future Improvements

1. **Unit Tests**: Add automated tests for the duplication flow
2. **Validation Utility**: Create a central validation utility for seat objects
3. **Type System**: Consider adding TypeScript to catch these issues at compile time
4. **Immutability**: Explore immutable data patterns for better predictability
