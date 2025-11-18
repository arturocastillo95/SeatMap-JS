// ============================================
// SECTION TRANSFORMATIONS - Stretch, curve, alignment
// ============================================

/**
 * Manager for section transformations
 * Responsible for: Stretch, curve, row alignment, dimension recalculation
 */
export const SectionTransformations = {
  /**
   * Apply stretch transformation to section
   * @param {Section} section - The section
   * @param {Object} options - Options for transformation
   * @param {boolean} options.skipLayout - If true, skip dimension recalculation (for multi-section alignment)
   */
  async applyStretch(section, { skipLayout = false } = {}) {
    const curve = section.curve || 0;
    
    // If there's a curve, use applyCurve instead (which includes stretch)
    if (curve !== 0) {
      await this.applyCurve(section, { skipLayout });
      return;
    }
    
    // Apply stretch transformation
    this.applyStretchTransform(section);
    
    // Skip layout recalculation if requested (used during multi-section alignment)
    if (skipLayout) {
      return;
    }
    
    // After stretching seats, update row labels if they exist
    // Import SeatManager dynamically to avoid circular dependency
    if (section.rowLabels.length > 0) {
      const module = await import('./SeatManager.js');
      module.SeatManager.updateRowLabels(section);
    } else {
      this.recalculateSectionDimensions(section);
      this.positionSeatsAndLabels(section);
    }
  },

  /**
   * Apply stretch to seats (modifies relativeX/Y)
   * @param {Section} section - The section
   */
  applyStretchTransform(section) {
    const stretchH = section.stretchH || 0;
    const stretchV = section.stretchV || 0;
    
    const rowMap = new Map();
    section.seats.forEach(seat => {
      const rowY = seat.baseRelativeY;
      if (!rowMap.has(rowY)) {
        rowMap.set(rowY, []);
      }
      rowMap.get(rowY).push(seat);
    });
    const rows = Array.from(rowMap.entries()).sort((a, b) => a[0] - b[0]);
    
    const colMap = new Map();
    section.seats.forEach(seat => {
      const colX = seat.baseRelativeX;
      if (!colMap.has(colX)) {
        colMap.set(colX, []);
      }
      colMap.get(colX).push(seat);
    });
    const cols = Array.from(colMap.keys()).sort((a, b) => a - b);
    
    // Calculate base spacing
    const baseSeatSpacingX = cols.length > 1 ? (cols[cols.length - 1] - cols[0]) / (cols.length - 1) : 20;
    const baseSeatSpacingY = rows.length > 1 ? (rows[rows.length - 1][0] - rows[0][0]) / (rows.length - 1) : 20;
    
    // Minimum spacing to prevent overlap (seat diameter is 20px, add 2px gap)
    const MIN_SPACING = 22;
    
    // Clamp stretch values to prevent overlap
    const maxNegativeStretchH = -(baseSeatSpacingX - MIN_SPACING);
    const maxNegativeStretchV = -(baseSeatSpacingY - MIN_SPACING);
    const clampedStretchH = Math.max(stretchH, maxNegativeStretchH);
    const clampedStretchV = Math.max(stretchV, maxNegativeStretchV);
    
    section.seats.forEach(seat => {
      let rowIndex = 0;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][1].includes(seat)) {
          rowIndex = i;
          break;
        }
      }
      const colIndex = cols.indexOf(seat.baseRelativeX);
      
      seat.relativeX = seat.baseRelativeX + (colIndex * clampedStretchH);
      seat.relativeY = seat.baseRelativeY + (rowIndex * clampedStretchV);
    });
  },

  /**
   * Apply curve transformation to section
   * @param {Section} section - The section
   * @param {Object} options - Options for transformation
   * @param {boolean} options.skipLayout - If true, skip dimension recalculation (for multi-section alignment)
   */
  async applyCurve(section, { skipLayout = false } = {}) {
    const curve = section.curve || 0;
    
    if (curve === 0) {
      await this.applyStretch(section, { skipLayout });
      return;
    }
    
    // Apply curve transformation (includes stretch)
    this.applyCurveTransform(section);
    
    // Skip layout recalculation if requested (used during multi-section alignment)
    if (skipLayout) {
      return;
    }
    
    // After curving seats, update row labels if they exist
    // Import SeatManager dynamically to avoid circular dependency
    if (section.rowLabels.length > 0) {
      const module = await import('./SeatManager.js');
      module.SeatManager.updateRowLabels(section);
    } else {
      this.recalculateSectionDimensions(section);
      this.positionSeatsAndLabels(section);
    }
  },

  /**
   * Apply curve to seats (modifies relativeX/Y)
   * @param {Section} section - The section
   */
  applyCurveTransform(section) {
    const curve = section.curve || 0;
    const stretchH = section.stretchH || 0;
    const stretchV = section.stretchV || 0;
    
    const rowMap = new Map();
    section.seats.forEach(seat => {
      const rowY = seat.baseRelativeY;
      if (!rowMap.has(rowY)) {
        rowMap.set(rowY, []);
      }
      rowMap.get(rowY).push(seat);
    });
    const rows = Array.from(rowMap.entries()).sort((a, b) => a[0] - b[0]);
    
    const colMap = new Map();
    section.seats.forEach(seat => {
      const colX = seat.baseRelativeX;
      if (!colMap.has(colX)) {
        colMap.set(colX, []);
      }
      colMap.get(colX).push(seat);
    });
    const cols = Array.from(colMap.keys()).sort((a, b) => a - b);
    
    // Calculate original spacing
    const seatSpacingX = cols.length > 1 ? (cols[cols.length - 1] - cols[0]) / (cols.length - 1) : 20;
    const seatSpacingY = rows.length > 1 ? (rows[rows.length - 1][0] - rows[0][0]) / (rows.length - 1) : 20;
    
    // Minimum spacing to prevent overlap (seat diameter is 20px, add 2px gap)
    const MIN_SPACING = 22;
    
    // Clamp stretch values to prevent overlap
    const maxNegativeStretchH = -(seatSpacingX - MIN_SPACING);
    const maxNegativeStretchV = -(seatSpacingY - MIN_SPACING);
    const clampedStretchH = Math.max(stretchH, maxNegativeStretchH);
    const clampedStretchV = Math.max(stretchV, maxNegativeStretchV);
    
    // Apply stretch to spacing
    const effectiveSeatSpacingX = seatSpacingX + clampedStretchH;
    const effectiveSeatSpacingY = seatSpacingY + clampedStretchV;
    
    // Convert curve value (0-100) to curvature k
    const k = curve / 2000;
    const R = 1 / k;
    
    const centerCol = (cols.length - 1) / 2;
    
    section.seats.forEach(seat => {
      let rowIndex = 0;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][1].includes(seat)) {
          rowIndex = i;
          break;
        }
      }
      const colIndex = cols.indexOf(seat.baseRelativeX);
      
      // Calculate radius for this row
      const r = R + rowIndex * effectiveSeatSpacingY;
      
      // Arc length spacing
      const seatsFromCenter = colIndex - centerCol;
      const theta = (effectiveSeatSpacingX / r) * seatsFromCenter;
      
      // Convert polar to Cartesian
      const x = r * Math.sin(theta);
      const y = r * Math.cos(theta) - R;
      
      // Offset to match the original center position
      const centerX = (cols[0] + cols[cols.length - 1]) / 2;
      const centerY = rows[0][0];
      
      seat.relativeX = centerX + x;
      seat.relativeY = centerY + y;
    });
  },

  /**
   * Calculate maximum safe curve value
   * @param {Section} section - The section
   * @returns {number} Maximum curve value
   */
  calculateMaxCurve(section) {
    const stretchH = section.stretchH || 0;
    
    // Get column information
    const colMap = new Map();
    section.seats.forEach(seat => {
      const colX = seat.baseRelativeX;
      if (!colMap.has(colX)) {
        colMap.set(colX, []);
      }
      colMap.get(colX).push(seat);
    });
    const cols = Array.from(colMap.keys()).sort((a, b) => a - b);
    
    // Calculate spacing
    const seatSpacingX = cols.length > 1 ? (cols[cols.length - 1] - cols[0]) / (cols.length - 1) : 20;
    const effectiveSeatSpacingX = seatSpacingX + stretchH;
    
    // Total width
    const totalWidth = (cols.length - 1) * effectiveSeatSpacingX;
    
    // Limit total angle to ~190 degrees
    const maxTotalAngle = 3.3;
    const minRadius = (totalWidth / 2) / (maxTotalAngle / 2);
    const maxK = 1 / minRadius;
    
    // Convert back to curve value (0-100)
    const maxCurve = maxK * 2000;
    
    return Math.min(100, maxCurve * 0.95);
  },

  /**
   * Align rows in a section
   * @param {Section} section - The section
   * @param {string} alignment - Alignment type ('left', 'center', 'right')
   */
  alignRows(section, alignment) {
    if (section.isGeneralAdmission) return;
    
    // Store the alignment preference
    section.rowAlignment = alignment;
    
    // Group seats by row
    const rowMap = new Map();
    section.seats.forEach(seat => {
      const rowY = seat.baseRelativeY;
      if (!rowMap.has(rowY)) {
        rowMap.set(rowY, []);
      }
      rowMap.get(rowY).push(seat);
    });
    
    const rows = Array.from(rowMap.entries()).sort((a, b) => a[0] - b[0]);
    
    // Find the row with the most seats to use as reference
    let maxSeatsInRow = 0;
    let referenceRow = null;
    rows.forEach(([_, rowSeats]) => {
      if (rowSeats.length > maxSeatsInRow) {
        maxSeatsInRow = rowSeats.length;
        referenceRow = rowSeats;
      }
    });
    
    // Use the reference row to determine spacing
    // Sort by current position to maintain left-to-right order
    const sortedRefRow = [...referenceRow].sort((a, b) => a.baseRelativeX - b.baseRelativeX);
    
    // Calculate spacing from reference row
    let seatSpacingX = 20; // default
    if (sortedRefRow.length > 1) {
      // Use the most common spacing in the reference row
      const spacings = [];
      for (let i = 1; i < sortedRefRow.length; i++) {
        spacings.push(sortedRefRow[i].baseRelativeX - sortedRefRow[i-1].baseRelativeX);
      }
      // Use median spacing to avoid outliers
      spacings.sort((a, b) => a - b);
      seatSpacingX = spacings[Math.floor(spacings.length / 2)];
    }
    
    const maxRowWidth = (maxSeatsInRow - 1) * seatSpacingX;
    
    // Calculate the center X based on the reference row's current center
    const refMinX = Math.min(...referenceRow.map(s => s.baseRelativeX));
    const refMaxX = Math.max(...referenceRow.map(s => s.baseRelativeX));
    const centerX = (refMinX + refMaxX) / 2;
    
    // Align each row
    rows.forEach(([rowY, rowSeats]) => {
      // Sort seats left to right to maintain order
      rowSeats.sort((a, b) => a.baseRelativeX - b.baseRelativeX);
      const rowWidth = (rowSeats.length - 1) * seatSpacingX;
      
      // Calculate offset based on alignment type
      let offset = 0;
      if (alignment === 'left') {
        // Align to the left edge of the widest row
        offset = -(maxRowWidth / 2);
      } else if (alignment === 'right') {
        // Align to the right edge of the widest row
        offset = (maxRowWidth / 2) - rowWidth;
      } else { // center
        // Center the row
        offset = -(rowWidth / 2);
      }
      
      // Position each seat in the row with consistent spacing
      rowSeats.forEach((seat, index) => {
        seat.baseRelativeX = centerX + offset + index * seatSpacingX;
        seat.relativeX = seat.baseRelativeX;
      });
    });
    
    // After aligning rows, reapply curve/stretch if they exist
    const curve = section.curve || 0;
    const stretchH = section.stretchH || 0;
    const stretchV = section.stretchV || 0;
    const hadLabels = section.rowLabels.length > 0;
    
    if (curve !== 0) {
      // Reapply curve (which includes stretch)
      this.applyCurve(section);
    } else if (stretchH !== 0 || stretchV !== 0) {
      // Reapply stretch
      this.applyStretch(section);
    } else if (hadLabels) {
      // No curve/stretch but had labels - regenerate them
      import('./SeatManager.js').then(module => {
        module.SeatManager.updateRowLabels(section);
      });
    } else {
      // No transformations or labels - just recalculate and position
      this.recalculateSectionDimensions(section);
      this.positionSeatsAndLabels(section);
    }
  },

  /**
   * Recalculate section dimensions based on seat positions
   * @param {Section} section - The section
   */
  recalculateSectionDimensions(section) {
    if (section.isGeneralAdmission || section.seats.length === 0) return;
    
    // Calculate bounding box based on current seat positions
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    
    // Check all seats (use seat radius of 10)
    section.seats.forEach(seat => {
      minX = Math.min(minX, seat.relativeX - 10);
      maxX = Math.max(maxX, seat.relativeX + 10);
      minY = Math.min(minY, seat.relativeY - 10);
      maxY = Math.max(maxY, seat.relativeY + 10);
    });

    // Also include row labels in bounding box calculation
    if (section.rowLabels && section.rowLabels.length > 0) {
      section.rowLabels.forEach(label => {
        const labelWidth = label.width || 20;
        const labelHeight = label.height || 20;
        minX = Math.min(minX, label.relativeX - labelWidth / 2);
        maxX = Math.max(maxX, label.relativeX + labelWidth / 2);
        minY = Math.min(minY, label.relativeY - labelHeight / 2);
        maxY = Math.max(maxY, label.relativeY + labelHeight / 2);
      });
    }
    
    const EDGE_PADDING = 10;
    
    // Calculate dimensions
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // Shift everything to start at EDGE_PADDING
    const shiftX = EDGE_PADDING - minX;
    const shiftY = EDGE_PADDING - minY;
    
    section.layoutShiftX = shiftX;
    section.layoutShiftY = shiftY;
    
    // Update dimensions
    section.contentWidth = contentWidth + (EDGE_PADDING * 2);
    section.contentHeight = contentHeight + (EDGE_PADDING * 2);
    
    // Update pivot to new center
    section.pivot.set(section.contentWidth / 2, section.contentHeight / 2);
    
    // Update graphics
    const sectionColor = section.sectionColor;
    section.clear();
    section.rect(0, 0, section.contentWidth, section.contentHeight);
    section.fill({ color: sectionColor, alpha: 0.25 });
    section.stroke({ width: 2, color: sectionColor, alpha: 0.8 });
    
    // Update hit area
    section.hitArea = new PIXI.Rectangle(0, 0, section.contentWidth, section.contentHeight);
    
    // Update selection border if it exists
    if (section.selectionBorder) {
      section.selectionBorder.clear();
      section.selectionBorder.rect(-3, -3, section.contentWidth + 6, section.contentHeight + 6);
      section.selectionBorder.stroke({ width: 3, color: 0x00ff00 });
    }
  },

  /**
   * Position seats and labels based on relative positions
   * @param {Section} section - The section
   */
  positionSeatsAndLabels(section) {
    if (section.isGeneralAdmission) return;
    
    // Get the layout shift (applied when labels are added or dimensions recalculated)
    const shiftX = section.layoutShiftX || 0;
    const shiftY = section.layoutShiftY || 0;
    
    // Position seats and labels accounting for pivot and rotation
    if (section.rotationDegrees && section.rotationDegrees !== 0) {
      // Has rotation - use rotation transformation
      const angleRad = section.rotationDegrees * Math.PI / 180;
      
      section.seats.forEach(seat => {
        // Apply layout shift to get actual position in section space
        const seatX = seat.relativeX + shiftX;
        const seatY = seat.relativeY + shiftY;
        
        // Convert to local coordinates (relative to pivot)
        const localX = seatX - section.pivot.x;
        const localY = seatY - section.pivot.y;
        
        // Apply rotation
        const rotatedX = localX * Math.cos(angleRad) - localY * Math.sin(angleRad);
        const rotatedY = localX * Math.sin(angleRad) + localY * Math.cos(angleRad);
        
        // Position in world space
        seat.x = section.x + rotatedX;
        seat.y = section.y + rotatedY;
        seat.rotation = angleRad;
      });
      
      // Position row labels with rotation
      section.rowLabels.forEach(label => {
        const localX = label.relativeX - section.pivot.x;
        const localY = label.relativeY - section.pivot.y;
        
        const rotatedX = localX * Math.cos(angleRad) - localY * Math.sin(angleRad);
        const rotatedY = localX * Math.sin(angleRad) + localY * Math.cos(angleRad);
        
        label.x = section.x + rotatedX;
        label.y = section.y + rotatedY;
        label.angle = section.rotationDegrees;
      });
    } else {
      // No rotation - simple offset
      section.seats.forEach(seat => {
        const seatX = seat.relativeX + shiftX;
        const seatY = seat.relativeY + shiftY;
        
        seat.x = section.x + seatX - section.pivot.x;
        seat.y = section.y + seatY - section.pivot.y;
        seat.rotation = 0;
      });
      
      // Position row labels without rotation
      section.rowLabels.forEach(label => {
        label.x = section.x + label.relativeX - section.pivot.x;
        label.y = section.y + label.relativeY - section.pivot.y;
        label.angle = 0;
      });
    }
  },

  /**
   * Update row labels after transformation (stub - delegates to row label manager)
   * @param {Section} section - The section
   */
  updateRowLabelsForTransform(section) {
    // This would call into a RowLabelManager if needed
    // For now, just recalculate and position
    this.recalculateSectionDimensions(section);
  },

  /**
   * Rebuild base positions from row/column indices
   * Used to fix corrupted base positions in loaded files
   * This creates a clean grid from rowIndex/colIndex, discarding corrupted baseX/baseY
   * @param {Section} section - The section
   */
  rebuildBasePositions(section) {
    console.log(`Rebuilding base positions for ${section.id || 'undefined'}`);
    
    // Find actual grid structure from indices (not positions!)
    const rowIndices = [...new Set(section.seats.map(s => s.rowIndex))].sort((a, b) => a - b);
    const colIndices = [...new Set(section.seats.map(s => s.colIndex))].sort((a, b) => a - b);
    
    console.log(`  Found ${rowIndices.length} rows and ${colIndices.length} columns (from indices)`);
    
    // Find the first seat in the first row to get the original anchor point
    const firstRow = rowIndices[0];
    const firstRowSeats = section.seats.filter(s => s.rowIndex === firstRow);
    const firstSeat = firstRowSeats.reduce((min, seat) => 
      seat.colIndex < min.colIndex ? seat : min
    );
    
    // Use this seat's CURRENT baseRelativeX/Y as the anchor
    // This preserves the section's overall position and row alignment type
    const anchorX = firstSeat.baseRelativeX;
    const anchorY = firstSeat.baseRelativeY;
    
    console.log(`  Anchor: [${firstSeat.rowIndex},${firstSeat.colIndex}] at (${anchorX}, ${anchorY})`);
    
    // Standard spacing
    const SEAT_SPACING = 24;
    
    // Rebuild ALL positions from a clean grid based on indices
    section.seats.forEach(seat => {
      // Find this seat's position in the sorted index arrays
      const rowPos = rowIndices.indexOf(seat.rowIndex);
      const colPos = colIndices.indexOf(seat.colIndex);
      
      // Calculate position as offset from anchor seat
      const colOffset = colPos * SEAT_SPACING;
      const rowOffset = rowPos * SEAT_SPACING;
      
      // Set clean base position
      seat.baseRelativeX = anchorX + colOffset;
      seat.baseRelativeY = anchorY + rowOffset;
    });
    
    console.log(`  Rebuilt ${section.seats.length} seats with clean 24px grid from (${anchorX}, ${anchorY})`);
  }
};
