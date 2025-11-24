// ============================================
// SECTION INTERACTION HANDLER - Section user interactions
// ============================================

import { State } from '../core/state.js';
import { VISUAL_CONFIG } from '../core/config.js';
import { Utils } from '../core/utils.js';
import { COLORS } from '../core/config.js';

/**
 * Handler for section interactions
 * Responsible for: Click handlers, selection, context menus, labels
 */
export const SectionInteractionHandler = {
  /**
   * Setup interaction handlers for a section
   * @param {Section} section - The section
   */
  setupSectionInteractions(section) {
    section.on('pointerdown', async (e) => {
      e.stopPropagation();
      
      // Only prepare for drag, don't start it immediately
      if (!State.isDeleteMode && !State.isEditSeatsMode && !State.isCreateMode && !State.isCreateGAMode) {
        
        // Zone Mode Restriction
        if (State.isEditZonesMode) {
          if (!section.isZone) return; // Can only select zones in zone mode
        } else {
          if (section.isZone) return; // Cannot select zones in other modes
        }

        let selectionChanged = false;
        
        // If clicking on a non-selected section, select it first
        if (!State.selectedSections.includes(section)) {
          if (!e.shiftKey) {
            this.deselectAll();
          }
          this.selectSection(section);
          selectionChanged = true;
        }
        // If clicking on an already-selected section, keep the selection as-is
        // This allows dragging multiple selected sections together
        
        // Always ensure resize handles for GA sections or Zones when there's only one selected
        if ((section.isGeneralAdmission || section.isZone) && State.selectedSections.length === 1) {
          const { ResizeHandleManager } = await import('./ResizeHandleManager.js');
          if (!section.resizeHandles) {
            ResizeHandleManager.addResizeHandles(section);
          }
        }
        
        // Dispatch selection changed event if needed
        if (selectionChanged) {
          document.dispatchEvent(new CustomEvent('selectionchanged', { 
            detail: { selectedSections: State.selectedSections } 
          }));
        }
        
        // Store potential drag start (will be activated on move)
        const worldPos = Utils.screenToWorld(e.global.x, e.global.y);
        State.potentialDragStart = {
          worldPos,
          screenPos: { x: e.global.x, y: e.global.y }
        };
      }
    });
    
    section.on('pointertap', async (e) => {
      e.stopPropagation();
      
      // Zone Mode Restriction
      if (State.isEditZonesMode) {
        if (!section.isZone) return;
      } else {
        if (section.isZone) return;
      }

      if (State.isDeleteMode) {
        const { SectionFactory } = await import('./SectionFactory.js');
        SectionFactory.deleteSection(section);
        return;
      }
      
      if (State.isEditSeatsMode) return;
      
      // Selection is now handled in pointerdown, just flash the section
      Utils.flash(section, COLORS.FLASH_SECTION);
    });
    
    section.on('rightdown', (e) => {
      e.stopPropagation();
      
      // Zone Mode Restriction
      if (State.isEditZonesMode) {
        if (!section.isZone) return;
      } else {
        if (section.isZone) return;
      }

      if (!State.isDeleteMode && !State.isEditSeatsMode) {
        this.showContextMenu(e.global.x, e.global.y, section);
      }
    });
    
    section.on('pointerover', () => {
      // Zone Mode Restriction
      if (State.isEditZonesMode) {
        if (!section.isZone) return;
      } else {
        if (section.isZone) return;
      }

      if (!State.isDeleteMode && !State.isEditSeatsMode) {
        Utils.showTooltip(section.sectionId);
      }
    });
    
    section.on('pointerout', Utils.hideTooltip);
  },

  /**
   * Select a section
   * @param {Section} section - The section to select
   */
  selectSection(section) {
    if (!State.selectedSections.includes(section)) {
      State.selectedSections.push(section);
    }
    
    // Create selection border
    if (!section.selectionBorder) {
      const offset = VISUAL_CONFIG.SELECTION.BORDER_OFFSET;
      section.selectionBorder = new PIXI.Graphics();
      section.selectionBorder.rect(-offset, -offset, section.contentWidth + offset * 2, section.contentHeight + offset * 2);
      section.selectionBorder.stroke({ 
        width: VISUAL_CONFIG.SELECTION.BORDER_WIDTH, 
        color: VISUAL_CONFIG.SELECTION.COLOR 
      });
      section.addChildAt(section.selectionBorder, 0);
    }
    section.selectionBorder.visible = true;
  },

  /**
   * Deselect a section
   * @param {Section} section - The section to deselect
   */
  async deselectSection(section) {
    const index = State.selectedSections.indexOf(section);
    if (index > -1) {
      State.selectedSections.splice(index, 1);
    }
    
    if (section.selectionBorder) {
      section.selectionBorder.visible = false;
    }
    
    // Remove resize handles for GA sections or Zones
    if ((section.isGeneralAdmission || section.isZone) && section.resizeHandles) {
      const { ResizeHandleManager } = await import('./ResizeHandleManager.js');
      ResizeHandleManager.removeResizeHandles(section);
    }
  },

  /**
   * Deselect all sections
   */
  deselectAll() {
    State.selectedSections.forEach(section => {
      if (section.selectionBorder) {
        section.selectionBorder.visible = false;
      }
      
      // Remove resize handles
      if ((section.isGeneralAdmission || section.isZone) && section.resizeHandles) {
        import('./ResizeHandleManager.js').then(({ ResizeHandleManager }) => {
          ResizeHandleManager.removeResizeHandles(section);
        });
      }
    });
    State.selectedSections = [];
  },

  /**
   * Show context menu for a section
   * @param {number} x - Screen x position
   * @param {number} y - Screen y position
   * @param {Section} section - The section
   */
  async showContextMenu(x, y, section) {
    const contextMenu = document.getElementById('contextMenu');
    if (!contextMenu) return;
    
    // Position and show the menu
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.style.display = 'block';
    contextMenu.dataset.sectionId = section.sectionId;
    
    // Show/hide "Edit Seats" option based on section type
    const editSeatsOption = document.getElementById('contextEditSeats');
    if (editSeatsOption) {
      editSeatsOption.style.display = section.isGeneralAdmission ? 'none' : 'flex';
    }
    
    // Store the section in State for the context menu actions to use
    State.contextMenuSection = section;
    
    // Close menu on click outside
    const closeMenu = (e) => {
      if (!contextMenu.contains(e.target)) {
        contextMenu.style.display = 'none';
        document.removeEventListener('pointerdown', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('pointerdown', closeMenu);
    }, 0);
  },

  /**
   * Create section label (deprecated - labels no longer used)
   * @param {Section} section - The section
   * @deprecated Labels are now part of the Section class
   */
  createSectionLabel(section) {
    console.warn('createSectionLabel is deprecated');
  },

  /**
   * Edit section label (deprecated)
   * @param {Section} section - The section
   * @param {PIXI.Text} label - The label
   * @param {PIXI.Graphics} labelBg - The label background
   * @deprecated Labels are now part of the Section class
   */
  editSectionLabel(section, label, labelBg) {
    console.warn('editSectionLabel is deprecated');
  }
};
