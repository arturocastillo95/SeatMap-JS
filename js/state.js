// ============================================
// APPLICATION STATE
// ============================================

export const State = {
  app: null,
  world: null,
  gridLayer: null,
  sectionLayer: null,
  seatLayer: null,
  sections: [],
  sectionCounter: 1,
  
  // Tool modes
  isCreateMode: false,
  isDeleteMode: false,
  isCreating: false,
  isPanning: false,
  isPanningMode: false,
  isSelecting: false,
  wasSpacePressed: false,
  
  // App modes
  currentMode: 'schema',  // 'schema' | 'seats' | 'underlay' | 'venue-shape' | 'pricing'
  
  // Seat editing
  isEditSeatsMode: false,
  selectedSeats: [],
  activeSectionForSeats: null,
  seatSelectionStart: null,
  seatSelectionRect: null,
  seatSelectionShiftKey: false,
  
  // Creation state
  createStart: null,
  previewRect: null,
  pendingSection: null,
  
  // Panning state
  lastPanPosition: { x: 0, y: 0 },
  
  // Selection state
  selectionStart: null,
  selectionRect: null,
  selectedSections: [],
  
  // Section dragging state
  isDraggingSections: false,
  dragStartPos: null,
  dragOriginalPositions: null
};

export const Elements = {};
