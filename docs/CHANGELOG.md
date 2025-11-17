# Changelog

All notable changes to SeatMap JS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **General Admission (GA) sections** for standing/open areas without individual seats
  - GA button in toolbar next to Seat Rows
  - Drag-to-create rectangular GA areas with grid snapping
  - Center-aligned section label showing section name
  - Capacity control instead of seat count
  - Width and height inputs with grid snapping
  - Interactive 8-point resize handles (corners + edges) with large hit areas (40px)
  - Resize handles rotate with section rotation
  - Handles update in real-time during section drag and rotation
  - Handles only visible when single GA section selected
  - Auto-exit GA creation mode after drawing
  - Hide Edit Seats option for GA sections in context menu
  - Custom drag info showing dimensions instead of seat count
  - Conditional sidebar showing capacity and size controls instead of seat options
  - Hide stretch controls for GA sections (not applicable)
  - Grid-snapped dimensions when resizing with handles
  - Collision detection and resolution for GA sections
  - Bounding box updates correctly when resizing
- Edit Seats mode with drag-to-select functionality
- Live visual feedback during seat selection with green highlighting
- Multi-select support with Shift key
- Seat deletion with Backspace key
- Align Rows feature (left/center/right alignment)
- Smart gap preservation for deleted seats during row alignment
- Row label starting point customization (numbers from any value, letters from A-Z)
- Row label flip button to reverse top-to-bottom order
- Row label hidden mode with 65% opacity (for viewer mode)
- Seat numbering starting point control
- Seat numbering direction flip (left-to-right or right-to-left)
- ESC key to exit Edit Seats mode, Pricing mode, and GA creation mode
- Input field focus protection (Backspace and Space work normally when typing)
- Letter labeling pattern: AA, BB, CC after Z
- Section color customization with color picker and hex input
- Pricing mode for setting base prices and service fees per section
- Service fee support (fixed dollar amount or percentage)
- Auto-exit pricing mode when section deselected
- Context menu on section right-click (Edit Seats / Delete Section)
- Context menu uses same confirmation dialog as toolbar delete
- Collapsible accordion sections in sidebar for better organization
- Improved sidebar design with bordered containers per section

### Changed
- SMF format upgraded to v2.0.0
- File format now includes individual seat data
- File format supports deleted seats
- File format includes section colors and pricing data
- **File format supports GA sections** with `type: "ga"` and `ga.capacity` fields
- Total venue capacity calculation includes GA section capacity
- Bounding box calculation includes row labels (excluding hidden labels)
- Section remains selected during Edit Seats mode
- Edit Seats button disabled when no section selected
- Pricing button disabled when no section selected
- Section graphics use stored color instead of hardcoded values
- Resize handles added to section layer instead of as section children for better event handling
- **Refactored monolithic SectionManager (1500+ lines) into focused modules**:
  - `managers/SectionFactory.js` - Section creation and deletion (~120 lines)
  - `managers/SeatManager.js` - Seat operations (~200 lines)
  - `managers/SectionInteractionHandler.js` - User interactions (~180 lines)
  - `managers/ResizeHandleManager.js` - GA resize handles (~300 lines)
  - `managers/SectionTransformations.js` - Stretch, curve, alignment (~350 lines)
  - Unified SectionManager delegates to specialized managers
  - Maintains 100% backward compatibility
  - Follows SOLID principles for better maintainability
- **Code quality improvements**:
  - Added type-safe Section class with validation (prevents runtime errors)
  - Centralized visual constants to VISUAL_CONFIG (no more magic numbers)
  - Removed 80% code duplication between createSection and createGASection

### Fixed
- Bounding box not resizing after row label removal
- Bounding box includes hidden labels in calculations
- Section deselection on canvas click in Edit Seats mode
- Labels positioned outside bounding box after alignment
- Seat selection lag behind selection rectangle
- Section color lost when adding labels or transforming
- Collision detection not accounting for section pivot point
- Section dragging collision detection using wrong coordinates
- Section alignment not accounting for pivot point
- Section selection hit area not matching visual bounds
- Zoom to fit not accounting for pivot point and labels
- Resize handles not rotating with GA section rotation
- Resize handles not moving with section during drag
- Resize handles remaining visible after deselection
- Space key preventing input in text fields
- Resize handle hit areas too small for easy interaction
- Resize handles not working outside section bounds
- Circular dependency between SectionManager and AlignmentManager resolved with events
- **Alignment tool now properly handles curved and stretched sections**
- **Drag threshold prevents accidental drags (5px minimum movement)**
- **Rotation slider displays correctly in -180 to 180 range**
- **Section selection immediately updates sidebar values**

## [0.1.0] - Initial Release

### Added
- Basic section creation with seat rows
- Section selection and multi-selection
- Alignment tools (left, center, right, top, bottom, middle)
- Distribution tools (horizontal and vertical)
- Section rotation with slider control
- Horizontal and vertical stretch transformations
- Curve transformation for stadium-style seating
- Row labels (numbers or letters) with left/right positioning
- Save/Load functionality with SMF v1.0.0 format
- Zoom and pan controls
- Collision detection and prevention
- Grid background
- Toolbar with material design icons
- Sidebar with section properties
- Delete section with confirmation dialog
