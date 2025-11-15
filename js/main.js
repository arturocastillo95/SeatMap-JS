// ============================================
// MAIN APPLICATION
// ============================================

import { State, Elements } from './state.js';
import { CONFIG } from './config.js';
import { setupGrid, setupExampleSection } from './sceneSetup.js';
import { ToolManager } from './toolManager.js';
import { InteractionManager } from './interactionManager.js';
import { AlignmentManager } from './alignmentManager.js';
import { FileManager } from './fileManager.js';
import { ModeManager } from './modeManager.js';

async function initializeApp() {
  State.app = new PIXI.Application();
  State.world = new PIXI.Container();
  State.gridLayer = new PIXI.Container();
  State.sectionLayer = new PIXI.Container();
  State.seatLayer = new PIXI.Container();

  await State.app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    antialias: true,
    background: CONFIG.BACKGROUND,
  });

  // Add layers in correct z-order: grid -> sections -> seats
  State.app.stage.addChild(State.world);
  State.world.addChild(State.gridLayer);
  State.world.addChild(State.sectionLayer);
  State.world.addChild(State.seatLayer);
  
  State.world.position.set(80, 60);
  State.world.scale.set(1);
  
  document.getElementById('app').appendChild(State.app.canvas);
}

function initializeElements() {
  Elements.app = document.getElementById('app');
  Elements.tooltip = document.getElementById('tooltip');
  Elements.dragInfo = document.getElementById('dragInfo');
  Elements.selectToolBtn = document.getElementById('selectToolBtn');
  Elements.panToolBtn = document.getElementById('panToolBtn');
  Elements.zoomToFitBtn = document.getElementById('zoomToFitBtn');
  Elements.createBtn = document.getElementById('createSectionBtn');
  Elements.openBtn = document.getElementById('openBtn');
  Elements.saveBtn = document.getElementById('saveBtn');
  Elements.fileInput = document.getElementById('fileInput');
  Elements.confirmBox = document.getElementById('confirmBox');
  Elements.confirmInfo = document.getElementById('confirmInfo');
  Elements.confirmKeep = document.getElementById('confirmKeep');
  Elements.confirmDelete = document.getElementById('confirmDelete');
  Elements.deleteConfirmBox = document.getElementById('deleteConfirmBox');
  Elements.deleteConfirmInfo = document.getElementById('deleteConfirmInfo');
  Elements.deleteConfirmYes = document.getElementById('deleteConfirmYes');
  Elements.deleteConfirmNo = document.getElementById('deleteConfirmNo');
  Elements.alignBar = document.getElementById('alignBar');
  Elements.alignLeftBtn = document.getElementById('alignLeftBtn');
  Elements.alignCenterHBtn = document.getElementById('alignCenterHBtn');
  Elements.alignRightBtn = document.getElementById('alignRightBtn');
  Elements.alignTopBtn = document.getElementById('alignTopBtn');
  Elements.alignCenterVBtn = document.getElementById('alignCenterVBtn');
  Elements.alignBottomBtn = document.getElementById('alignBottomBtn');
  Elements.distributeHBtn = document.getElementById('distributeHBtn');
  Elements.distributeVBtn = document.getElementById('distributeVBtn');
  Elements.sectionSidebar = document.getElementById('sectionSidebar');
  Elements.sectionNameInput = document.getElementById('sectionNameInput');
  Elements.contextMenu = document.getElementById('contextMenu');
  Elements.contextEditSeats = document.getElementById('contextEditSeats');
  Elements.contextDeleteSection = document.getElementById('contextDeleteSection');
  Elements.rowLabelsHeader = document.getElementById('rowLabelsHeader');
  Elements.rowLabelsContent = document.getElementById('rowLabelsContent');
  Elements.outlineHeader = document.getElementById('outlineHeader');
  Elements.outlineContent = document.getElementById('outlineContent');
  Elements.seatsHeader = document.getElementById('seatsHeader');
  Elements.seatsContent = document.getElementById('seatsContent');
  Elements.seatNumberingHeader = document.getElementById('seatNumberingHeader');
  Elements.seatNumberingContent = document.getElementById('seatNumberingContent');
  Elements.rowLabelNone = document.getElementById('rowLabelNone');
  Elements.rowLabelNumbers = document.getElementById('rowLabelNumbers');
  Elements.rowLabelLetters = document.getElementById('rowLabelLetters');
  Elements.rowLabelLeft = document.getElementById('rowLabelLeft');
  Elements.rowLabelRight = document.getElementById('rowLabelRight');
  Elements.rowLabelHidden = document.getElementById('rowLabelHidden');
  Elements.rowLabelPositionSection = document.getElementById('rowLabelPositionSection');
  Elements.rowLabelStartInput = document.getElementById('rowLabelStartInput');
  Elements.rowLabelFlipBtn = document.getElementById('rowLabelFlipBtn');
  Elements.seatNumberStartInput = document.getElementById('seatNumberStartInput');
  Elements.seatNumberFlipBtn = document.getElementById('seatNumberFlipBtn');
  Elements.rotateSlider = document.getElementById('rotateSlider');
  Elements.rotateValue = document.getElementById('rotateValue');
  Elements.resetRotateBtn = document.getElementById('resetRotateBtn');
  Elements.curveSlider = document.getElementById('curveSlider');
  Elements.curveValue = document.getElementById('curveValue');
  Elements.resetCurveBtn = document.getElementById('resetCurveBtn');
  Elements.stretchHSlider = document.getElementById('stretchHSlider');
  Elements.stretchHValue = document.getElementById('stretchHValue');
  Elements.resetStretchHBtn = document.getElementById('resetStretchHBtn');
  Elements.stretchVSlider = document.getElementById('stretchVSlider');
  Elements.stretchVValue = document.getElementById('stretchVValue');
  Elements.resetStretchVBtn = document.getElementById('resetStretchVBtn');
  Elements.sectionColorPicker = document.getElementById('sectionColorPicker');
  Elements.sectionColorInput = document.getElementById('sectionColorInput');
}

