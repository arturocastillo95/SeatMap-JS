# Changelog

All notable changes to SeatMap JS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-12-03

### Added

- **SMF Validator Module** (`src/core/smfValidator.js`) - Comprehensive file format validation
  - Validates all SMF file fields against schema defined in FILE_FORMAT.md
  - Returns detailed errors and warnings for debugging
  - Validates: root fields, venue, location, coordinates, canvas, underlay, sections, seats, styles
  - Supports both sparse format (v2.1.0+) and legacy format (v2.0.0)
  - Checks for duplicate section/seat IDs
  - `validate(data)` - Full validation returning `{ valid, errors, warnings }`
  - `isValid(data)` - Quick boolean check
  - `formatResults(results)` - Human-readable output

### Changed

- **File Import Validation** - Enhanced `fileManager.js` import process
  - Now uses SMFValidator for comprehensive validation on file load
  - Shows detailed error messages when validation fails
  - Logs warnings for non-critical issues
  - Better error reporting to users via alert

- **Venue Location Structure** - Updated venue object in saved files
  - Changed from flat `location` string to structured object
  - Now includes: `address`, `city`, `state`, `country`, `coordinates` (lat/lng)
  - Matches FILE_FORMAT.md specification

### Fixed

- **FILE_FORMAT.md** - Updated documentation to match actual implementation
  - Corrected venue.location structure (was string, now object)

## [Unreleased]

### Added - Demo & Visual Enhancements (December 2025)

- **Bundled Demo Version** (`demo-booking-bundled.html`) - UMD build alternative to ES modules
  - Uses `dist/seatmap-renderer.umd.js` bundle with CDN PixiJS
  - Same functionality as `demo-booking.html` but without ES module imports
  - Useful for simpler deployment or environments without module support

### Fixed - Accessibility Icon Rendering

- **Material Symbols Font Weight** - Fixed accessibility icons showing raw text instead of wheelchair icon
  - Changed font weight from `wght=400` to `wght=300` in demo HTML files
  - Matches renderer's `document.fonts.load("300 14px 'Material Symbols Outlined'")` call
  - Ensures consistent icon rendering for special needs seats

### Changed - File Format

- **Underlay Dimensions in Save Data** - Now stores underlay image dimensions
  - Added `width` and `height` fields to underlay save data in `fileManager.js`
  - Enables pre-sizing containers before image loads (improves layout stability)
  - Values sourced from `State.underlaySprite.originalWidth/Height`

---

### Added - Visual Enhancements (November 2025)

- **Background Grid** - Configurable grid pattern behind the map
  - New configuration options: `showGrid`, `gridColor`, `gridSize`, `gridLineWidth`
  - Grid rendered behind all content for subtle visual depth
  - Runtime methods: `setGridColor(color)`, `setGridVisible(show)`
  - Automatically re-renders on viewport resize

- **Orphan Seat Highlight Animation** - Visual feedback when orphan prevention blocks an action
  - Orphan seats flash with a coral/red warning color (`0xff6b6b`)
  - Smooth pulse animation (2 pulses over 1.5 seconds)
  - Gradually fades back to original color
  - Fully configurable via options:
    - `orphanHighlightEnabled` (default: true) - Enable/disable animation
    - `orphanHighlightColor` (default: 0xff6b6b) - Warning highlight color
    - `orphanHighlightDuration` (default: 1500ms) - Animation duration
    - `orphanHighlightPulseScale` (default: 1.3) - Scale factor for pulse
  - Animation runs automatically in renderer (no consumer code needed)

- **Enhanced Demo Booking Page** (`demo-booking.html`)
  - **Mobile Top Bar**: Compact event info header for mobile devices
  - **Event Details Modal**: Full event info accessible via "Ver más" link
  - **Sticky Event Header**: Desktop sidebar header with scroll shadow effect
  - **Alert Notifications**: Map overlay alerts for selection limits and orphan blocks
  - **Improved Sidebar**: Wider (420px), better shadow, cleaner visual hierarchy

### Changed

- **Section Zoom Behavior** - Desktop-optimized zoom targeting
  - On desktop, section zoom centers on section (not tap point)
  - On mobile/touch, zoom centers on tap point for intuitive UX
  - Zone containers correctly use pivot for center calculations

