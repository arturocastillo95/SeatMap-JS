// ============================================
// SECTION FACTORY - Section creation logic
// ============================================

import { State } from '../core/state.js';
import { Section } from '../core/Section.js';

/**
 * Factory for creating sections
 * Responsible for: Section instantiation, initial setup
 */
export const SectionFactory = {
  /**
   * Create a regular section with seats
   * @param {number} x - X position
   * @param {number} y - Y position  
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {number} rows - Number of rows
   * @param {number} seatsPerRow - Seats per row
   * @returns {Section} The created section
   */
  createSection(x, y, width, height, rows, seatsPerRow) {
    try {
      const section = new Section({
        x,
        y,
        width,
        height,
        sectionId: `Section ${State.sectionCounter++}`,
        isGeneralAdmission: false
      });
      
      return section;
    } catch (error) {
      console.error('Failed to create section:', error.message);
      throw error;
    }
  },

  /**
   * Create a General Admission section
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @returns {Section} The created GA section
   */
  createGASection(x, y, width, height) {
    try {
      const section = new Section({
        x,
        y,
        width,
        height,
        sectionId: `GA ${State.sectionCounter++}`,
        isGeneralAdmission: true,
        gaCapacity: 0
      });
      
      return section;
    } catch (error) {
      console.error('Failed to create GA section:', error.message);
      throw error;
    }
  },

  /**
   * Register section in the application state
   * @param {Section} section - The section to register
   */
  registerSection(section) {
    State.sectionLayer.addChild(section);
    State.sections.push(section);
  },

  /**
   * Delete a section
   * @param {Section} section - The section to delete
   */
  deleteSection(section) {
    // Remove from selection
    const selectionIndex = State.selectedSections.indexOf(section);
    if (selectionIndex > -1) {
      State.selectedSections.splice(selectionIndex, 1);
    }
    
    // Remove resize handles (for GA sections)
    if (section.resizeHandles && section.resizeHandles.length > 0) {
      section.resizeHandles.forEach(handle => {
        if (handle && handle.parent) {
          handle.parent.removeChild(handle);
          handle.destroy();
        }
      });
      section.resizeHandles = [];
    }
    
    // Remove seats
    if (section.seats && section.seats.length > 0) {
      section.seats.forEach(seat => {
        if (seat) {
          State.seatLayer.removeChild(seat);
          seat.destroy({ children: true });
        }
      });
    }
    
    // Remove row labels
    if (section.rowLabels && section.rowLabels.length > 0) {
      section.rowLabels.forEach(label => {
        if (label && label.parent) {
          label.parent.removeChild(label);
          label.destroy();
        }
      });
      section.rowLabels = [];
    }
    
    // Remove selection border
    if (section.selectionBorder) {
      section.removeChild(section.selectionBorder);
      section.selectionBorder.destroy();
    }
    
    // Remove from state
    const index = State.sections.indexOf(section);
    if (index > -1) {
      State.sections.splice(index, 1);
    }
    
    // Remove from stage and destroy
    State.sectionLayer.removeChild(section);
    section.destroy({ children: true });
    
    console.log(`Deleted section: ${section.sectionId}`);
  }
};
