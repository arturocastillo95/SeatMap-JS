// ============================================
// UNDERLAY MANAGER - Background image management
// ============================================

import { State } from '../state.js';
import { Utils } from '../utils.js';

/**
 * Manager for background underlay images (PNG/SVG)
 * Responsible for: Loading images, positioning, opacity, visibility
 */
export const UnderlayManager = {
  /**
   * Initialize underlay layer and setup
   */
  init() {
    // Underlay layer already created in state initialization
    console.log('✓ UnderlayManager initialized');
  },

  /**
   * Load an image file (PNG or SVG) as underlay
   * @param {File} file - The image file to load
   */
  async loadImage(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file type
    const validTypes = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload PNG, JPG, or SVG');
    }

    try {
      // Read file as data URL
      const dataUrl = await this.readFileAsDataURL(file);
      
      // Load the image using common method
      await this.loadImageFromDataUrl(dataUrl, file.name, null);
      
      return State.underlaySprite;
    } catch (error) {
      console.error('Failed to load image:', error);
      throw new Error(`Failed to load image: ${error.message}`);
    }
  },

  /**
   * Load an image from a URL
   * @param {string} url - The image URL to load
   */
  async loadImageFromURL(url) {
    if (!url) {
      throw new Error('No URL provided');
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    try {
      // Try to load the image to verify it's accessible
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      // Get the blob and convert to data URL for consistency
      const blob = await response.blob();
      const dataUrl = await this.blobToDataURL(blob);
      
      // Extract filename from URL
      const urlObj = new URL(url);
      const fileName = urlObj.pathname.split('/').pop() || 'external-image';
      
      // Load the image using common method
      await this.loadImageFromDataUrl(dataUrl, fileName, url);
      
      return State.underlaySprite;
    } catch (error) {
      console.error('Failed to load image from URL:', error);
      throw new Error(`Failed to load image from URL: ${error.message}`);
    }
  },

  /**
   * Common method to load image from data URL
   * @param {string} dataUrl - Base64 data URL
   * @param {string} fileName - Display name for the image
   * @param {string|null} sourceUrl - Original URL if loaded from URL
   */
  async loadImageFromDataUrl(dataUrl, fileName, sourceUrl) {
    // Clear existing underlay
    this.clear();
    
    // Create PIXI sprite from data URL
    const texture = await PIXI.Assets.load(dataUrl);
    const sprite = new PIXI.Sprite(texture);
    
    // Store original dimensions
    sprite.originalWidth = texture.width;
    sprite.originalHeight = texture.height;
    
    // Position at origin
    sprite.x = 0;
    sprite.y = 0;
    
    // Set default opacity
    sprite.alpha = State.underlayOpacity;
    
    // Make non-interactive by default (don't block clicks)
    sprite.eventMode = 'none';
    
    // Add to underlay layer
    State.underlayLayer.addChild(sprite);
    State.underlaySprite = sprite;
    State.underlayData = dataUrl;
    State.underlayFileName = fileName;
    State.underlaySourceUrl = sourceUrl; // Store original URL if applicable
    
    // Setup interactions if in underlay mode
    if (State.currentMode === 'underlay') {
      this.enableInteractions();
      this.addResizeHandles();
    }
    
    console.log(`✓ Loaded underlay: ${fileName} (${texture.width}x${texture.height})`);
    
    // Dispatch event for UI updates
    document.dispatchEvent(new CustomEvent('underlayLoaded', {
      detail: {
        fileName: fileName,
        width: texture.width,
        height: texture.height,
        sourceUrl: sourceUrl
      }
    }));
  },

  /**
   * Read file as data URL
   * @param {File} file - The file to read
   * @returns {Promise<string>} Data URL
   */
  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  /**
   * Convert blob to data URL
   * @param {Blob} blob - The blob to convert
   */
  blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read blob'));
      reader.readAsDataURL(blob);
    });
  },

  /**
   * Set underlay opacity
   * @param {number} opacity - Opacity value (0-1)
   */
  setOpacity(opacity) {
    const clampedOpacity = Math.max(0, Math.min(1, opacity));
    State.underlayOpacity = clampedOpacity;
    
    if (State.underlaySprite) {
      State.underlaySprite.alpha = clampedOpacity;
    }
  },

  /**
   * Set underlay visibility
   * @param {boolean} visible - Whether underlay is visible
   */
  setVisible(visible) {
    State.underlayVisible = visible;
    
    if (State.underlaySprite) {
      State.underlaySprite.visible = visible;
    }
  },

  /**
   * Set underlay scale
   * @param {number} scale - Scale value (0.1 - 5)
   */
  setScale(scale) {
    const clampedScale = Math.max(0.1, Math.min(5, scale));
    State.underlayScale = clampedScale;
    
    if (State.underlaySprite) {
      State.underlaySprite.scale.set(clampedScale);
    }
  },

  /**
   * Set underlay position
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  setPosition(x, y) {
    State.underlayX = x;
    State.underlayY = y;
    
    if (State.underlaySprite) {
      State.underlaySprite.x = x;
      State.underlaySprite.y = y;
    }
  },

  /**
   * Clear the current underlay
   */
  clear() {
    // Remove resize handles first
    this.removeResizeHandles();
    
    if (State.underlaySprite) {
      State.underlayLayer.removeChild(State.underlaySprite);
      State.underlaySprite.destroy();
      State.underlaySprite = null;
    }
    
    State.underlayData = null;
    State.underlayFileName = null;
    
    console.log('✓ Underlay cleared');
    
    // Dispatch event for UI updates
    document.dispatchEvent(new CustomEvent('underlayCleared'));
  },

  /**
   * Get underlay info
   * @returns {object|null} Underlay info or null
   */
  getInfo() {
    if (!State.underlaySprite) {
      return null;
    }

    return {
      fileName: State.underlayFileName,
      width: State.underlaySprite.originalWidth,
      height: State.underlaySprite.originalHeight,
      x: State.underlayX,
      y: State.underlayY,
      scale: State.underlayScale,
      opacity: State.underlayOpacity,
      visible: State.underlayVisible,
      dataUrl: State.underlayData
    };
  },

  /**
   * Restore underlay from saved data
   * @param {object} data - Saved underlay data
   */
  async restore(data) {
    if (!data || !data.dataUrl) {
      return;
    }

    try {
      // Load texture from data URL
      const texture = await PIXI.Assets.load(data.dataUrl);
      const sprite = new PIXI.Sprite(texture);
      
      // Store original dimensions
      sprite.originalWidth = texture.width;
      sprite.originalHeight = texture.height;
      
      // Restore position and properties
      sprite.x = data.x || 0;
      sprite.y = data.y || 0;
      sprite.scale.set(data.scale || 1);
      sprite.alpha = data.opacity !== undefined ? data.opacity : 0.5;
      sprite.visible = data.visible !== undefined ? data.visible : true;
      sprite.eventMode = 'none';
      
      // Clear existing and add new
      this.clear();
      State.underlayLayer.addChild(sprite);
      State.underlaySprite = sprite;
      State.underlayData = data.dataUrl;
      State.underlayFileName = data.fileName || 'underlay';
      State.underlaySourceUrl = data.sourceUrl || null;
      State.underlayX = sprite.x;
      State.underlayY = sprite.y;
      State.underlayScale = sprite.scale.x;
      State.underlayOpacity = sprite.alpha;
      State.underlayVisible = sprite.visible;
      
      // Setup interactions if in underlay mode
      if (State.currentMode === 'underlay') {
        this.enableInteractions();
        this.addResizeHandles();
      }
      
      console.log(`✓ Restored underlay: ${State.underlayFileName}`);
      
      // Dispatch event for UI updates
      document.dispatchEvent(new CustomEvent('underlayLoaded', {
        detail: {
          fileName: State.underlayFileName,
          width: texture.width,
          height: texture.height
        }
      }));
    } catch (error) {
      console.error('Failed to restore underlay:', error);
    }
  },

  // ============================================
  // INTERACTIONS
  // ============================================

  /**
   * Enable drag interactions for underlay
   */
  enableInteractions() {
    if (!State.underlaySprite) return;

    const sprite = State.underlaySprite;
    sprite.eventMode = 'static';
    sprite.cursor = 'move';

    // Remove existing listeners if any
    sprite.removeAllListeners();

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let spriteStartX = 0;
    let spriteStartY = 0;

    sprite.on('pointerdown', (e) => {
      if (State.currentMode !== 'underlay') return;
      
      e.stopPropagation();
      isDragging = true;
      
      const worldPos = Utils.screenToWorld(e.global.x, e.global.y);
      dragStartX = worldPos.x;
      dragStartY = worldPos.y;
      spriteStartX = sprite.x;
      spriteStartY = sprite.y;
      
      State.app.stage.cursor = 'grabbing';
    });

    const onPointerMove = (e) => {
      if (!isDragging) return;

      const worldPos = Utils.screenToWorld(e.global.x, e.global.y);
      const dx = worldPos.x - dragStartX;
      const dy = worldPos.y - dragStartY;

      sprite.x = spriteStartX + dx;
      sprite.y = spriteStartY + dy;

      State.underlayX = sprite.x;
      State.underlayY = sprite.y;

      // Update resize handles
      this.updateResizeHandles();

      // Update position inputs
      document.dispatchEvent(new CustomEvent('underlayPositionChanged', {
        detail: { x: Math.round(sprite.x), y: Math.round(sprite.y) }
      }));
    };

    const onPointerUp = () => {
      if (isDragging) {
        isDragging = false;
        State.app.stage.cursor = 'default';
      }
    };

    State.app.stage.on('pointermove', onPointerMove);
    State.app.stage.on('pointerup', onPointerUp);
    State.app.stage.on('pointerupoutside', onPointerUp);

    // Store listeners for cleanup
    sprite._dragListeners = { onPointerMove, onPointerUp };
  },

  /**
   * Disable drag interactions for underlay
   */
  disableInteractions() {
    if (!State.underlaySprite) return;

    const sprite = State.underlaySprite;
    sprite.eventMode = 'none';
    sprite.cursor = 'default';
    sprite.removeAllListeners();

    // Remove stage listeners
    if (sprite._dragListeners) {
      State.app.stage.off('pointermove', sprite._dragListeners.onPointerMove);
      State.app.stage.off('pointerup', sprite._dragListeners.onPointerUp);
      State.app.stage.off('pointerupoutside', sprite._dragListeners.onPointerUp);
      sprite._dragListeners = null;
    }
  },

  // ============================================
  // RESIZE HANDLES
  // ============================================

  /**
   * Add resize handles to underlay (8-point: corners + edges)
   */
  addResizeHandles() {
    if (!State.underlaySprite) return;

    // Remove existing handles
    this.removeResizeHandles();

    const sprite = State.underlaySprite;
    const handleSize = 8;
    const hitAreaSize = 40;
    const handleColor = 0x4ade80; // Green

    const width = sprite.width;
    const height = sprite.height;

    const positions = [
      { x: 0, y: 0, cursor: 'nwse-resize', corner: 'nw' },           // Top-left
      { x: width / 2, y: 0, cursor: 'ns-resize', corner: 'n' },      // Top-center
      { x: width, y: 0, cursor: 'nesw-resize', corner: 'ne' },       // Top-right
      { x: width, y: height / 2, cursor: 'ew-resize', corner: 'e' }, // Middle-right
      { x: width, y: height, cursor: 'nwse-resize', corner: 'se' },  // Bottom-right
      { x: width / 2, y: height, cursor: 'ns-resize', corner: 's' }, // Bottom-center
      { x: 0, y: height, cursor: 'nesw-resize', corner: 'sw' },      // Bottom-left
      { x: 0, y: height / 2, cursor: 'ew-resize', corner: 'w' }      // Middle-left
    ];

    State.underlayResizeHandles = [];

    positions.forEach(pos => {
      const handle = new PIXI.Graphics();
      handle.rect(-handleSize / 2, -handleSize / 2, handleSize, handleSize);
      handle.fill({ color: handleColor });
      handle.stroke({ width: 1, color: 0xffffff });
      handle.eventMode = 'static';
      handle.cursor = pos.cursor;
      handle.corner = pos.corner;

      // Larger hit area for easier interaction
      handle.hitArea = new PIXI.Rectangle(-hitAreaSize / 2, -hitAreaSize / 2, hitAreaSize, hitAreaSize);

      // Position handle in world space
      handle.x = sprite.x + pos.x * sprite.scale.x;
      handle.y = sprite.y + pos.y * sprite.scale.y;

      this.setupHandleInteractions(handle);

      State.underlayLayer.addChild(handle);
      State.underlayResizeHandles.push(handle);
    });
  },

  /**
   * Update resize handle positions
   */
  updateResizeHandles() {
    if (!State.underlaySprite || !State.underlayResizeHandles) return;

    const sprite = State.underlaySprite;
    const width = sprite.width;
    const height = sprite.height;

    const positions = [
      { x: 0, y: 0 },           // Top-left
      { x: width / 2, y: 0 },   // Top-center
      { x: width, y: 0 },       // Top-right
      { x: width, y: height / 2 }, // Middle-right
      { x: width, y: height },  // Bottom-right
      { x: width / 2, y: height }, // Bottom-center
      { x: 0, y: height },      // Bottom-left
      { x: 0, y: height / 2 }   // Middle-left
    ];

    State.underlayResizeHandles.forEach((handle, i) => {
      // positions[i].x is already in world space (sprite.width already includes scale)
      // so we just add it to sprite position directly
      handle.x = sprite.x + positions[i].x;
      handle.y = sprite.y + positions[i].y;
    });
  },

  /**
   * Remove resize handles
   */
  removeResizeHandles() {
    if (State.underlayResizeHandles) {
      State.underlayResizeHandles.forEach(handle => {
        State.underlayLayer.removeChild(handle);
        handle.destroy();
      });
      State.underlayResizeHandles = null;
    }
  },

  /**
   * Setup resize handle interactions
   */
  setupHandleInteractions(handle) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startSpriteX = 0;
    let startSpriteY = 0;
    let startWidth = 0;
    let startHeight = 0;
    let startScale = 0;

    const onPointerMove = (e) => {
      if (!isDragging || !State.underlaySprite) return;

      const sprite = State.underlaySprite;
      const worldPos = Utils.screenToWorld(e.global.x, e.global.y);
      const dx = worldPos.x - startX;
      const dy = worldPos.y - startY;

      const corner = handle.corner;
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startSpriteX;
      let newY = startSpriteY;

      // Calculate new dimensions based on corner
      switch (corner) {
        case 'nw': // Top-left
          newWidth = Math.max(50, startWidth - dx);
          newHeight = Math.max(50, startHeight - dy);
          break;
        case 'n': // Top-center
          newHeight = Math.max(50, startHeight - dy);
          break;
        case 'ne': // Top-right
          newWidth = Math.max(50, startWidth + dx);
          newHeight = Math.max(50, startHeight - dy);
          break;
        case 'e': // Middle-right
          newWidth = Math.max(50, startWidth + dx);
          break;
        case 'se': // Bottom-right
          newWidth = Math.max(50, startWidth + dx);
          newHeight = Math.max(50, startHeight + dy);
          break;
        case 's': // Bottom-center
          newHeight = Math.max(50, startHeight + dy);
          break;
        case 'sw': // Bottom-left
          newWidth = Math.max(50, startWidth - dx);
          newHeight = Math.max(50, startHeight + dy);
          break;
        case 'w': // Middle-left
          newWidth = Math.max(50, startWidth - dx);
          break;
      }

      // Calculate new scale based on width (maintain aspect ratio)
      const newScale = newWidth / sprite.originalWidth;
      
      // Calculate actual new dimensions with the scale
      const scaledWidth = sprite.originalWidth * newScale;
      const scaledHeight = sprite.originalHeight * newScale;

      // Calculate position adjustments based on which corner/edge is being dragged
      switch (corner) {
        case 'nw': // Top-left - anchor bottom-right
          newX = startSpriteX + (startWidth - scaledWidth);
          newY = startSpriteY + (startHeight - scaledHeight);
          break;
        case 'n': // Top-center - anchor bottom
          newY = startSpriteY + (startHeight - scaledHeight);
          break;
        case 'ne': // Top-right - anchor bottom-left
          newY = startSpriteY + (startHeight - scaledHeight);
          break;
        case 'e': // Middle-right - anchor left
          break;
        case 'se': // Bottom-right - anchor top-left
          break;
        case 's': // Bottom-center - anchor top
          break;
        case 'sw': // Bottom-left - anchor top-right
          newX = startSpriteX + (startWidth - scaledWidth);
          break;
        case 'w': // Middle-left - anchor right
          newX = startSpriteX + (startWidth - scaledWidth);
          break;
      }

      // Update sprite
      sprite.scale.set(newScale);
      sprite.x = newX;
      sprite.y = newY;

      State.underlayScale = newScale;
      State.underlayX = newX;
      State.underlayY = newY;

      // Update handles
      this.updateResizeHandles();

      // Dispatch events for UI updates
      document.dispatchEvent(new CustomEvent('underlayScaleChanged', {
        detail: { scale: Math.round(newScale * 100) }
      }));
      document.dispatchEvent(new CustomEvent('underlayPositionChanged', {
        detail: { x: Math.round(newX), y: Math.round(newY) }
      }));
    };

    const onPointerUp = () => {
      if (isDragging) {
        isDragging = false;
        State.app.stage.off('pointermove', onPointerMove);
        State.app.stage.off('pointerup', onPointerUp);
        State.app.stage.off('pointerupoutside', onPointerUp);
      }
    };

    handle.on('pointerdown', (e) => {
      if (State.currentMode !== 'underlay' || !State.underlaySprite) return;

      e.stopPropagation();
      isDragging = true;

      const sprite = State.underlaySprite;
      const worldPos = Utils.screenToWorld(e.global.x, e.global.y);
      startX = worldPos.x;
      startY = worldPos.y;
      startSpriteX = sprite.x;
      startSpriteY = sprite.y;
      startWidth = sprite.width;
      startHeight = sprite.height;
      startScale = sprite.scale.x;

      State.app.stage.on('pointermove', onPointerMove);
      State.app.stage.on('pointerup', onPointerUp);
      State.app.stage.on('pointerupoutside', onPointerUp);
    });
  }
};