- **ViewportManager** - Improved section centering
  - Section zoom now correctly uses container's center position (pivot-based)
  - Clearer code comments explaining coordinate calculations

### Added - Booking Demo (November 2025)

- **Complete Ticket Booking Demo** (`demo-booking.html`) - Production-ready reference implementation
  - **Responsive Layout**: Desktop sidebar (380px) + mobile bottom sheet drawer
  - **Section List**: Displays all sections with colors, pricing, sorting (price high/low)
  - **Selection View**: Shows selected tickets with individual removal via trash button
  - **Purchase Footer**: Sticky footer with total price and purchase button
  - **Mobile Drawer**: Collapsible/expandable with drag handle, raises above footer when active
  - **Map Integration**: Zoom-to-section on click, auto-hide notice banner
  - **Dynamic Viewport**: CSS `dvh` units + JavaScript `--real-vh` for mobile browser chrome handling

- **New Renderer Methods**:
  - `getSections(options)` - Returns sections with `color` property (hex string from seat/section color)
  - `deselectSeat(seatId)` - Programmatically remove a specific seat from selection
  - `decreaseGASelection(sectionId)` - Reduce GA quantity by 1 for a section
  - `fitToSections(padding)` - Fit viewport to all sections with optional padding

- **New Renderer Options**:
  - `showControls` (default: true) - Show/hide default map controls (zoom, center buttons)
  - `fitToSectionsPadding` (default: 50) - Padding for fitToSections calculations

- **Cart Data Enhancements**:
  - Seats now include: `sectionId`, `sectionName`, `row`, `seat`, `color` (hex string)
  - GA selections now include: `color` (hex string from section color)

- **Documentation**:
  - New `BOOKING_DEMO.md` with complete integration guide
  - Updated `README.md` with demo section

### Added - Performance & Responsiveness (November 2025)

- **Progressive Loading** - Optimized map loading for instant visual feedback
  - **Two-Phase Rendering**: Zones/GA sections render first (instant), seated sections render progressively
  - **Chunked Seat Rendering**: Seats render in configurable batches (default 200) using requestAnimationFrame
  - **Deferred Seat Labels**: PIXI.Text objects created on hover instead of upfront (saves memory/CPU)
  - **Loading Events**: New events for UI integration:
    - `mapZonesLoaded` - Fired when zones are visible (Phase 1 complete)
    - `seatLoadProgress` - Progress updates during seat loading
    - `mapFullyLoaded` - Fired when all content is rendered
  - **Abort Support**: Loading can be cancelled when new data is loaded
  - Configurable via options:
    - `seatChunkSize` (default: 200) - Seats per animation frame
    - `deferSeatLabels` (default: true) - Defer label creation

- **Responsive Viewport** - Automatically adapts to container size changes
  - **ResizeObserver**: Watches container element directly (not just window resize)
  - **Debounced Handling**: 100ms debounce prevents excessive recalculations
  - **Smart Re-fitting**: 
    - At overview level: Re-fits content to new viewport
    - While zoomed in: Maintains relative zoom level and re-centers
  - **Constraint Updates**: Recalculates bounds for proper panning limits
  - **Proper Cleanup**: ResizeObserver disconnected on destroy()

### Added - GA Section Enhancements (November 2025)

- **Mobile-Optimized Touch UX** - Enhanced touch interactions for mobile devices
  - **Tap-Centered Zoom**: Tapping a zone zooms centered on tap point, not zone center
  - **Double-Tap Zoom**: Double-tap for deeper zoom (configurable boost levels)
  - **Gesture Detection**: Distinguishes taps from gestures (pinch/pan) to prevent accidental actions
  - **Gesture Cooldown**: Brief cooldown after gestures prevents accidental taps
  - **Larger Seat Hit Areas**: Configurable hit area scale for easier tapping on mobile (default 2x)
  - **Zoom-Required Selection**: On mobile, requires zooming in before seat selection to prevent accidental picks
  - **Touch Tooltip Disabled**: Tooltips don't show on touch devices (hover not applicable)
  - All behaviors configurable via options:
    - `tapZoomBoost` (default: 1.3) - Single tap zoom multiplier
    - `doubleTapZoomBoost` (default: 2.0) - Double tap zoom multiplier  
    - `doubleTapMaxDelay` (default: 300ms) - Max time between taps for double-tap
    - `mobileRequireZoomForSelection` (default: true) - Require zoom before selection
    - `mobileMinZoomForSelection` (default: 1.5) - Min zoom ratio for selection
    - `mobileSeatHitareaScale` (default: 2.0) - Hit area multiplier on touch devices

