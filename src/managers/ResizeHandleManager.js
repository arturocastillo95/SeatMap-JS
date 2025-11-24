// ============================================
// RESIZE HANDLE MANAGER - GA section resize handles
// ============================================

import { State } from '../core/state.js';
import { VISUAL_CONFIG } from '../core/config.js';
import { Utils } from '../core/utils.js';

/**
 * Manager for GA section resize handles
 * Responsible for: Handle creation, positioning, interactions
 */
export const ResizeHandleManager = {
  /**
   * Add resize handles to a GA section
   * @param {Section} section - The GA section
   */
  addResizeHandles(section) {
    if (!section.isGeneralAdmission && !section.isZone) return;
    
    // Remove existing handles first to avoid duplicates
    if (section.resizeHandles) {
      this.removeResizeHandles(section);
    }
    
    const handleSize = VISUAL_CONFIG.HANDLE.SIZE;
    const hitAreaSize = VISUAL_CONFIG.HANDLE.HIT_AREA_SIZE;
    const handleColor = VISUAL_CONFIG.HANDLE.COLOR;
    const offset = VISUAL_CONFIG.SELECTION.BORDER_OFFSET;
    
    const positions = [
      { x: -offset, y: -offset, cursor: 'nwse-resize', corner: 'nw' }, // Top-left
      { x: section.contentWidth / 2, y: -offset, cursor: 'ns-resize', corner: 'n' }, // Top-center
      { x: section.contentWidth + offset, y: -offset, cursor: 'nesw-resize', corner: 'ne' }, // Top-right
      { x: section.contentWidth + offset, y: section.contentHeight / 2, cursor: 'ew-resize', corner: 'e' }, // Middle-right
      { x: section.contentWidth + offset, y: section.contentHeight + offset, cursor: 'nwse-resize', corner: 'se' }, // Bottom-right
      { x: section.contentWidth / 2, y: section.contentHeight + offset, cursor: 'ns-resize', corner: 's' }, // Bottom-center
      { x: -offset, y: section.contentHeight + offset, cursor: 'nesw-resize', corner: 'sw' }, // Bottom-left
      { x: -offset, y: section.contentHeight / 2, cursor: 'ew-resize', corner: 'w' } // Middle-left
    ];
    
    section.resizeHandles = [];
    
    positions.forEach(pos => {
      const handle = new PIXI.Graphics();
      handle.rect(-handleSize / 2, -handleSize / 2, handleSize, handleSize);
      handle.fill({ color: handleColor });
      handle.stroke({ width: VISUAL_CONFIG.HANDLE.STROKE_WIDTH, color: VISUAL_CONFIG.HANDLE.STROKE_COLOR });
      handle.eventMode = 'static';
      handle.cursor = pos.cursor;
      handle.corner = pos.corner;
      
      // Add larger hit area for easier interaction
      handle.hitArea = new PIXI.Rectangle(-hitAreaSize / 2, -hitAreaSize / 2, hitAreaSize, hitAreaSize);
      
      // Store reference to parent section
      handle.parentSection = section;
      
      this.setupHandleInteractions(handle);
      
      // Add to section layer (not as child of section) so it can receive events outside section bounds
      State.sectionLayer.addChild(handle);
      section.resizeHandles.push(handle);
    });
    
    // Update handle positions with rotation
    this.updateHandlePositions(section);
  },

  /**
   * Update resize handle positions (accounts for rotation)
   * @param {Section} section - The GA section
   */
  updateHandlePositions(section) {
    if (!section.resizeHandles) return;
    
    const offset = VISUAL_CONFIG.SELECTION.BORDER_OFFSET;
    const positions = [
      { x: -offset, y: -offset }, // Top-left
      { x: section.contentWidth / 2, y: -offset }, // Top-center
      { x: section.contentWidth + offset, y: -offset }, // Top-right
      { x: section.contentWidth + offset, y: section.contentHeight / 2 }, // Middle-right
      { x: section.contentWidth + offset, y: section.contentHeight + offset }, // Bottom-right
      { x: section.contentWidth / 2, y: section.contentHeight + offset }, // Bottom-center
      { x: -offset, y: section.contentHeight + offset }, // Bottom-left
      { x: -offset, y: section.contentHeight / 2 } // Middle-left
    ];
    
    // Get rotation angle in radians
    const angleRad = (section.rotationDegrees || 0) * Math.PI / 180;
    
    section.resizeHandles.forEach((handle, i) => {
      // Get local position relative to pivot
      const localX = positions[i].x - section.pivot.x;
      const localY = positions[i].y - section.pivot.y;
      
      // Rotate the local position
      const rotatedX = localX * Math.cos(angleRad) - localY * Math.sin(angleRad);
      const rotatedY = localX * Math.sin(angleRad) + localY * Math.cos(angleRad);
      
      // Position handle in world coordinates
      handle.x = section.x + rotatedX;
      handle.y = section.y + rotatedY;
      
      // Rotate the handle itself to match section rotation
      handle.rotation = angleRad;
    });
  },

  /**
   * Remove resize handles from a section
   * @param {Section} section - The GA section
   */
  removeResizeHandles(section) {
    if (!section.resizeHandles) return;
    
    section.resizeHandles.forEach(handle => {
      State.sectionLayer.removeChild(handle);
      handle.destroy();
    });
    section.resizeHandles = null;
  },

  /**
   * Setup drag interactions for a resize handle
   * @param {PIXI.Graphics} handle - The handle
   */
  setupHandleInteractions(handle) {
    let isDragging = false;
    let startX, startY;
    let startWidth, startHeight;
    let startSectionX, startSectionY;
    
    const onPointerMove = (event) => {
      if (!isDragging) return;
      
      const section = handle.parentSection;
      if (!section) return;
      
      const worldPos = Utils.screenToWorld(event.global.x, event.global.y);
      const dx = worldPos.x - startX;
      const dy = worldPos.y - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startSectionX;
      let newY = startSectionY;
      
      // Calculate new dimensions based on corner
      switch (handle.corner) {
        case 'nw': // Top-left
          newWidth = Math.max(50, startWidth - dx);
          newHeight = Math.max(50, startHeight - dy);
          newX = startSectionX + (startWidth - newWidth) / 2;
          newY = startSectionY + (startHeight - newHeight) / 2;
          break;
        case 'n': // Top-center
          newHeight = Math.max(50, startHeight - dy);
          newY = startSectionY + (startHeight - newHeight) / 2;
          break;
        case 'ne': // Top-right
          newWidth = Math.max(50, startWidth + dx);
          newHeight = Math.max(50, startHeight - dy);
          newX = startSectionX + (newWidth - startWidth) / 2;
          newY = startSectionY + (startHeight - newHeight) / 2;
          break;
        case 'e': // Middle-right
          newWidth = Math.max(50, startWidth + dx);
          newX = startSectionX + (newWidth - startWidth) / 2;
          break;
        case 'se': // Bottom-right
          newWidth = Math.max(50, startWidth + dx);
          newHeight = Math.max(50, startHeight + dy);
          newX = startSectionX + (newWidth - startWidth) / 2;
          newY = startSectionY + (newHeight - startHeight) / 2;
          break;
        case 's': // Bottom-center
          newHeight = Math.max(50, startHeight + dy);
          newY = startSectionY + (newHeight - startHeight) / 2;
          break;
        case 'sw': // Bottom-left
          newWidth = Math.max(50, startWidth - dx);
          newHeight = Math.max(50, startHeight + dy);
          newX = startSectionX + (startWidth - newWidth) / 2;
          newY = startSectionY + (newHeight - startHeight) / 2;
          break;
        case 'w': // Middle-left
          newWidth = Math.max(50, startWidth - dx);
          newX = startSectionX + (startWidth - newWidth) / 2;
          break;
      }
      
      // Snap dimensions to grid
      let snappedWidth, snappedHeight;
      
      if (section.isZone) {
        // For zones, scale freely (no snapping to seat grid)
        // Just ensure minimum dimensions
        snappedWidth = Math.max(50, newWidth);
        snappedHeight = Math.max(50, newHeight);
      } else {
        // For GA sections, snap to seat grid
        const snappedDims = Utils.calculateSeatDimensions(newWidth, newHeight);
        snappedWidth = snappedDims.snappedWidth;
        snappedHeight = snappedDims.snappedHeight;
      }
      
      // Recalculate position based on snapped dimensions
      // We need to keep the opposite corner fixed when resizing
      switch (handle.corner) {
        case 'nw': // Top-left (fix bottom-right)
          newX = startSectionX + (startWidth - snappedWidth) / 2;
          newY = startSectionY + (startHeight - snappedHeight) / 2;
          break;
        case 'n': // Top-center (fix bottom)
          newY = startSectionY + (startHeight - snappedHeight) / 2;
          break;
        case 'ne': // Top-right (fix bottom-left)
          newX = startSectionX + (snappedWidth - startWidth) / 2;
          newY = startSectionY + (startHeight - snappedHeight) / 2;
          break;
        case 'e': // Middle-right (fix left)
          newX = startSectionX + (snappedWidth - startWidth) / 2;
          break;
        case 'se': // Bottom-right (fix top-left)
          newX = startSectionX + (snappedWidth - startWidth) / 2;
          newY = startSectionY + (snappedHeight - startHeight) / 2;
          break;
        case 's': // Bottom-center (fix top)
          newY = startSectionY + (snappedHeight - startHeight) / 2;
          break;
        case 'sw': // Bottom-left (fix top-right)
          newX = startSectionX + (startWidth - snappedWidth) / 2;
          newY = startSectionY + (snappedHeight - startHeight) / 2;
          break;
        case 'w': // Middle-left (fix right)
          newX = startSectionX + (startWidth - snappedWidth) / 2;
          break;
      }
      
      // Update section position and size
      section.x = newX;
      section.y = newY;
      
      // Use Section's built-in resize method
      try {
        section.resize(snappedWidth, snappedHeight);
        this.updateHandlePositions(section);
      } catch (error) {
        console.error('Resize failed:', error.message);
      }
      
      // Update sidebar values via event
      document.dispatchEvent(new CustomEvent('gaResizing', { detail: { section } }));
    };
    
    const onPointerUp = (event) => {
      if (!isDragging) return;
      isDragging = false;
      
      // Remove event listeners
      State.app.stage.off('pointermove', onPointerMove);
      State.app.stage.off('pointerup', onPointerUp);
      State.app.stage.off('pointerupoutside', onPointerUp);
      
      // Dispatch event to check for collisions after resize
      const section = handle.parentSection;
      if (section) {
        document.dispatchEvent(new CustomEvent('gaResizeEnd', { detail: { section } }));
      }
    };
    
    handle.on('pointerdown', (event) => {
      if (event.button !== 0) return; // Only left click
      
      isDragging = true;
      const section = handle.parentSection;
      const worldPos = Utils.screenToWorld(event.global.x, event.global.y);
      startX = worldPos.x;
      startY = worldPos.y;
      startWidth = section.contentWidth;
      startHeight = section.contentHeight;
      startSectionX = section.x;
      startSectionY = section.y;
      
      // Add event listeners
      State.app.stage.on('pointermove', onPointerMove);
      State.app.stage.on('pointerup', onPointerUp);
      State.app.stage.on('pointerupoutside', onPointerUp);
      
      event.stopPropagation();
    });
  }
};
