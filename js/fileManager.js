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
      version: "2.0.0",
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
      
      // Underlay image (background)
      underlay: State.underlayData ? {
        dataUrl: State.underlayData,
        fileName: State.underlayFileName,
        sourceUrl: State.underlaySourceUrl || null,
        x: State.underlayX,
        y: State.underlayY,
        scale: State.underlayScale,
        opacity: State.underlayOpacity,
        visible: State.underlayVisible
      } : null,
      
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
    // Handle GA sections differently
    if (section.isGeneralAdmission) {
      return {
        // Identity
        id: section.sectionId,
        name: section.sectionId,
        groupId: null,
        type: 'ga', // Mark as General Admission
        
        // Position and dimensions
        x: section.x - section.pivot.x,  // Convert from center to top-left
        y: section.y - section.pivot.y,
        width: section.contentWidth,
        height: section.contentHeight,
        
        // Base configuration
        base: {
          rows: 0,
          columns: 0,
          baseWidth: section.baseWidth,
          baseHeight: section.baseHeight
        },
        
        // GA specific properties
        ga: {
          capacity: section.gaCapacity || 0
        },
        
        // Transformations
        transform: {
          rotation: section.rotationDegrees || 0,
          curve: 0,
          stretchH: 0,
          stretchV: 0
        },
        
        // Row labels (not used for GA)
        rowLabels: {
          type: "none",
          start: 1,
          reversed: false,
          showLeft: false,
          showRight: false,
          hidden: false
        },
        
        // Seat configuration (not used for GA)
        seatNumbering: {
          start: 1,
          reversed: false,
          perRow: true
        },
        
        // No individual seats for GA
        seats: [],
        
        // Visual styling
        style: {
          fillColor: "#4a5568",
          seatColor: "#ffffff",
          borderColor: "#3b82f6",
          sectionColor: section.sectionColor !== undefined ? section.sectionColor : 0x3b82f6,
          opacity: 1.0
        },
        
        // Pricing
        pricing: section.pricing ? {
          basePrice: section.pricing.basePrice || 0,
          serviceFee: section.pricing.serviceFee || 0,
          serviceFeeEnabled: section.pricing.serviceFeeEnabled || false,
          serviceFeeType: section.pricing.serviceFeeType || 'fixed'
        } : {
          basePrice: 0,
          serviceFee: 0,
          serviceFeeEnabled: false,
          serviceFeeType: 'fixed'
        },
        
        // Extensible metadata
        metadata: {}
      };
    }
    
    // Regular section with seats
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
        start: section.rowLabelStart !== undefined ? section.rowLabelStart : (section.rowLabelType === 'letters' ? 'A' : 1),
        reversed: section.rowLabelReversed || false,
        showLeft: section.showLeftLabels || false,
        showRight: section.showRightLabels || false,
        hidden: section.labelsHidden || false
      },
      
      // Seat configuration and numbering
      seatNumbering: {
        start: section.seatNumberStart || 1,
        reversed: section.seatNumberReversed || false,
        perRow: true
      },
      
      // Individual seats (for supporting deleted seats)
      seats: seats.map(seat => ({
        rowIndex: seat.rowIndex,
        colIndex: seat.colIndex,
        number: seat.children[1] ? seat.children[1].text : (seat.colIndex + 1).toString(),
        baseX: seat.baseRelativeX,
        baseY: seat.baseRelativeY,
        metadata: {}
      })),
      
      // Visual styling
      style: {
        fillColor: "#4a5568",
        seatColor: "#ffffff",
        borderColor: "#3b82f6",
        sectionColor: section.sectionColor !== undefined ? section.sectionColor : 0x3b82f6,
        opacity: 1.0
      },
      
      // Pricing (v2.0.0+)
      pricing: section.pricing ? {
        basePrice: section.pricing.basePrice || 0,
        serviceFee: section.pricing.serviceFee || 0,
        serviceFeeEnabled: section.pricing.serviceFeeEnabled || false,
        serviceFeeType: section.pricing.serviceFeeType || 'fixed'
      } : {
        basePrice: 0,
        serviceFee: 0,
        serviceFeeEnabled: false,
        serviceFeeType: 'fixed'
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
      if (section.isGeneralAdmission) {
        return total + (section.gaCapacity || 0);
      }
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
      
      // Restore underlay if present
      if (jsonData.underlay) {
        const { UnderlayManager } = await import('./managers/UnderlayManager.js');
        await UnderlayManager.restore(jsonData.underlay);
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
    // Check if this is a GA section
    if (data.type === 'ga') {
      // Create GA section
      const section = SectionManager.createGASection(
        data.x,
        data.y,
        data.base.baseWidth,
        data.base.baseHeight
      );
      
      // Restore section name
      section.sectionId = data.name;
      
      // Update GA label with section name
      if (section.gaLabel) {
        section.gaLabel.text = data.name;
      }
      
      // Restore GA capacity
      if (data.ga) {
        section.gaCapacity = data.ga.capacity || 0;
      }
      
      // Restore section color
      if (data.style && data.style.sectionColor !== undefined) {
        section.sectionColor = data.style.sectionColor;
        const colorHex = '#' + section.sectionColor.toString(16).padStart(6, '0');
        SectionManager.setSectionColor(section, colorHex);
      }
      
      // Restore pricing
      if (data.pricing) {
        section.pricing = {
          basePrice: data.pricing.basePrice || 0,
          serviceFee: data.pricing.serviceFee || 0,
          serviceFeeEnabled: data.pricing.serviceFeeEnabled || false,
          serviceFeeType: data.pricing.serviceFeeType || 'fixed'
        };
      }
      
      // Restore rotation
      section.rotationDegrees = data.transform.rotation || 0;
      if (section.rotationDegrees !== 0) {
        section.angle = section.rotationDegrees;
      }
      
      return section;
    }
    
    // Regular section with seats
    // Determine if this is v2.0.0 format with individual seat data
    const hasIndividualSeats = Array.isArray(data.seats) && data.seats.length > 0 && data.seats[0].rowIndex !== undefined;
    
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
    
    // Restore row labels (with v2.0.0 additions)
    section.rowLabelType = data.rowLabels.type;
    section.rowLabelStart = data.rowLabels.start !== undefined ? data.rowLabels.start : (data.rowLabels.type === 'letters' ? 'A' : 1);
    section.rowLabelReversed = data.rowLabels.reversed || false;
    section.showLeftLabels = data.rowLabels.showLeft;
    section.showRightLabels = data.rowLabels.showRight;
    section.labelsHidden = data.rowLabels.hidden || false;
    
    // Restore seat numbering (v2.0.0)
    if (data.seatNumbering) {
      section.seatNumberStart = data.seatNumbering.start || 1;
      section.seatNumberReversed = data.seatNumbering.reversed || false;
    }
    
    // Restore pricing (v2.0.0+)
    if (data.pricing) {
      section.pricing = {
        basePrice: data.pricing.basePrice || 0,
        serviceFee: data.pricing.serviceFee || 0,
        serviceFeeEnabled: data.pricing.serviceFeeEnabled || false,
        serviceFeeType: data.pricing.serviceFeeType || 'fixed'
      };
    }
    
    // Restore section color (v2.0.0+)
    if (data.style && data.style.sectionColor !== undefined) {
      section.sectionColor = data.style.sectionColor;
      // Redraw section with the restored color
      const colorHex = '#' + section.sectionColor.toString(16).padStart(6, '0');
      SectionManager.setSectionColor(section, colorHex);
    }
    
    // Restore transformations
    section.rotationDegrees = data.transform.rotation;
    section.curve = data.transform.curve;
    section.stretchH = data.transform.stretchH;
    section.stretchV = data.transform.stretchV;
    
    // Handle deleted seats (v2.0.0)
    if (hasIndividualSeats) {
      // Create a set of existing seat positions for fast lookup
      const existingSeats = new Set(data.seats.map(s => `${s.rowIndex},${s.colIndex}`));
      
      // Remove seats that were deleted
      section.seats = section.seats.filter(seat => {
        const key = `${seat.rowIndex},${seat.colIndex}`;
        const exists = existingSeats.has(key);
        
        if (!exists) {
          // Remove from display
          State.seatLayer.removeChild(seat);
          seat.destroy();
        }
        
        return exists;
      });
    }
    
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
    
    // Update seat numbers if custom numbering
    if (data.seatNumbering && (data.seatNumbering.start !== 1 || data.seatNumbering.reversed)) {
      SectionManager.updateSeatNumbers(section);
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
