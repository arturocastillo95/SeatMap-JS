// ============================================
// TOOL MANAGER
// ============================================

import { State, Elements } from '../core/state.js';
import { CONFIG, COLORS, VISUAL_CONFIG } from '../core/config.js';
import { Utils } from '../core/utils.js';
import { SectionManager } from './sectionManager.js';

export const ToolManager = {
  init() {
    this.setupPanTool();
    this.setupCreateTool();
    this.setupCreateGATool();
    this.setupCreateZoneTool();
    this.setupDialogHandlers();
    this.handleDeleteConfirmation();
    this.setupZoomToFit();
    this.setupKeyboardShortcuts();
  },

  // Helper to update button label without affecting icon
  updateButtonLabel(button, text) {
    const label = button.querySelector('.tool-label');
    if (label) {
      label.textContent = text;
    } else {
      // Fallback for buttons without tool-label span
      button.textContent = text;
    }
  },

  setupZoomToFit() {
    Elements.zoomToFitBtn.addEventListener('click', () => {
      this.zoomToFitAll();
    });
  },

  zoomToFitAll() {
    if (State.sections.length === 0) return;

    // Calculate bounding box of all sections and seats
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    State.sections.forEach(section => {
      // Section bounds (accounting for pivot at center)
      const sectionLeft = section.x - section.pivot.x;
      const sectionTop = section.y - section.pivot.y;
      const sectionRight = sectionLeft + section.contentWidth;
      const sectionBottom = sectionTop + section.contentHeight;
      
      minX = Math.min(minX, sectionLeft);
      minY = Math.min(minY, sectionTop);
      maxX = Math.max(maxX, sectionRight);
      maxY = Math.max(maxY, sectionBottom);
      
      // Check seats and labels too for more accurate bounds
      section.seats.forEach(seat => {
        minX = Math.min(minX, seat.x - VISUAL_CONFIG.UI.SEAT_BOUNDS_PADDING);
        minY = Math.min(minY, seat.y - VISUAL_CONFIG.UI.SEAT_BOUNDS_PADDING);
        maxX = Math.max(maxX, seat.x + VISUAL_CONFIG.UI.SEAT_BOUNDS_PADDING);
        maxY = Math.max(maxY, seat.y + VISUAL_CONFIG.UI.SEAT_BOUNDS_PADDING);
      });
      
      // Check row labels if they exist
      section.rowLabels.forEach(label => {
        minX = Math.min(minX, label.x - VISUAL_CONFIG.UI.LABEL_BOUNDS_PADDING);
        minY = Math.min(minY, label.y - VISUAL_CONFIG.UI.LABEL_BOUNDS_PADDING);
        maxX = Math.max(maxX, label.x + VISUAL_CONFIG.UI.LABEL_BOUNDS_PADDING);
        maxY = Math.max(maxY, label.y + VISUAL_CONFIG.UI.LABEL_BOUNDS_PADDING);
      });
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const contentCenterX = minX + contentWidth / 2;
    const contentCenterY = minY + contentHeight / 2;

    // Calculate scale to fit with padding
    const padding = VISUAL_CONFIG.UI.ZOOM_PADDING;
    const availableWidth = State.app.screen.width - padding * 2;
    const availableHeight = State.app.screen.height - padding * 2 - VISUAL_CONFIG.UI.TOOLBAR_HEIGHT; // Account for top bar
    
    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    const targetScale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 1:1

    // Set the scale
    State.world.scale.set(targetScale);

    // Center the content
    const screenCenterX = State.app.screen.width / 2;
    const screenCenterY = (State.app.screen.height + VISUAL_CONFIG.UI.TOOLBAR_HEIGHT) / 2; // Account for top bar

    State.world.x = screenCenterX - contentCenterX * targetScale;
    State.world.y = screenCenterY - contentCenterY * targetScale;
    
    // Update zone visibility based on zoom level
    SectionManager.updateZoneVisibility(targetScale);
  },

  setupPanTool() {
    Elements.panToolBtn.addEventListener('click', () => {
      // Toggle pan mode
      if (!State.isPanningMode) {
        State.isPanningMode = true;
        
        // Turn off other modes
        if (State.isCreateMode) {
          State.isCreateMode = false;
          Elements.createBtn.classList.remove('active');
          this.updateButtonLabel(Elements.createBtn, 'Seat Rows');
        }
        if (State.isDeleteMode) {
          State.isDeleteMode = false;
        }
        
        // Update UI
        Elements.selectToolBtn.classList.remove('active');
        Elements.panToolBtn.classList.add('active');
        State.app.stage.cursor = 'grab';
      } else {
        // Switch back to select mode
        State.isPanningMode = false;
        Elements.panToolBtn.classList.remove('active');
        Elements.selectToolBtn.classList.add('active');
        State.app.stage.cursor = 'default';
      }
    });
    
    // Select tool button
    Elements.selectToolBtn.addEventListener('click', () => {
      if (State.isPanningMode) {
        State.isPanningMode = false;
        Elements.panToolBtn.classList.remove('active');
        Elements.selectToolBtn.classList.add('active');
        State.app.stage.cursor = 'default';
      }
      
      // Turn off other modes
      if (State.isCreateMode) {
        State.isCreateMode = false;
        Elements.createBtn.classList.remove('active');
        this.updateButtonLabel(Elements.createBtn, 'Seat Rows');
      }
      if (State.isDeleteMode) {
        State.isDeleteMode = false;
      }
    });
  },

  setupCreateTool() {
    Elements.createBtn.addEventListener('click', () => {
      State.isCreateMode = !State.isCreateMode;
      
      if (State.isCreateMode) {
        // Turn off GA mode if active
        if (State.isCreateGAMode) {
          State.isCreateGAMode = false;
          Elements.createGABtn.classList.remove('active');
          this.updateButtonLabel(Elements.createGABtn, 'GA');
        }
        if (State.isPanningMode) {
          State.isPanningMode = false;
          Elements.panToolBtn.classList.remove('active');
        }
        if (State.isDeleteMode) {
          State.isDeleteMode = false;
        }
      }
      
      Elements.createBtn.classList.toggle('active', State.isCreateMode);
      this.updateButtonLabel(Elements.createBtn, State.isCreateMode ? 'Cancel' : 'Seat Rows');
      State.app.stage.cursor = State.isCreateMode ? 'crosshair' : 'default';
    });
  },

  setupCreateGATool() {
    Elements.createGABtn.addEventListener('click', () => {
      State.isCreateGAMode = !State.isCreateGAMode;
      
      if (State.isCreateGAMode) {
        // Turn off seat rows mode if active
        if (State.isCreateMode) {
          State.isCreateMode = false;
          Elements.createBtn.classList.remove('active');
          this.updateButtonLabel(Elements.createBtn, 'Seat Rows');
        }
        if (State.isPanningMode) {
          State.isPanningMode = false;
          Elements.panToolBtn.classList.remove('active');
        }
        if (State.isDeleteMode) {
          State.isDeleteMode = false;
        }
      }
      
      Elements.createGABtn.classList.toggle('active', State.isCreateGAMode);
      this.updateButtonLabel(Elements.createGABtn, State.isCreateGAMode ? 'Cancel' : 'GA');
      State.app.stage.cursor = State.isCreateGAMode ? 'crosshair' : 'default';
    });
  },

  setupCreateZoneTool() {
    // We'll access the button directly or via Elements if added later
    const createZoneBtn = Elements.createZoneBtn || document.getElementById('createZoneBtn');
    if (!createZoneBtn) return;

    createZoneBtn.addEventListener('click', () => {
      State.isCreateZoneMode = !State.isCreateZoneMode;
      
      if (State.isCreateZoneMode) {
        // Turn off other modes
        if (State.isCreateMode) {
          State.isCreateMode = false;
          Elements.createBtn.classList.remove('active');
          this.updateButtonLabel(Elements.createBtn, 'Seat Rows');
        }
        if (State.isCreateGAMode) {
          State.isCreateGAMode = false;
          Elements.createGABtn.classList.remove('active');
          this.updateButtonLabel(Elements.createGABtn, 'GA');
        }
        if (State.isPanningMode) {
          State.isPanningMode = false;
          Elements.panToolBtn.classList.remove('active');
        }
        if (State.isDeleteMode) {
          State.isDeleteMode = false;
        }
      }
      
      createZoneBtn.classList.toggle('active', State.isCreateZoneMode);
      this.updateButtonLabel(createZoneBtn, State.isCreateZoneMode ? 'Cancel' : 'Zone');
      State.app.stage.cursor = State.isCreateZoneMode ? 'crosshair' : 'default';
    });
  },

  handleCreateZoneStart(worldPos) {
    State.isCreating = true;
    State.createStart = { x: worldPos.x, y: worldPos.y };
    State.previewRect = new PIXI.Graphics();
    State.world.addChild(State.previewRect);
  },

  handleCreateZoneMove(worldPos, screenX, screenY) {
    const rawWidth = Math.abs(worldPos.x - State.createStart.x);
    const rawHeight = Math.abs(worldPos.y - State.createStart.y);
    
    // No snapping to seat grid for zones, but maybe snap to grid?
    // For now, just use raw dimensions or snap to grid size if needed
    // Let's snap to 10px grid for cleaner zones
    const snappedWidth = Math.round(rawWidth / 10) * 10;
    const snappedHeight = Math.round(rawHeight / 10) * 10;
    
    // Calculate position based on drag direction
    const x = worldPos.x < State.createStart.x ? State.createStart.x - snappedWidth : State.createStart.x;
    const y = worldPos.y < State.createStart.y ? State.createStart.y - snappedHeight : State.createStart.y;
    
    State.previewRect.clear();
    State.previewRect.rect(x, y, snappedWidth, snappedHeight);
    State.previewRect.stroke({ 
      width: 2, 
      color: 0x9C27B0, // Purple for zones
      alpha: 0.8 
    });
    State.previewRect.fill({ 
      color: 0x9C27B0, 
      alpha: 0.2 
    });
    
    // Show dimensions info
    Elements.dragInfo.innerHTML = `${Math.round(snappedWidth)} × ${Math.round(snappedHeight)}<br><strong>Zone</strong>`;
    Elements.dragInfo.style.left = (screenX + 15) + 'px';
    Elements.dragInfo.style.top = (screenY + 15) + 'px';
    Elements.dragInfo.classList.add('show');
  },

  handleCreateZoneEnd(worldPos) {
    Utils.hideDragInfo();
    
    const rawWidth = Math.abs(worldPos.x - State.createStart.x);
    const rawHeight = Math.abs(worldPos.y - State.createStart.y);
    
    const snappedWidth = Math.round(rawWidth / 10) * 10;
    const snappedHeight = Math.round(rawHeight / 10) * 10;
    
    const x = worldPos.x < State.createStart.x ? State.createStart.x - snappedWidth : State.createStart.x;
    const y = worldPos.y < State.createStart.y ? State.createStart.y - snappedHeight : State.createStart.y;
    
    // Clean up preview
    State.world.removeChild(State.previewRect);
    State.previewRect = null;
    State.createStart = null;
    State.isCreating = false;
    
    // Create Zone if large enough
    if (snappedWidth > CONFIG.MIN_SECTION_SIZE && snappedHeight > CONFIG.MIN_SECTION_SIZE) {
      SectionManager.createZone(x, y, snappedWidth, snappedHeight);
      
      // Exit Zone creation mode
      State.isCreateZoneMode = false;
      const createZoneBtn = Elements.createZoneBtn || document.getElementById('createZoneBtn');
      if (createZoneBtn) {
        createZoneBtn.classList.remove('active');
        this.updateButtonLabel(createZoneBtn, 'Zone');
      }
      State.app.stage.cursor = 'default';
    }
  },

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Spacebar toggles pan mode
      if (e.code === 'Space' && !e.repeat) {
        // Don't trigger pan mode if user is typing in an input field
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          return; // Let the input handle space normally
        }
        
        e.preventDefault();
        if (!State.isPanningMode) {
          State.isPanningMode = true;
          State.wasSpacePressed = true;
          
          // Turn off other modes
          if (State.isCreateMode) {
            State.isCreateMode = false;
            Elements.createBtn.classList.remove('active');
            this.updateButtonLabel(Elements.createBtn, 'Seat Rows');
          }
          if (State.isDeleteMode) {
            State.isDeleteMode = false;
          }
          
          Elements.selectToolBtn.classList.remove('active');
          Elements.panToolBtn.classList.add('active');
          State.app.stage.cursor = 'grab';
        }
      }

      // Backspace deletes selected sections OR seats depending on mode
      if (e.code === 'Backspace' && !e.repeat) {
        // Don't trigger delete if user is typing in an input field
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          return; // Let the input handle backspace normally
        }

        // In edit seats mode, delete selected seats
        if (State.isEditSeatsMode && State.selectedSeats.length > 0) {
          e.preventDefault();
          import('./modeManager.js').then(({ ModeManager }) => {
            ModeManager.deleteSelectedSeats();
          });
        }
        // In schema mode, delete selected sections
        else if (State.selectedSections.length > 0) {
          e.preventDefault();
          this.showDeleteConfirmation();
        }
      }

      // ESC exits edit seats mode or cancels create mode
      if (e.code === 'Escape' && !e.repeat) {
        // Exit edit seats mode
        if (State.isEditSeatsMode) {
          e.preventDefault();
          import('./modeManager.js').then(({ ModeManager }) => {
            ModeManager.switchMode('schema');
          });
        }
        // Cancel create mode (if not currently drawing)
        else if (State.isCreateMode && !State.isCreating) {
          e.preventDefault();
          State.isCreateMode = false;
          Elements.createBtn.classList.remove('active');
          this.updateButtonLabel(Elements.createBtn, 'Seat Rows');
          State.app.stage.cursor = 'default';
        }
        // Cancel GA mode (if not currently drawing)
        else if (State.isCreateGAMode && !State.isCreating) {
          e.preventDefault();
          State.isCreateGAMode = false;
          Elements.createGABtn.classList.remove('active');
          this.updateButtonLabel(Elements.createGABtn, 'GA');
          State.app.stage.cursor = 'default';
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      // Release spacebar to exit pan mode (only if activated by spacebar)
      if (e.code === 'Space' && State.wasSpacePressed) {
        e.preventDefault();
        State.isPanningMode = false;
        State.wasSpacePressed = false;
        
        Elements.panToolBtn.classList.remove('active');
        Elements.selectToolBtn.classList.add('active');
        State.app.stage.cursor = 'default';
      }
    });
  },

  showDeleteConfirmation() {
    const count = State.selectedSections.length;
    const sectionNames = State.selectedSections.map(s => s.sectionId).join(', ');
    
    Elements.deleteConfirmInfo.textContent = count === 1 
      ? `Delete section ${sectionNames}?`
      : `Delete ${count} sections (${sectionNames})?`;
    
    Elements.deleteConfirmBox.classList.add('show');
    Elements.deleteConfirmBox.style.left = '50%';
    Elements.deleteConfirmBox.style.top = '50%';
    Elements.deleteConfirmBox.style.transform = 'translate(-50%, -50%)';
    
    // Set up keyboard handler for this dialog
    this.setupDeleteDialogKeyboard();
  },

  setupDeleteDialogKeyboard() {
    const keyHandler = (e) => {
      if (!Elements.deleteConfirmBox.classList.contains('show')) return;
      
      if (e.key === 'Enter') {
        e.preventDefault();
        Elements.deleteConfirmYes.click();
        window.removeEventListener('keydown', keyHandler);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        Elements.deleteConfirmNo.click();
        window.removeEventListener('keydown', keyHandler);
      }
    };
    
    window.addEventListener('keydown', keyHandler);
  },

  handleDeleteConfirmation() {
    Elements.deleteConfirmYes.addEventListener('click', () => {
      // Delete all selected sections (make a copy first since deleteSection modifies the array)
      const sectionsToDelete = [...State.selectedSections];
      sectionsToDelete.forEach(section => {
        SectionManager.deleteSection(section);
      });
      State.selectedSections = [];
      Elements.deleteConfirmBox.classList.remove('show');
    });

    Elements.deleteConfirmNo.addEventListener('click', () => {
      Elements.deleteConfirmBox.classList.remove('show');
    });
  },

  setupDialogHandlers() {
    Elements.confirmKeep.addEventListener('click', () => {
      Elements.confirmBox.classList.remove('show');
      
      // Exit create mode after keeping section
      State.isCreateMode = false;
      Elements.createBtn.classList.remove('active');
      this.updateButtonLabel(Elements.createBtn, 'Seat Rows');
      State.app.stage.cursor = 'default';
      
      State.pendingSection = null;
    });

    Elements.confirmDelete.addEventListener('click', () => {
      if (State.pendingSection && State.pendingSection.section) {
        SectionManager.deleteSection(State.pendingSection.section);
      }
      
      Elements.confirmBox.classList.remove('show');
      
      // Exit create mode after deleting section
      State.isCreateMode = false;
      Elements.createBtn.classList.remove('active');
      this.updateButtonLabel(Elements.createBtn, 'Seat Rows');
      State.app.stage.cursor = 'default';
      
      State.pendingSection = null;
    });

    // Keyboard support for create confirmation dialog
    window.addEventListener('keydown', (e) => {
      if (!Elements.confirmBox.classList.contains('show')) return;
      
      if (e.key === 'Enter') {
        e.preventDefault();
        Elements.confirmKeep.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        Elements.confirmDelete.click();
      }
    });
  },

  handleCreateStart(worldPos) {
    State.isCreating = true;
    State.createStart = { x: worldPos.x, y: worldPos.y };
    State.previewRect = new PIXI.Graphics();
    State.world.addChild(State.previewRect);
  },

  handleCreateMove(worldPos, screenX, screenY) {
    const rawWidth = Math.abs(worldPos.x - State.createStart.x);
    const rawHeight = Math.abs(worldPos.y - State.createStart.y);
    
    const { seats, rows, snappedWidth, snappedHeight } = Utils.calculateSeatDimensions(rawWidth, rawHeight);
    
    // Calculate position based on drag direction
    const x = worldPos.x < State.createStart.x ? State.createStart.x - snappedWidth : State.createStart.x;
    const y = worldPos.y < State.createStart.y ? State.createStart.y - snappedHeight : State.createStart.y;
    
    State.previewRect.clear();
    State.previewRect.rect(x, y, snappedWidth, snappedHeight);
    State.previewRect.stroke({ 
      width: VISUAL_CONFIG.PREVIEW.STROKE_WIDTH, 
      color: COLORS.PREVIEW, 
      alpha: VISUAL_CONFIG.PREVIEW.STROKE_ALPHA 
    });
    State.previewRect.fill({ 
      color: COLORS.PREVIEW, 
      alpha: VISUAL_CONFIG.PREVIEW.FILL_ALPHA 
    });
    
    Utils.showDragInfo(seats, rows, screenX, screenY);
  },

  handleCreateEnd(worldPos) {
    Utils.hideDragInfo();
    
    const rawWidth = Math.abs(worldPos.x - State.createStart.x);
    const rawHeight = Math.abs(worldPos.y - State.createStart.y);
    
    const { seats, rows, snappedWidth, snappedHeight } = Utils.calculateSeatDimensions(rawWidth, rawHeight);
    
    const x = worldPos.x < State.createStart.x ? State.createStart.x - snappedWidth : State.createStart.x;
    const y = worldPos.y < State.createStart.y ? State.createStart.y - snappedHeight : State.createStart.y;
    
    // Clean up preview
    State.world.removeChild(State.previewRect);
    State.previewRect = null;
    State.createStart = null;
    State.isCreating = false;
    
    // Create section immediately if large enough
    if (snappedWidth > CONFIG.MIN_SECTION_SIZE && snappedHeight > CONFIG.MIN_SECTION_SIZE) {
      const section = SectionManager.createSection(x, y, snappedWidth, snappedHeight, rows, seats);
      
      // Show confirm box near the section
      const sectionScreenPos = section.getGlobalPosition();
      const rect = State.app.canvas.getBoundingClientRect();
      const boxX = rect.left + sectionScreenPos.x + snappedWidth / 2 - 100;
      const boxY = rect.top + sectionScreenPos.y - 80;
      
      Elements.confirmBox.style.left = boxX + 'px';
      Elements.confirmBox.style.top = boxY + 'px';
      
      Elements.confirmInfo.innerHTML = `
        <strong>${seats}</strong> seats per row<br>
        <strong>${rows}</strong> rows<br>
        <strong>${seats * rows}</strong> total seats
      `;
      
      Elements.confirmBox.classList.add('show');
      
      State.pendingSection = { section, x, y, width: snappedWidth, height: snappedHeight, rows, seats };
    }
  },

  handleCreateGAStart(worldPos) {
    State.isCreating = true;
    State.createStart = { x: worldPos.x, y: worldPos.y };
    State.previewRect = new PIXI.Graphics();
    State.world.addChild(State.previewRect);
  },

  handleCreateGAMove(worldPos, screenX, screenY) {
    const rawWidth = Math.abs(worldPos.x - State.createStart.x);
    const rawHeight = Math.abs(worldPos.y - State.createStart.y);
    
    // Snap to seat grid dimensions
    const { seats, rows, snappedWidth, snappedHeight } = Utils.calculateSeatDimensions(rawWidth, rawHeight);
    
    // Calculate position based on drag direction
    const x = worldPos.x < State.createStart.x ? State.createStart.x - snappedWidth : State.createStart.x;
    const y = worldPos.y < State.createStart.y ? State.createStart.y - snappedHeight : State.createStart.y;
    
    State.previewRect.clear();
    State.previewRect.rect(x, y, snappedWidth, snappedHeight);
    State.previewRect.stroke({ 
      width: VISUAL_CONFIG.PREVIEW.STROKE_WIDTH, 
      color: COLORS.PREVIEW, 
      alpha: VISUAL_CONFIG.PREVIEW.STROKE_ALPHA 
    });
    State.previewRect.fill({ 
      color: COLORS.PREVIEW, 
      alpha: VISUAL_CONFIG.PREVIEW.FILL_ALPHA 
    });
    
    // Show dimensions info (without seat/row count for GA)
    Elements.dragInfo.innerHTML = `${Math.round(snappedWidth)} × ${Math.round(snappedHeight)}<br><strong>General Admission</strong>`;
    Elements.dragInfo.style.left = (screenX + 15) + 'px';
    Elements.dragInfo.style.top = (screenY + 15) + 'px';
    Elements.dragInfo.classList.add('show');
  },

  handleCreateGAEnd(worldPos) {
    Utils.hideDragInfo();
    
    const rawWidth = Math.abs(worldPos.x - State.createStart.x);
    const rawHeight = Math.abs(worldPos.y - State.createStart.y);
    
    // Snap to seat grid dimensions
    const { seats, rows, snappedWidth, snappedHeight } = Utils.calculateSeatDimensions(rawWidth, rawHeight);
    
    const x = worldPos.x < State.createStart.x ? State.createStart.x - snappedWidth : State.createStart.x;
    const y = worldPos.y < State.createStart.y ? State.createStart.y - snappedHeight : State.createStart.y;
    
    // Clean up preview
    State.world.removeChild(State.previewRect);
    State.previewRect = null;
    State.createStart = null;
    State.isCreating = false;
    
    // Create GA section if large enough
    if (snappedWidth > CONFIG.MIN_SECTION_SIZE && snappedHeight > CONFIG.MIN_SECTION_SIZE) {
      SectionManager.createGASection(x, y, snappedWidth, snappedHeight);
      
      // Exit GA creation mode
      State.isCreateGAMode = false;
      Elements.createGABtn.classList.remove('active');
      this.updateButtonLabel(Elements.createGABtn, 'GA');
      State.app.stage.cursor = 'default';
    }
  }
};