- **GA Label Customization** - Full control over General Admission section labels (non-zone)
  - Font size slider (8-72px) in sidebar
  - Label color picker with hex input
  - X/Y offset sliders (-200 to +200) for precise positioning
  - Real-time visual updates in editor
  - Persists in file save/load format (`gaLabelFontSize`, `gaLabelColor`, `gaLabelOffsetX`, `gaLabelOffsetY`)
  - Renderer support with proper rotation handling

- **GA Quantity Selection Dialog** - Interactive ticket selection for GA sections in renderer
  - Click on any GA section to open selection dialog
  - Quantity +/- buttons with smooth UI
  - Respects `maxSelectedSeats` limit across seats AND GA tickets combined
  - Inventory support with available quantity limits
  - Styled modal matching existing tooltip design
  - `gaSelectionConfirm` and `ga-selection-change` events dispatched

- **Unified Cart with GA Support** - Single cart for seats + GA tickets
  - `CartManager` now accepts `gaSelections` array
  - Cart data includes `seatCount`, `gaCount`, and `totalCount`
  - `cartChange` event includes both `seats` and `ga` arrays
  - Price totals include GA ticket prices

- **GA Tooltip on Hover** - Shows section info when hovering GA sections
  - Displays section name, price, and "General Admission" category
  - Uses section color for footer styling
  - Hides row/seat columns (not applicable for GA)

- **New Module: GASelectionManager** - Dedicated manager for GA interactions
  - `renderer/interaction/GASelectionManager.js`
  - Handles dialog UI, inventory, and selection state
  - Methods: `show()`, `confirm()`, `getSelectionsArray()`, `clearAll()`
  - Integrates with SelectionManager for combined limit enforcement

### Changed

- **SelectionManager** - Now accounts for GA selections in limit checks
  - `isLimitReached()` includes GA ticket count
  - Added `getRemainingSlots()` method
  - Added `setGASelectionCountGetter()` for cross-manager communication

- **Renderer GA Behavior** - GA sections no longer fade on zoom
  - GA sections remain at full opacity at all zoom levels
  - Only Zone sections fade based on zoom (semantic zoom)
  - GA sections marked with `container.isGASection = true`

- **Tooltip Row Handling** - Intelligently hides row column
  - When `content.row === null`, the row column is hidden entirely
  - Cleaner display for GA and other non-seat elements

### Fixed

- **GA Label Duplication Bug** - Old labels no longer persist when renaming GA sections
  - `createGALabel()` now removes existing label before creating new one
  - Matches pattern used by `createZoneLabel()`

---

### Added - Modular Architecture (Previous)
- **Modular Renderer Architecture** - Major refactoring of the ~2000-line monolithic `SeatMapRenderer` into a clean, modular architecture
  - **Core Modules**:
    - `TextureCache.js` - Seat texture creation and caching for performance optimization
    - `ViewportManager.js` - Viewport transforms, fitting, animations, and position constraints
  - **Interaction Modules**:
    - `InputHandler.js` - Pan/zoom/touch input with pinch-to-zoom support
    - `SelectionManager.js` - Seat selection logic with orphan detection
    - `CartManager.js` - Cart state management and event dispatching
  - **Rendering Modules**:
    - `UnderlayRenderer.js` - Background image rendering
    - `SectionRenderer.js` - Section containers, backgrounds, GA and Zone content
    - `RowLabelRenderer.js` - Row label generation and positioning
  - **UI Modules**:
    - `UIManager.js` - Reset button, zone visibility fade on zoom
  - **Inventory Modules**:
    - `InventoryManager.js` - Inventory data loading and seat status updates
  - Main orchestrator reduced from ~2000 lines to ~500 lines
  - Each module follows Single Responsibility Principle (SRP)
  - Dependency injection pattern for better testability
  - Explicit cleanup with `destroy()` methods

