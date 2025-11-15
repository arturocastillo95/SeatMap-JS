# Changelog

All notable changes to SeatMap JS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
- ESC key to exit Edit Seats mode and Pricing mode
- Input field focus protection (Backspace works normally when typing)
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
- Bounding box calculation includes row labels (excluding hidden labels)
- Section remains selected during Edit Seats mode
- Edit Seats button disabled when no section selected
- Pricing button disabled when no section selected
- Section graphics use stored color instead of hardcoded values

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