function setupResizeHandler() {
  window.addEventListener('resize', () => {
    if (State.app?.renderer) {
      State.app.renderer.resize(window.innerWidth, window.innerHeight);
    }
  });
}

function setupFileHandlers() {
  // Open button
  Elements.openBtn.addEventListener('click', async () => {
    try {
      await FileManager.open(Elements.fileInput);
    } catch (error) {
      if (error.message !== 'No file selected') {
        console.error('Error opening file:', error);
      }
    }
  });
  
  // Save button
  Elements.saveBtn.addEventListener('click', () => {
    FileManager.save();
  });
}

function setupCollapsibleSections() {
  // Helper function to toggle accordion collapse
  const toggleAccordion = (header, body) => {
    if (!header || !body) return; // Skip if elements don't exist
    
    header.addEventListener('click', () => {
      const icon = header.querySelector('.sidebar-accordion-chevron');
      
      if (body.style.display === 'none') {
        body.style.display = 'block';
        header.classList.add('is-open');
        if (icon) icon.textContent = 'expand_more';
      } else {
        body.style.display = 'none';
        header.classList.remove('is-open');
        if (icon) icon.textContent = 'chevron_right';
      }
    });
  };

  // Apply to accordion sections
  toggleAccordion(Elements.rowLabelsHeader, Elements.rowLabelsContent);
  toggleAccordion(Elements.outlineHeader, Elements.outlineContent);
  toggleAccordion(Elements.seatsHeader, Elements.seatsContent);
  toggleAccordion(Elements.seatNumberingHeader, Elements.seatNumberingContent);
}

function setupContextMenu() {
  // Edit Seats option
  Elements.contextEditSeats.addEventListener('click', () => {
    if (State.contextMenuSection) {
      ModeManager.enterEditSeatsMode(State.contextMenuSection);
      Elements.contextMenu.classList.remove('show');
      State.contextMenuSection = null;
    }
  });

  // Delete Section option
  Elements.contextDeleteSection.addEventListener('click', () => {
    if (State.contextMenuSection) {
      Elements.contextMenu.classList.remove('show');
      State.contextMenuSection = null;
      
      // Show the delete confirmation dialog (same as backspace)
      ToolManager.showDeleteConfirmation();
    }
  });
  
  // Prevent context menu from browser
  State.app.canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
}

function setupPricingHandlers() {
  const basePriceInput = document.getElementById('pricingBasePrice');
  const serviceFeeInput = document.getElementById('pricingServiceFee');
  const serviceFeeToggle = document.getElementById('pricingServiceFeeToggle');
  const serviceFeeInputs = document.getElementById('serviceFeeInputs');
  const serviceFeeFixed = document.getElementById('serviceFeeFixed');
  const serviceFeePercent = document.getElementById('serviceFeePercent');

  if (basePriceInput) {
    basePriceInput.addEventListener('input', () => {
      ModeManager.savePricingData();
      ModeManager.updateTotalPrice();
    });
  }

  if (serviceFeeInput) {
    serviceFeeInput.addEventListener('input', () => {
      ModeManager.savePricingData();
      ModeManager.updateTotalPrice();
    });
  }

  if (serviceFeeToggle) {
    serviceFeeToggle.addEventListener('change', () => {
      // Show/hide service fee inputs
      if (serviceFeeInputs) {
        serviceFeeInputs.style.display = serviceFeeToggle.checked ? 'block' : 'none';
      }
      ModeManager.savePricingData();
      ModeManager.updateTotalPrice();
    });
  }

  if (serviceFeeFixed) {
    serviceFeeFixed.addEventListener('click', () => {
      ModeManager.toggleServiceFeeType('fixed');
    });
  }

  if (serviceFeePercent) {
    serviceFeePercent.addEventListener('click', () => {
      ModeManager.toggleServiceFeeType('percent');
    });
  }
}

// Start the application
(async () => {
  await initializeApp();
  initializeElements();
  setupGrid();
  // setupExampleSection();
  ToolManager.init();
  InteractionManager.init();
  AlignmentManager.init();
  ModeManager.init();
  setupResizeHandler();
  setupFileHandlers();
  setupCollapsibleSections();
  setupContextMenu();
  setupPricingHandlers();
})();