- **Vite Build System** - Modern build tooling for the renderer
  - ES Module build (`seatmap-renderer.es.js` ~53KB, ~14KB gzipped)
  - UMD build for browsers (`seatmap-renderer.umd.js` ~35KB, ~11KB gzipped)
  - Source maps for debugging
  - Development server with hot module replacement
  - Path aliases for clean imports (`@core`, `@interaction`, `@rendering`, `@ui`, `@inventory`)

- **NPM Package Structure** - Prepared renderer for distribution
  - `package.json` with proper exports for ES and UMD formats
  - PIXI.js as peer dependency (v8+)
  - Scripts: `npm run dev`, `npm run build`, `npm run preview`

- **Documentation**
  - `ARCHITECTURE.md` - Comprehensive guide to the modular renderer architecture
  - Module responsibilities, dependency patterns, and migration guide

### Changed
- Renderer now uses ES module imports instead of global PIXI reference
- Demo pages updated to use bundled UMD build with CDN PIXI.js
- Organized renderer file structure:
  - `renderer/core/` - Core utilities
  - `renderer/interaction/` - User interaction handlers
  - `renderer/rendering/` - Rendering utilities
  - `renderer/ui/` - UI components
  - `renderer/inventory/` - Inventory management
- Renamed `venue-map-*.json` test files to `demo-venue.json` for clarity
- Removed redundant HTML demo pages

### Fixed
- Module import errors when loading renderer outside of Vite dev server
- PIXI.js resolution errors in standalone HTML pages

---

## Previous Changes

### Added
- **Orphan Seat Prevention** - Prevents leaving single-seat gaps when selecting seats
  - Configurable via `preventOrphanSeats` option (default: `true`)
  - Blocks selections that would skip over a seat creating a gap
  - Blocks deselections that would isolate a single seat with no selected neighbors
  - Allows building up selections from edges (adjacent seats can be selected next)
  - Allows peeling off selections from edges (deselecting end seats)
  - Fires `orphan-seat-blocked` event with detailed message explaining why action was blocked
  - Event includes: `action`, `seat`, `sectionId`, `orphanSeats`, `message`, `orphanCount`
  - Uses row-indexed seat lookup for efficient adjacency detection
- **Zone Label Positioning** - Fine-tune the position of zone labels
  - X and Y offset sliders in the sidebar for Zone sections
  - Real-time visual update in the editor
  - Persists in file save/load format (`labelOffsetX`, `labelOffsetY`)
  - Renderer support with correct rotation handling
- **Context Menu Enhancements** - Improved context menu for Zones
  - Added Zone Label controls (Size, Color) directly to the context menu
- **Duplicate Section IDs** - Improved ID generation
  - Duplicating a section now generates a new unique ID instead of reusing the name

### Improved
- **Tooltip Category Display** - Cleaner category names in tooltips
  - Automatically removes trailing numbers from section names (e.g., "VIP 3" -> "VIP") when no specific category is set
- **Tooltip Visibility** - Better handling of non-seat elements
  - Hides the "Seat" row in tooltips for elements without seat numbers (like Zones/GA)

### Fixed
- **Renderer Label Rotation** - Fixed zone label offsets to rotate correctly with the zone
- **Tooltip Layout** - Fixed empty rows appearing in tooltips when data is missing

### Optimized
- **Sparse Map Format (SMF) Optimization** - Reduced JSON file size by ~50%
  - Implemented sparse object keys for seats (`r`, `c`, `n`, `x`, `y` instead of full names)
  - Omitted default values (e.g., `specialNeeds: false`) to save space
  - Updated renderer to support both legacy (v2.0) and optimized (v2.1) formats
- **Underlay Image Referencing** - Optimized storage for external images
  - When an underlay is loaded from a URL, the JSON now stores the `sourceUrl` reference instead of embedding the full Base64 data
  - Significantly reduces file size for maps using high-resolution background images hosted externally
  - Automatically falls back to embedding if no source URL is present

### Added
- **Join Zones** - Merge multiple zones into a single complex polygon
  - Select multiple zones in "Edit Zones" mode
  - Right-click and choose "Join Zones"
  - Merges geometries using boolean union operations
  - Preserves the label and properties of the first selected zone
- **Custom Zone Shapes** - Support for non-rectangular zone geometries
  - Zones can now be defined by an arbitrary array of points
  - Rendering engine updated to draw polygons instead of just rectangles
  - Resize handles correctly scale custom polygon shapes
