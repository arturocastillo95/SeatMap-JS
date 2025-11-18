// ============================================
// MAIN APPLICATION
// ============================================

import { State, Elements } from '../src/core/state.js';
import { CONFIG } from '../src/core/config.js';
import { setupGrid, setupExampleSection } from '../src/core/sceneSetup.js';
import { ToolManager } from '../src/managers/toolManager.js';
import { InteractionManager } from '../src/managers/interactionManager.js';
import { AlignmentManager } from '../src/managers/alignmentManager.js';
import { FileManager } from '../src/managers/fileManager.js';
import { ModeManager } from '../src/managers/modeManager.js';
import { UnderlayManager } from '../src/managers/UnderlayManager.js';

async function initializeApp() {
  State.app = new PIXI.Application();
  State.world = new PIXI.Container();
  State.gridLayer = new PIXI.Container();
  State.underlayLayer = new PIXI.Container();
  State.sectionLayer = new PIXI.Container();
  State.seatLayer = new PIXI.Container();

  await State.app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    antialias: true,
    background: CONFIG.BACKGROUND,
  });

  // Add layers in correct z-order: grid -> underlay -> sections -> seats
  State.app.stage.addChild(State.world);
  State.world.addChild(State.gridLayer);
  State.world.addChild(State.underlayLayer);
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
  Elements.createGABtn = document.getElementById('createGABtn');
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
  Elements.seatsSection = document.getElementById('seatsSection');
  Elements.seatsTitle = document.getElementById('seatsTitle');
  Elements.seatsInfo = document.getElementById('seatsInfo');
  Elements.capacityInput = document.getElementById('capacityInput');
  Elements.gaCapacityInput = document.getElementById('gaCapacityInput');
  Elements.seatNumberingSection = document.getElementById('seatNumberingSection');
  Elements.seatNumberingHeader = document.getElementById('seatNumberingHeader');
  Elements.seatNumberingContent = document.getElementById('seatNumberingContent');
  Elements.alignRowsSection = document.getElementById('alignRowsSection');
  Elements.addRowsSection = document.getElementById('addRowsSection');
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
  Elements.stretchHSection = document.getElementById('stretchHSection');
  Elements.stretchVSlider = document.getElementById('stretchVSlider');
  Elements.stretchVValue = document.getElementById('stretchVValue');
  Elements.resetStretchVBtn = document.getElementById('resetStretchVBtn');
  Elements.stretchVSection = document.getElementById('stretchVSection');
  Elements.sectionColorPicker = document.getElementById('sectionColorPicker');
  Elements.sectionColorInput = document.getElementById('sectionColorInput');
  Elements.gaSizeControls = document.getElementById('gaSizeControls');
  Elements.gaWidthInput = document.getElementById('gaWidthInput');
  Elements.gaHeightInput = document.getElementById('gaHeightInput');
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

