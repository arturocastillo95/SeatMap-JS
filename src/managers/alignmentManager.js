// ============================================
// ALIGNMENT MANAGER (OPTIMIZED)
// ============================================

import { State, Elements } from '../core/state.js';
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
    this.setupResizeHandleListeners();
  },

  setupResizeHandleListeners() {
    // Listen for GA resize events
    document.addEventListener('gaResizing', (e) => {
      const section = e.detail.section;
      this.updateSidebarValues(section);
    });
    
    document.addEventListener('gaResizeEnd', (e) => {
      const section = e.detail.section;
      this.resolveCollisions([section]);
    });
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
        // Update GA label if it exists
        if (section.gaLabel) {
          section.gaLabel.text = e.target.value;
        }
      }
    });

    // Row label type buttons
    Elements.rowLabelNone.addEventListener('click', () => this.setRowLabelType('none'));
    Elements.rowLabelNumbers.addEventListener('click', () => this.setRowLabelType('numbers'));
    Elements.rowLabelLetters.addEventListener('click', () => this.setRowLabelType('letters'));

    // Row label position buttons (toggleable)
    Elements.rowLabelLeft.addEventListener('click', () => this.toggleRowLabelPosition('left'));
    Elements.rowLabelRight.addEventListener('click', () => this.toggleRowLabelPosition('right'));
    Elements.rowLabelHidden.addEventListener('click', () => this.toggleRowLabelPosition('hidden'));

    // Row label starting point
    Elements.rowLabelStartInput.addEventListener('input', (e) => this.setRowLabelStart(e.target.value));
    Elements.rowLabelFlipBtn.addEventListener('click', () => this.flipRowLabels());

    // Seat numbering
    Elements.seatNumberStartInput.addEventListener('input', (e) => this.setSeatNumberStart(e.target.value));
    Elements.seatNumberFlipBtn.addEventListener('click', () => this.flipSeatNumbering());

    // Rotation slider
    Elements.rotateSlider.addEventListener('input', (e) => this.setRotation(parseFloat(e.target.value)));
    Elements.resetRotateBtn.addEventListener('click', () => this.resetRotation());

    // Curve slider
    Elements.curveSlider.addEventListener('input', (e) => this.setCurve(parseFloat(e.target.value)));
    Elements.resetCurveBtn.addEventListener('click', () => this.resetCurve());

    // Stretch sliders
    Elements.stretchHSlider.addEventListener('input', (e) => this.setStretchH(parseFloat(e.target.value)));
    Elements.resetStretchHBtn.addEventListener('click', () => this.resetStretchH());
    Elements.stretchVSlider.addEventListener('input', (e) => this.setStretchV(parseFloat(e.target.value)));
    Elements.resetStretchVBtn.addEventListener('click', () => this.resetStretchV());

    // Align Rows buttons
    const alignRowsButtons = document.querySelectorAll('.sidebar-align-btn');
    if (alignRowsButtons.length >= 3) {
      alignRowsButtons[0].addEventListener('click', () => this.alignRowsLeft());
      alignRowsButtons[1].addEventListener('click', () => this.alignRowsCenter());
      alignRowsButtons[2].addEventListener('click', () => this.alignRowsRight());
    }

    // Section color inputs
    Elements.sectionColorPicker.addEventListener('input', (e) => {
      if (State.selectedSections.length === 1) {
        const colorHex = e.target.value;
        // Update text input
        Elements.sectionColorInput.value = colorHex.toUpperCase();
        // Apply color to section
        SectionManager.setSectionColor(State.selectedSections[0], colorHex);
      }
    });

    Elements.sectionColorInput.addEventListener('change', (e) => {
      if (State.selectedSections.length === 1) {
        let colorHex = e.target.value.trim();
        // Add # if missing
        if (!colorHex.startsWith('#')) {
          colorHex = '#' + colorHex;
        }
        // Validate hex color
        if (/^#[0-9A-Fa-f]{6}$/.test(colorHex)) {
          // Update color picker
          Elements.sectionColorPicker.value = colorHex;
          // Apply color to section
          SectionManager.setSectionColor(State.selectedSections[0], colorHex);
          // Update text input to show formatted value
          Elements.sectionColorInput.value = colorHex.toUpperCase();
        } else {
          // Invalid color, reset to current section color
          const section = State.selectedSections[0];
          const validColorHex = '#' + (section.sectionColor || 0x3b82f6).toString(16).padStart(6, '0');
          Elements.sectionColorInput.value = validColorHex.toUpperCase();
        }
      }
    });

    // Seat color inputs
    Elements.seatColorPicker.addEventListener('input', (e) => {
      if (State.selectedSections.length === 1) {
        const colorHex = e.target.value;
        // Update text input
        Elements.seatColorInput.value = colorHex.toUpperCase();
        // Apply color to section's seats
        SectionManager.setSeatColor(State.selectedSections[0], colorHex);
      }
    });

    Elements.seatColorInput.addEventListener('change', (e) => {
      if (State.selectedSections.length === 1) {
        let colorHex = e.target.value.trim();
        // Add # if missing
        if (!colorHex.startsWith('#')) {
          colorHex = '#' + colorHex;
        }
        // Validate hex color
        if (/^#[0-9A-Fa-f]{6}$/.test(colorHex)) {
          // Update color picker
          Elements.seatColorPicker.value = colorHex;
          // Apply color to section's seats
          SectionManager.setSeatColor(State.selectedSections[0], colorHex);
          // Update text input to show formatted value
          Elements.seatColorInput.value = colorHex.toUpperCase();
        } else {
          // Invalid color, reset to current seat color
          const section = State.selectedSections[0];
          const validColorHex = '#' + (section.seatColor || 0xffffff).toString(16).padStart(6, '0');
          Elements.seatColorInput.value = validColorHex.toUpperCase();
        }
      }
    });

    // Seat text color inputs
    Elements.seatTextColorPicker.addEventListener('input', (e) => {
      if (State.selectedSections.length === 1) {
        const colorHex = e.target.value;
        // Update text input
        Elements.seatTextColorInput.value = colorHex.toUpperCase();
        // Apply color to section's seat text
        SectionManager.setSeatTextColor(State.selectedSections[0], colorHex);
      }
    });

    Elements.seatTextColorInput.addEventListener('change', (e) => {
      if (State.selectedSections.length === 1) {
        let colorHex = e.target.value.trim();
        // Add # if missing
        if (!colorHex.startsWith('#')) {
          colorHex = '#' + colorHex;
        }
        // Validate hex color
        if (/^#[0-9A-Fa-f]{6}$/.test(colorHex)) {
          // Update color picker
          Elements.seatTextColorPicker.value = colorHex;
          // Apply color to section's seat text
          SectionManager.setSeatTextColor(State.selectedSections[0], colorHex);
          // Update text input to show formatted value
          Elements.seatTextColorInput.value = colorHex.toUpperCase();
        } else {
          // Invalid color, reset to current seat text color
          const section = State.selectedSections[0];
          const validColorHex = '#' + (section.seatTextColor || 0x000000).toString(16).padStart(6, '0');
          Elements.seatTextColorInput.value = validColorHex.toUpperCase();
        }
      }
    });

    // Row label color picker
    Elements.rowLabelColorPicker.addEventListener('input', (e) => {
      if (State.selectedSections.length === 1) {
        const colorHex = e.target.value;
        // Update text input
        Elements.rowLabelColorInput.value = colorHex.toUpperCase();
        // Apply color to section's row labels
        SectionManager.setRowLabelColor(State.selectedSections[0], colorHex);
      }
    });

    Elements.rowLabelColorInput.addEventListener('change', (e) => {
      if (State.selectedSections.length === 1) {
        let colorHex = e.target.value.trim();
        // Add # if missing
        if (!colorHex.startsWith('#')) {
          colorHex = '#' + colorHex;
        }
        // Validate hex color
        if (/^#[0-9A-Fa-f]{6}$/.test(colorHex)) {
          // Update color picker
          Elements.rowLabelColorPicker.value = colorHex;
          // Apply color to section's row labels
          SectionManager.setRowLabelColor(State.selectedSections[0], colorHex);
          // Update text input to show formatted value
          Elements.rowLabelColorInput.value = colorHex.toUpperCase();
        } else {
          // Invalid color, reset to current row label color
          const section = State.selectedSections[0];
          const validColorHex = '#' + (section.rowLabelColor || 0xffffff).toString(16).padStart(6, '0');
          Elements.rowLabelColorInput.value = validColorHex.toUpperCase();
        }
      }
    });

    // GA Capacity input
    Elements.gaCapacityInput.addEventListener('input', (e) => {
      if (State.selectedSections.length === 1) {
        const section = State.selectedSections[0];
        if (section.isGeneralAdmission) {
          section.gaCapacity = parseInt(e.target.value) || 0;
        }
      }
    });

    // GA Width input
    Elements.gaWidthInput.addEventListener('change', (e) => {
      if (State.selectedSections.length === 1) {
        const section = State.selectedSections[0];
        if (section.isGeneralAdmission) {
          const newWidth = parseFloat(e.target.value) || 0;
          if (newWidth > 0) {
            SectionManager.resizeGASection(section, newWidth, section.contentHeight);
            // Check for collisions after resize and resolve them
            this.resolveCollisions([section]);
          }
        }
      }
    });

    // GA Height input
    Elements.gaHeightInput.addEventListener('change', (e) => {
      if (State.selectedSections.length === 1) {
        const section = State.selectedSections[0];
        if (section.isGeneralAdmission) {
          const newHeight = parseFloat(e.target.value) || 0;
          if (newHeight > 0) {
            SectionManager.resizeGASection(section, section.contentWidth, newHeight);
            // Check for collisions after resize and resolve them
            this.resolveCollisions([section]);
          }
        }
      }
    });

    // Section fill toggle
    Elements.sectionFillToggle.addEventListener('click', () => {
      if (State.selectedSections.length === 1) {
        const section = State.selectedSections[0];
        section.fillVisible = !section.fillVisible;
        Elements.sectionFillToggle.classList.toggle('active', section.fillVisible);
      }
    });

    // Section stroke toggle
    Elements.sectionStrokeToggle.addEventListener('click', () => {
      if (State.selectedSections.length === 1) {
        const section = State.selectedSections[0];
        section.strokeVisible = !section.strokeVisible;
        Elements.sectionStrokeToggle.classList.toggle('active', section.strokeVisible);
      }
    });

    // Glow Enabled Toggle
    Elements.glowEnabledToggle.addEventListener('change', (e) => {
      if (State.selectedSections.length === 1) {
        const section = State.selectedSections[0];
        SectionManager.setGlowEnabled(section, e.target.checked);
        // Show/hide controls
        document.getElementById('glowControls').style.display = e.target.checked ? 'block' : 'none';
      }
    });

    // Glow Color
    Elements.glowColorPicker.addEventListener('input', (e) => {
      if (State.selectedSections.length === 1) {
        const colorHex = e.target.value;
        Elements.glowColorInput.value = colorHex.toUpperCase();
        SectionManager.setGlowColor(State.selectedSections[0], colorHex);
      }
    });

    Elements.glowColorInput.addEventListener('change', (e) => {
      if (State.selectedSections.length === 1) {
        let colorHex = e.target.value.trim();
        if (!colorHex.startsWith('#')) colorHex = '#' + colorHex;
        if (/^#[0-9A-Fa-f]{6}$/.test(colorHex)) {
          Elements.glowColorPicker.value = colorHex;
          Elements.glowColorInput.value = colorHex.toUpperCase();
          SectionManager.setGlowColor(State.selectedSections[0], colorHex);
        }
      }
    });

    // Glow Opacity
    Elements.glowOpacitySlider.addEventListener('input', (e) => {
      if (State.selectedSections.length === 1) {
        const opacity = parseInt(e.target.value) / 100;
        Elements.glowOpacityValue.textContent = `${e.target.value}%`;
        SectionManager.setGlowOpacity(State.selectedSections[0], opacity);
      }
    });

    // Glow Strength
    Elements.glowStrengthSlider.addEventListener('input', (e) => {
      if (State.selectedSections.length === 1) {
        const strength = parseInt(e.target.value);
        Elements.glowStrengthValue.textContent = `${strength}px`;
        SectionManager.setGlowStrength(State.selectedSections[0], strength);
      }
    });

    // Glow Blur
    Elements.glowBlurSlider.addEventListener('input', (e) => {
      if (State.selectedSections.length === 1) {
        const blur = parseInt(e.target.value);
        Elements.glowBlurValue.textContent = `${blur}px`;
        SectionManager.setGlowBlur(State.selectedSections[0], blur);
      }
    });
  },

  setRowLabelType(type) {
    if (State.selectedSections.length === 1) {
      const section = State.selectedSections[0];
      section.rowLabelType = type;
      
      // Set appropriate default starting value based on type
      if (type === 'numbers' && (typeof section.rowLabelStart !== 'number')) {
        section.rowLabelStart = 1;
      } else if (type === 'letters' && (typeof section.rowLabelStart !== 'string')) {
        section.rowLabelStart = 'A';
      }
      
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
        // Unset hidden if enabling left
        if (section.showLeftLabels) {
          section.labelsHidden = false;
        }
      } else if (position === 'right') {
        section.showRightLabels = !section.showRightLabels;
        // Unset hidden if enabling right
        if (section.showRightLabels) {
          section.labelsHidden = false;
        }
      } else if (position === 'hidden') {
        section.labelsHidden = !section.labelsHidden;
        // If enabling hidden, ensure at least one position is active
        if (section.labelsHidden && !section.showLeftLabels && !section.showRightLabels) {
          section.showLeftLabels = true;
        }
      }
      
      // If both positions are now off and not hidden, switch back to 'none'
      if (!section.showLeftLabels && !section.showRightLabels && !section.labelsHidden) {
        section.rowLabelType = 'none';
      }
      
      SectionManager.updateRowLabels(section);
      this.updateSeatPositions(section); // Update positions after box size changes
      this.updateSidebarValues(section);
    }
  },

  setRowLabelStart(value) {
    if (State.selectedSections.length === 1) {
      const section = State.selectedSections[0];
      
      // Validate and set the starting value based on label type
      if (section.rowLabelType === 'numbers') {
        // For numbers, parse as integer and ensure it's >= 1
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 1) {
          section.rowLabelStart = num;
          SectionManager.updateRowLabels(section);
          this.updateSeatPositions(section);
        } else if (value === '') {
          // Reset to default
          section.rowLabelStart = 1;
          Elements.rowLabelStartInput.value = '1';
          SectionManager.updateRowLabels(section);
          this.updateSeatPositions(section);
        }
      } else if (section.rowLabelType === 'letters') {
        // For letters, validate it's a single letter
        const letter = value.toUpperCase().trim();
        if (letter.length === 1 && letter >= 'A' && letter <= 'Z') {
          section.rowLabelStart = letter;
          Elements.rowLabelStartInput.value = letter;
          SectionManager.updateRowLabels(section);
          this.updateSeatPositions(section);
        } else if (value === '') {
          // Reset to default
          section.rowLabelStart = 'A';
          Elements.rowLabelStartInput.value = 'A';
          SectionManager.updateRowLabels(section);
          this.updateSeatPositions(section);
        }
      }
    }
  },

  flipRowLabels() {
    if (State.selectedSections.length === 1) {
      const section = State.selectedSections[0];
      section.rowLabelReversed = !section.rowLabelReversed;
      
      // Update button active state
      Elements.rowLabelFlipBtn.classList.toggle('active', section.rowLabelReversed);
      
      SectionManager.updateRowLabels(section);
      this.updateSeatPositions(section);
      console.log(`✓ Row labels ${section.rowLabelReversed ? 'reversed' : 'normal'}`);
    }
  },

  setSeatNumberStart(value) {
    if (State.selectedSections.length === 1) {
      const section = State.selectedSections[0];
      
      // Parse as integer and ensure it's >= 1
      const num = parseInt(value, 10);
      if (!isNaN(num) && num >= 1) {
        section.seatNumberStart = num;
        SectionManager.updateSeatNumbers(section);
      } else if (value === '') {
        // Reset to default
        section.seatNumberStart = 1;
        Elements.seatNumberStartInput.value = '1';
        SectionManager.updateSeatNumbers(section);
      }
    }
  },

  flipSeatNumbering() {
    if (State.selectedSections.length === 1) {
      const section = State.selectedSections[0];
      section.seatNumberReversed = !section.seatNumberReversed;
      
      // Update button active state
      Elements.seatNumberFlipBtn.classList.toggle('active', section.seatNumberReversed);
      
      SectionManager.updateSeatNumbers(section);
      console.log(`✓ Seat numbering ${section.seatNumberReversed ? 'reversed' : 'normal'}`);
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
      
      // Update resize handles if they exist (for GA sections)
      if (section.resizeHandles) {
        SectionManager.updateResizeHandles(section);
      }
      
      // Update the UI
      this.updateSidebarValues(section);
    }
  },

  setStretchH(amount) {
    if (State.selectedSections.length === 1) {
      const section = State.selectedSections[0];
      section.stretchH = amount;
      
      // Recalculate seat positions with new horizontal spacing
      SectionManager.applyStretch(section);
      
      // Update the UI
      this.updateSidebarValues(section);
    }
  },

  setStretchV(amount) {
    if (State.selectedSections.length === 1) {
      const section = State.selectedSections[0];
      section.stretchV = amount;
      
      // Recalculate seat positions with new vertical spacing
      SectionManager.applyStretch(section);
      
      // Update the UI
      this.updateSidebarValues(section);
    }
  },

  setCurve(amount) {
    if (State.selectedSections.length === 1) {
      const section = State.selectedSections[0];
      
      // Calculate maximum safe curve for this section
      const maxCurve = SectionManager.calculateMaxCurve(section);
      
      // Clamp the curve to safe maximum
      section.curve = Math.min(amount, maxCurve);
      
      // Recalculate seat positions with curve
      SectionManager.applyCurve(section);
      
      // Update the UI
      this.updateSidebarValues(section);
    }
  },

  resetRotation() {
    if (State.selectedSections.length === 1) {
      this.setRotation(0);
    }
  },

  resetCurve() {
    if (State.selectedSections.length === 1) {
      this.setCurve(0);
    }
  },

  resetStretchH() {
    if (State.selectedSections.length === 1) {
      this.setStretchH(0);
    }
  },

  resetStretchV() {
    if (State.selectedSections.length === 1) {
      this.setStretchV(0);
    }
  },

  alignRowsLeft() {
    if (State.selectedSections.length === 1) {
      const section = State.selectedSections[0];
      SectionManager.alignRows(section, 'left');
      console.log('✓ Aligned rows to left');
    }
  },

  alignRowsCenter() {
    if (State.selectedSections.length === 1) {
      const section = State.selectedSections[0];
      SectionManager.alignRows(section, 'center');
      console.log('✓ Aligned rows to center');
    }
  },

  alignRowsRight() {
    if (State.selectedSections.length === 1) {
      const section = State.selectedSections[0];
      SectionManager.alignRows(section, 'right');
      console.log('✓ Aligned rows to right');
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
        
        // Show resize handles only for single GA section selection
        if (section.isGeneralAdmission && !section.resizeHandles) {
          SectionManager.addResizeHandles(section);
        }
      } else {
        Elements.sectionSidebar.classList.remove('show');
        
        // Remove resize handles from all sections (not just selected ones)
        State.sections.forEach(section => {
          if (section.resizeHandles) {
            SectionManager.removeResizeHandles(section);
          }
        });
      }
    });
  },

  updateSidebarValues(section) {
    // Update section name input
    Elements.sectionNameInput.value = section.sectionId || 'Unnamed Section';
    
    // Update section color inputs
    const colorHex = '#' + (section.sectionColor || 0x3b82f6).toString(16).padStart(6, '0');
    Elements.sectionColorPicker.value = colorHex;
    Elements.sectionColorInput.value = colorHex.toUpperCase();
    
    // Update seat color inputs
    const seatColorHex = '#' + (section.seatColor || 0xffffff).toString(16).padStart(6, '0');
    Elements.seatColorPicker.value = seatColorHex;
    Elements.seatColorInput.value = seatColorHex.toUpperCase();
    
    // Update seat text color inputs
    const seatTextColorHex = '#' + (section.seatTextColor || 0x000000).toString(16).padStart(6, '0');
    Elements.seatTextColorPicker.value = seatTextColorHex;
    Elements.seatTextColorInput.value = seatTextColorHex.toUpperCase();
    
    // Update fill and stroke visibility toggles
    Elements.sectionFillToggle.classList.toggle('active', section.fillVisible !== false);
    Elements.sectionStrokeToggle.classList.toggle('active', section.strokeVisible !== false);
    
    // Update Glow Controls
    Elements.glowEnabledToggle.checked = section.glowEnabled;
    document.getElementById('glowControls').style.display = section.glowEnabled ? 'block' : 'none';
    
    const glowColorHex = '#' + (section.glowColor || 0xffffff).toString(16).padStart(6, '0');
    Elements.glowColorPicker.value = glowColorHex;
    Elements.glowColorInput.value = glowColorHex.toUpperCase();
    
    const glowOpacity = Math.round((section.glowOpacity !== undefined ? section.glowOpacity : 0.5) * 100);
    Elements.glowOpacitySlider.value = glowOpacity;
    Elements.glowOpacityValue.textContent = `${glowOpacity}%`;
    
    const glowStrength = section.glowStrength !== undefined ? section.glowStrength : 10;
    Elements.glowStrengthSlider.value = glowStrength;
    Elements.glowStrengthValue.textContent = `${glowStrength}px`;

    const glowBlur = section.glowBlur !== undefined ? section.glowBlur : 5;
    Elements.glowBlurSlider.value = glowBlur;
    Elements.glowBlurValue.textContent = `${glowBlur}px`;

    // Check if this is a GA section
    const isGA = section.isGeneralAdmission === true;
    
    // Show/hide sections based on section type
    if (isGA) {
      // GA section - show capacity, size controls, hide row labels, seat numbering, align rows, add rows, stretch controls, seat colors
      Elements.seatsTitle.textContent = 'Capacity';
      Elements.seatsInfo.style.display = 'none';
      Elements.capacityInput.style.display = 'block';
      Elements.gaCapacityInput.value = section.gaCapacity || 0;
      Elements.gaSizeControls.style.display = 'block';
      Elements.gaWidthInput.value = Math.round(section.contentWidth);
      Elements.gaHeightInput.value = Math.round(section.contentHeight);
      Elements.rowLabelsHeader.parentElement.style.display = 'none';
      Elements.seatNumberingSection.style.display = 'none';
      Elements.alignRowsSection.style.display = 'none';
      Elements.addRowsSection.style.display = 'none';
      Elements.stretchHSection.style.display = 'none';
      Elements.stretchVSection.style.display = 'none';
      Elements.styleHeader.parentElement.style.display = 'block';
      // Hide only seat color inputs for GA sections
      document.getElementById('seatColorSection').style.display = 'none';
      document.getElementById('seatTextColorSection').style.display = 'none';
      return; // Skip the rest of the updates
    } else {
      // Regular section - show all seat-related controls, hide GA size controls, show stretch controls
      Elements.seatsTitle.textContent = 'Seats';
      Elements.seatsInfo.style.display = 'block';
      Elements.capacityInput.style.display = 'none';
      Elements.gaSizeControls.style.display = 'none';
      Elements.rowLabelsHeader.parentElement.style.display = 'block';
      Elements.seatNumberingSection.style.display = 'block';
      Elements.alignRowsSection.style.display = 'block';
      Elements.addRowsSection.style.display = 'block';
      Elements.stretchHSection.style.display = 'block';
      Elements.stretchVSection.style.display = 'block';
      Elements.styleHeader.parentElement.style.display = 'block';
      // Show all color inputs for regular sections
      document.getElementById('seatColorSection').style.display = 'block';
      document.getElementById('seatTextColorSection').style.display = 'block';
      
      // Calculate and display actual row and seat counts
      const seatCount = section.seats ? section.seats.length : 0;
      const uniqueRows = section.seats ? new Set(section.seats.map(seat => seat.userData?.row).filter(row => row !== undefined)).size : 0;
      Elements.seatsInfo.textContent = `${uniqueRows} rows / ${seatCount} seats`;
    }
    
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
    Elements.rowLabelHidden.classList.toggle('active', section.labelsHidden || false);

    // Update row label starting point input
    if (section.rowLabelType === 'numbers') {
      Elements.rowLabelStartInput.value = section.rowLabelStart || 1;
      Elements.rowLabelStartInput.placeholder = '1';
    } else if (section.rowLabelType === 'letters') {
      Elements.rowLabelStartInput.value = section.rowLabelStart || 'A';
      Elements.rowLabelStartInput.placeholder = 'A';
    }
    Elements.rowLabelFlipBtn.classList.toggle('active', section.rowLabelReversed || false);
    
    // Update row label spacing controls
    const spacing = section.rowLabelSpacing || 20;
    if (Elements.rowLabelSpacingSlider) {
      Elements.rowLabelSpacingSlider.value = spacing;
    }
    if (Elements.rowLabelSpacingValue) {
      Elements.rowLabelSpacingValue.textContent = `${spacing}px`;
    }

    // Update row label color inputs
    const rowLabelColorHex = '#' + (section.rowLabelColor || 0xffffff).toString(16).padStart(6, '0');
    Elements.rowLabelColorPicker.value = rowLabelColorHex;
    Elements.rowLabelColorInput.value = rowLabelColorHex.toUpperCase();

    // Update seat numbering controls
    Elements.seatNumberStartInput.value = section.seatNumberStart || 1;
    Elements.seatNumberFlipBtn.classList.toggle('active', section.seatNumberReversed || false);
    
    // Update rotation slider and display value
    // Convert from 0-360 range to -180 to 180 range for the slider
    let rotation = section.rotationDegrees || 0;
    if (rotation > 180) {
      rotation = rotation - 360;
    }
    Elements.rotateSlider.value = rotation;
    Elements.rotateValue.textContent = `${rotation}°`;

    // Update curve slider and display value
    const curve = section.curve || 0;
    Elements.curveSlider.value = curve;
    Elements.curveValue.textContent = `${curve}`;

    // Update stretch sliders and display values
    const stretchH = section.stretchH || 0;
    const stretchV = section.stretchV || 0;
    Elements.stretchHSlider.value = stretchH;
    Elements.stretchHValue.textContent = `${stretchH}`;
    Elements.stretchVSlider.value = stretchV;
    Elements.stretchVValue.textContent = `${stretchV}`;
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
        // Calculate bounds at current position (accounting for pivot at center)
        const currentBounds = {
          minX: x - section.pivot.x,
          maxX: x - section.pivot.x + section.contentWidth,
          minY: y - section.pivot.y,
          maxY: y - section.pivot.y + section.contentHeight
        };
        
        const otherBounds = {
          minX: other.x - other.pivot.x,
          maxX: other.x - other.pivot.x + other.contentWidth,
          minY: other.y - other.pivot.y,
          maxY: other.y - other.pivot.y + other.contentHeight
        };
        
        // Check X-axis movement independently
        if (dx !== 0) {
          const testX = x + finalDx;
          const testBoundsX = {
            minX: testX - section.pivot.x,
            maxX: testX - section.pivot.x + section.contentWidth,
            minY: y - section.pivot.y, // Keep Y at original
            maxY: y - section.pivot.y + section.contentHeight
          };
          
          // Would moving on X-axis cause overlap?
          if (testBoundsX.maxX > otherBounds.minX && testBoundsX.minX < otherBounds.maxX &&
              testBoundsX.maxY > otherBounds.minY && testBoundsX.minY < otherBounds.maxY) {
            // Collision on X-axis - constrain X movement
            if (dx > 0) {
              const maxDx = otherBounds.minX - (x - section.pivot.x + section.contentWidth);
              finalDx = Math.min(finalDx, maxDx);
            } else {
              const maxDx = otherBounds.maxX - (x - section.pivot.x);
              finalDx = Math.max(finalDx, maxDx);
            }
          }
        }
        
        // Check Y-axis movement independently
        if (dy !== 0) {
          const testY = y + finalDy;
          const testBoundsY = {
            minX: x - section.pivot.x, // Keep X at original
            maxX: x - section.pivot.x + section.contentWidth,
            minY: testY - section.pivot.y,
            maxY: testY - section.pivot.y + section.contentHeight
          };
          
          // Would moving on Y-axis cause overlap?
          if (testBoundsY.maxX > otherBounds.minX && testBoundsY.minX < otherBounds.maxX &&
              testBoundsY.maxY > otherBounds.minY && testBoundsY.minY < otherBounds.maxY) {
            // Collision on Y-axis - constrain Y movement
            if (dy > 0) {
              const maxDy = otherBounds.minY - (y - section.pivot.y + section.contentHeight);
              finalDy = Math.min(finalDy, maxDy);
            } else {
              const maxDy = otherBounds.maxY - (y - section.pivot.y);
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
    // Calculate bounds with padding on s1 (accounting for pivot at center)
    const b1 = {
      minX: s1.x - s1.pivot.x - padding,
      maxX: s1.x - s1.pivot.x + s1.contentWidth + padding,
      minY: s1.y - s1.pivot.y - padding,
      maxY: s1.y - s1.pivot.y + s1.contentHeight + padding
    };
    
    const b2 = {
      minX: s2.x - s2.pivot.x,
      maxX: s2.x - s2.pivot.x + s2.contentWidth,
      minY: s2.y - s2.pivot.y,
      maxY: s2.y - s2.pivot.y + s2.contentHeight
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

  /**
   * Align a section, handling curve/stretch transformations properly
   * Temporarily flattens the section, aligns it, then reapplies transformations
   * @param {Section} section - The section to align
   * @param {Function} alignFunc - Function that sets the new x/y position
   */
  alignSectionWithTransforms(section, alignFunc) {
    // Store transformation values
    const savedCurve = section.curve;
    const savedStretchH = section.stretchH;
    const savedStretchV = section.stretchV;
    const hadLabels = section.rowLabels.length > 0;
    
    // Flatten section for alignment (if curved or stretched)
    if (savedCurve || savedStretchH || savedStretchV) {
      // Reset seats to base positions without modifying them
      section.seats.forEach(seat => {
        seat.relativeX = seat.baseRelativeX;
        seat.relativeY = seat.baseRelativeY;
      });
      
      // Temporarily set transformations to 0
      section.curve = 0;
      section.stretchH = 0;
      section.stretchV = 0;
      
      // Recalculate dimensions and update labels if needed
      if (hadLabels) {
        SectionManager.updateRowLabels(section);
      } else {
        SectionManager.recalculateSectionDimensions(section);
        SectionManager.positionSeatsAndLabels(section);
      }
    }
    
    // Perform the alignment on the flattened section
    alignFunc(section);
    
    // Reapply transformations
    if (savedCurve || savedStretchH || savedStretchV) {
      section.curve = savedCurve;
      section.stretchH = savedStretchH;
      section.stretchV = savedStretchV;
      
      if (savedCurve) {
        SectionManager.applyCurve(section, { skipLayout: true });
      } else {
        SectionManager.applyStretch(section, { skipLayout: true });
      }
    } else {
      this.updateSeatPositions(section);
    }
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
    
    // Step 1: Ensure transformations are applied WITHOUT layout changes
    State.selectedSections.forEach(section => {
      if (section.curve) {
        SectionManager.applyCurve(section, { skipLayout: true });
      } else if (section.stretchH || section.stretchV) {
        SectionManager.applyStretch(section, { skipLayout: true });
      }
    });
    
    // Step 2: Align sections based on their left edges
    const minX = Math.min(...State.selectedSections.map(sec => sec.x - sec.pivot.x));
    State.selectedSections.forEach(section => {
      section.x = minX + section.pivot.x;
      SectionManager.positionSeatsAndLabels(section);
    });
    
    this.resolveCollisions(State.selectedSections);
  },

  alignRight() {
    if (State.selectedSections.length < 2) return;
    
    // Step 1: Ensure transformations are applied WITHOUT layout changes
    State.selectedSections.forEach(section => {
      if (section.curve) {
        SectionManager.applyCurve(section, { skipLayout: true });
      } else if (section.stretchH || section.stretchV) {
        SectionManager.applyStretch(section, { skipLayout: true });
      }
    });
    
    // Step 2: Align sections based on their right edges
    const maxX = Math.max(...State.selectedSections.map(sec => sec.x - sec.pivot.x + sec.contentWidth));
    State.selectedSections.forEach(section => {
      section.x = maxX - section.contentWidth + section.pivot.x;
      SectionManager.positionSeatsAndLabels(section);
    });
    
    this.resolveCollisions(State.selectedSections);
  },

  alignCenterHorizontal() {
    if (State.selectedSections.length < 2) return;
    
    // Step 1: Ensure transformations are applied WITHOUT layout changes
    State.selectedSections.forEach(section => {
      if (section.curve) {
        SectionManager.applyCurve(section, { skipLayout: true });
      } else if (section.stretchH || section.stretchV) {
        SectionManager.applyStretch(section, { skipLayout: true });
      }
    });
    
    // Step 2: Align sections based on their horizontal centers
    const centers = State.selectedSections.map(sec => sec.x - sec.pivot.x + sec.contentWidth / 2);
    const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;
    State.selectedSections.forEach(section => {
      section.x = avgCenter - section.contentWidth / 2 + section.pivot.x;
      SectionManager.positionSeatsAndLabels(section);
    });
    
    this.resolveCollisions(State.selectedSections);
  },

  alignTop() {
    if (State.selectedSections.length < 2) return;
    
    // Step 1: Ensure transformations are applied WITHOUT layout changes
    State.selectedSections.forEach(section => {
      if (section.curve) {
        SectionManager.applyCurve(section, { skipLayout: true });
      } else if (section.stretchH || section.stretchV) {
        SectionManager.applyStretch(section, { skipLayout: true });
      }
    });
    
    // Step 2: Align sections based on their top edges
    const minY = Math.min(...State.selectedSections.map(sec => sec.y - sec.pivot.y));
    State.selectedSections.forEach(section => {
      section.y = minY + section.pivot.y;
      SectionManager.positionSeatsAndLabels(section);
    });
    
    this.resolveCollisions(State.selectedSections);
  },

  alignBottom() {
    if (State.selectedSections.length < 2) return;
    
    // Step 1: Ensure transformations are applied WITHOUT layout changes
    State.selectedSections.forEach(section => {
      if (section.curve) {
        SectionManager.applyCurve(section, { skipLayout: true });
      } else if (section.stretchH || section.stretchV) {
        SectionManager.applyStretch(section, { skipLayout: true });
      }
    });
    
    // Step 2: Align sections based on their bottom edges
    const maxY = Math.max(...State.selectedSections.map(sec => sec.y - sec.pivot.y + sec.contentHeight));
    State.selectedSections.forEach(section => {
      section.y = maxY - section.contentHeight + section.pivot.y;
      SectionManager.positionSeatsAndLabels(section);
    });
    
    this.resolveCollisions(State.selectedSections);
  },

  alignCenterVertical() {
    if (State.selectedSections.length < 2) return;
    
    // Step 1: Ensure transformations are applied WITHOUT layout changes
    State.selectedSections.forEach(section => {
      if (section.curve) {
        SectionManager.applyCurve(section, { skipLayout: true });
      } else if (section.stretchH || section.stretchV) {
        SectionManager.applyStretch(section, { skipLayout: true });
      }
    });
    
    // Step 2: Align sections based on their vertical centers
    const centers = State.selectedSections.map(sec => sec.y - sec.pivot.y + sec.contentHeight / 2);
    const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;
    State.selectedSections.forEach(section => {
      section.y = avgCenter - section.contentHeight / 2 + section.pivot.y;
      SectionManager.positionSeatsAndLabels(section);
    });
    
    this.resolveCollisions(State.selectedSections);
  },

  // ============================================
  // DISTRIBUTION FUNCTIONS (Using Bounding Box)
  // ============================================

  distributeHorizontally() {
    if (State.selectedSections.length < 3) return;
    
    // Sort by the left edge (accounting for pivot at center)
    const sorted = [...State.selectedSections].sort((a, b) => (a.x - a.pivot.x) - (b.x - b.pivot.x));
    
    // Keep first and last in place, distribute middle sections evenly
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    
    // Calculate available space between first and last
    const startX = (first.x - first.pivot.x) + first.contentWidth;
    const endX = last.x - last.pivot.x;
    const availableSpace = endX - startX;
    
    // Calculate total width of middle sections
    const middleSections = sorted.slice(1, -1);
    const totalMiddleWidth = middleSections.reduce((sum, s) => sum + s.contentWidth, 0);
    
    // Calculate gap size
    // Available space minus middle widths, divided by number of gaps
    const numGaps = sorted.length - 1;
    let gap = (availableSpace - totalMiddleWidth) / numGaps;
    
    // If gap is less than minimum, push last section to make room
    if (gap < this.GAP) {
      const neededSpace = (this.GAP * numGaps) + totalMiddleWidth;
      last.x = startX + neededSpace + last.pivot.x;
      this.updateSeatPositions(last);
      gap = this.GAP;
    }
    
    // Position middle sections with calculated gap
    let currentX = startX + gap;
    for (let i = 1; i < sorted.length - 1; i++) {
      sorted[i].x = currentX + sorted[i].pivot.x;
      this.updateSeatPositions(sorted[i]);
      currentX += sorted[i].contentWidth + gap;
    }
    
    // Resolve collisions for all moved sections
    this.resolveCollisions(sorted.slice(1));
  },

  distributeVertically() {
    if (State.selectedSections.length < 3) return;
    
    // Sort by the top edge (accounting for pivot at center)
    const sorted = [...State.selectedSections].sort((a, b) => (a.y - a.pivot.y) - (b.y - b.pivot.y));
    
    // Keep first and last in place, distribute middle sections evenly
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    
    // Calculate available space between first and last
    const startY = (first.y - first.pivot.y) + first.contentHeight;
    const endY = last.y - last.pivot.y;
    const availableSpace = endY - startY;
    
    // Calculate total height of middle sections
    const middleSections = sorted.slice(1, -1);
    const totalMiddleHeight = middleSections.reduce((sum, s) => sum + s.contentHeight, 0);
    
    // Calculate gap size
    // Available space minus middle heights, divided by number of gaps
    const numGaps = sorted.length - 1;
    let gap = (availableSpace - totalMiddleHeight) / numGaps;
    
    // If gap is less than minimum, push last section to make room
    if (gap < this.GAP) {
      const neededSpace = (this.GAP * numGaps) + totalMiddleHeight;
      last.y = startY + neededSpace + last.pivot.y;
      this.updateSeatPositions(last);
      gap = this.GAP;
    }
    
    // Position middle sections with calculated gap
    let currentY = startY + gap;
    for (let i = 1; i < sorted.length - 1; i++) {
      sorted[i].y = currentY + sorted[i].pivot.y;
      this.updateSeatPositions(sorted[i]);
      currentY += sorted[i].contentHeight + gap;
    }
    
    // Resolve collisions for all moved sections
    this.resolveCollisions(sorted.slice(1));
  }
};