- **Zone Layering** - Improved rendering order
  - Zones now render on their own dedicated layer
  - Order: Grid -> Underlay -> Zones -> Sections -> Seats
  - Ensures zones are always behind sections but above the background
- **Edit Zones Mode** - Dedicated mode for managing zones
  - New "Edit Zones" button in the sidebar
  - Restricts selection to only zones when active
  - Prevents selection of zones in other modes (Schema, Edit Seats)
  - Dims non-zone sections for better visibility
  - Shows only Zone creation tool in toolbar
- **Updated Row Label Logic** - Changed letter sequence behavior
  - Previous: A-Z, AA, AB, AC...
  - New: A-Z, AA, BB, CC... (repeating characters)
  - Consistent with common venue labeling standards

### Fixed
- **Renderer Special Needs Icons** - Improved visibility and rendering
  - Icons are now always visible (not just on hover)
  - Fixed font weight mismatch (300 vs 400) causing text fallback
  - Added font loading check to ensure icons render correctly
  - Adjusted icon scale to fit renderer seat size

### Added
- **Row Label Color Customization** - Control the color of row labels per section
  - Color picker and hex input in Row Labels accordion
  - Real-time visual updates when changing colors
  - Defaults to white (#ffffff) for backward compatibility
  - Persists in file save/load format under `rowLabels.color`
  - Independent per-section configuration
  - Does not reset section alignment when color is changed
- **Actual Seat Count Display** - Shows real number of seats in section
  - Sidebar now displays actual count from `section.seats.length`
  - Shows unique row count by counting distinct row indices
  - Updates in real-time as seats are added or deleted
  - Format: "X rows / Y seats" (e.g., "10 rows / 82 seats")
  - Replaces previous hardcoded placeholder text
- **Smart Seat Tooltips** - Dynamic tooltip format based on row label configuration
  - If row labels enabled: Shows "Section Name - Row [Label] Seat [Number]" (e.g., "Section 1 - Row A Seat 5")
  - If no row labels: Falls back to original format (e.g., "Section 1-R1S5")
  - Uses actual row label (letters/numbers) and seat number
  - Respects row label reversal setting
- **UI Reorganization** - Improved sidebar organization
  - Combined Colors and Outline into single "Style" accordion
  - Contains: Section Color, Seat Color, Seat Text Color, Fill/Stroke toggles, GA size controls
  - Cleaner, more intuitive grouping of related settings
- **Seat Color Customization** - Control circle fill color and text color for individual seats
  - Separate color pickers for seat circle color and seat text color
  - Per-section customization (each section can have different seat colors)
  - Real-time visual updates when changing colors
  - Applies to all seats in the section (except special needs seats which remain blue)
  - Special needs seats override with blue (#2563eb) regardless of section colors
  - Colors persist in file save/load format
  - Defaults to white circles (#ffffff) with black text (#000000) for backward compatibility
  - Hidden for GA sections (no individual seats)
  - Located in section sidebar below "Section Color"
- **Row Label Spacing Control** - Adjust distance between row labels and seats
  - Slider control (5-50px) in Row Labels section of sidebar
  - Real-time visual feedback as spacing changes
  - Defaults to 20px for backward compatibility
  - Persists in file save/load format
  - Independent per-section configuration
- **Section Fill and Stroke Visibility Toggles** - Control background and border display
  - Independent checkboxes for fill (background) and stroke (border)
  - Both default to visible for backward compatibility
  - Persists in file save/load format
  - Per-section configuration
- **Glow Blur Control** - Adjust the softness of the glow effect
  - Slider control (0-20px) in Glow Controls section
  - Real-time visual feedback
  - Performance optimization: disables filter when blur is 0
  - Persists in file save/load format
- **Underlay Image Replacement with Settings Preservation** - Replace background image without losing adjustments
  - "Replace underlay (keep settings)" checkbox when underlay exists
  - Preserves position, scale, opacity, and visibility when checked
  - Defaults to unchecked for standard replacement behavior
- **Negative Stretch Values** - Compress sections horizontally or vertically
  - Extended stretch range from -80 to 100 (previously 0 to 100)
  - Automatic clamping enforces minimum 22px spacing to prevent seat overlap
  - Real-time visual feedback with slider
  - Backward compatible with existing files
- **Multi-section dragging** - Drag multiple selected sections together as a group
- **Special Needs Seats** for wheelchair-accessible seating
  - Toggle special needs status for individual seats or groups
  - Visual distinction: blue color (#2563eb) with accessibility icon
  - Material Symbols "accessible_forward" icon replaces seat number
  - Toggle checkbox in seat properties sidebar when seats are selected
  - Sidebar appears only when seats are selected
  - Multi-seat toggle support with indeterminate state
  - Special needs status persists in file save/load
  - Works with Edit Seats mode selection
- **Underlay feature** for background images in venue maps
  - Import PNG, SVG, or JPG images as venue background/blueprint
  - Accessible via Underlay mode button in left sidebar
  - Drag and drop image positioning with click-and-drag
  - Interactive 8-point resize handles (corners + edges) for scaling
  - Real-time opacity control (0-100%) with slider
  - Scale control (10-500%) with slider and reset button
  - Manual position adjustment with X/Y coordinate inputs
  - Visibility toggle to show/hide underlay
  - Clear/remove underlay functionality
  - Images saved in SMF format as Base64-encoded dataURL
  - Layer ordering: Grid → Underlay → Sections → Seats
  - Non-interactive when not in underlay mode
  - Resize handles maintain constant screen size across zoom levels
  - Automatic UI updates when dragging/resizing via custom events
  - File info display showing image name and dimensions
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
- **Manual Seat Numbering** - Override automatic numbering for specific seats
  - Select a single seat in "Edit Seats" mode
  - Enter custom number/label in the sidebar
  - Persists through save/load operations
  - Protected from automatic renumbering updates
  - Supports alphanumeric values (e.g., "1A", "VIP-1")
- **Renderer Improvements** - Enhanced visual quality and interaction
  - **Semantic Zoom**: Zones fade out and individual seats fade in as you zoom deeper
  - **Touch Support**: Native pinch-to-zoom and pan gestures for mobile/tablet
  - **Zone Rendering**: Optimized rendering for Zone polygons
  - **Performance**: Improved culling and level-of-detail management
- **Editor Collision Fixes** - Improved object interaction
  - Zones no longer collide with sections or other zones
  - Smoother dragging and positioning experience
  - Corrected "Zone" vs "Section" labeling in sidebar

### Changed
- SMF format upgraded to v2.0.0
- File format now includes individual seat data with position data (baseX, baseY)
- File format supports deleted seats
- File format includes section colors and pricing data
- File format stores row alignment preference (left/center/right)
- File format includes exact center position (centerX, centerY) for pixel-perfect positioning
- **File format supports GA sections** with `type: "ga"` and `ga.capacity` fields
- **File format supports underlay images** with Base64 dataURL, position, scale, opacity, and visibility
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
  - `managers/UnderlayManager.js` - Background image management (~550 lines)
  - Unified SectionManager delegates to specialized managers
  - Maintains 100% backward compatibility
  - Follows SOLID principles for better maintainability
- **Centralized Configuration**:
  - Refactored hardcoded values (colors, dimensions, visual properties) into `src/core/config.js`
  - Expanded `VISUAL_CONFIG` and `COLORS` constants for better maintainability
  - Updated all managers to use centralized configuration instead of magic numbers
- **Code quality improvements**:
  - Added type-safe Section class with validation (prevents runtime errors)
  - Centralized visual constants to VISUAL_CONFIG (no more magic numbers)
  - Removed 80% code duplication between createSection and createGASection

### Fixed
- **Stretch and curve transformations now preserve alignment with deleted seats** - Complete rewrite of transformation algorithms to properly handle sections where seats have been deleted
  - **Virtual Grid Concept**: Transformations treat seats as if they exist on a complete virtual grid, with deleted seats leaving logical gaps
  - **Stretch transformation improvements**:
    - Uses `colIndex` to calculate logical column positions (preserves gaps from deleted seats)
    - Processes each row independently to maintain row-specific alignment
    - Calculates alignment offset per row based on `section.rowAlignment` (left/center/right)
    - Uses standard 24px grid spacing as base for logical structure
    - Stretch affects spacing only, not logical grid positions
    - Vertical stretch applied consistently across all rows
  - **Curve transformation improvements**:
    - Finds longest row and uses its center as the curve's vertical axis of symmetry
    - Calculates stable logical columns using BASE spacing (24px), not stretched spacing
    - Logical column indices remain constant when stretch is applied
    - Uses polar-to-Cartesian conversion for proper circular arc
    - Subtracts `curveDY` to create upward theater-style curve (not downward)
    - Stretch affects arc length spacing while preserving logical grid structure
    - Works correctly with all alignment types (left/center/right)
  - **Row alignment improvements**:
    - Calculates virtual row width including gaps from deleted seats
    - Uses `colIndex` offsets to preserve spacing for missing seats
    - Properly positions seats based on logical grid positions
  - **Key benefits**:
    - Alignment (left/center/right) is preserved during all transformations
    - Deleted seats create consistent gaps regardless of transformation
    - Curve creates proper theater-style upward arc
    - More intuitive and maintainable code with clear variable names
- **Multi-section alignment preserving row alignment**
  - Added `rebuildBasePositions()` function to reconstruct clean 24px grid from row/column indices
  - Added `skipLayout` option to prevent dimension recalculation during transformations
  - Rewrote all 6 alignment methods (alignLeft, alignRight, alignTop, alignBottom, alignCenterHorizontal, alignCenterVertical) to treat sections as rigid blocks
  - Removed three-phase flatten/restore pattern that was causing dimension recalculation
  - New approach: Apply transforms with skipLayout → Align positions → Position seats
- **Seat positioning on file load** - Fixed critical issue where seats appeared outside the bounding box after loading files. Root cause: layout shift was being applied twice - once by modifying `relativeX/Y` in `updateRowLabels()` and again by `positionSeatsAndLabels()` during positioning. Solution: Only apply shift to labels, let `positionSeatsAndLabels()` handle seat positioning using `seat.x = section.x + (seat.relativeX + layoutShiftX) - pivot.x`
- **Seat number preservation** - Fixed issue where seat numbers were being recalculated on file load instead of preserving the exact numbers shown. This is critical when seats have been deleted - remaining seats must keep their original numbers (e.g., seats 1, 2, 5 after deleting 3, 4). Solution: Restore `number` field from saved data and skip `updateSeatNumbers()` call when loading files with individual seat data
- **Row alignment and transformation restoration** - Fixed critical issue where rows with different lengths (e.g., rows A-D with fewer seats) would lose their right/left alignment after save/load, and sections with curve/stretch transformations would revert to base positions. Root causes: (1) Only saving `baseX/baseY` without transformed positions, (2) Transformation recalculation was skipped but positions weren't preserved. Solution: Now save BOTH `baseX/baseY` (for editing) AND `relativeX/relativeY` (final transformed positions). On load, restore transformed positions, calculate proper layout shift for bounding box, and use `_loadedFromFile` flag to prevent repositioning. After load completes, flag is cleared so future edits work correctly
- **Row alignment not persisting** - Left/right aligned seats now maintain alignment after save/load
- **Section positions drifting** - Exact center positions stored to prevent floating-point errors
- **Seat positions misaligned** - Base seat positions restored from file and recalculated on load
- **Multi-section drag not working** - Fixed by preserving selection when clicking already-selected section
- **Delete section errors** - Added safety checks for undefined objects (labels, handles)
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

### v2.1.0 (2025-11-20)
- **Renderer Enhancements**
  - **Smart Viewport**: Implemented `fitToView` for perfect initial centering and zoom limits.
  - **Section Zoom**: Clicking a section now smoothly zooms to fit it in the viewport.
  - **Seat Interactions**: Added hover effects (scale + glow) and selection state (checkmark).
  - **Tooltip System**: Added a smart tooltip showing Section, Row, Seat, Category, and Price.
    - Follows mouse cursor with smooth ease-in animation.
    - Automatically positions itself to stay within screen bounds.
    - Matches seat colors for visual consistency.
  - **Cart Integration**: Implemented `cartChange` event emitting selected seats in a standardized format.
  - **Inventory Loading**: Added `loadInventory` method to map external data (prices, status) to seats.
  - **Pricing Logic**: Implemented hierarchical pricing (Seat Specific > Section Base > Default).

- **Editor Updates**
  - **Persistent Seat IDs**: Added generation of 8-character alphanumeric IDs for seats during export.
  - **ID Preservation**: Existing IDs are preserved during import/export cycles to ensure data integrity.

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
