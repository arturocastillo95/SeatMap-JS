// ============================================
// SECTION MANAGER
// ============================================

import { State } from './state.js';
import { CONFIG, COLORS } from './config.js';
import { Utils } from './utils.js';

export const SectionManager = {
  createSection(x, y, width, height, rows, seatsPerRow) {
    const section = new PIXI.Graphics();
    section.rect(0, 0, width, height);
    section.fill({ color: COLORS.SECTION_FILL, alpha: 0.25 });
    section.stroke({ width: 2, color: COLORS.SECTION_STROKE, alpha: 0.8 });
    section.eventMode = 'static';
    section.cursor = 'pointer';
    section.sectionId = `Section ${State.sectionCounter++}`;
    section.seats = [];
    section.rowLabels = [];
    section.rowLabelType = 'none'; // 'none', 'numbers', 'letters'
    section.showLeftLabels = false;
    section.showRightLabels = false;
    section.x = x;
    section.y = y;
    
    // Use custom properties for logical dimensions (don't use .width/.height as they modify scale)
    section.contentWidth = width;
    section.contentHeight = height;
    section.baseWidth = width; // Store original width without labels
    section.baseHeight = height;
    section.rotationDegrees = 0; // Store rotation in degrees (custom property to avoid PIXI conflict)
    section.stretchH = 0; // Horizontal stretch (adds spacing between columns)
    section.stretchV = 0; // Vertical stretch (adds spacing between rows)
    section.curve = 0; // Curve amount (0 = flat, positive = curved)
    
    // Set pivot to center for rotation
    section.pivot.set(width / 2, height / 2);
    // Adjust position to compensate for pivot (keep visual position the same)
    section.x = x + width / 2;
    section.y = y + height / 2;
    
    this.setupSectionInteractions(section);
    State.sectionLayer.addChild(section);
    State.sections.push(section);
    
    this.createSeats(section, x, y, width, height, rows, seatsPerRow);
    
    return section;
  },

  // Deprecated: Section labels no longer used
  createSectionLabel(section) {
    // Create background for label
    const labelBg = new PIXI.Graphics();
    const labelContainer = new PIXI.Container();
    
    const label = new PIXI.Text({
      text: section.sectionId,
      style: {
        fontFamily: 'system-ui, sans-serif',
        fontSize: 14,
        fontWeight: 'bold',
        fill: 0xffffff,
        align: 'center'
      }
    });
    
    // Draw background
    const padding = 6;
    labelBg.rect(-label.width / 2 - padding, -2, label.width + padding * 2, label.height + 4);
    labelBg.fill({ color: 0x000000, alpha: 0.5 });
    labelBg.stroke({ width: 1, color: COLORS.SECTION_STROKE, alpha: 0.8 });
    
    labelContainer.addChild(labelBg);
    labelContainer.addChild(label);
    
    label.x = 0;
    label.y = 0;
    label.anchor.set(0.5, 0);
    
    labelContainer.x = section.contentWidth / 2;
    labelContainer.y = -label.height - 8;
    labelContainer.eventMode = 'static';
    labelContainer.cursor = 'text';
    
    // Make label clickable to edit
    labelContainer.on('pointertap', (e) => {
      e.stopPropagation();
      this.editSectionLabel(section, label, labelBg);
    });
    
    section.addChild(labelContainer);
    section.label = label;
    section.labelBg = labelBg;
    section.labelContainer = labelContainer;
  },

  editSectionLabel(section, label, labelBg) {
    // Create input element for editing
    const input = document.createElement('input');
    input.type = 'text';
    input.value = section.sectionId;
    input.style.position = 'fixed';
    input.style.fontFamily = 'system-ui, sans-serif';
    input.style.fontSize = '14px';
    input.style.fontWeight = 'bold';
    input.style.padding = '4px 8px';
    input.style.border = '2px solid #1e90ff';
    input.style.borderRadius = '4px';
    input.style.background = 'rgba(30,30,40,0.95)';
    input.style.color = '#fff';
    input.style.outline = 'none';
    input.style.zIndex = '1000';
    
    // Position input at label location
    const labelWorldPos = label.getGlobalPosition();
    const rect = State.app.canvas.getBoundingClientRect();
    input.style.left = (rect.left + labelWorldPos.x - 50) + 'px';
    input.style.top = (rect.top + labelWorldPos.y) + 'px';
    input.style.width = '100px';
    
    document.body.appendChild(input);
    input.focus();
    input.select();
    
    const saveLabel = () => {
      const newName = input.value.trim();
      if (newName) {
        section.sectionId = newName;
        label.text = newName;
        
        // Update background size
        const padding = 6;
        labelBg.clear();
        labelBg.rect(-label.width / 2 - padding, -2, label.width + padding * 2, label.height + 4);
        labelBg.fill({ color: 0x000000, alpha: 0.5 });
        labelBg.stroke({ width: 1, color: COLORS.SECTION_STROKE, alpha: 0.8 });
        
        console.log('Section renamed to:', newName);
      }
      document.body.removeChild(input);
    };
    
    input.addEventListener('blur', saveLabel);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveLabel();
      } else if (e.key === 'Escape') {
        document.body.removeChild(input);
      }
    });
  },

  setupSectionInteractions(section) {
    section.on('pointerdown', (e) => {
      if (State.isDeleteMode || State.isCreateMode || State.isPanningMode) return;
      
      e.stopPropagation();
      
      const worldPos = Utils.screenToWorld(e.global.x, e.global.y);
      
      // Select this section if not already selected
      if (!State.selectedSections.includes(section)) {
        // Clear previous selection if not holding shift
        if (!e.shiftKey) {
          State.selectedSections.forEach(s => {
            this.deselectSection(s);
          });
          State.selectedSections = [];
        }
        
        State.selectedSections.push(section);
        this.selectSection(section);
      }
      
      // Set up drag state
      State.isDraggingSections = true;
      State.dragStartPos = { x: worldPos.x, y: worldPos.y };
      
      // Store original positions of ALL selected sections
      State.dragOriginalPositions = State.selectedSections.map(s => ({
        section: s,
        x: s.x,
        y: s.y
      }));
      
      // Set alpha for all selected sections
      State.selectedSections.forEach(s => {
        s.alpha = 0.7;
      });
      
      State.app.stage.cursor = 'grabbing';
    });

    section.on('pointertap', (e) => {
      if (State.isDraggingSections) return;
      
      if (State.isDeleteMode) {
        e.stopPropagation();
        this.deleteSection(section);
        return;
      }
      // Selection is already handled in pointerdown, just log
      console.log('Section clicked:', section.sectionId);
    });

    section.on('pointerover', () => {
      if (State.isDeleteMode) {
        Utils.showTooltip('Click to delete: ' + section.sectionId);
        section.tint = COLORS.DELETE_HIGHLIGHT;
      } else if (!State.isCreateMode) {
        Utils.showTooltip(section.sectionId + ' (drag to move)');
      }
    });

    section.on('pointerout', () => {
      Utils.hideTooltip();
      section.tint = 0xffffff;
    });
  },

  createSeats(section, x, y, width, height, rows, seatsPerRow) {
    const innerWidth = width - (CONFIG.SECTION_MARGIN * 2);
    const innerHeight = height - (CONFIG.SECTION_MARGIN * 2);
    const seatSpacingX = innerWidth / (seatsPerRow - 1);
    const seatSpacingY = innerHeight / (rows - 1);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < seatsPerRow; col++) {
        const seatNumber = col + 1; // Number per row (1, 2, 3...)
        
        // Create seat container
        const seatContainer = new PIXI.Container();
        
        // Create circle
        const seat = new PIXI.Graphics();
        seat.circle(0, 0, 10);
        seat.fill({ color: COLORS.SEAT, alpha: 1 });
        
        // Create number label
        const seatLabel = new PIXI.Text({
          text: seatNumber.toString(),
          style: {
            fontFamily: 'system-ui, sans-serif',
            fontSize: 10,
            fontWeight: 'bold',
            fill: 0x000000,
            align: 'center'
          }
        });
        seatLabel.anchor.set(0.5, 0.5);
        seatLabel.x = 0;
        seatLabel.y = 0;
        
        seatContainer.addChild(seat);
        seatContainer.addChild(seatLabel);
        
        // Store relative position to section (relative to top-left, not center)
        seatContainer.relativeX = CONFIG.SECTION_MARGIN + col * seatSpacingX;
        seatContainer.relativeY = CONFIG.SECTION_MARGIN + row * seatSpacingY;
        
        // Store base relative positions (never modified, always the original)
        seatContainer.baseRelativeX = seatContainer.relativeX;
        seatContainer.baseRelativeY = seatContainer.relativeY;
        
        // Store row and column indices for grouping
        seatContainer.rowIndex = row;
        seatContainer.colIndex = col;
        
        // Initial position accounting for pivot
        seatContainer.x = section.x + seatContainer.relativeX - section.pivot.x;
        seatContainer.y = section.y + seatContainer.relativeY - section.pivot.y;
        
        seatContainer.eventMode = 'static';
        seatContainer.cursor = 'pointer';
        seatContainer.seatId = `${section.sectionId}-R${row + 1}S${col + 1}`;
        seatContainer.seatNumber = seatNumber;
        
        this.setupSeatInteractions(seatContainer);
        State.seatLayer.addChild(seatContainer);
        section.seats.push(seatContainer);
      }
    }
  },

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
        Utils.showTooltip(seat.seatId);
      }
    });

    seat.on('pointerout', Utils.hideTooltip);
  },

  updateRowLabels(section) {
    // Remove existing labels
    section.rowLabels.forEach(label => {
      State.seatLayer.removeChild(label);
      label.destroy();
    });
    section.rowLabels = [];

    // ALWAYS reset seats to their true base positions (from creation)
    // But then reapply transformations (stretch and curve) if they exist
    const stretchH = section.stretchH || 0;
    const stretchV = section.stretchV || 0;
    const curve = section.curve || 0;
    
    if (curve !== 0) {
      // Curve takes precedence and includes stretch
      this.applyCurveTransform(section);
    } else if (stretchH !== 0 || stretchV !== 0) {
      // Just apply stretch
      this.applyStretchTransform(section);
    } else {
      // No transformations, just use base positions
      section.seats.forEach(seat => {
        seat.relativeX = seat.baseRelativeX;
        seat.relativeY = seat.baseRelativeY;
      });
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
        section.selectionBorder.clear();
        section.selectionBorder.rect(-3, -3, section.contentWidth + 6, section.contentHeight + 6);
        section.selectionBorder.stroke({ width: 3, color: 0x00ff00 });
      }
      
      // Update seat positions (handles rotation)
      this.positionSeatsAndLabels(section);
      
      this.updateSectionGraphics(section);
      return;
    }

    // Group seats by their original row index (not by Y position which changes with transformations)
    const rowMap = new Map();
    section.seats.forEach(seat => {
      const rowIdx = seat.rowIndex;
      if (!rowMap.has(rowIdx)) {
        rowMap.set(rowIdx, []);
      }
      rowMap.get(rowIdx).push(seat);
    });

    const rows = Array.from(rowMap.entries()).sort((a, b) => a[0] - b[0]);
    const LABEL_GAP = 30; // Distance from seat edge to label center
    
    rows.forEach(([rowIndex, seatsInRow]) => {
      const labelText = this.getRowLabelText(rowIndex, section.rowLabelType);
      
      // Get leftmost and rightmost seats based on their current relativeX (after transformations)
      const sortedSeats = seatsInRow.sort((a, b) => a.relativeX - b.relativeX);
      const leftmostSeat = sortedSeats[0];
      const rightmostSeat = sortedSeats[sortedSeats.length - 1];

      // Create left label - position at the leftmost seat of this row
      if (section.showLeftLabels) {
        const leftLabel = this.createRowLabel(labelText);
        leftLabel.relativeX = leftmostSeat.relativeX - 10 - LABEL_GAP; // 10 = seat radius
        leftLabel.relativeY = leftmostSeat.relativeY; // Use the seat's Y position (important for curves)
        leftLabel.x = section.x + leftLabel.relativeX;
        leftLabel.y = section.y + leftLabel.relativeY;
        section.rowLabels.push(leftLabel);
        State.seatLayer.addChild(leftLabel);
      }

      // Create right label - position at the rightmost seat of this row
      if (section.showRightLabels) {
        const rightLabel = this.createRowLabel(labelText);
        rightLabel.relativeX = rightmostSeat.relativeX + 10 + LABEL_GAP; // 10 = seat radius
        rightLabel.relativeY = rightmostSeat.relativeY; // Use the seat's Y position (important for curves)
        rightLabel.x = section.x + rightLabel.relativeX;
        rightLabel.y = section.y + rightLabel.relativeY;
        section.rowLabels.push(rightLabel);
        State.seatLayer.addChild(rightLabel);
      }
    });

    // Calculate bounding box for collision detection (includes labels)
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

    // Check all labels (use actual bounds)
    section.rowLabels.forEach(label => {
      const labelHalfWidth = label.width / 2;
      const labelHalfHeight = label.height / 2;
      minX = Math.min(minX, label.relativeX - labelHalfWidth);
      maxX = Math.max(maxX, label.relativeX + labelHalfWidth);
      minY = Math.min(minY, label.relativeY - labelHalfHeight);
      maxY = Math.max(maxY, label.relativeY + labelHalfHeight);
    });

    // Add padding
    const EDGE_PADDING = 10;
    
    // Calculate total content width and height
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // Shift everything so content starts at EDGE_PADDING
    const shiftX = EDGE_PADDING - minX;
    const shiftY = EDGE_PADDING - minY;
    
    // Store the shift amounts on the section - don't modify relative positions yet
    section.layoutShiftX = shiftX;
    section.layoutShiftY = shiftY;
    
    // Apply shift to labels (they were positioned relative to base seat positions)
    section.rowLabels.forEach(label => {
      label.relativeX += shiftX;
      label.relativeY += shiftY;
    });
    
        // Update dimensions to match content (no ceiling for precision)
    section.contentWidth = contentWidth + (EDGE_PADDING * 2);
    section.contentHeight = contentHeight + (EDGE_PADDING * 2);
    
    // Update pivot to new center (important for rotation)
    section.pivot.set(section.contentWidth / 2, section.contentHeight / 2);
    
    // Update the visual graphics to match new dimensions
    this.updateSectionGraphics(section);
    
    // Update selection border if it exists
    if (section.selectionBorder) {
      section.selectionBorder.clear();
      section.selectionBorder.rect(-3, -3, section.contentWidth + 6, section.contentHeight + 6);
      section.selectionBorder.stroke({ width: 3, color: 0x00ff00 });
    }
    
    // Update seat and label positions (handles rotation)
    this.positionSeatsAndLabels(section);
  },

  positionSeatsAndLabels(section) {
    // Get the layout shift (applied when labels are added)
    const shiftX = section.layoutShiftX || 0;
    const shiftY = section.layoutShiftY || 0;
    
    // Position seats and labels accounting for pivot and rotation
    if (section.rotationDegrees && section.rotationDegrees !== 0) {
      // Has rotation - use rotation transformation
      const radians = (section.rotationDegrees * Math.PI) / 180;
      const centerX = section.x;
      const centerY = section.y;
      
      section.seats.forEach(seat => {
        // Apply layout shift to base position
        const adjustedX = seat.relativeX + shiftX;
        const adjustedY = seat.relativeY + shiftY;
        
        const relX = adjustedX - section.pivot.x;
        const relY = adjustedY - section.pivot.y;
        const rotatedX = relX * Math.cos(radians) - relY * Math.sin(radians);
        const rotatedY = relX * Math.sin(radians) + relY * Math.cos(radians);
        seat.x = centerX + rotatedX;
        seat.y = centerY + rotatedY;
        seat.angle = section.rotationDegrees;
      });
      
      section.rowLabels.forEach(label => {
        const relX = label.relativeX - section.pivot.x;
        const relY = label.relativeY - section.pivot.y;
        const rotatedX = relX * Math.cos(radians) - relY * Math.sin(radians);
        const rotatedY = relX * Math.sin(radians) + relY * Math.cos(radians);
        label.x = centerX + rotatedX;
        label.y = centerY + rotatedY;
        label.angle = section.rotationDegrees;
      });
    } else {
      // No rotation - simple offset
      section.seats.forEach(seat => {
        // Apply layout shift to base position
        const adjustedX = seat.relativeX + shiftX;
        const adjustedY = seat.relativeY + shiftY;
        
        seat.x = section.x + adjustedX - section.pivot.x;
        seat.y = section.y + adjustedY - section.pivot.y;
        seat.angle = 0;
      });
      
      section.rowLabels.forEach(label => {
        label.x = section.x + label.relativeX - section.pivot.x;
        label.y = section.y + label.relativeY - section.pivot.y;
        label.angle = 0;
      });
    }
  },

  updateSectionGraphics(section) {
    // Redraw the section rectangle at current size
    section.clear();
    section.rect(0, 0, section.contentWidth, section.contentHeight);
    section.fill({ color: COLORS.SECTION_FILL, alpha: 0.25 });
    section.stroke({ width: 2, color: COLORS.SECTION_STROKE, alpha: 0.8 });
  },

  getRowLabelText(index, type) {
    if (type === 'numbers') {
      return (index + 1).toString();
    } else if (type === 'letters') {
      // Convert to letters: 0->A, 1->B, ... 25->Z, 26->AA, 27->AB, etc.
      let label = '';
      let num = index;
      do {
        label = String.fromCharCode(65 + (num % 26)) + label;
        num = Math.floor(num / 26) - 1;
      } while (num >= 0);
      return label;
    }
    return '';
  },

  createRowLabel(text) {
    const label = new PIXI.Text({
      text: text,
      style: {
        fontFamily: 'system-ui, sans-serif',
        fontSize: 14,
        fontWeight: 'bold',
        fill: 0xffffff,
        align: 'center'
      }
    });
    label.anchor.set(0.5, 0.5);
    return label;
  },

  updateRowLabelPositions(section) {
    // Update positions when section moves
    section.rowLabels.forEach(label => {
      // Labels are recreated on update, so this is mainly for dragging
      // We'll handle this in updateSeatPositions
    });
  },

  selectSection(section) {
    // Add selection border if it doesn't exist
    if (!section.selectionBorder) {
      section.selectionBorder = new PIXI.Graphics();
      section.selectionBorder.rect(-3, -3, section.contentWidth + 6, section.contentHeight + 6);
      section.selectionBorder.stroke({ width: 3, color: 0x00ff00 });
      section.addChildAt(section.selectionBorder, 0);
    }
    section.selectionBorder.visible = true;
    // Apply green tint to the section background
    section.tint = 0x00ff00;
    
    // Dispatch selection change event
    document.dispatchEvent(new CustomEvent('selectionchanged'));
  },

  deselectSection(section) {
    if (section.selectionBorder) {
      section.selectionBorder.visible = false;
    }
    // Reset tint to white (default)
    section.tint = 0xffffff;
    
    // Dispatch selection change event
    document.dispatchEvent(new CustomEvent('selectionchanged'));
  },

  deselectAll() {
    State.selectedSections.forEach(section => {
      this.deselectSection(section);
    });
    State.selectedSections = [];
  },

  applyStretch(section) {
    const curve = section.curve || 0;
    
    // If there's a curve, use applyCurve instead (which includes stretch)
    if (curve !== 0) {
      this.applyCurve(section);
      return;
    }
    
    // Get the stretch amounts
    const stretchH = section.stretchH || 0;
    const stretchV = section.stretchV || 0;
    
    // Apply stretch transformation
    this.applyStretchTransform(section);
    
    // After stretching seats, update row labels if they exist
    if (section.rowLabels.length > 0) {
      this.updateRowLabels(section);
    } else {
      // No labels, just recalculate dimensions and update positions
      this.recalculateSectionDimensions(section);
      this.positionSeatsAndLabels(section);
    }
  },

  // Helper: Apply stretch transformation to seats (modifies relativeX/Y)
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
    
    section.seats.forEach(seat => {
      let rowIndex = 0;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][1].includes(seat)) {
          rowIndex = i;
          break;
        }
      }
      const colIndex = cols.indexOf(seat.baseRelativeX);
      
      seat.relativeX = seat.baseRelativeX + (colIndex * stretchH);
      seat.relativeY = seat.baseRelativeY + (rowIndex * stretchV);
    });
  },

  // Helper: Apply curve transformation to seats (modifies relativeX/Y)
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
    
    // Apply stretch to spacing
    const effectiveSeatSpacingX = seatSpacingX + stretchH;
    const effectiveSeatSpacingY = seatSpacingY + stretchV;
    
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
      
      // Calculate radius for this row (each row is an arc at different radius)
      const r = R + rowIndex * effectiveSeatSpacingY;
      
      // For proper seat-to-seat spacing on the arc, we need arc length spacing
      // Arc length = r * theta, so if we want arc spacing to equal effectiveSeatSpacingX:
      // theta_per_seat = effectiveSeatSpacingX / r
      
      // Total angle span for this row based on number of seats and desired spacing
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

  calculateMaxCurve(section) {
    // Calculate the maximum safe curve value to prevent self-intersection
    // The curve becomes problematic when the angle exceeds ~170 degrees total
    
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
    
    // Total width of the section (in seat spacing units)
    const totalWidth = (cols.length - 1) * effectiveSeatSpacingX;
    
    // We want to limit the total angle to about 190 degrees (3.316 radians)
    // theta_total = (totalWidth / 2) / R  (for half the section)
    // We want: theta_total < 3.316 / 2 ≈ 1.658 radians
    // So: (totalWidth / 2) / R < 1.658
    // Therefore: R > (totalWidth / 2) / 1.658
    // And: k < 1 / R
    
    const maxTotalAngle = 3.3; // radians (~190 degrees total, leaving margin)
    const minRadius = (totalWidth / 2) / (maxTotalAngle / 2);
    const maxK = 1 / minRadius;
    
    // Convert back to curve value (0-100)
    // k = curve / 2000
    const maxCurve = maxK * 2000;
    
    // Clamp to slider range with minimal safety margin
    return Math.min(100, maxCurve * 0.95);
  },

  applyCurve(section) {
    const curve = section.curve || 0;
    
    if (curve === 0) {
      // No curve, just apply stretch if any
      this.applyStretch(section);
      return;
    }
    
    // Apply curve transformation (includes stretch)
    this.applyCurveTransform(section);
    
    // After curving seats, update row labels if they exist
    if (section.rowLabels.length > 0) {
      this.updateRowLabels(section);
    } else {
      // No labels, just recalculate dimensions and update positions
      this.recalculateSectionDimensions(section);
      this.positionSeatsAndLabels(section);
    }
  },

  recalculateSectionDimensions(section) {
    // Calculate bounding box based on current seat positions
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    
    section.seats.forEach(seat => {
      minX = Math.min(minX, seat.relativeX - 10);
      maxX = Math.max(maxX, seat.relativeX + 10);
      minY = Math.min(minY, seat.relativeY - 10);
      maxY = Math.max(maxY, seat.relativeY + 10);
    });
    
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
    this.updateSectionGraphics(section);
    
    // Update selection border if it exists
    if (section.selectionBorder) {
      section.selectionBorder.clear();
      section.selectionBorder.rect(-3, -3, section.contentWidth + 6, section.contentHeight + 6);
      section.selectionBorder.stroke({ width: 3, color: 0x00ff00 });
    }
  },

  deleteSection(section) {
    // Remove all seats
    section.seats.forEach(seat => {
      State.seatLayer.removeChild(seat);
      seat.destroy();
    });
    
    // Remove all row labels
    section.rowLabels.forEach(label => {
      State.seatLayer.removeChild(label);
      label.destroy();
    });
    
    // Remove section
    State.sectionLayer.removeChild(section);
    section.destroy();
    
    // Remove from tracking array
    const index = State.sections.indexOf(section);
    if (index > -1) {
      State.sections.splice(index, 1);
    }
    
    // Remove from selection
    const selIndex = State.selectedSections.indexOf(section);
    if (selIndex > -1) {
      State.selectedSections.splice(selIndex, 1);
    }
    
    // Dispatch selection change event to update UI (hide sidebar if no selection)
    document.dispatchEvent(new CustomEvent('selectionchanged'));
    
    console.log('Deleted section:', section.sectionId);
  }
};
