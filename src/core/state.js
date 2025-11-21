// ============================================
// APPLICATION STATE
// ============================================

export const State = {
  app: null,
  world: null,
  gridLayer: null,
  underlayLayer: null,  // Layer for background images
  sectionLayer: null,
  seatLayer: null,
  sections: [],
  selectedSections: [],
  sectionCounter: 1,
  
  // Tool modes
  isCreateMode: false,
  isCreateGAMode: false,
  isCreateZoneMode: false,
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
  
  // Context menu
  contextMenuSection: null,
  
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
  dragOriginalPositions: null,
  potentialDragStart: null,  // Stores initial click position before drag threshold is reached

  // Underlay state
  underlaySprite: null,
  underlayData: null,
  underlayFileName: null,
  underlaySourceUrl: null,
  underlayX: 0,
  underlayY: 0,
  underlayScale: 1,
  underlayOpacity: 0.5,
  underlayVisible: true,
  underlayResizeHandles: null,
};

export const Elements = {};
