// ============================================
// ALIGNMENT MANAGER (OPTIMIZED)
// ============================================

import { State, Elements } from './state.js';
import { SectionManager } from './sectionManager.js';

export const AlignmentManager = {
  // Configuration
  COLLISION_PADDING: 0, // Allow touching - only block actual overlap
  PUSH_DISTANCE: 30,
  MAX_ITERATIONS: 20,
  GAP: 40, // Minimum gap for distribution
  
  init() {
    this.setupAlignmentControls();
    this.setupSidebarControls();
    this.observeSelectionChanges();
  },

  setupAlignmentControls() {
    // Horizontal alignment
    Elements.alignLeftBtn.addEventListener('click', () => this.alignLeft());
    Elements.alignCenterHBtn.addEventListener('click', () => this.alignCenterHorizontal());
    Elements.alignRightBtn.addEventListener('click', () => this.alignRight());
    
    // Vertical alignment
    Elements.alignTopBtn.addEventListener('click', () => this.alignTop());
    Elements.alignCenterVBtn.addEventListener('click', () => this.alignCenterVertical());
    Elements.alignBottomBtn.addEventListener('click', () => this.alignBottom());
    
    // Distribution
    Elements.distributeHBtn.addEventListener('click', () => this.distributeHorizontally());
    Elements.distributeVBtn.addEventListener('click', () => this.distributeVertically());
  },

  setupSidebarControls() {
    // Section name input
    Elements.sectionNameInput.addEventListener('input', (e) => {
      if (State.selectedSections.length === 1) {
        const section = State.selectedSections[0];
        section.sectionId = e.target.value;
      }
    });

    // Row label type buttons
    Elements.rowLabelNone.addEventListener('click', () => this.setRowLabelType('none'));
    Elements.rowLabelNumbers.addEventListener('click', () => this.setRowLabelType('numbers'));
    Elements.rowLabelLetters.addEventListener('click', () => this.setRowLabelType('letters'));

    // Row label position buttons (toggleable)
    Elements.rowLabelLeft.addEventListener('click', () => this.toggleRowLabelPosition('left'));
    Elements.rowLabelRight.addEventListener('click', () => this.toggleRowLabelPosition('right'));

    // Rotation slider
    Elements.rotateSlider.addEventListener('input', (e) => this.setRotation(parseFloat(e.target.value)));
  },

  setRowLabelType(type) {
    if (State.selectedSections.length === 1) {
      const section = State.selectedSections[0];
      section.rowLabelType = type;
      
      // If selecting numbers or letters and no position is set, default to left
      if (type !== 'none' && !section.showLeftLabels && !section.showRightLabels) {
        section.showLeftLabels = true;
      }
      
      SectionManager.updateRowLabels(section);
      this.updateSeatPositions(section); // Update positions after box size changes
      this.updateSidebarValues(section);
    }
  },

  toggleRowLabelPosition(position) {
    if (State.selectedSections.length === 1) {
      const section = State.selectedSections[0];
      if (position === 'left') {
        section.showLeftLabels = !section.showLeftLabels;
      } else if (position === 'right') {
        section.showRightLabels = !section.showRightLabels;
      }
      
      // If both positions are now off, switch back to 'none'
      if (!section.showLeftLabels && !section.showRightLabels) {
        section.rowLabelType = 'none';
      }
      
      SectionManager.updateRowLabels(section);
      this.updateSeatPositions(section); // Update positions after box size changes
      this.updateSidebarValues(section);
    }
  },

  setRotation(degrees) {
    if (State.selectedSections.length === 1) {
      const section = State.selectedSections[0];
      
      // Clamp rotation between -180 and 180
      degrees = Math.max(-180, Math.min(180, degrees));
      section.rotationDegrees = degrees;
      
      // Rotate the section graphics (bounding box)
      section.angle = degrees;
      
      // Update seat and label positions to rotate them around section center
      SectionManager.positionSeatsAndLabels(section);
      
      // Update the UI
      this.updateSidebarValues(section);
    }
  },

  observeSelectionChanges() {
    // Event-driven approach instead of polling
    document.addEventListener('selectionchanged', () => {
      const selectedCount = State.selectedSections.length;
      
      // Show alignment bar for 2+ sections
      if (selectedCount >= 2) {
        Elements.alignBar.classList.add('show');
      } else {
        Elements.alignBar.classList.remove('show');
      }
      
      // Show sidebar for single section
      if (selectedCount === 1) {
        const section = State.selectedSections[0];
        Elements.sectionSidebar.classList.add('show');
        this.updateSidebarValues(section);
      } else {
        Elements.sectionSidebar.classList.remove('show');
      }
    });
  },

  updateSidebarValues(section) {
    // Update section name input
    Elements.sectionNameInput.value = section.sectionId || 'Unnamed Section';
    
    // Update row label type buttons
    Elements.rowLabelNone.classList.toggle('active', section.rowLabelType === 'none');
    Elements.rowLabelNumbers.classList.toggle('active', section.rowLabelType === 'numbers');
    Elements.rowLabelLetters.classList.toggle('active', section.rowLabelType === 'letters');
    
    // Show/hide position section based on label type
    const showPosition = section.rowLabelType !== 'none';
    Elements.rowLabelPositionSection.style.display = showPosition ? 'block' : 'none';
    
    // Update row label position buttons (independently toggleable)
    Elements.rowLabelLeft.classList.toggle('active', section.showLeftLabels);
    Elements.rowLabelRight.classList.toggle('active', section.showRightLabels);
    
    // Update rotation slider and display value
    const rotation = section.rotationDegrees || 0;
    Elements.rotateSlider.value = rotation;
    Elements.rotateValue.textContent = `${rotation}°`;
  },

  // ============================================
  // TWO-PROBLEM COLLISION SYSTEM
  // ============================================
  
  /**
   * CORE COLLISION TEST
   * Tests if two bounding boxes overlap (not just touching).
   * Padding is applied ONLY to the first box.
   */
  coreCollisionTest(x1, y1, w1, h1, x2, y2, w2, h2, padding = 0) {
    const b1 = {
      minX: x1 - padding,
      maxX: x1 + w1 + padding,
      minY: y1 - padding,
      maxY: y1 + h1 + padding
    };
    
    const b2 = {
      minX: x2,
      maxX: x2 + w2,
      minY: y2,
      maxY: y2 + h2
    };
    
    return (b1.maxX > b2.minX && b1.minX < b2.maxX && 
            b1.maxY > b2.minY && b1.minY < b2.maxY);
  },

  // ============================================
  // PROBLEM 1: PREVENTION (During Dragging)
  // ============================================

  /**
   * Get the permitted drag movement with "sliding" behavior.
   * Calculates the maximum movement possible before collision.
   * Only constrains the axis that would cause overlap.
   * 
   * @param {Array} dragPositions - Array of {section, x, y} with original positions
   * @param {number} dx, dy - Desired movement deltas
   * @param {Array} otherSections - Static sections to check against
   */
  getPermittedDrag(dragPositions, dx, dy, otherSections) {
    // Early exit if no movement
    if (dx === 0 && dy === 0) return { dx: 0, dy: 0 };
    
    let finalDx = dx;
    let finalDy = dy;
    
    // Check each moving section against each static section
    for (const { section, x, y } of dragPositions) {
      for (const other of otherSections) {
        // Calculate bounds at current position
        const currentBounds = {
          minX: x,
          maxX: x + section.width,
          minY: y,
          maxY: y + section.height
        };
        
        const otherBounds = {
          minX: other.x,
          maxX: other.x + other.width,
          minY: other.y,
          maxY: other.y + other.height
        };
        
        // Check X-axis movement independently
        if (dx !== 0) {
          const testX = x + finalDx;
          const testBoundsX = {
            minX: testX,
            maxX: testX + section.width,
            minY: y, // Keep Y at original
            maxY: y + section.height
          };
          
          // Would moving on X-axis cause overlap?
          if (testBoundsX.maxX > otherBounds.minX && testBoundsX.minX < otherBounds.maxX &&
              testBoundsX.maxY > otherBounds.minY && testBoundsX.minY < otherBounds.maxY) {
            // Collision on X-axis - constrain X movement
            if (dx > 0) {
              const maxDx = otherBounds.minX - (x + section.width);
              finalDx = Math.min(finalDx, maxDx);
            } else {
              const maxDx = otherBounds.maxX - x;
              finalDx = Math.max(finalDx, maxDx);
            }
          }
        }
        
        // Check Y-axis movement independently
        if (dy !== 0) {
          const testY = y + finalDy;
          const testBoundsY = {
            minX: x, // Keep X at original
            maxX: x + section.width,
            minY: testY,
            maxY: testY + section.height
          };
          
          // Would moving on Y-axis cause overlap?
          if (testBoundsY.maxX > otherBounds.minX && testBoundsY.minX < otherBounds.maxX &&
              testBoundsY.maxY > otherBounds.minY && testBoundsY.minY < otherBounds.maxY) {
            // Collision on Y-axis - constrain Y movement
            if (dy > 0) {
              const maxDy = otherBounds.minY - (y + section.height);
              finalDy = Math.min(finalDy, maxDy);
            } else {
              const maxDy = otherBounds.maxY - y;
              finalDy = Math.max(finalDy, maxDy);
            }
          }
        }
      }
    }
    
    return { dx: finalDx, dy: finalDy };
  },

  // ============================================
  // PROBLEM 2: SEPARATION (After Alignment)
  // ============================================

  /**
   * Calculate the Minimum Translation Vector (MTV) to separate two overlapping sections.
   * Returns the smallest push needed on either X or Y axis.
   */
  getCollisionVector(s1, s2, padding = this.COLLISION_PADDING) {
    // Calculate bounds with padding on s1
    const b1 = {
      minX: s1.x - padding,
      maxX: s1.x + s1.width + padding,
      minY: s1.y - padding,
      maxY: s1.y + s1.height + padding
    };
    
    const b2 = {
      minX: s2.x,
      maxX: s2.x + s2.width,
      minY: s2.y,
      maxY: s2.y + s2.height
    };
    
    // Calculate overlap on each axis
    const xOverlap = Math.min(b1.maxX, b2.maxX) - Math.max(b1.minX, b2.minX);
    const yOverlap = Math.min(b1.maxY, b2.maxY) - Math.max(b1.minY, b2.minY);
    
    // No collision if no overlap on either axis
    if (xOverlap <= 0 || yOverlap <= 0) return null;
    
    // Find the axis with smaller overlap (minimum translation)
    if (xOverlap < yOverlap) {
      // Push on X-axis
      const direction = (b1.minX + b1.maxX) / 2 < (b2.minX + b2.maxX) / 2 ? -1 : 1;
      return { axis: 'x', delta: xOverlap * direction };
    } else {
      // Push on Y-axis
      const direction = (b1.minY + b1.maxY) / 2 < (b2.minY + b2.maxY) / 2 ? -1 : 1;
      return { axis: 'y', delta: yOverlap * direction };
    }
  },

  /**
   * Update seat positions for a section (optimized - no logging)
   */
  updateSeatPositions(section) {
    // Use the centralized positioning method from SectionManager
    SectionManager.positionSeatsAndLabels(section);
  },

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  /**
   * Resolve collisions using iterative relaxation with MTV.
   * Pushes sections apart by the minimum amount needed on the correct axis.
   * Preserves alignment better than fixed-distance pushing.
   */
  resolveCollisions(movedSections) {
    for (let iteration = 0; iteration < this.MAX_ITERATIONS; iteration++) {
      let hadCollision = false;
      
      for (const section of movedSections) {
        // Check collision with ALL other sections
        const otherSections = State.sections.filter(s => s !== section);
        
        for (const other of otherSections) {
          const vector = this.getCollisionVector(section, other, this.COLLISION_PADDING);
          
          if (vector) {
            hadCollision = true;
            
            // Apply the minimum translation vector
            if (vector.axis === 'x') {
              section.x += vector.delta;
            } else {
              section.y += vector.delta;
            }
            
            this.updateSeatPositions(section);
          }
        }
      }
      
      if (!hadCollision) break;
    }
    
    // Final update of all seat positions after collision resolution
    movedSections.forEach(section => {
      this.updateSeatPositions(section);
    });
  },

  // ============================================
  // ALIGNMENT FUNCTIONS (Using Bounding Box)
  // ============================================

  alignLeft() {
    if (State.selectedSections.length < 2) return;
    
    // Find the leftmost bounding box 'x'
    const minX = Math.min(...State.selectedSections.map(s => s.x));
    
    // Move all sections to that 'x'
    State.selectedSections.forEach(section => {
      section.x = minX;
      this.updateSeatPositions(section);
    });
    
    this.resolveCollisions(State.selectedSections);
  },

  alignRight() {
    if (State.selectedSections.length < 2) return;
    
    // Find the rightmost edge (x + width)
    const maxX = Math.max(...State.selectedSections.map(s => s.x + s.width));
    
    // Move all sections so their right edge aligns with maxX
    State.selectedSections.forEach(section => {
      section.x = maxX - section.width;
      this.updateSeatPositions(section);
    });
    
    this.resolveCollisions(State.selectedSections);
  },

  alignCenterHorizontal() {
    if (State.selectedSections.length < 2) return;
    
    // Calculate center of bounding box for each section
    const centers = State.selectedSections.map(s => s.x + s.width / 2);
    const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;
    
    // Move all sections so their centers align
    State.selectedSections.forEach(section => {
      section.x = avgCenter - section.width / 2;
      this.updateSeatPositions(section);
    });
    
    this.resolveCollisions(State.selectedSections);
  },

  alignTop() {
    if (State.selectedSections.length < 2) return;
    
    // Find the topmost bounding box 'y'
    const minY = Math.min(...State.selectedSections.map(s => s.y));
    
    // Move all sections to that 'y'
    State.selectedSections.forEach(section => {
      section.y = minY;
      this.updateSeatPositions(section);
    });
    
    this.resolveCollisions(State.selectedSections);
  },

  alignBottom() {
    if (State.selectedSections.length < 2) return;
    
    // Find the bottommost edge (y + height)
    const maxY = Math.max(...State.selectedSections.map(s => s.y + s.height));
    
    // Move all sections so their bottom edge aligns with maxY
    State.selectedSections.forEach(section => {
      section.y = maxY - section.height;
      this.updateSeatPositions(section);
    });
    
    this.resolveCollisions(State.selectedSections);
  },

  alignCenterVertical() {
    if (State.selectedSections.length < 2) return;
    
    // Calculate center of bounding box for each section
    const centers = State.selectedSections.map(s => s.y + s.height / 2);
    const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;
    
    // Move all sections so their centers align
    State.selectedSections.forEach(section => {
      section.y = avgCenter - section.height / 2;
      this.updateSeatPositions(section);
    });
    
    this.resolveCollisions(State.selectedSections);
  },

  // ============================================
  // DISTRIBUTION FUNCTIONS (Using Bounding Box)
  // ============================================

  distributeHorizontally() {
    if (State.selectedSections.length < 3) return;
    
    // Sort by the bounding box 'x' position
    const sorted = [...State.selectedSections].sort((a, b) => a.x - b.x);
    
    // Keep first and last in place, distribute middle sections evenly
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    
    // Calculate available space between first and last
    const startX = first.x + first.width;
    const endX = last.x;
    const availableSpace = endX - startX;
    
    // Calculate total width of middle sections
    const middleSections = sorted.slice(1, -1);
    const totalMiddleWidth = middleSections.reduce((sum, s) => sum + s.width, 0);
    
    // Calculate gap size
    // Available space minus middle widths, divided by number of gaps
    const numGaps = sorted.length - 1;
    let gap = (availableSpace - totalMiddleWidth) / numGaps;
    
    // If gap is less than minimum, push last section to make room
    if (gap < this.GAP) {
      const neededSpace = (this.GAP * numGaps) + totalMiddleWidth;
      last.x = startX + neededSpace;
      this.updateSeatPositions(last);
      gap = this.GAP;
    }
    
    // Position middle sections with calculated gap
    let currentX = startX + gap;
    for (let i = 1; i < sorted.length - 1; i++) {
      sorted[i].x = currentX;
      this.updateSeatPositions(sorted[i]);
      currentX += sorted[i].width + gap;
    }
    
    // Resolve collisions for all moved sections
    this.resolveCollisions(sorted.slice(1));
  },

  distributeVertically() {
    if (State.selectedSections.length < 3) return;
    
    // Sort by the bounding box 'y' position
    const sorted = [...State.selectedSections].sort((a, b) => a.y - b.y);
    
    // Keep first and last in place, distribute middle sections evenly
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    
    // Calculate available space between first and last
    const startY = first.y + first.height;
    const endY = last.y;
    const availableSpace = endY - startY;
    
    // Calculate total height of middle sections
    const middleSections = sorted.slice(1, -1);
    const totalMiddleHeight = middleSections.reduce((sum, s) => sum + s.height, 0);
    
    // Calculate gap size
    // Available space minus middle heights, divided by number of gaps
    const numGaps = sorted.length - 1;
    let gap = (availableSpace - totalMiddleHeight) / numGaps;
    
    // If gap is less than minimum, push last section to make room
    if (gap < this.GAP) {
      const neededSpace = (this.GAP * numGaps) + totalMiddleHeight;
      last.y = startY + neededSpace;
      this.updateSeatPositions(last);
      gap = this.GAP;
    }
    
    // Position middle sections with calculated gap
    let currentY = startY + gap;
    for (let i = 1; i < sorted.length - 1; i++) {
      sorted[i].y = currentY;
      this.updateSeatPositions(sorted[i]);
      currentY += sorted[i].height + gap;
    }
    
    // Resolve collisions for all moved sections
    this.resolveCollisions(sorted.slice(1));
  }
};
