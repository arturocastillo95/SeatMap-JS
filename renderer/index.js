/**
 * SeatMap Renderer Module Exports
 * Barrel export for all renderer modules
 */

// Import tooltip styles (will be bundled by Vite)
import './assets/tooltip.css';

// Main renderer
export { SeatMapRenderer } from './SeatMapRenderer.js';

// Core modules
export { TextureCache } from './core/TextureCache.js';
export { ViewportManager } from './core/ViewportManager.js';

// Interaction modules
export { InputHandler } from './interaction/InputHandler.js';
export { SelectionManager } from './interaction/SelectionManager.js';
export { CartManager } from './interaction/CartManager.js';

// UI modules
export { UIManager } from './ui/UIManager.js';
export { TooltipManager } from './TooltipManager.js';

// Inventory modules
export { InventoryManager } from './inventory/InventoryManager.js';

// Rendering modules
export { 
    renderUnderlay 
} from './rendering/UnderlayRenderer.js';

export { 
    createSectionContainer,
    createSectionBackground,
    renderGAContent,
    renderZoneContent 
} from './rendering/SectionRenderer.js';

export { 
    renderRowLabels,
    buildRowLabelMap,
    getRowLabelText 
} from './rendering/RowLabelRenderer.js';

// Re-export PIXI for convenience (when bundled)
export * as PIXI from 'pixi.js';
