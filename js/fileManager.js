// ============================================
// FILE MANAGER - Save/Load Venue Maps
// ============================================

import { State } from './state.js';

export const FileManager = {
  /**
   * Export current venue map to JSON format (SMF - Seat Map Format)
   */
  exportToJSON() {
    const timestamp = new Date().toISOString();
    
    const mapData = {
      // Format metadata
      format: "SMF",
      version: "1.0.0",
      created: timestamp,
      modified: timestamp,
      
      // Venue information
      venue: {
        name: "Untitled Venue",
        location: "",
        capacity: this.calculateTotalCapacity(),
        metadata: {}
      },
      
      // Canvas/viewport settings
      canvas: {
        width: State.app.screen.width,
        height: State.app.screen.height,
        zoom: State.world.scale.x,
        panX: State.world.position.x,
        panY: State.world.position.y
      },
      
      // Section groups (for future use)
      groups: [],
      
      // Sections array
      sections: State.sections.map(section => this.serializeSection(section)),
      
      // Future extensibility: other objects
      objects: [],
      
      // Global metadata
      metadata: {
        software: "Venue Map JS v1.0",
        author: "",
        tags: [],
        custom: {}
      }
    };
    
    return mapData;
  },
  
  /**
   * Serialize a single section to JSON format
   */
  serializeSection(section) {
    // Calculate base configuration from seats
    const seats = section.seats;
    if (seats.length === 0) {
      return null;
    }
    
    // Get unique rows and columns
    const rows = new Set(seats.map(s => s.rowIndex));
    const cols = new Set(seats.map(s => s.colIndex));
    
    const numRows = rows.size;
    const numCols = cols.size;
    
    return {
      // Identity
      id: section.sectionId,
      name: section.sectionId,
      groupId: null,
      
      // Position and dimensions
      x: section.x - section.pivot.x,  // Convert from center to top-left
      y: section.y - section.pivot.y,
      width: section.contentWidth,
      height: section.contentHeight,
      
      // Base configuration
      base: {
        rows: numRows,
        columns: numCols,
        baseWidth: section.baseWidth,
        baseHeight: section.baseHeight
      },
      
      // Transformations
      transform: {
        rotation: section.rotationDegrees || 0,
        curve: section.curve || 0,
        stretchH: section.stretchH || 0,
        stretchV: section.stretchV || 0
      },
      
      // Row labels
      rowLabels: {
        type: section.rowLabelType || "none",
        showLeft: section.showLeftLabels || false,
        showRight: section.showRightLabels || false
      },
      
      // Seat configuration
      seats: {
        count: seats.length,
        numbering: "perRow"
      },
      
      // Visual styling
      style: {
        fillColor: "#4a5568",
        seatColor: "#ffffff",
        borderColor: "#3b82f6",
        opacity: 1.0
      },
      
      // Extensible metadata
      metadata: {}
    };
  },
  
  /**
   * Calculate total seating capacity
   */
  calculateTotalCapacity() {
    return State.sections.reduce((total, section) => {
      return total + section.seats.length;
    }, 0);
  },
  
  /**
   * Download JSON file
   */
  downloadJSON(data, filename = 'venue-map.json') {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
  },
  
  /**
   * Save current venue map
   */
  save() {
    try {
      const mapData = this.exportToJSON();
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `venue-map-${timestamp}.json`;
      
      this.downloadJSON(mapData, filename);
      
      console.log('✓ Venue map exported successfully');
      return true;
    } catch (error) {
      console.error('✗ Failed to export venue map:', error);
      return false;
    }
  },
  
  /**
   * Import venue map from JSON
   */
  async importFromJSON(jsonData) {
    try {
      // Validate format
      if (jsonData.format !== 'SMF') {
        throw new Error('Invalid file format. Expected SMF (Seat Map Format).');
      }
      
      console.log(`Loading SMF v${jsonData.version}...`);
      
      // Clear existing sections
      await this.clearAllSections();
      
      // Restore canvas state
      if (jsonData.canvas) {
        State.world.scale.set(jsonData.canvas.zoom);
        State.world.position.set(jsonData.canvas.panX, jsonData.canvas.panY);
      }
      
      // Import sections
      const { SectionManager } = await import('./sectionManager.js');
      
      for (const sectionData of jsonData.sections) {
        this.deserializeSection(sectionData, SectionManager);
      }
      
      console.log(`✓ Loaded ${jsonData.sections.length} sections with ${jsonData.venue.capacity} total seats`);
      return true;
    } catch (error) {
      console.error('✗ Failed to import venue map:', error);
      alert(`Failed to load file: ${error.message}`);
      return false;
    }
  },
  
  /**
   * Deserialize a single section from JSON
   */
  deserializeSection(data, SectionManager) {
    // Create section with base dimensions
    const section = SectionManager.createSection(
      data.x,
      data.y,
      data.base.baseWidth,
      data.base.baseHeight,
      data.base.rows,
      data.base.columns
    );
    
    // Restore section name
    section.sectionId = data.name;
    
    // Restore row labels
    section.rowLabelType = data.rowLabels.type;
    section.showLeftLabels = data.rowLabels.showLeft;
    section.showRightLabels = data.rowLabels.showRight;
    
    // Restore transformations
    section.rotationDegrees = data.transform.rotation;
    section.curve = data.transform.curve;
    section.stretchH = data.transform.stretchH;
    section.stretchV = data.transform.stretchV;
    
    // Apply transformations in correct order
    if (data.transform.curve > 0 || data.transform.stretchH > 0 || data.transform.stretchV > 0) {
      if (data.transform.curve > 0) {
        SectionManager.applyCurve(section);
      } else {
        SectionManager.applyStretch(section);
      }
    }
    
    // Apply rotation
    if (data.transform.rotation !== 0) {
      section.angle = data.transform.rotation;
      SectionManager.positionSeatsAndLabels(section);
    }
    
    // Update row labels if needed
    if (data.rowLabels.type !== 'none') {
      SectionManager.updateRowLabels(section);
    }
    
    return section;
  },
  
  /**
   * Clear all existing sections
   */
  async clearAllSections() {
    // Make a copy of the sections array to avoid modification during iteration
    const sectionsToDelete = [...State.sections];
    
    const { SectionManager } = await import('./sectionManager.js');
    sectionsToDelete.forEach(section => {
      SectionManager.deleteSection(section);
    });
    
    // Clear arrays
    State.sections = [];
    State.selectedSections = [];
    
    console.log('✓ Cleared all existing sections');
  },
  
  /**
   * Open file dialog and load venue map
   */
  open(fileInputElement) {
    return new Promise((resolve, reject) => {
      fileInputElement.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        
        try {
          const text = await file.text();
          const jsonData = JSON.parse(text);
          const success = await this.importFromJSON(jsonData);
          
          // Reset file input for next use
          fileInputElement.value = '';
          
          resolve(success);
        } catch (error) {
          reject(error);
        }
      };
      
      // Trigger file picker
      fileInputElement.click();
    });
  }
};
