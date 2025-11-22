// ============================================
// SECTION MANAGER (UNIFIED) - Delegates to specialized managers
// ============================================
// This is the main entry point that coordinates all section-related operations
// by delegating to focused, single-responsibility modules.

import { SectionFactory } from './SectionFactory.js';
import { SeatManager } from './SeatManager.js';
import { SectionInteractionHandler } from './SectionInteractionHandler.js';
import { ResizeHandleManager } from './ResizeHandleManager.js';
import { SectionTransformations } from './SectionTransformations.js';
import { State } from '../core/state.js';

/**
 * Unified SectionManager that delegates to specialized managers
 * This maintains backward compatibility while using a cleaner architecture
 */
export const SectionManager = {
  // ============================================
  // CREATION (delegates to SectionFactory)
  // ============================================
  
  createSection(x, y, width, height, rows, seatsPerRow) {
    const section = SectionFactory.createSection(x, y, width, height, rows, seatsPerRow);
    SectionInteractionHandler.setupSectionInteractions(section);
    SectionFactory.registerSection(section);
    SeatManager.createSeats(section, x, y, width, height, rows, seatsPerRow);
    return section;
  },

  createGASection(x, y, width, height) {
    const section = SectionFactory.createGASection(x, y, width, height);
    SectionInteractionHandler.setupSectionInteractions(section);
    SectionFactory.registerSection(section);
    return section;
  },

  createZone(x, y, width, height) {
    const section = SectionFactory.createZone(x, y, width, height);
    SectionInteractionHandler.setupSectionInteractions(section);
    SectionFactory.registerSection(section);
    return section;
  },

  duplicateSection(section) {
    return SectionFactory.duplicateSection(section);
  },

  deleteSection(section) {
    return SectionFactory.deleteSection(section);
  },

  // ============================================
  // RESIZE HANDLES (delegates to ResizeHandleManager)
  // ============================================
  
  addResizeHandles(section) {
    return ResizeHandleManager.addResizeHandles(section);
  },

  updateResizeHandles(section) {
    return ResizeHandleManager.updateHandlePositions(section);
  },

  removeResizeHandles(section) {
    return ResizeHandleManager.removeResizeHandles(section);
  },

  resizeGASection(section, newWidth, newHeight) {
    try {
      section.resize(newWidth, newHeight);
      if (section.resizeHandles) {
        ResizeHandleManager.updateHandlePositions(section);
      }
    } catch (error) {
      console.error('Failed to resize GA section:', error.message);
      throw error;
    }
  },

  // ============================================
  // SEATS (delegates to SeatManager)
  // ============================================
  
  createSeats(section, x, y, width, height, rows, seatsPerRow) {
    return SeatManager.createSeats(section, x, y, width, height, rows, seatsPerRow);
  },

  setupSeatInteractions(seat) {
    return SeatManager.setupSeatInteractions(seat);
  },

  updateSeatNumbers(section) {
    return SeatManager.updateSeatNumbers(section);
  },

  getRowLabelText(index, type, startValue) {
    return SeatManager.getRowLabelText(index, type, startValue);
  },

  createRowLabel(text, isHidden = false) {
    return SeatManager.createRowLabel(text, isHidden);
  },

  // ============================================
  // INTERACTIONS (delegates to SectionInteractionHandler)
  // ============================================
  
  setupSectionInteractions(section) {
    return SectionInteractionHandler.setupSectionInteractions(section);
  },

  selectSection(section) {
    return SectionInteractionHandler.selectSection(section);
  },

  deselectSection(section) {
    return SectionInteractionHandler.deselectSection(section);
  },

  deselectAll() {
    return SectionInteractionHandler.deselectAll();
  },

  showContextMenu(x, y, section) {
    return SectionInteractionHandler.showContextMenu(x, y, section);
  },

  // ============================================
  // TRANSFORMATIONS (delegates to SectionTransformations)
  // ============================================
  
  applyStretch(section) {
    return SectionTransformations.applyStretch(section);
  },

  applyCurve(section) {
    return SectionTransformations.applyCurve(section);
  },

  calculateMaxCurve(section) {
    return SectionTransformations.calculateMaxCurve(section);
  },

  alignRows(section, alignment) {
    return SectionTransformations.alignRows(section, alignment);
  },

  recalculateSectionDimensions(section) {
    return SectionTransformations.recalculateSectionDimensions(section);
  },

  positionSeatsAndLabels(section) {
    return SectionTransformations.positionSeatsAndLabels(section);
  },

  // ============================================
  // GRAPHICS & RENDERING
  // ============================================
  
  updateSectionGraphics(section) {
    section.redrawGraphics();
  },

  setSectionColor(section, colorHex) {
    if (!colorHex || typeof colorHex !== 'string') {
      throw new Error('Invalid color hex');
    }
    
    // Convert hex string to number
    const colorValue = parseInt(colorHex.replace('#', ''), 16);
    section.sectionColor = colorValue;
    
    console.log(`✓ Updated section color to ${colorHex}`);
  },

  setSeatColor(section, colorHex) {
    if (!colorHex || typeof colorHex !== 'string') {
      throw new Error('Invalid color hex');
    }
    
    // Convert hex string to number
    const colorValue = parseInt(colorHex.replace('#', ''), 16);
    section.seatColor = colorValue;
    
    // Update all existing seats (if any)
    SeatManager.updateAllSeats(section);
    
    console.log(`✓ Updated seat color to ${colorHex}`);
  },

  setSeatTextColor(section, colorHex) {
    if (!colorHex || typeof colorHex !== 'string') {
      throw new Error('Invalid color hex');
    }
    
    // Convert hex string to number
    const colorValue = parseInt(colorHex.replace('#', ''), 16);
    section.seatTextColor = colorValue;
    
    // Update all existing seats (if any)
    SeatManager.updateAllSeats(section);
    
    console.log(`✓ Updated seat text color to ${colorHex}`);
  },

  setRowLabelColor(section, colorHex) {
    if (!colorHex || typeof colorHex !== 'string') {
      throw new Error('Invalid color hex');
    }
    
    // Convert hex string to number
    const colorValue = parseInt(colorHex.replace('#', ''), 16);
    section.rowLabelColor = colorValue;
    
    // Update only the color of existing row labels (don't recalculate positions)
    section.rowLabels.forEach(label => {
      label.style.fill = colorValue;
    });
    
    console.log(`✓ Updated row label color to ${colorHex}`);
  },

  setGlowEnabled(section, enabled) {
    section.glowEnabled = enabled;
    SeatManager.updateAllSeats(section);
    console.log(`✓ Updated glow enabled to ${enabled}`);
  },

  setGlowColor(section, colorHex) {
    if (!colorHex || typeof colorHex !== 'string') {
      throw new Error('Invalid color hex');
    }
    const colorValue = parseInt(colorHex.replace('#', ''), 16);
    section.glowColor = colorValue;
    SeatManager.updateAllSeats(section);
    console.log(`✓ Updated glow color to ${colorHex}`);
  },

  setGlowOpacity(section, opacity) {
    section.glowOpacity = opacity;
    SeatManager.updateAllSeats(section);
    console.log(`✓ Updated glow opacity to ${opacity}`);
  },

  setGlowStrength(section, strength) {
    section.glowStrength = strength;
    SeatManager.updateAllSeats(section);
    console.log(`✓ Updated glow strength to ${strength}`);
  },

  setGlowBlur(section, blur) {
    section.glowBlur = blur;
    SeatManager.updateAllSeats(section);
    console.log(`✓ Updated glow blur to ${blur}`);
  },

  setSectionPadding(section, padding) {
    if (typeof padding !== 'number' || padding < 0) {
      throw new Error('Invalid padding value');
    }
    section.sectionPadding = padding;
    
    // Recalculate dimensions to apply the new padding
    if (section.rowLabels && section.rowLabels.length > 0) {
       SeatManager.updateRowLabels(section);
    } else {
       SectionTransformations.recalculateSectionDimensions(section);
       SectionTransformations.positionSeatsAndLabels(section);
    }
    
    console.log(`✓ Updated section padding to ${padding}`);
  },

  // ============================================
  // LEGACY/COMPATIBILITY METHODS
  // ============================================
  
  // Methods that may still be called by old code but are deprecated
  createSectionLabel(section) {
    console.warn('createSectionLabel is deprecated - labels are now part of Section class');
  },

  editSectionLabel(section, label, labelBg) {
    console.warn('editSectionLabel is deprecated - labels are now part of Section class');
  },

  updateRowLabels(section) {
    return SeatManager.updateRowLabels(section);
  },

  updateRowLabelPositions(section) {
    // Stub for compatibility
    console.warn('updateRowLabelPositions should use SectionTransformations');
  },

  updateZoneVisibility(scale) {
    const ZOOM_THRESHOLD = 1.5; // Start fading out at 1.5x zoom
    const FADE_RANGE = 0.5; // Fully transparent at 2.0x zoom
    
    State.sections.forEach(section => {
      if (section.isZone) {
        let opacity = section.fillOpacity || 0.2;
        
        if (scale > ZOOM_THRESHOLD) {
          const fade = Math.max(0, 1 - (scale - ZOOM_THRESHOLD) / FADE_RANGE);
          opacity *= fade;
        }
        
        // Update the graphics alpha directly
        if (section.bgGraphics) {
          section.bgGraphics.alpha = opacity;
        }
        // Also fade label
        if (section.labelContainer) {
          section.labelContainer.alpha = opacity > 0.05 ? 1 : 0;
        }
      }
    });
  },
};

/**
 * Architecture Benefits:
 * 
 * ✅ Single Responsibility - Each manager handles one concern
 * ✅ Easier Testing - Test each manager independently
 * ✅ Better Maintainability - Changes isolated to specific modules
 * ✅ Reduced Coupling - Managers don't depend on each other
 * ✅ Cleaner Code - ~300 lines vs 1500+ lines per module
 * ✅ Backward Compatible - Existing code continues to work
 */
