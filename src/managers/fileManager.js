// ============================================
// FILE MANAGER - Save/Load Venue Maps
// ============================================

import { State } from '../core/state.js';
import { COLORS } from '../core/config.js';
import { Utils } from '../core/utils.js';

export const FileManager = {
  /**
   * Export current venue map to JSON format (SMF - Seat Map Format)
   */
  exportToJSON() {
    const timestamp = new Date().toISOString();
    
    const mapData = {
      // Format metadata
      format: "SMF",
      version: "2.1.0",
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
        dataUrl: State.underlaySourceUrl ? null : State.underlayData,
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
      const serialized = {
        // Identity
        id: section.sectionId,
        name: section.sectionId,
        groupId: null,
        type: 'ga', // Mark as General Admission
        
        // Position and dimensions
        x: section.x - section.pivot.x,  // Convert from center to top-left
        y: section.y - section.pivot.y,
        centerX: section.x,  // Store exact center position
        centerY: section.y,
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
          fillColor: COLORS.DEFAULT_FILL_COLOR,
          seatColor: section.seatColor !== undefined ? section.seatColor : COLORS.DEFAULT_SEAT,
          seatTextColor: section.seatTextColor !== undefined ? section.seatTextColor : COLORS.DEFAULT_TEXT,
          borderColor: COLORS.DEFAULT_BORDER_COLOR,
          sectionColor: section.sectionColor !== undefined ? section.sectionColor : COLORS.DEFAULT_SECTION,
          fillVisible: section.fillVisible !== undefined ? section.fillVisible : true,
          strokeVisible: section.strokeVisible !== undefined ? section.strokeVisible : true,
          opacity: 1.0,
          glow: {
            enabled: section.glowEnabled,
            color: section.glowColor,
            opacity: section.glowOpacity,
            strength: section.glowStrength
          }
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

      if (section.isZone) {
        serialized.isZone = true;
        serialized.zoneLabel = section.zoneLabel;
        serialized.showZoneLabel = section.showZoneLabel;
        serialized.showZone = section.showZone;
        serialized.fillOpacity = section.fillOpacity;
        if (section.points) {
          serialized.points = section.points;
        }
      }

      return serialized;
    }
    
    // Regular section with seats
    const seats = section.seats;
    if (seats.length === 0) {
      return null;
    }
    
    // Get unique rows and columns
    const rows = new Set(seats.map(s => s.rowIndex));
    const cols = new Set(seats.map(s => s.colIndex));
    
    // FIX: Calculate grid dimensions based on max indices to preserve grid structure
    // This ensures that if rows/cols are deleted from the middle or start,
    // the grid is still reconstructed correctly during load.
    const maxRowIndex = Math.max(...Array.from(rows));
    const maxColIndex = Math.max(...Array.from(cols));
    
    const numRows = maxRowIndex + 1;
    const numCols = maxColIndex + 1;

    // Calculate spacing to preserve grid layout
    let spacingX = 24; // Default
    let spacingY = 24; // Default
    
    // Calculate X spacing
    let totalSpacingX = 0;
    let countX = 0;
    
    // Group by row
    const rowMap = new Map();
    seats.forEach(s => {
        if (!rowMap.has(s.rowIndex)) rowMap.set(s.rowIndex, []);
        rowMap.get(s.rowIndex).push(s);
    });
    
    rowMap.forEach(rowSeats => {
        rowSeats.sort((a, b) => a.colIndex - b.colIndex);
        for (let i = 1; i < rowSeats.length; i++) {
            const curr = rowSeats[i];
            const prev = rowSeats[i-1];
            const colDiff = curr.colIndex - prev.colIndex;
            if (colDiff > 0) {
                // Use baseRelativeX if available, else relativeX
                const currX = curr.baseRelativeX !== undefined ? curr.baseRelativeX : curr.relativeX;
                const prevX = prev.baseRelativeX !== undefined ? prev.baseRelativeX : prev.relativeX;
                
                if (currX !== undefined && prevX !== undefined) {
                    totalSpacingX += (currX - prevX) / colDiff;
                    countX++;
                }
            }
        }
    });
    
    if (countX > 0) spacingX = totalSpacingX / countX;

    // Calculate Y spacing
    let totalSpacingY = 0;
    let countY = 0;
    
    // Group by col
    const colMap = new Map();
    seats.forEach(s => {
        if (!colMap.has(s.colIndex)) colMap.set(s.colIndex, []);
        colMap.get(s.colIndex).push(s);
    });
    
    colMap.forEach(colSeats => {
        colSeats.sort((a, b) => a.rowIndex - b.rowIndex);
        for (let i = 1; i < colSeats.length; i++) {
            const curr = colSeats[i];
            const prev = colSeats[i-1];
            const rowDiff = curr.rowIndex - prev.rowIndex;
            if (rowDiff > 0) {
                // Use baseRelativeY if available, else relativeY
                const currY = curr.baseRelativeY !== undefined ? curr.baseRelativeY : curr.relativeY;
                const prevY = prev.baseRelativeY !== undefined ? prev.baseRelativeY : prev.relativeY;
                
                if (currY !== undefined && prevY !== undefined) {
                    totalSpacingY += (currY - prevY) / rowDiff;
                    countY++;
                }
            }
        }
    });
    
    if (countY > 0) spacingY = totalSpacingY / countY;

    // Recalculate base dimensions based on the full grid extent
    const margin = 20; // CONFIG.SECTION_MARGIN
    const baseWidth = (numCols > 1) ? ((numCols - 1) * spacingX + (margin * 2)) : section.baseWidth;
    const baseHeight = (numRows > 1) ? ((numRows - 1) * spacingY + (margin * 2)) : section.baseHeight;
    
    return {
      // Identity
      id: section.sectionId,
      name: section.sectionId,
      groupId: null,
      
      // Position and dimensions
      x: section.x - section.pivot.x,  // Convert from center to top-left
      y: section.y - section.pivot.y,
      centerX: section.x,  // Store exact center position  
      centerY: section.y,
      width: section.contentWidth,
      height: section.contentHeight,
      
      // Base configuration
      base: {
        rows: numRows,
        columns: numCols,
        baseWidth: baseWidth,
        baseHeight: baseHeight,
        padding: section.sectionPadding
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
        hidden: section.labelsHidden || false,
        spacing: section.rowLabelSpacing || 20,
        color: section.rowLabelColor !== undefined ? section.rowLabelColor : COLORS.DEFAULT_SEAT
      },
      
      // Seat configuration and numbering
      seatNumbering: {
        start: section.seatNumberStart || 1,
        reversed: section.seatNumberReversed || false,
        perRow: true
      },
      
      // Row alignment
      rowAlignment: section.rowAlignment || 'center',
      
      // Layout shift (for row labels positioning)
      layoutShiftX: section.layoutShiftX || 0,
      layoutShiftY: section.layoutShiftY || 0,
      
      // Individual seats (for supporting deleted seats and special needs)
      // Save BOTH base and current (transformed) positions
      seats: seats.map(seat => {
        // Ensure seat has a unique ID
        if (!seat.id) {
          seat.id = Utils.generateShortId();
        }

        // Optimized seat object (Sparse Object)
        const seatData = {
          id: seat.id,
          r: seat.rowIndex,
          c: seat.colIndex,
          n: seat.seatLabel ? seat.seatLabel.text : (seat.children[2] instanceof PIXI.Text ? seat.children[2].text : (seat.colIndex + 1).toString()),
          x: seat.relativeX !== undefined ? seat.relativeX : seat.x,
          y: seat.relativeY !== undefined ? seat.relativeY : seat.y
        };

        // Optional fields - only add if true/present
        if (seat.specialNeeds) seatData.sn = true;
        if (seat.isManualNumber) seatData.mn = true;
        
        // Base coordinates - only if different from relative (transformed)
        const baseX = seat.baseRelativeX;
        const baseY = seat.baseRelativeY;
        
        if (baseX !== undefined && Math.abs(baseX - seatData.x) > 0.01) {
            seatData.bx = baseX;
        }
        if (baseY !== undefined && Math.abs(baseY - seatData.y) > 0.01) {
            seatData.by = baseY;
        }
        
        // Metadata
        if (seat.metadata && Object.keys(seat.metadata).length > 0) {
            seatData.m = seat.metadata;
        }

        return seatData;
      }),
      
      // Visual styling
      style: {
        fillColor: COLORS.DEFAULT_FILL_COLOR,
        seatColor: section.seatColor !== undefined ? section.seatColor : COLORS.DEFAULT_SEAT,
        seatTextColor: section.seatTextColor !== undefined ? section.seatTextColor : COLORS.DEFAULT_TEXT,
        borderColor: COLORS.DEFAULT_BORDER_COLOR,
        sectionColor: section.sectionColor !== undefined ? section.sectionColor : COLORS.DEFAULT_SECTION,
        fillVisible: section.fillVisible !== undefined ? section.fillVisible : true,
        strokeVisible: section.strokeVisible !== undefined ? section.strokeVisible : true,
        opacity: 1.0,
        glow: {
          enabled: section.glowEnabled,
          color: section.glowColor,
          opacity: section.glowOpacity,
          strength: section.glowStrength,
          blur: section.glowBlur
        }
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
        const { UnderlayManager } = await import('./UnderlayManager.js');
        await UnderlayManager.restore(jsonData.underlay);
      }
      
      // Import sections
      const { SectionManager } = await import('./sectionManager.js');
      
      for (const sectionData of jsonData.sections) {
        await this.deserializeSection(sectionData, SectionManager);
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
  async deserializeSection(data, SectionManager) {
    // Check if this is a GA section or Zone
    if (data.type === 'ga') {
      let section;
      
      // Check for isZone flag OR legacy indicators (like zoneLabel or name starting with "Zone")
      const isZone = data.isZone || (data.zoneLabel !== undefined) || (data.name && data.name.startsWith('Zone'));

      if (isZone) {
        // Create Zone
        section = SectionManager.createZone(
          data.x,
          data.y,
          data.base.baseWidth,
          data.base.baseHeight
        );
        
        // Restore Zone specific properties
        if (data.zoneLabel) section.zoneLabel = data.zoneLabel;
        if (data.showZoneLabel !== undefined) section.showZoneLabel = data.showZoneLabel;
        if (data.showZone !== undefined) section.showZone = data.showZone;
        if (data.fillOpacity !== undefined) section.fillOpacity = data.fillOpacity;
        if (data.points) section.points = data.points;
        
      } else {
        // Create GA section
        section = SectionManager.createGASection(
          data.x,
          data.y,
          data.base.baseWidth,
          data.base.baseHeight
        );
        
        // Update GA label with section name
        if (section.gaLabel) {
          section.gaLabel.text = data.name;
        }
        
        // Restore GA capacity
        if (data.ga) {
          section.gaCapacity = data.ga.capacity || 0;
        }
      }
      
      // Restore section name
      section.sectionId = data.name;
      
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
      
      // Restore exact center position if available (v2.0.0+)
      if (data.centerX !== undefined && data.centerY !== undefined) {
        section.x = data.centerX;
        section.y = data.centerY;
      }
      
      return section;
    }
    
    // Regular section with seats
    // Determine if this is v2.0.0 format with individual seat data
    const hasIndividualSeats = Array.isArray(data.seats) && data.seats.length > 0 && (data.seats[0].rowIndex !== undefined || data.seats[0].r !== undefined);
    
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
    
    // Restore padding (v2.1.0+)
    if (data.base.padding !== undefined) {
      section.sectionPadding = data.base.padding;
    }
    
    // Restore row labels (with v2.0.0 additions)
    section.rowLabelType = data.rowLabels.type;
    section.rowLabelStart = data.rowLabels.start !== undefined ? data.rowLabels.start : (data.rowLabels.type === 'letters' ? 'A' : 1);
    section.rowLabelReversed = data.rowLabels.reversed || false;
    section.showLeftLabels = data.rowLabels.showLeft;
    section.showRightLabels = data.rowLabels.showRight;
    section.labelsHidden = data.rowLabels.hidden || false;
    section.rowLabelSpacing = data.rowLabels.spacing || 20;
    
    // Restore seat numbering (v2.0.0)
    if (data.seatNumbering) {
      section.seatNumberStart = data.seatNumbering.start || 1;
      section.seatNumberReversed = data.seatNumbering.reversed || false;
    }
    
    // Restore row alignment (v2.0.0+)
    if (data.rowAlignment) {
      section.rowAlignment = data.rowAlignment;
    }
    
    // Restore layout shift (v2.0.0+)
    if (data.layoutShiftX !== undefined) {
      section.layoutShiftX = data.layoutShiftX;
    }
    if (data.layoutShiftY !== undefined) {
      section.layoutShiftY = data.layoutShiftY;
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
    
    // Restore seat colors (v2.0.0+)
    let needsSeatColorUpdate = false;
    if (data.style) {
      if (data.style.seatColor !== undefined && data.style.seatColor !== null) {
        // Handle both number and string formats
        if (typeof data.style.seatColor === 'string') {
          const colorValue = parseInt(data.style.seatColor.replace('#', ''), 16);
          if (!isNaN(colorValue)) {
            section.seatColor = colorValue;
            needsSeatColorUpdate = true;
          }
        } else if (typeof data.style.seatColor === 'number') {
          section.seatColor = data.style.seatColor;
          needsSeatColorUpdate = true;
        }
      }
      if (data.style.seatTextColor !== undefined && data.style.seatTextColor !== null) {
        // Handle both number and string formats
        if (typeof data.style.seatTextColor === 'string') {
          const colorValue = parseInt(data.style.seatTextColor.replace('#', ''), 16);
          if (!isNaN(colorValue)) {
            section.seatTextColor = colorValue;
            needsSeatColorUpdate = true;
          }
        } else if (typeof data.style.seatTextColor === 'number') {
          section.seatTextColor = data.style.seatTextColor;
          needsSeatColorUpdate = true;
        }
      }
    }

    // Restore row label color from rowLabels.color field
    if (data.rowLabels && data.rowLabels.color !== undefined && data.rowLabels.color !== null) {
      // Handle both number and string formats
      if (typeof data.rowLabels.color === 'string') {
        const colorValue = parseInt(data.rowLabels.color.replace('#', ''), 16);
        if (!isNaN(colorValue)) {
          section.rowLabelColor = colorValue;
        }
      } else if (typeof data.rowLabels.color === 'number') {
        section.rowLabelColor = data.rowLabels.color;
      }
    }
    
    // Restore fill and stroke visibility (v2.0.0+)
    if (data.style) {
      if (data.style.fillVisible !== undefined) {
        section.fillVisible = data.style.fillVisible;
      }
      if (data.style.strokeVisible !== undefined) {
        section.strokeVisible = data.style.strokeVisible;
      }
      // Restore glow properties
      if (data.style.glow) {
        section.glowEnabled = data.style.glow.enabled || false;
        section.glowColor = data.style.glow.color || COLORS.DEFAULT_GLOW;
        section.glowOpacity = data.style.glow.opacity !== undefined ? data.style.glow.opacity : 0.5;
        section.glowStrength = data.style.glow.strength !== undefined ? data.style.glow.strength : 10;
        section.glowBlur = data.style.glow.blur !== undefined ? data.style.glow.blur : 5;
      }
    }
    
    // Restore transformations
    section.rotationDegrees = data.transform.rotation;
    section.curve = data.transform.curve;
    section.stretchH = data.transform.stretchH;
    section.stretchV = data.transform.stretchV;
    
    // Handle deleted seats and restore special needs status (v2.0.0+)
    if (hasIndividualSeats) {
      // Create a map of seat data for fast lookup
      const seatDataMap = new Map(data.seats.map(s => {
          const r = s.r !== undefined ? s.r : s.rowIndex;
          const c = s.c !== undefined ? s.c : s.colIndex;
          return [`${r},${c}`, s];
      }));
      
      // Import SeatManager once for efficiency
      const { SeatManager } = await import('./SeatManager.js');
      
      // Remove deleted seats and restore special needs status
      const keptSeats = [];
      for (const seat of section.seats) {
        const key = `${seat.rowIndex},${seat.colIndex}`;
        const seatData = seatDataMap.get(key);
        
        if (!seatData) {
          // Seat was deleted - remove from display
          State.seatLayer.removeChild(seat);
          seat.destroy();
        } else {
          // Restore seat positions from saved data
          // Handle both legacy (baseX) and optimized (bx) keys
          const bx = seatData.bx !== undefined ? seatData.bx : seatData.baseX;
          const by = seatData.by !== undefined ? seatData.by : seatData.baseY;
          
          // Handle both legacy (relativeX) and optimized (x) keys
          const rx = seatData.x !== undefined ? seatData.x : seatData.relativeX;
          const ry = seatData.y !== undefined ? seatData.y : seatData.relativeY;

          if (bx !== undefined) {
            seat.baseRelativeX = bx;
          }
          if (by !== undefined) {
            seat.baseRelativeY = by;
          }
          
          // Restore transformed positions if available (v2.0.0+)
          if (rx !== undefined) {
            seat.relativeX = rx;
          } else if (bx !== undefined) {
            // Fallback for older files without relativeX/Y
            seat.relativeX = bx;
          }
          
          if (ry !== undefined) {
            seat.relativeY = ry;
          } else if (by !== undefined) {
            // Fallback for older files without relativeX/Y
            seat.relativeY = by;
          }
          
          // If base coords were omitted in optimized format (because they matched relative),
          // restore them from relative
          if (seat.baseRelativeX === undefined && seat.relativeX !== undefined) {
             seat.baseRelativeX = seat.relativeX;
          }
          if (seat.baseRelativeY === undefined && seat.relativeY !== undefined) {
             seat.baseRelativeY = seat.relativeY;
          }
          
          // Restore seat number if available
          // Handle legacy (number) and optimized (n)
          const number = seatData.n !== undefined ? seatData.n : seatData.number;
          if (number !== undefined) {
            if (seat.seatLabel) {
              seat.seatLabel.text = number;
            } else if (seat.children[2] instanceof PIXI.Text) {
              seat.children[2].text = number;
            }
            seat.seatNumber = number;
          }

          // Restore manual number flag
          // Handle legacy (isManualNumber) and optimized (mn)
          if (seatData.mn || seatData.isManualNumber) {
            seat.isManualNumber = true;
          }

          // Restore seat ID (v2.1.0)
          if (seatData.id) {
            seat.id = seatData.id;
          }
          
          // Restore special needs status
          // Handle legacy (specialNeeds) and optimized (sn)
          if (seatData.sn || seatData.specialNeeds) {
            SeatManager.setSpecialNeeds(seat, true);
          }
          
          // Restore metadata
          if (seatData.m) {
             seat.metadata = seatData.m;
          } else if (seatData.metadata) {
             seat.metadata = seatData.metadata;
          }

          keptSeats.push(seat);
        }
      }
      section.seats = keptSeats;
      
      // IMPORTANT: Rebuild base positions from row/column indices
      // This fixes corrupted base positions that may exist in the file
      const { SectionTransformations } = await import('./SectionTransformations.js');
      SectionTransformations.rebuildBasePositions(section);
      
      // VALIDATION: Ensure each seat has independent base position properties
      // This prevents reference sharing bugs between duplicated sections
      section.seats.forEach(seat => {
        if (!seat.hasOwnProperty('baseRelativeX')) {
          seat.baseRelativeX = seat.relativeX || seat.x || 0;
          console.warn(`Seat missing baseRelativeX, initialized to ${seat.baseRelativeX}`);
        }
        if (!seat.hasOwnProperty('baseRelativeY')) {
          seat.baseRelativeY = seat.relativeY || seat.y || 0;
          console.warn(`Seat missing baseRelativeY, initialized to ${seat.baseRelativeY}`);
        }
        // Ensure relativeX/Y are also independent properties
        if (!seat.hasOwnProperty('relativeX')) {
          seat.relativeX = seat.baseRelativeX;
        }
        if (!seat.hasOwnProperty('relativeY')) {
          seat.relativeY = seat.baseRelativeY;
        }
      });
      
      // Mark section as loaded from file BEFORE applying transformations
      // This prevents transformation functions from recalculating seat positions
      section._loadedFromFile = true;
    }
    
    // Apply transformations in correct order
    // If section has individual seat data, transformations should be skipped
    // because seats already have correct transformed positions from the file
    if (!hasIndividualSeats && (data.transform.curve > 0 || data.transform.stretchH > 0 || data.transform.stretchV > 0)) {
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
    // Skip if we have individual seat data - numbers are already restored from the file
    if (!hasIndividualSeats && data.seatNumbering && (data.seatNumbering.start !== 1 || data.seatNumbering.reversed)) {
      SectionManager.updateSeatNumbers(section);
    }
    
    // Update row labels if needed
    // The _loadedFromFile flag (set earlier) ensures updateRowLabels doesn't reset seat positions
    if (data.rowLabels.type !== 'none') {
      SectionManager.updateRowLabels(section);
    }
    
    // Clear the flag after all positioning is done
    if (hasIndividualSeats) {
      delete section._loadedFromFile;
    }
    
    // Restore exact center position if available (v2.0.0+)
    if (data.centerX !== undefined && data.centerY !== undefined) {
      section.x = data.centerX;
      section.y = data.centerY;
      
      // Update all seat positions to match the new section position
      SectionManager.positionSeatsAndLabels(section);
    }
    
    // Update seat visuals if custom colors were loaded
    if (needsSeatColorUpdate && section.seats.length > 0) {
      const { SeatManager } = await import('./SeatManager.js');
      SeatManager.updateAllSeats(section);
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
