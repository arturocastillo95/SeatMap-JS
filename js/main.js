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
  Elements.rowLabelNone = document.getElementById('rowLabelNone');
  Elements.rowLabelNumbers = document.getElementById('rowLabelNumbers');
  Elements.rowLabelLetters = document.getElementById('rowLabelLetters');
  Elements.rowLabelLeft = document.getElementById('rowLabelLeft');
  Elements.rowLabelRight = document.getElementById('rowLabelRight');
  Elements.rowLabelPositionSection = document.getElementById('rowLabelPositionSection');
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
})();
