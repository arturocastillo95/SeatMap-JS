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
    section.width = width;
    section.height = height;
    section.baseWidth = width; // Store original width without labels
    section.baseHeight = height;
    
    this.setupSectionInteractions(section);
    State.sectionLayer.addChild(section);
    State.sections.push(section);
    
    this.createSeats(section, x, y, width, height, rows, seatsPerRow);
    
    return section;
  },

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
    
    labelContainer.x = section.width / 2;
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
        Utils.showTooltip(section.sectionId + ' (drag to move, click label to rename)');
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
        
        // Store relative position to section
        seatContainer.relativeX = CONFIG.SECTION_MARGIN + col * seatSpacingX;
        seatContainer.relativeY = CONFIG.SECTION_MARGIN + row * seatSpacingY;
        
        seatContainer.x = x + seatContainer.relativeX;
        seatContainer.y = y + seatContainer.relativeY;
        
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
    seat.on('pointertap', (e) => {
      if (!State.isDeleteMode) {
        e.stopPropagation();
        console.log('Seat clicked:', seat.seatId);
        Utils.flash(seat, COLORS.FLASH_SEAT);
      }
    });

    seat.on('pointerover', () => {
      if (!State.isDeleteMode) {
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

    // Don't create labels if type is 'none' or neither position is enabled
    if (section.rowLabelType === 'none' || (!section.showLeftLabels && !section.showRightLabels)) {
      // Reset to base dimensions if no labels
      section.width = section.baseWidth;
      section.height = section.baseHeight;
      
      // Restore original seat positions if they were shifted
      if (section.seats.length > 0 && section.seats[0].originalRelativeX !== undefined) {
        section.seats.forEach(seat => {
          seat.relativeX = seat.originalRelativeX;
          seat.relativeY = seat.originalRelativeY;
          seat.x = section.x + seat.relativeX;
          seat.y = section.y + seat.relativeY;
          // Clear the stored original positions
          delete seat.originalRelativeX;
          delete seat.originalRelativeY;
        });
      }
      
      this.updateSectionGraphics(section);
      return;
    }

    // Store original positions before any shifting (first time only)
    if (section.seats.length > 0 && section.seats[0].originalRelativeX === undefined) {
      section.seats.forEach(seat => {
        seat.originalRelativeX = seat.relativeX;
        seat.originalRelativeY = seat.relativeY;
      });
    }
    
    // Always reset to original positions before calculating new layout
    section.seats.forEach(seat => {
      seat.relativeX = seat.originalRelativeX;
      seat.relativeY = seat.originalRelativeY;
    });

    // Get unique rows from seats
    const rowMap = new Map();
    section.seats.forEach(seat => {
      const rowY = seat.relativeY;
      if (!rowMap.has(rowY)) {
        rowMap.set(rowY, []);
      }
      rowMap.get(rowY).push(seat);
    });

    const rows = Array.from(rowMap.entries()).sort((a, b) => a[0] - b[0]);
    const LABEL_GAP = 30; // Distance from seat edge to label center
    
    rows.forEach((rowData, index) => {
      const [rowY, seatsInRow] = rowData;
      const labelText = this.getRowLabelText(index, section.rowLabelType);
      
      // Get leftmost and rightmost seats
      const sortedSeats = seatsInRow.sort((a, b) => a.relativeX - b.relativeX);
      const leftSeat = sortedSeats[0];
      const rightSeat = sortedSeats[sortedSeats.length - 1];

      // Create left label - store relative position
      // Position label to the left of the leftmost seat edge (seat center - seat radius - gap)
      if (section.showLeftLabels) {
        const leftLabel = this.createRowLabel(labelText);
        leftLabel.relativeX = leftSeat.relativeX - 10 - LABEL_GAP; // 10 = seat radius
        leftLabel.relativeY = rowY;
        leftLabel.x = section.x + leftLabel.relativeX;
        leftLabel.y = section.y + leftLabel.relativeY;
        section.rowLabels.push(leftLabel);
        State.seatLayer.addChild(leftLabel);
      }

      // Create right label - store relative position
      // Position label to the right of the rightmost seat edge (seat center + seat radius + gap)
      if (section.showRightLabels) {
        const rightLabel = this.createRowLabel(labelText);
        rightLabel.relativeX = rightSeat.relativeX + 10 + LABEL_GAP; // 10 = seat radius
        rightLabel.relativeY = rowY;
        rightLabel.x = section.x + rightLabel.relativeX;
        rightLabel.y = section.y + rightLabel.relativeY;
        section.rowLabels.push(rightLabel);
        State.seatLayer.addChild(rightLabel);
      }
    });

    // Calculate bounding box for collision detection (includes labels)
    if (section.rowLabels.length === 0) {
      // No labels - use base dimensions
      section.width = section.baseWidth;
      section.height = section.baseHeight;
      
      // Update seat positions in case they were shifted
      section.seats.forEach(seat => {
        seat.x = section.x + seat.relativeX;
        seat.y = section.y + seat.relativeY;
      });
      
      return;
    }

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
    
    // Center the content by shifting everything to start at EDGE_PADDING
    const shiftX = EDGE_PADDING - minX;
    const shiftY = EDGE_PADDING - minY;
    
    section.seats.forEach(seat => {
      seat.relativeX += shiftX;
      seat.x = section.x + seat.relativeX;
      seat.relativeY += shiftY;
      seat.y = section.y + seat.relativeY;
    });
    
    section.rowLabels.forEach(label => {
      label.relativeX += shiftX;
      label.x = section.x + label.relativeX;
      label.relativeY += shiftY;
      label.y = section.y + label.relativeY;
    });
    
    // Update collision box dimensions (for collision detection and alignment)
    section.width = Math.ceil(contentWidth) + (EDGE_PADDING * 2);
    section.height = Math.ceil(contentHeight) + (EDGE_PADDING * 2);
    
    // NOTE: We don't call updateSectionGraphics here because
    // the visual box (blue background) should stay at baseWidth.
    // Only the collision box (section.width) expands to include labels.
  },

  updateSectionGraphics(section) {
    // Redraw the section rectangle at BASE size (not including labels)
    section.clear();
    section.rect(0, 0, section.baseWidth, section.baseHeight);
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
      section.selectionBorder.rect(-3, -3, section.width + 6, section.height + 6);
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
