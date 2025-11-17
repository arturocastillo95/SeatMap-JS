// ============================================
// INTERACTION MANAGER
// ============================================

import { State } from './state.js';
import { Utils } from './utils.js';
import { ToolManager } from './toolManager.js';
import { SectionManager } from './sectionManager.js';
import { AlignmentManager } from './alignmentManager.js';
import { ModeManager } from './modeManager.js';

export const InteractionManager = {
  init() {
    State.app.stage.eventMode = 'static';
    State.app.stage.hitArea = State.app.renderer.screen;
    
    State.app.stage.on('pointerdown', (e) => this.handlePointerDown(e));
    State.app.stage.on('pointermove', (e) => this.handlePointerMove(e));
    window.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    
    State.app.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
  },

  handlePointerDown(e) {
    // Middle mouse button or panning mode active - pan with left click
    if (e.button === 1 || (e.button === 0 && State.isPanningMode)) {
      State.isPanning = true;
      State.lastPanPosition = { x: e.global.x, y: e.global.y };
      State.app.stage.cursor = 'grabbing';
      return;
    }

    // Create mode (Seat Rows)
    if (State.isCreateMode) {
      const worldPos = Utils.screenToWorld(e.global.x, e.global.y);
      ToolManager.handleCreateStart(worldPos);
      return;
    }
    
    // Create GA mode
    if (State.isCreateGAMode) {
      const worldPos = Utils.screenToWorld(e.global.x, e.global.y);
      ToolManager.handleCreateGAStart(worldPos);
      return;
    }
    
    // Store shift key state for later use
    State.isShiftPressed = e.shiftKey;
    
    // In edit seats mode, start seat selection rectangle
    if (State.isEditSeatsMode) {
      // Clear previous selection if not holding shift
      if (!e.shiftKey) {
        State.selectedSeats.forEach(seat => {
          ModeManager.deselectSeat(seat);
        });
        State.selectedSeats = [];
      }
      
      State.seatSelectionStart = { x: e.global.x, y: e.global.y };
      State.seatSelectionShiftKey = e.shiftKey; // Store for later
      State.app.stage.cursor = 'crosshair';
      return;
    }
    
    // Clear selection when clicking on background (not holding shift)
    if (!e.shiftKey && State.selectedSections.length > 0) {
      State.selectedSections.forEach(section => {
        if (section.selectionBorder) {
          section.selectionBorder.visible = false;
        }
        section.tint = 0xffffff;
      });
      State.selectedSections = [];
      // Dispatch selection change event once after clearing all
      document.dispatchEvent(new CustomEvent('selectionchanged'));
    }
    
    // Default: start selection rectangle
    State.isSelecting = true;
    State.selectionStart = { x: e.global.x, y: e.global.y };
    State.app.stage.cursor = 'crosshair';
  },

  handlePointerMove(e) {
    // Check if we should start dragging (threshold to distinguish click from drag)
    if (State.potentialDragStart && !State.isDraggingSections) {
      const dx = e.global.x - State.potentialDragStart.screenPos.x;
      const dy = e.global.y - State.potentialDragStart.screenPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Only start drag if moved more than 5 pixels
      if (distance > 5) {
        State.isDraggingSections = true;
        State.dragStartPos = State.potentialDragStart.worldPos;
        State.dragOriginalPositions = State.selectedSections.map(s => ({
          section: s,
          x: s.x,
          y: s.y
        }));
        State.potentialDragStart = null;
        State.app.stage.cursor = 'grabbing';
      }
    }
    
    // Handle section dragging
    if (State.isDraggingSections && State.dragStartPos && State.dragOriginalPositions) {
      const worldPos = Utils.screenToWorld(e.global.x, e.global.y);
      const desiredDx = worldPos.x - State.dragStartPos.x;
      const desiredDy = worldPos.y - State.dragStartPos.y;
      
      // Get first section's original position to calculate movement delta
      const firstOriginal = State.dragOriginalPositions[0];
      const targetX = firstOriginal.x + desiredDx;
      const targetY = firstOriginal.y + desiredDy;
      
      // Calculate movement from current position to target
      const movementFromCurrent = {
        dx: targetX - firstOriginal.section.x,
        dy: targetY - firstOriginal.section.y
      };
      
      // Build current positions for collision testing
      const currentPositions = State.dragOriginalPositions.map(({ section }) => ({
        section,
        x: section.x,  // Use current position
        y: section.y
      }));
      
      // Get permitted movement with sliding behavior (using CURRENT positions)
      const otherSections = State.sections.filter(s => !State.selectedSections.includes(s));
      const { dx, dy } = AlignmentManager.getPermittedDrag(
        currentPositions,
        movementFromCurrent.dx,
        movementFromCurrent.dy,
        otherSections
      );
      
      // Apply the permitted movement from current positions
      currentPositions.forEach(({ section }) => {
        section.x += dx;
        section.y += dy;
        
        // Update seat and label positions (handles rotation if needed)
        AlignmentManager.updateSeatPositions(section);
        
        // Update resize handles if they exist (for GA sections)
        if (section.resizeHandles) {
          SectionManager.updateResizeHandles(section);
        }
      });
      return;
    }
    
    // Handle create mode preview
    if (State.isCreating && State.createStart && State.previewRect) {
      const worldPos = Utils.screenToWorld(e.global.x, e.global.y);
      if (State.isCreateMode) {
        ToolManager.handleCreateMove(worldPos, e.global.x, e.global.y);
      } else if (State.isCreateGAMode) {
        ToolManager.handleCreateGAMove(worldPos, e.global.x, e.global.y);
      }
      return;
    }
    
    // Handle panning
    if (State.isPanning) {
      const dx = e.global.x - State.lastPanPosition.x;
      const dy = e.global.y - State.lastPanPosition.y;
      State.world.x += dx;
      State.world.y += dy;
      State.lastPanPosition = { x: e.global.x, y: e.global.y };
      return;
    }

    // Handle selection dragging
    if (State.isSelecting && State.selectionStart) {
      this.updateSelectionRect(e.global.x, e.global.y);
      return;
    }
    
    // Handle seat selection dragging in Edit Seats mode
    if (State.isEditSeatsMode && State.seatSelectionStart) {
      this.updateSeatSelectionRect(e.global.x, e.global.y);
      return;
    }
    
    // Default: move tooltip
    Utils.moveTooltip(e.global.x, e.global.y);
  },

  updateSelectionRect(currentX, currentY) {
    const startX = State.selectionStart.x;
    const startY = State.selectionStart.y;
    
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    
    // Create selection rectangle if it doesn't exist
    if (!State.selectionRect) {
      State.selectionRect = new PIXI.Graphics();
      State.app.stage.addChild(State.selectionRect);
    }
    
    // Draw selection rectangle
    State.selectionRect.clear();
    State.selectionRect.rect(x, y, width, height);
    State.selectionRect.fill({ color: 0x1e90ff, alpha: 0.1 });
    State.selectionRect.stroke({ width: 2, color: 0x1e90ff, alpha: 0.8 });
  },

  updateSeatSelectionRect(currentX, currentY) {
    const startX = State.seatSelectionStart.x;
    const startY = State.seatSelectionStart.y;
    
    const screenX = Math.min(startX, currentX);
    const screenY = Math.min(startY, currentY);
    const screenWidth = Math.abs(currentX - startX);
    const screenHeight = Math.abs(currentY - startY);
    
    // Create seat selection rectangle if it doesn't exist
    if (!State.seatSelectionRect) {
      State.seatSelectionRect = new PIXI.Graphics();
      State.app.stage.addChild(State.seatSelectionRect);
    }
    
    // Draw seat selection rectangle (different color than section selection)
    State.seatSelectionRect.clear();
    State.seatSelectionRect.rect(screenX, screenY, screenWidth, screenHeight);
    State.seatSelectionRect.fill({ color: 0x00ff00, alpha: 0.1 });
    State.seatSelectionRect.stroke({ width: 2, color: 0x00ff00, alpha: 0.8 });
    
    // Real-time seat selection preview - convert to world coordinates properly
    const worldStart = Utils.screenToWorld(Math.min(startX, currentX), Math.min(startY, currentY));
    const worldEnd = Utils.screenToWorld(Math.max(startX, currentX), Math.max(startY, currentY));
    
    const selectionBounds = {
      x: worldStart.x,
      y: worldStart.y,
      width: worldEnd.x - worldStart.x,
      height: worldEnd.y - worldStart.y
    };
    
    this.updateLiveSelectionPreview(selectionBounds);
  },
  
  updateLiveSelectionPreview(selectionBounds) {
    
    // Get the active section for seat editing
    const section = State.activeSectionForSeats;
    if (!section || !section.seats) return;
    
    // Track which seats are currently in the selection
    const seatsInSelection = new Set();
    
    section.seats.forEach(seat => {
      // Seats are in the seatLayer which is a child of world
      // So we need to use their x, y positions directly (already in world space)
      const seatX = seat.x;
      const seatY = seat.y;
      const seatRadius = 10; // Seat circle radius
      
      // Check if seat center is within selection bounds
      // Using center point for more accurate selection
      const isInBounds = (
        seatX >= selectionBounds.x &&
        seatX <= selectionBounds.x + selectionBounds.width &&
        seatY >= selectionBounds.y &&
        seatY <= selectionBounds.y + selectionBounds.height
      );
      
      if (isInBounds) {
        seatsInSelection.add(seat);
        // Highlight if not already selected
        if (!State.selectedSeats.includes(seat)) {
          ModeManager.highlightSeat(seat, true);
        }
      } else {
        // Remove highlight if not in permanent selection
        if (!State.selectedSeats.includes(seat)) {
          ModeManager.highlightSeat(seat, false);
        }
      }
    });
  },

  handlePointerUp(e) {
    // Clear potential drag start (if it was just a click)
    if (State.potentialDragStart) {
      State.potentialDragStart = null;
    }
    
    // Handle section dragging end
    if (State.isDraggingSections) {
      State.isDraggingSections = false;
      
      // Check for collisions and resolve them
      AlignmentManager.resolveCollisions(State.selectedSections);
      
      // Restore alpha for all selected sections
      State.selectedSections.forEach(s => {
        s.alpha = 1;
      });
      
      State.dragStartPos = null;
      State.dragOriginalPositions = null;
      State.app.stage.cursor = 'default';
      return;
    }
    
    // Handle create mode end
    if (State.isCreating && State.createStart && State.previewRect) {
      const worldPos = Utils.screenToWorld(e.clientX, e.clientY);
      if (State.isCreateMode) {
        ToolManager.handleCreateEnd(worldPos);
      } else if (State.isCreateGAMode) {
        ToolManager.handleCreateGAEnd(worldPos);
      }
      return;
    }
    
    // Handle panning end
    if (State.isPanning) {
      State.isPanning = false;
      State.app.stage.cursor = State.isPanningMode ? 'grab' : ((State.isCreateMode || State.isCreateGAMode) ? 'crosshair' : (State.isDeleteMode ? 'not-allowed' : 'default'));
      return;
    }

    // Handle selection end
    if (State.isSelecting) {
      if (State.selectionRect && State.selectionStart) {
        this.processSelection(e);
      }
      
      // Clean up
      if (State.selectionRect) {
        State.selectionRect.clear();
        State.selectionRect.destroy();
        State.selectionRect = null;
      }
      
      State.isSelecting = false;
      State.selectionStart = null;
      State.app.stage.cursor = 'default';
      return;
    }

    // Handle seat selection end in Edit Seats mode
    if (State.isEditSeatsMode && State.seatSelectionStart) {
      if (State.seatSelectionRect) {
        this.processSeatSelection(e);
      }
      
      // Clean up
      if (State.seatSelectionRect) {
        State.seatSelectionRect.clear();
        State.seatSelectionRect.destroy();
        State.seatSelectionRect = null;
      }
      
      State.seatSelectionStart = null;
      State.app.stage.cursor = 'default';
      return;
    }
  },

  processSelection(e) {
    const startX = State.selectionStart.x;
    const startY = State.selectionStart.y;
    const endX = e.clientX;
    const endY = e.clientY;
    
    // Convert screen coordinates to world coordinates
    const worldStart = Utils.screenToWorld(Math.min(startX, endX), Math.min(startY, endY));
    const worldEnd = Utils.screenToWorld(Math.max(startX, endX), Math.max(startY, endY));
    
    const selectionBounds = {
      x: worldStart.x,
      y: worldStart.y,
      width: worldEnd.x - worldStart.x,
      height: worldEnd.y - worldStart.y
    };
    
    // Note: Selection was already cleared in handlePointerDown if shift wasn't pressed
    
    // Check which sections intersect with the selection rectangle
    State.sections.forEach(section => {
      const sectionBounds = {
        x: section.x,
        y: section.y,
        width: section.contentWidth,
        height: section.contentHeight
      };
      
      // Check if rectangles intersect
      const intersects = !(
        sectionBounds.x > selectionBounds.x + selectionBounds.width ||
        sectionBounds.x + sectionBounds.width < selectionBounds.x ||
        sectionBounds.y > selectionBounds.y + selectionBounds.height ||
        sectionBounds.y + sectionBounds.height < selectionBounds.y
      );
      
      if (intersects && !State.selectedSections.includes(section)) {
        State.selectedSections.push(section);
        SectionManager.selectSection(section);
      }
    });
    
    // Dispatch selection changed event to update sidebar
    if (State.selectedSections.length > 0) {
      document.dispatchEvent(new CustomEvent('selectionchanged', { 
        detail: { selectedSections: State.selectedSections } 
      }));
    }
  },

  processSeatSelection(e) {
    const startX = State.seatSelectionStart.x;
    const startY = State.seatSelectionStart.y;
    const endX = e.clientX;
    const endY = e.clientY;
    
    // Convert screen coordinates to world coordinates
    const worldStart = Utils.screenToWorld(Math.min(startX, endX), Math.min(startY, endY));
    const worldEnd = Utils.screenToWorld(Math.max(startX, endX), Math.max(startY, endY));
    
    const selectionBounds = {
      x: worldStart.x,
      y: worldStart.y,
      width: worldEnd.x - worldStart.x,
      height: worldEnd.y - worldStart.y
    };
    
    // Get the active section for seat editing
    const section = State.activeSectionForSeats;
    if (!section || !section.seats) return;
    
    // Note: Selection was already cleared in handlePointerDown if shift wasn't pressed
    
    // Check which seats intersect with the selection rectangle
    section.seats.forEach(seat => {
      // Seats are in the seatLayer which is a child of world
      // So we use their x, y positions directly (already in world space)
      const seatX = seat.x;
      const seatY = seat.y;
      
      // Check if seat center is within selection bounds
      const isInBounds = (
        seatX >= selectionBounds.x &&
        seatX <= selectionBounds.x + selectionBounds.width &&
        seatY >= selectionBounds.y &&
        seatY <= selectionBounds.y + selectionBounds.height
      );
      
      if (isInBounds && !State.selectedSeats.includes(seat)) {
        ModeManager.selectSeat(seat);
      }
    });
  },

  handleWheel(e) {
    e.preventDefault();
    
    // Check if it's a pan gesture (shift key or horizontal scroll)
    // ctrlKey is true for pinch-to-zoom on trackpad
    const isPanGesture = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);
    
    if (isPanGesture && !e.ctrlKey) {
      // Pan the canvas
      State.world.x -= e.deltaX;
      State.world.y -= e.deltaY;
    } else {
      // Zoom (scroll wheel or pinch)
      const scale = e.deltaY < 0 ? 1.1 : 0.9;

      const ptBefore = Utils.screenToWorld(e.clientX, e.clientY);
      State.world.scale.set(State.world.scale.x * scale);

      const ptAfter = Utils.screenToWorld(e.clientX, e.clientY);
      State.world.x += (ptAfter.x - ptBefore.x) * State.world.scale.x;
      State.world.y += (ptAfter.y - ptBefore.y) * State.world.scale.y;
    }
  }
};
