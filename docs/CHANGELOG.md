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
- Seat numbering starting point control
- Seat numbering direction flip (left-to-right or right-to-left)
- ESC key to exit Edit Seats mode
- Input field focus protection (Backspace works normally when typing)
- Letter labeling pattern: AA, BB, CC after Z

### Changed
- SMF format upgraded to v2.0.0
- File format now includes individual seat data
- File format supports deleted seats
- Bounding box calculation includes row labels
- Section remains selected during Edit Seats mode
- Edit Seats button disabled when no section selected

### Fixed
- Bounding box not resizing after row label removal
- Section deselection on canvas click in Edit Seats mode
- Labels positioned outside bounding box after alignment
- Seat selection lag behind selection rectangle

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
