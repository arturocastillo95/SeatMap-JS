// ============================================
// MODE MANAGER - Handle app mode switching
// ============================================

import { State } from './state.js';

export const ModeManager = {
  init() {
    this.setupModeButtons();
  },
  
  setupModeButtons() {
    const modeButtons = document.querySelectorAll('.mode-item');
    
    modeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const mode = button.getAttribute('data-mode');
        this.switchMode(mode);
      });
    });
  },
  
  switchMode(mode) {
    // Check if trying to enter seats mode
    if (mode === 'seats') {
      // Require exactly one selected section
      if (State.selectedSections.length !== 1) {
        alert('Please select a single section to edit its seats.');
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
    } else if (previousMode === 'seats') {
      this.exitEditSeatsMode();
    }
    
    console.log(`Switched to mode: ${mode}`);
  },
  
  enterEditSeatsMode() {
    State.isEditSeatsMode = true;
    
    // Store the active section for editing
    State.activeSectionForSeats = State.selectedSections[0];
    
    // Keep the section selected and visible
    // But hide alignment bar
    document.getElementById('alignBar').classList.remove('show');
    document.getElementById('sectionSidebar').classList.remove('show');
    
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
      });
    });
    
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
  }
};
