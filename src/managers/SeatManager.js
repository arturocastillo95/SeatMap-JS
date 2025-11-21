// ============================================
// SEAT MANAGER - Seat creation and management
// ============================================

import { State } from '../core/state.js';
import { CONFIG, COLORS, VISUAL_CONFIG } from '../core/config.js';
import { Utils } from '../core/utils.js';
import { SectionTransformations } from './SectionTransformations.js';

/**
 * Manager for seat operations
 * Responsible for: Seat creation, interactions, numbering, row labels
 */
export const SeatManager = {
  /**
   * Create seats for a section
   * @param {Section} section - The section
   * @param {number} x - Section x position
   * @param {number} y - Section y position
   * @param {number} width - Section width
   * @param {number} height - Section height
   * @param {number} rows - Number of rows
   * @param {number} seatsPerRow - Seats per row
   */
  createSeats(section, x, y, width, height, rows, seatsPerRow) {
    const innerWidth = width - (CONFIG.SECTION_MARGIN * 2);
    const innerHeight = height - (CONFIG.SECTION_MARGIN * 2);
    const seatSpacingX = innerWidth / (seatsPerRow - 1);
    const seatSpacingY = innerHeight / (rows - 1);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < seatsPerRow; col++) {
        const seatNumber = col + 1;
        
        // Create seat container
        const seatContainer = new PIXI.Container();
        
        // Create glow graphics (initially hidden)
        const glowGraphics = new PIXI.Graphics();
        glowGraphics.visible = false;
        seatContainer.glowGraphics = glowGraphics;

        // Create circle (use section's seat color)
        const seat = new PIXI.Graphics();
        seat.circle(0, 0, 10);
        seat.fill({ color: section.seatColor, alpha: 1 });
        seatContainer.seatGraphics = seat;
        
        // Create number label (use section's seat text color)
        const seatLabel = new PIXI.Text({
          text: seatNumber.toString(),
          style: {
            fontFamily: 'system-ui, sans-serif',
            fontSize: 10,
            fontWeight: 'bold',
            fill: section.seatTextColor,
            align: 'center'
          }
        });
        seatLabel.anchor.set(0.5, 0.5);
        seatLabel.x = 0;
        seatLabel.y = 0;
        seatContainer.seatLabel = seatLabel;
        
        seatContainer.addChild(glowGraphics);
        seatContainer.addChild(seat);
        seatContainer.addChild(seatLabel);
        
        // Store relative position to section
        seatContainer.relativeX = CONFIG.SECTION_MARGIN + col * seatSpacingX;
        seatContainer.relativeY = CONFIG.SECTION_MARGIN + row * seatSpacingY;
        
        // Store base relative positions
        seatContainer.baseRelativeX = seatContainer.relativeX;
        seatContainer.baseRelativeY = seatContainer.relativeY;
        
        // Store row and column indices
        seatContainer.rowIndex = row;
        seatContainer.colIndex = col;
        
        // Initial position accounting for pivot
        seatContainer.x = section.x + seatContainer.relativeX - section.pivot.x;
        seatContainer.y = section.y + seatContainer.relativeY - section.pivot.y;
        
        seatContainer.eventMode = 'static';
        seatContainer.cursor = 'pointer';
        seatContainer.seatId = `${section.sectionId}-R${row + 1}S${col + 1}`;
        seatContainer.seatNumber = seatNumber;
        seatContainer.specialNeeds = false; // Track special needs status
        
        this.setupSeatInteractions(seatContainer);
        State.seatLayer.addChild(seatContainer);
        section.seats.push(seatContainer);
      }
    }
  },

  /**
   * Update the number of a specific seat
   * @param {PIXI.Container} seat - The seat container
   * @param {string|number} newNumber - The new seat number
   */
  updateSeatNumber(seat, newNumber) {
    seat.seatNumber = newNumber;
    seat.isManualNumber = true;
    if (seat.seatLabel) {
      seat.seatLabel.text = newNumber.toString();
    }
  },

  /**
   * Setup interaction handlers for a seat
   * @param {PIXI.Container} seat - The seat container
   */
  setupSeatInteractions(seat) {
    seat.on('pointertap', async (e) => {
      e.stopPropagation();
      
      // In edit seats mode, select/deselect the seat
      if (State.isEditSeatsMode) {
        const { ModeManager } = await import('./modeManager.js');
        
        if (State.selectedSeats.includes(seat)) {
          ModeManager.deselectSeat(seat);
        } else {
          ModeManager.selectSeat(seat);
        }
        return;
      }
      
      // Normal mode behavior
      if (!State.isDeleteMode) {
        console.log('Seat clicked:', seat.seatId);
        Utils.flash(seat, COLORS.FLASH_SEAT);
      }
    });

    seat.on('pointerover', () => {
      if (!State.isDeleteMode && !State.isEditSeatsMode) {
        // Find section
        const section = State.sections.find(s => s.seats.includes(seat));
        
        if (section && section.rowLabelType !== 'none') {
          // Calculate dynamic label
          const uniqueRows = [...new Set(section.seats.map(s => s.rowIndex))].sort((a, b) => a - b);
          const visualRowIndex = uniqueRows.indexOf(seat.rowIndex);
          
          if (visualRowIndex !== -1) {
            const totalRows = uniqueRows.length;
            const labelIndex = section.rowLabelReversed ? (totalRows - 1 - visualRowIndex) : visualRowIndex;
            const labelText = this.getRowLabelText(labelIndex, section.rowLabelType, section.rowLabelStart);
            
            Utils.showTooltip(`${section.sectionId} - Row ${labelText} Seat ${seat.seatNumber}`);
            return;
          }
        }
        
        Utils.showTooltip(seat.seatId);
      }
    });

    seat.on('pointerout', Utils.hideTooltip);
  },

  /**
   * Update seat visual based on special needs status
   * @param {PIXI.Container} seat - The seat container
   * @param {Section} section - The section (optional, will find it if not provided)
   */
  updateSeatVisual(seat, section = null) {
    // Find section if not provided
    if (!section) {
      section = State.sections.find(s => s.seats.includes(seat));
    }
    
    if (!section) {
      console.error('Could not find section for seat', seat);
      return;
    }

    // Ensure references exist (handle migration from old structure)
    if (!seat.glowGraphics) {
      // If glow doesn't exist, create it and add at bottom
      seat.glowGraphics = new PIXI.Graphics();
      seat.addChildAt(seat.glowGraphics, 0);
      
      // Update references to other children
      seat.seatGraphics = seat.children[1];
      seat.seatLabel = seat.children[2];
    } else if (!seat.seatGraphics) {
      // If references are missing but glow exists (unlikely but safe)
      seat.seatGraphics = seat.children[1];
      seat.seatLabel = seat.children[2];
    }

    const { glowGraphics, seatGraphics, seatLabel } = seat;
    
    // Update Glow
    if (section.glowEnabled) {
      glowGraphics.clear();
      
      const radius = 10 + (section.glowStrength / 2);
      glowGraphics.circle(0, 0, radius);
      glowGraphics.fill({ color: section.glowColor, alpha: section.glowOpacity });
      glowGraphics.visible = true;

      // Apply Gaussian Blur for realistic glow effect
      if (section.glowBlur > 0) {
        if (!glowGraphics.filters || glowGraphics.filters.length === 0) {
          // Create filter with optimized quality for performance
          const blurFilter = new PIXI.BlurFilter();
          blurFilter.quality = 2;
          blurFilter.kernelSize = 2;
          glowGraphics.filters = [blurFilter];
        }
        
        // Update blur strength based on glow strength
        glowGraphics.filters[0].strength = section.glowBlur;
      } else {
        // Remove filters if blur is 0
        glowGraphics.filters = null;
      }
    } else {
      glowGraphics.visible = false;
      glowGraphics.filters = null;
    }
    
    if (seat.specialNeeds) {
      // Special needs seat: blue color with accessibility icon
      seatGraphics.clear();
      seatGraphics.circle(0, 0, 10);
      seatGraphics.fill({ color: COLORS.SPECIAL_NEEDS, alpha: 1 }); // Blue color
      
      // Replace number with accessibility icon (Material Symbols: accessible_forward)
      seatLabel.text = 'accessible_forward';
      seatLabel.style.fontFamily = 'Material Symbols Outlined';
      seatLabel.style.fontSize = 14;
      seatLabel.style.fontWeight = 'normal';
    } else {
      // Regular seat: use section's seat colors
      seatGraphics.clear();
      seatGraphics.circle(0, 0, 10);
      seatGraphics.fill({ color: section.seatColor, alpha: 1 });
      
      // Show seat number with section's text color
      seatLabel.text = seat.seatNumber.toString();
      seatLabel.style.fontFamily = 'system-ui, sans-serif';
      seatLabel.style.fontSize = 10;
      seatLabel.style.fontWeight = 'bold';
      seatLabel.style.fill = section.seatTextColor;
    }
  },

  /**
   * Toggle special needs status for a seat
   * @param {PIXI.Container} seat - The seat container
   * @param {boolean} isSpecialNeeds - Whether to mark as special needs
   */
  setSpecialNeeds(seat, isSpecialNeeds) {
    seat.specialNeeds = isSpecialNeeds;
    this.updateSeatVisual(seat);
    
    // Dispatch event to update UI
    document.dispatchEvent(new CustomEvent('seatPropertiesChanged'));
  },

  /**
   * Update all seats in a section to reflect current seat colors
   * @param {Section} section - The section
   */
  updateAllSeats(section) {
    // Skip if GA section or seats haven't been created yet
    if (section.isGeneralAdmission || !section.seats || section.seats.length === 0) {
      return;
    }
    
    // Iterate through all seats and update their visuals
    section.seats.forEach(seat => {
      this.updateSeatVisual(seat, section);
    });
    
    console.log(`✓ Updated ${section.seats.length} seat visuals`);
  },

  /**
   * Update seat numbers for a section
   * @param {Section} section - The section
   */
  updateSeatNumbers(section) {
    if (section.isGeneralAdmission) return;
    
    const rows = this._groupSeatsByRow(section.seats);
    const start = section.seatNumberStart || 1;
    const reversed = section.seatNumberReversed || false;
    
    Object.keys(rows).forEach(rowIndex => {
      const rowSeats = rows[rowIndex];
      const seatsToNumber = reversed ? [...rowSeats].reverse() : rowSeats;
      
      seatsToNumber.forEach((seat, index) => {
        // Skip manually numbered seats
        if (seat.isManualNumber) return;

        const number = start + index;
        seat.seatNumber = number;
        
        // Update the label text
        if (seat.seatLabel) {
          seat.seatLabel.text = number.toString();
        } else {
          // Fallback for legacy structure
          const label = seat.children[1];
          if (label && label instanceof PIXI.Text) {
            label.text = number.toString();
          }
        }
      });
    });
  },

  /**
   * Group seats by row index
   * @param {Array} seats - Array of seats
   * @returns {Object} Seats grouped by row
   * @private
   */
  _groupSeatsByRow(seats) {
    const rows = {};
    seats.forEach(seat => {
      const rowIndex = seat.rowIndex;
      if (!rows[rowIndex]) {
        rows[rowIndex] = [];
      }
      rows[rowIndex].push(seat);
    });
    
    // Sort each row by column index
    Object.keys(rows).forEach(rowIndex => {
      rows[rowIndex].sort((a, b) => a.colIndex - b.colIndex);
    });
    
    return rows;
  },

  /**
   * Get row label text based on type and index
   * @param {number} index - Row index
   * @param {string} type - Label type ('none', 'numbers', 'letters')
   * @param {number|string} startValue - Starting value
   * @returns {string} Label text
   */
  getRowLabelText(index, type, startValue) {
    if (type === 'numbers') {
      const start = startValue || 1;
      return (index + start).toString();
    } else if (type === 'letters') {
      const start = startValue || 'A';
      const startCharCode = start.charCodeAt(0);
      const offset = startCharCode - 65;
      
      let labelIndex = index + offset;
      let label = '';
      
      // Handle multi-letter labels (A-Z, then AA, AB, etc.)
      while (labelIndex >= 0) {
        label = String.fromCharCode(65 + (labelIndex % 26)) + label;
        labelIndex = Math.floor(labelIndex / 26) - 1;
      }
      
      return label;
    }
    return '';
  },

  /**
   * Create a row label
   * @param {string} text - Label text
   * @param {boolean} isHidden - Whether label is hidden (grayed out)
   * @param {number} color - Label color (hex number)
   * @returns {PIXI.Text} Label text object
   */
  createRowLabel(text, isHidden = false, color = COLORS.DEFAULT_SEAT) {
    const label = new PIXI.Text({
      text,
      style: {
        fontFamily: 'system-ui, sans-serif',
        fontSize: 14,
        fontWeight: 'bold',
        fill: color,
        align: 'center'
      }
    });
    label.anchor.set(0.5, 0.5);
    label.alpha = isHidden ? 0.60 : 1.0;
    
    return label;
  },

  /**
   * Update row labels for a section
   * @param {Section} section - The section
   */
  updateRowLabels(section) {
    // Remove existing labels
    section.rowLabels.forEach(label => {
      State.seatLayer.removeChild(label);
      label.destroy();
    });
    section.rowLabels = [];

    // If section was loaded from file, seats already have correct positions
    // Don't reset or recalculate them
    if (!section._loadedFromFile) {
      // ALWAYS reset seats to their true base positions (from creation)
      // But then reapply transformations (stretch and curve) if they exist
      const stretchH = section.stretchH || 0;
      const stretchV = section.stretchV || 0;
      const curve = section.curve || 0;
      
      if (curve !== 0) {
        // Curve takes precedence and includes stretch
        SectionTransformations.applyCurveTransform(section);
      } else if (stretchH !== 0 || stretchV !== 0) {
        // Just apply stretch
        SectionTransformations.applyStretchTransform(section);
      } else {
        // No transformations, just use base positions
        section.seats.forEach(seat => {
          seat.relativeX = seat.baseRelativeX;
          seat.relativeY = seat.baseRelativeY;
        });
      }
    }

    // Don't create labels if type is 'none' or neither position is enabled
    if (section.rowLabelType === 'none' || (!section.showLeftLabels && !section.showRightLabels)) {
      // Reset to base dimensions if no labels
      section.contentWidth = section.baseWidth;
      section.contentHeight = section.baseHeight;
      
      // Clear layout shift
      section.layoutShiftX = 0;
      section.layoutShiftY = 0;
      
      // Update pivot to base center
      section.pivot.set(section.contentWidth / 2, section.contentHeight / 2);
      
      // Update selection border if it exists
      if (section.selectionBorder) {
        const offset = VISUAL_CONFIG.SELECTION.BORDER_OFFSET;
        section.selectionBorder.clear();
        section.selectionBorder.rect(-offset, -offset, section.contentWidth + offset * 2, section.contentHeight + offset * 2);
        section.selectionBorder.stroke({ width: VISUAL_CONFIG.SELECTION.BORDER_WIDTH, color: VISUAL_CONFIG.SELECTION.COLOR });
      }
      
      // Update seat positions (handles rotation)
      SectionTransformations.positionSeatsAndLabels(section);
      
      this.updateSectionGraphics(section);
      return;
    }

    // Group seats by their original row index
    const rowMap = new Map();
    section.seats.forEach(seat => {
      const rowIdx = seat.rowIndex;
      if (!rowMap.has(rowIdx)) {
        rowMap.set(rowIdx, []);
      }
      rowMap.get(rowIdx).push(seat);
    });

    const rows = Array.from(rowMap.entries()).sort((a, b) => a[0] - b[0]);
    // Use section's rowLabelSpacing property (defaults to 20px)
    const labelSpacing = section.rowLabelSpacing || 20;
    
    rows.forEach(([rowIndex, seatsInRow], arrayIndex) => {
      const totalRows = rows.length;
      const labelIndex = section.rowLabelReversed ? (totalRows - 1 - arrayIndex) : arrayIndex;
      const labelText = this.getRowLabelText(labelIndex, section.rowLabelType, section.rowLabelStart);
      
      const sortedSeats = seatsInRow.sort((a, b) => a.relativeX - b.relativeX);
      const leftmostSeat = sortedSeats[0];
      const rightmostSeat = sortedSeats[sortedSeats.length - 1];

      if (section.showLeftLabels) {
        const leftLabel = this.createRowLabel(labelText, section.labelsHidden, section.rowLabelColor);
        leftLabel.relativeX = leftmostSeat.relativeX - 10 - labelSpacing;
        leftLabel.relativeY = leftmostSeat.relativeY;
        leftLabel.x = section.x + leftLabel.relativeX;
        leftLabel.y = section.y + leftLabel.relativeY;
        section.rowLabels.push(leftLabel);
        State.seatLayer.addChild(leftLabel);
      }

      if (section.showRightLabels) {
        const rightLabel = this.createRowLabel(labelText, section.labelsHidden, section.rowLabelColor);
        rightLabel.relativeX = rightmostSeat.relativeX + 10 + labelSpacing;
        rightLabel.relativeY = rightmostSeat.relativeY;
        rightLabel.x = section.x + rightLabel.relativeX;
        rightLabel.y = section.y + rightLabel.relativeY;
        section.rowLabels.push(rightLabel);
        State.seatLayer.addChild(rightLabel);
      }
    });

    // Calculate bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    section.seats.forEach(seat => {
      minX = Math.min(minX, seat.relativeX - 10);
      maxX = Math.max(maxX, seat.relativeX + 10);
      minY = Math.min(minY, seat.relativeY - 10);
      maxY = Math.max(maxY, seat.relativeY + 10);
    });

    if (!section.labelsHidden) {
      section.rowLabels.forEach(label => {
        const labelHalfWidth = label.width / 2;
        const labelHalfHeight = label.height / 2;
        minX = Math.min(minX, label.relativeX - labelHalfWidth);
        maxX = Math.max(maxX, label.relativeX + labelHalfWidth);
        minY = Math.min(minY, label.relativeY - labelHalfHeight);
        maxY = Math.max(maxY, label.relativeY + labelHalfHeight);
      });
    }

    const EDGE_PADDING = 10;
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const shiftX = EDGE_PADDING - minX;
    const shiftY = EDGE_PADDING - minY;
    
    section.layoutShiftX = shiftX;
    section.layoutShiftY = shiftY;
    
    // Apply shift to labels only
    // Seats get the shift applied by positionSeatsAndLabels() which uses:
    // seat.x = section.x + (seat.relativeX + layoutShiftX) - pivot.x
    section.rowLabels.forEach(label => {
      label.relativeX += shiftX;
      label.relativeY += shiftY;
    });
    
    section.contentWidth = contentWidth + (EDGE_PADDING * 2);
    section.contentHeight = contentHeight + (EDGE_PADDING * 2);
    section.pivot.set(section.contentWidth / 2, section.contentHeight / 2);
    
    this.updateSectionGraphics(section);
    
    if (section.selectionBorder) {
      const offset = VISUAL_CONFIG.SELECTION.BORDER_OFFSET;
      section.selectionBorder.clear();
      section.selectionBorder.rect(-offset, -offset, section.contentWidth + offset * 2, section.contentHeight + offset * 2);
      section.selectionBorder.stroke({ width: VISUAL_CONFIG.SELECTION.BORDER_WIDTH, color: VISUAL_CONFIG.SELECTION.COLOR });
    }
    
    SectionTransformations.positionSeatsAndLabels(section);
  },

  /**
   * Update section graphics
   * @param {Section} section - The section
   */
  updateSectionGraphics(section) {
    const sectionColor = section.sectionColor || COLORS.SECTION_STROKE;
    section.clear();
    section.rect(0, 0, section.contentWidth, section.contentHeight);
    
    // Apply fill only if visible
    if (section.fillVisible) {
      section.fill({ color: sectionColor, alpha: VISUAL_CONFIG.SECTION.FILL_ALPHA });
    }
    
    // Apply stroke only if visible
    if (section.strokeVisible) {
      section.stroke({ width: VISUAL_CONFIG.SECTION.STROKE_WIDTH, color: sectionColor, alpha: VISUAL_CONFIG.SECTION.STROKE_ALPHA });
    }
    
    section.hitArea = new PIXI.Rectangle(0, 0, section.contentWidth, section.contentHeight);
  }
};