function setupUnderlayHandlers() {
  const underlayFileInput = document.getElementById('underlayFileInput');
  const underlayUploadBtn = document.getElementById('underlayUploadBtn');
  const underlayUrlInput = document.getElementById('underlayUrlInput');
  const underlayLoadUrlBtn = document.getElementById('underlayLoadUrlBtn');
  const underlayOpacitySlider = document.getElementById('underlayOpacitySlider');
  const underlayOpacityValue = document.getElementById('underlayOpacityValue');
  const underlayScaleSlider = document.getElementById('underlayScaleSlider');
  const underlayScaleValue = document.getElementById('underlayScaleValue');
  const underlayResetScaleBtn = document.getElementById('underlayResetScaleBtn');
  const underlayXInput = document.getElementById('underlayXInput');
  const underlayYInput = document.getElementById('underlayYInput');
  const underlayVisibleBtn = document.getElementById('underlayVisibleBtn');
  const underlayClearBtn = document.getElementById('underlayClearBtn');
  const underlayControls = document.getElementById('underlayControls');
  const underlayFileInfo = document.getElementById('underlayFileInfo');

  // Upload button - trigger file input
  if (underlayUploadBtn && underlayFileInput) {
    underlayUploadBtn.addEventListener('click', () => {
      underlayFileInput.click();
    });
  }

  // File input change - load image
  if (underlayFileInput) {
    underlayFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          await UnderlayManager.loadImage(file);
          // UI updates handled by 'underlayLoaded' event
        } catch (error) {
          alert(error.message);
        }
      }
      // Reset input so same file can be loaded again
      underlayFileInput.value = '';
    });
  }

  // Load from URL button
  if (underlayLoadUrlBtn && underlayUrlInput) {
    underlayLoadUrlBtn.addEventListener('click', async () => {
      const url = underlayUrlInput.value.trim();
      if (!url) {
        alert('Please enter an image URL');
        return;
      }

      try {
        underlayLoadUrlBtn.disabled = true;
        underlayLoadUrlBtn.querySelector('.material-symbols').textContent = 'hourglass_empty';
        
        await UnderlayManager.loadImageFromURL(url);
        // UI updates handled by 'underlayLoaded' event
        
        // Clear input after successful load
        underlayUrlInput.value = '';
      } catch (error) {
        alert(error.message);
      } finally {
        underlayLoadUrlBtn.disabled = false;
        underlayLoadUrlBtn.querySelector('.material-symbols').textContent = 'download';
      }
    });

    // Also allow Enter key to load URL
    underlayUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        underlayLoadUrlBtn.click();
      }
    });
  }

  // Opacity slider
  if (underlayOpacitySlider && underlayOpacityValue) {
    underlayOpacitySlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      underlayOpacityValue.textContent = `${value}%`;
      UnderlayManager.setOpacity(value / 100);
    });
  }

  // Scale slider
  if (underlayScaleSlider && underlayScaleValue) {
    underlayScaleSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      underlayScaleValue.textContent = `${value}%`;
      UnderlayManager.setScale(value / 100);
    });
  }

  // Reset scale button
  if (underlayResetScaleBtn && underlayScaleSlider && underlayScaleValue) {
    underlayResetScaleBtn.addEventListener('click', () => {
      underlayScaleSlider.value = 100;
      underlayScaleValue.textContent = '100%';
      UnderlayManager.setScale(1);
    });
  }

  // Position inputs
  if (underlayXInput) {
    underlayXInput.addEventListener('input', (e) => {
      const x = parseInt(e.target.value) || 0;
      const y = parseInt(underlayYInput?.value) || 0;
      UnderlayManager.setPosition(x, y);
    });
  }

  if (underlayYInput) {
    underlayYInput.addEventListener('input', (e) => {
      const y = parseInt(e.target.value) || 0;
      const x = parseInt(underlayXInput?.value) || 0;
      UnderlayManager.setPosition(x, y);
    });
  }

  // Visibility toggle
  if (underlayVisibleBtn) {
    underlayVisibleBtn.addEventListener('click', () => {
      const isVisible = !State.underlayVisible;
      UnderlayManager.setVisible(isVisible);
      
      if (isVisible) {
        underlayVisibleBtn.classList.add('active');
        underlayVisibleBtn.querySelector('span:last-child').textContent = 'Visible';
        underlayVisibleBtn.querySelector('.material-symbols').textContent = 'visibility';
      } else {
        underlayVisibleBtn.classList.remove('active');
        underlayVisibleBtn.querySelector('span:last-child').textContent = 'Hidden';
        underlayVisibleBtn.querySelector('.material-symbols').textContent = 'visibility_off';
      }
    });
  }

  // Clear button
  if (underlayClearBtn) {
    underlayClearBtn.addEventListener('click', () => {
      if (confirm('Remove the underlay image?')) {
        UnderlayManager.clear();
      }
    });
  }

  // Listen for underlay loaded event
  document.addEventListener('underlayLoaded', (e) => {
    if (underlayControls && underlayFileInfo) {
      underlayControls.style.display = 'block';
      underlayFileInfo.style.display = 'block';
      underlayFileInfo.textContent = `${e.detail.fileName} (${e.detail.width}×${e.detail.height})`;
    }
  });

  // Listen for underlay cleared event
  document.addEventListener('underlayCleared', () => {
    if (underlayControls && underlayFileInfo) {
      underlayControls.style.display = 'none';
      underlayFileInfo.style.display = 'none';
      underlayFileInfo.textContent = 'No image loaded';
    }
    
    // Reset controls to defaults
    if (underlayOpacitySlider && underlayOpacityValue) {
      underlayOpacitySlider.value = 50;
      underlayOpacityValue.textContent = '50%';
    }
    if (underlayScaleSlider && underlayScaleValue) {
      underlayScaleSlider.value = 100;
      underlayScaleValue.textContent = '100%';
    }
    if (underlayXInput) underlayXInput.value = '0';
    if (underlayYInput) underlayYInput.value = '0';
    if (underlayVisibleBtn) {
      underlayVisibleBtn.classList.add('active');
      underlayVisibleBtn.querySelector('span:last-child').textContent = 'Visible';
      underlayVisibleBtn.querySelector('.material-symbols').textContent = 'visibility';
    }
  });

  // Listen for position changes from drag
  document.addEventListener('underlayPositionChanged', (e) => {
    if (underlayXInput) underlayXInput.value = e.detail.x;
    if (underlayYInput) underlayYInput.value = e.detail.y;
  });

  // Listen for scale changes from resize
  document.addEventListener('underlayScaleChanged', (e) => {
    if (underlayScaleSlider && underlayScaleValue) {
      underlayScaleSlider.value = e.detail.scale;
      underlayScaleValue.textContent = `${e.detail.scale}%`;
    }
  });
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
  UnderlayManager.init();
  setupResizeHandler();
  setupFileHandlers();
  setupCollapsibleSections();
  setupContextMenu();
  setupPricingHandlers();
  setupUnderlayHandlers();
})();
