// ============================================
// SECTION FACTORY - Section creation logic
// ============================================

import { State } from '../core/state.js';
import { Section } from '../core/Section.js';
import { SectionInteractionHandler } from './SectionInteractionHandler.js';
import { Utils } from '../core/utils.js';

/**
 * Factory for creating sections
 * Responsible for: Section instantiation, initial setup
 */
export const SectionFactory = {
  /**
   * Create a regular section with seats
   * @param {number} x - X position
   * @param {number} y - Y Position
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
   * @param {number} y - Y Position
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
   * Create a Zone section
   * @param {number} x - X position
   * @param {number} y - Y Position
   * @param {number} width - Width
   * @param {number} height - Height
   * @returns {Section} The created Zone section
   */
  createZone(x, y, width, height) {
    try {
      const section = new Section({
        x,
        y,
        width,
        height,
        sectionId: `Zone ${State.sectionCounter++}`,
        isGeneralAdmission: true, // Reuse GA logic for resizing/interaction
        isZone: true,
        zoneLabel: `Zone ${State.sectionCounter}`,
        sectionColor: 0xcccccc, // Default grey for zones
        fillOpacity: 0.5
      });
      
      return section;
    } catch (error) {
      console.error('Failed to create Zone:', error.message);
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
   * Duplicate a section
   * @param {Section} originalSection - The section to duplicate
   * @returns {Section} The duplicated section
   */
  async duplicateSection(originalSection) {
    console.log('Duplicate Section called for:', originalSection.sectionId);
    try {
      // Import FileManager to use serialization logic
      const { FileManager } = await import('./fileManager.js');
      const { SectionManager } = await import('./sectionManager.js');
      
      // Serialize the original section
      const sectionData = FileManager.serializeSection(originalSection);
      console.log('Serialized data:', sectionData);
      
      // Modify data for the new section
      // Offset position slightly so it's visible
      const OFFSET = 50;
      sectionData.x += OFFSET;
      sectionData.y += OFFSET;
      if (sectionData.centerX !== undefined) sectionData.centerX += OFFSET;
      if (sectionData.centerY !== undefined) sectionData.centerY += OFFSET;
      
      // Generate new unique name
      let baseName = originalSection.sectionId;
      // Remove existing " Copy X" suffix if present
      baseName = baseName.replace(/ Copy( \d+)?$/, '');
      
      let newName = `${baseName} Copy`;
      let counter = 1;
      
      // Check for name collisions
      while (State.sections.some(s => s.sectionId === newName)) {
        counter++;
        newName = `${baseName} Copy ${counter}`;
      }
      
      sectionData.name = newName;
      sectionData.id = newName;

      // Regenerate seat IDs to ensure uniqueness
      if (sectionData.seats) {
        sectionData.seats.forEach(seat => {
          // Remove ID so it gets regenerated or generate a new one
          seat.id = Utils.generateShortId();
        });
      }
      
      console.log('Deserializing new section with name:', newName);
      
      // CRITICAL FIX: Deep clone the section data to prevent reference sharing
      // This ensures the duplicated section has completely independent seat objects
      const clonedSectionData = JSON.parse(JSON.stringify(sectionData));
      
      // Deserialize to create the new section
      const newSection = await FileManager.deserializeSection(clonedSectionData, SectionManager);
      
      if (!newSection) {
        console.error('Failed to create new section from deserialization');
        return;
      }

      console.log('New section created:', newSection);
      
      // NOTE: Section is already registered by deserializeSection -> createSection
      // So we don't call registerSection() again to avoid duplicate registration
      
      // Select the new section
      SectionInteractionHandler.deselectAll();
      SectionInteractionHandler.selectSection(newSection);
      
      // Trigger selection changed event
      document.dispatchEvent(new CustomEvent('selectionchanged', { 
        detail: { selectedSections: [newSection] } 
      }));
      
      console.log(`✓ Duplicated section: ${originalSection.sectionId} -> ${newSection.sectionId}`);
      return newSection;
    } catch (error) {
      console.error('Failed to duplicate section:', error);
      throw error;
    }
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
