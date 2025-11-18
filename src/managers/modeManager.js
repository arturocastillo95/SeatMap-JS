// ============================================
// MODE MANAGER - Handle app mode switching
// ============================================

import { State } from '../core/state.js';

export const ModeManager = {
  init() {
    this.setupModeButtons();
    this.updateModeButtonStates();
    
    // Listen for selection changes to update button states
    document.addEventListener('selectionchanged', () => {
      this.updateModeButtonStates();
      this.handleSelectionChange();
    });
  },
  
  setupModeButtons() {
    const modeButtons = document.querySelectorAll('.mode-item');
    
    modeButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Don't allow clicking disabled buttons
        if (button.classList.contains('disabled')) {
          return;
        }
        
        const mode = button.getAttribute('data-mode');
        this.switchMode(mode);
      });
    });
  },
  
  updateModeButtonStates() {
    const editSeatsBtn = document.querySelector('[data-mode="seats"]');
    const pricingBtn = document.querySelector('[data-mode="pricing"]');
    
    if (!editSeatsBtn || !pricingBtn) return;
    
    // Don't update if we're already in seats mode (section is locked)
    if (State.currentMode === 'seats') {
      return;
    }
    
    // Enable Edit Seats and Pricing only if exactly one section is selected
    if (State.selectedSections.length === 1) {
      editSeatsBtn.classList.remove('disabled');
      pricingBtn.classList.remove('disabled');
    } else {
      editSeatsBtn.classList.add('disabled');
      pricingBtn.classList.add('disabled');
    }
  },

  handleSelectionChange() {
    // If in pricing mode and no section selected, exit pricing mode
    if (State.currentMode === 'pricing' && State.selectedSections.length === 0) {
      this.switchMode('schema');
    }
  },
  
  switchMode(mode) {
    // Check if trying to enter seats or pricing mode
    if (mode === 'seats' || mode === 'pricing') {
      // Require exactly one selected section
      if (State.selectedSections.length !== 1) {
        alert(`Please select a single section to ${mode === 'seats' ? 'edit its seats' : 'set pricing'}.`);
        return;
      }
    }
    
    // Update state
    const previousMode = State.currentMode;
    State.currentMode = mode;
    
    // Update UI - remove active from all, add to current
    document.querySelectorAll('.mode-item').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-mode="${mode}"]`)?.classList.add('active');
    
    // Handle mode-specific logic
    if (mode === 'seats') {
      this.enterEditSeatsMode();
      this.hidePricingSidebar();
      this.hideUnderlaySidebar();
      this.disableUnderlayInteractions();
    } else if (mode === 'pricing') {
      if (previousMode === 'seats') {
        this.exitEditSeatsMode();
      }
      this.showPricingSidebar();
      this.hideUnderlaySidebar();
      this.disableUnderlayInteractions();
    } else if (mode === 'underlay') {
      if (previousMode === 'seats') {
        this.exitEditSeatsMode();
      }
      if (previousMode === 'pricing') {
        this.hidePricingSidebar();
      }
      this.showUnderlaySidebar();
      this.enableUnderlayInteractions();
    } else {
      if (previousMode === 'seats') {
        this.exitEditSeatsMode();
      }
      if (previousMode === 'pricing') {
        this.hidePricingSidebar();
      }
      if (previousMode === 'underlay') {
        this.hideUnderlaySidebar();
        this.disableUnderlayInteractions();
      }
    }
    
    console.log(`Switched to mode: ${mode}`);
  },
  
  enterEditSeatsMode() {
    State.isEditSeatsMode = true;
    
    // Store the active section for editing
    State.activeSectionForSeats = State.selectedSections[0];
    
    // Keep the section selected and visible
    // But hide alignment bar and sidebar
    document.getElementById('alignBar').classList.remove('show');
    document.getElementById('sectionSidebar').classList.remove('show');
    
    // Disable section interactions (prevent deselection)
    State.activeSectionForSeats.eventMode = 'none';
    
    // Dim all other sections
    State.sections.forEach(section => {
      if (section !== State.activeSectionForSeats) {
        section.alpha = 0.3;
        section.eventMode = 'none'; // Disable interactions
        section.seats.forEach(seat => {
          seat.eventMode = 'none';
          seat.cursor = 'default';
        });
      }
    });
    
    // Make only the active section's seats interactive
    State.activeSectionForSeats.seats.forEach(seat => {
      seat.cursor = 'pointer';
      seat.eventMode = 'static';
    });
    
    console.log(`✓ Entered Edit Seats mode for: ${State.activeSectionForSeats.sectionId}`);
  },
  
  exitEditSeatsMode() {
    State.isEditSeatsMode = false;
    
    // Clear seat selection
    this.deselectAllSeats();
    
    // Restore all sections to normal state
    State.sections.forEach(section => {
      section.alpha = 1.0;
      section.eventMode = 'static';
      section.seats.forEach(seat => {
        seat.eventMode = 'static';
        seat.cursor = 'pointer';
        // Ensure all seats are unhighlighted
        this.highlightSeat(seat, false);
      });
    });
    
    // Keep the section selected (don't clear selection)
    // The section that was being edited remains selected
    
    // Clear active section reference
    State.activeSectionForSeats = null;
    
    console.log('✓ Exited Edit Seats mode');
  },
  
  selectSeat(seat) {
    // Only allow selection if seat belongs to active section
    if (State.activeSectionForSeats && 
        !State.activeSectionForSeats.seats.includes(seat)) {
      return;
    }
    
    if (!State.selectedSeats.includes(seat)) {
      State.selectedSeats.push(seat);
      this.highlightSeat(seat, true);
    }
  },
  
  deselectSeat(seat) {
    const index = State.selectedSeats.indexOf(seat);
    if (index > -1) {
      State.selectedSeats.splice(index, 1);
      this.highlightSeat(seat, false);
    }
  },
  
  deselectAllSeats() {
    State.selectedSeats.forEach(seat => {
      this.highlightSeat(seat, false);
    });
    State.selectedSeats = [];
  },
  
  highlightSeat(seat, selected) {
    // Find the circle graphics in the seat container
    const circle = seat.children[0]; // First child is the circle
    if (circle) {
      if (selected) {
        circle.tint = 0x00ff00; // Green tint for selected seats
      } else {
        circle.tint = 0xffffff; // White (default)
      }
    }
  },
  
  deleteSelectedSeats() {
    if (State.selectedSeats.length === 0) return;
    
    const count = State.selectedSeats.length;
    
    // Remove seats from their sections and from the stage
    State.selectedSeats.forEach(seat => {
      // Find parent section
      State.sections.forEach(section => {
        const index = section.seats.indexOf(seat);
        if (index > -1) {
          section.seats.splice(index, 1);
        }
      });
      
      // Remove from display
      State.seatLayer.removeChild(seat);
      seat.destroy();
    });
    
    // Clear selection
    State.selectedSeats = [];
    
    console.log(`✓ Deleted ${count} seat(s)`);
  },

  showPricingSidebar() {
    const pricingSidebar = document.getElementById('pricingSidebar');
    if (pricingSidebar) {
      pricingSidebar.classList.add('show');
      
      // Load pricing data for the selected section
      const section = State.selectedSections[0];
      this.loadPricingData(section);
    }
  },

  hidePricingSidebar() {
    const pricingSidebar = document.getElementById('pricingSidebar');
    if (pricingSidebar) {
      pricingSidebar.classList.remove('show');
    }
  },

  loadPricingData(section) {
    // Initialize pricing data if it doesn't exist
    if (!section.pricing) {
      section.pricing = {
        basePrice: 0,
        serviceFee: 0,
        serviceFeeEnabled: false,
        serviceFeeType: 'fixed' // 'fixed' or 'percent'
      };
    }

    // Update the UI
    const basePriceInput = document.getElementById('pricingBasePrice');
    const serviceFeeInput = document.getElementById('pricingServiceFee');
    const serviceFeeToggle = document.getElementById('pricingServiceFeeToggle');
    const serviceFeeInputs = document.getElementById('serviceFeeInputs');
    const serviceFeeFixed = document.getElementById('serviceFeeFixed');
    const serviceFeePercent = document.getElementById('serviceFeePercent');

    if (basePriceInput) basePriceInput.value = section.pricing.basePrice || 0;
    if (serviceFeeInput) serviceFeeInput.value = section.pricing.serviceFee || 0;
    if (serviceFeeToggle) serviceFeeToggle.checked = section.pricing.serviceFeeEnabled || false;
    
    // Show/hide service fee inputs based on toggle
    if (serviceFeeInputs) {
      serviceFeeInputs.style.display = section.pricing.serviceFeeEnabled ? 'block' : 'none';
    }
    
    // Set service fee type buttons
    const feeType = section.pricing.serviceFeeType || 'fixed';
    if (serviceFeeFixed && serviceFeePercent) {
      if (feeType === 'fixed') {
        serviceFeeFixed.classList.add('active');
        serviceFeePercent.classList.remove('active');
      } else {
        serviceFeeFixed.classList.remove('active');
        serviceFeePercent.classList.add('active');
      }
    }
    
    this.updateServiceFeeUnit(feeType);
    this.updateTotalPrice();
  },

  savePricingData() {
    if (State.selectedSections.length !== 1) return;
    
    const section = State.selectedSections[0];
    const basePriceInput = document.getElementById('pricingBasePrice');
    const serviceFeeInput = document.getElementById('pricingServiceFee');
    const serviceFeeToggle = document.getElementById('pricingServiceFeeToggle');
    const serviceFeeFixed = document.getElementById('serviceFeeFixed');

    if (!section.pricing) {
      section.pricing = {};
    }

    section.pricing.basePrice = parseFloat(basePriceInput.value) || 0;
    section.pricing.serviceFee = parseFloat(serviceFeeInput.value) || 0;
    section.pricing.serviceFeeEnabled = serviceFeeToggle.checked;
    section.pricing.serviceFeeType = serviceFeeFixed.classList.contains('active') ? 'fixed' : 'percent';

    console.log(`✓ Saved pricing for ${section.sectionId}:`, section.pricing);
  },

  updateTotalPrice() {
    const basePriceInput = document.getElementById('pricingBasePrice');
    const serviceFeeInput = document.getElementById('pricingServiceFee');
    const serviceFeeToggle = document.getElementById('pricingServiceFeeToggle');
    const serviceFeeFixed = document.getElementById('serviceFeeFixed');
    const totalPriceDisplay = document.getElementById('pricingTotalPrice');

    if (!totalPriceDisplay) return;

    const basePrice = parseFloat(basePriceInput.value) || 0;
    const serviceFeeValue = parseFloat(serviceFeeInput.value) || 0;
    const serviceFeeEnabled = serviceFeeToggle.checked;
    const isFixed = serviceFeeFixed.classList.contains('active');

    let serviceFeeAmount = 0;
    if (serviceFeeEnabled) {
      if (isFixed) {
        serviceFeeAmount = serviceFeeValue;
      } else {
        // Percentage
        serviceFeeAmount = (basePrice * serviceFeeValue) / 100;
      }
    }

    const total = basePrice + serviceFeeAmount;
    totalPriceDisplay.textContent = `$${total.toFixed(2)}`;
  },

  updateServiceFeeUnit(type) {
    const serviceFeeUnit = document.getElementById('serviceFeeUnit');
    if (serviceFeeUnit) {
      serviceFeeUnit.textContent = type === 'fixed' ? '$' : '%';
    }
  },

  toggleServiceFeeType(type) {
    const serviceFeeFixed = document.getElementById('serviceFeeFixed');
    const serviceFeePercent = document.getElementById('serviceFeePercent');

    if (type === 'fixed') {
      serviceFeeFixed.classList.add('active');
      serviceFeePercent.classList.remove('active');
    } else {
      serviceFeeFixed.classList.remove('active');
      serviceFeePercent.classList.add('active');
    }

    this.updateServiceFeeUnit(type);
    this.savePricingData();
    this.updateTotalPrice();
  },

  // ============================================
  // UNDERLAY MODE
  // ============================================

  showUnderlaySidebar() {
    const underlaySidebar = document.getElementById('underlaySidebar');
    if (underlaySidebar) {
      underlaySidebar.classList.add('show');
    }
  },

  hideUnderlaySidebar() {
    const underlaySidebar = document.getElementById('underlaySidebar');
    if (underlaySidebar) {
      underlaySidebar.classList.remove('show');
    }
  },

  enableUnderlayInteractions() {
    // Dynamically import UnderlayManager
    import('./UnderlayManager.js').then(module => {
      module.UnderlayManager.enableInteractions();
      module.UnderlayManager.addResizeHandles();
    });
  },

  disableUnderlayInteractions() {
    // Dynamically import UnderlayManager
    import('./UnderlayManager.js').then(module => {
      module.UnderlayManager.disableInteractions();
      module.UnderlayManager.removeResizeHandles();
    });
  }
};
