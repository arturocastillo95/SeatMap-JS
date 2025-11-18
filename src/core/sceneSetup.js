// ============================================
// SCENE SETUP (GRID AND EXAMPLE SECTION)
// ============================================

import { State } from './state.js';
import { CONFIG, VISUAL_CONFIG, COLORS } from './config.js';
import { SectionManager } from '../managers/sectionManager.js';

export function setupGrid() {
  const grid = new PIXI.Graphics();
  
  for (let i = -CONFIG.GRID_COUNT; i <= CONFIG.GRID_COUNT; i++) {
    grid.moveTo(i * CONFIG.GRID_SIZE, -CONFIG.GRID_COUNT * CONFIG.GRID_SIZE);
    grid.lineTo(i * CONFIG.GRID_SIZE, CONFIG.GRID_COUNT * CONFIG.GRID_SIZE);
    grid.moveTo(-CONFIG.GRID_COUNT * CONFIG.GRID_SIZE, i * CONFIG.GRID_SIZE);
    grid.lineTo(CONFIG.GRID_COUNT * CONFIG.GRID_SIZE, i * CONFIG.GRID_SIZE);
  }
  
  grid.stroke({ width: 1, color: COLORS.GRID, alpha: 0.6 });
  State.gridLayer.addChild(grid);
}

export function setupExampleSection() {
  const section = new PIXI.Graphics();
  section.poly([150, 150, 550, 150, 520, 350, 180, 350]);
  section.fill({ color: COLORS.SECTION_FILL, alpha: VISUAL_CONFIG.SECTION.FILL_ALPHA });
  section.stroke({ width: VISUAL_CONFIG.SECTION.STROKE_WIDTH, color: COLORS.SECTION_STROKE, alpha: VISUAL_CONFIG.SECTION.STROKE_ALPHA });
  section.eventMode = 'static';
  section.cursor = 'pointer';
  section.sectionId = 'Orchestra A';
  section.seats = [];
  
  // Create label for the section
  SectionManager.createSectionLabel(section);
  
  SectionManager.setupSectionInteractions(section);
  State.sectionLayer.addChild(section);
  State.sections.push(section);
  
  // Create trapezoid-shaped seating
  const MARGIN = 25;
  const SEAT_SPACING = 24;
  const ROW_SPACING = 24;
  const topY = 150 + MARGIN;
  const bottomY = 350 - MARGIN;
  const topLeftX = 150 + MARGIN;
  const topRightX = 550 - MARGIN;
  const bottomLeftX = 180 + MARGIN;
  const bottomRightX = 520 - MARGIN;
  const totalRows = Math.floor((bottomY - topY) / ROW_SPACING);
  
  for (let row = 0; row < totalRows; row++) {
    const rowProgress = row / (totalRows - 1);
    const y = topY + row * ROW_SPACING;
    const leftX = topLeftX + (bottomLeftX - topLeftX) * rowProgress;
    const rightX = topRightX + (bottomRightX - topRightX) * rowProgress;
    const availableWidth = rightX - leftX;
    const maxSeats = Math.floor((availableWidth + SEAT_SPACING) / SEAT_SPACING);
    const actualSpacing = availableWidth / (maxSeats - 1);
    
    for (let seatIndex = 0; seatIndex < maxSeats; seatIndex++) {
      const seatNumber = seatIndex + 1; // Number per row (1, 2, 3...)
      
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
      
      seatContainer.x = leftX + seatIndex * actualSpacing;
      seatContainer.y = y;
      seatContainer.eventMode = 'static';
      seatContainer.cursor = 'pointer';
      seatContainer.seatId = `${section.sectionId}-R${row + 1}S${seatNumber}`;
      seatContainer.seatNumber = seatNumber;
      
      SectionManager.setupSeatInteractions(seatContainer);
      State.seatLayer.addChild(seatContainer);
      section.seats.push(seatContainer);
    }
  }
}
