// ============================================
// CONFIGURATION & CONSTANTS
// ============================================

export const CONFIG = {
  SEAT_SIZE: 24,        // Spacing between seats
  SECTION_MARGIN: 20,   // Margin around section edges
  GRID_SIZE: 50,        // Grid cell size
  GRID_COUNT: 80,       // Grid cells in each direction
  MIN_SECTION_SIZE: 50  // Minimum section size in pixels
};

export const VISUAL_CONFIG = {
  HANDLE: {
    SIZE: 8,              // Visual size of resize handles
    HIT_AREA_SIZE: 40,    // Interactive hit area size (larger for easier grabbing)
    COLOR: 0x4ade80,      // Handle fill color (green)
    STROKE_WIDTH: 1,      // Handle border width
    STROKE_COLOR: 0xffffff // Handle border color (white)
  },
  SELECTION: {
    BORDER_WIDTH: 3,      // Selection border thickness
    BORDER_OFFSET: 3,     // Offset from section edge
    COLOR: 0x00ff00       // Selection border color (green)
  },
  SECTION: {
    FILL_ALPHA: 0.25,     // Section fill opacity
    STROKE_ALPHA: 0.8,    // Section border opacity
    STROKE_WIDTH: 2,      // Section border width
    DIMMED_ALPHA: 0.3     // Opacity for dimmed sections (e.g. in edit seats mode)
  },
  GA_LABEL: {
    FONT_SIZE: 18,        // GA section label font size
    FONT_WEIGHT: 'bold',  // GA section label font weight
    FONT_FAMILY: 'system-ui, sans-serif',
    COLOR: 0xffffff       // GA section label color (white)
  },
  PREVIEW: {
    STROKE_WIDTH: 2,
    STROKE_ALPHA: 0.8,
    FILL_ALPHA: 0.15
  },
  UI: {
    TOOLBAR_HEIGHT: 56,
    ZOOM_PADDING: 50,
    SEAT_BOUNDS_PADDING: 15,
    LABEL_BOUNDS_PADDING: 20
  }
};

export const COLORS = {
  BACKGROUND: '#0f0f13',
  GRID: 0x2a2a33,
  SECTION_FILL: 0x1e90ff,
  SECTION_STROKE: 0x1e90ff,
  SEAT: 0xffffff,
  PREVIEW: 0xffc107,
  DELETE_HIGHLIGHT: 0xff4444,
  FLASH_SEAT: 0x00ff88,
  FLASH_SECTION: 0xffc107,
  DEFAULT_SECTION: 0x3b82f6,
  DEFAULT_SEAT: 0xffffff,
  DEFAULT_TEXT: 0x000000,
  DEFAULT_GLOW: 0xffffff,
  SELECTION_RECT_FILL: 0x1e90ff,
  SELECTION_RECT_STROKE: 0x1e90ff,
  SEAT_SELECTION_RECT_FILL: 0x00ff00,
  SEAT_SELECTION_RECT_STROKE: 0x00ff00,
  SPECIAL_NEEDS: 0x2563eb,
  HANDLE_FILL: 0x4ade80,
  HANDLE_STROKE: 0xffffff,
  DEFAULT_FILL_COLOR: "#4a5568",
  DEFAULT_BORDER_COLOR: "#3b82f6"
};
