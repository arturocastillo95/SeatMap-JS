// ============================================
// SECTION MANAGER (UNIFIED) - Delegates to specialized managers
// ============================================
// This is the main entry point that coordinates all section-related operations
// by delegating to focused, single-responsibility modules.

import { SectionFactory } from './SectionFactory.js';
import { SeatManager } from './SeatManager.js';
import { SectionInteractionHandler } from './SectionInteractionHandler.js';
import { ResizeHandleManager } from './ResizeHandleManager.js';
import { SectionTransformations } from './SectionTransformations.js';
import { State } from '../core/state.js';

/**
 * Unified SectionManager that delegates to specialized managers
 * This maintains backward compatibility while using a cleaner architecture
 */
export const SectionManager = {
  // ============================================
  // CREATION (delegates to SectionFactory)
  // ============================================
  
  createSection(x, y, width, height, rows, seatsPerRow) {
    const section = SectionFactory.createSection(x, y, width, height, rows, seatsPerRow);
    SectionInteractionHandler.setupSectionInteractions(section);
    SectionFactory.registerSection(section);
    SeatManager.createSeats(section, x, y, width, height, rows, seatsPerRow);
    return section;
  },

  createGASection(x, y, width, height) {
    const section = SectionFactory.createGASection(x, y, width, height);
    SectionInteractionHandler.setupSectionInteractions(section);
    SectionFactory.registerSection(section);
    return section;
  },

  createZone(x, y, width, height) {
    const section = SectionFactory.createZone(x, y, width, height);
    SectionInteractionHandler.setupSectionInteractions(section);
    SectionFactory.registerSection(section);
    return section;
  },

  duplicateSection(section) {
    return SectionFactory.duplicateSection(section);
  },

  deleteSection(section) {
    return SectionFactory.deleteSection(section);
  },

  // ============================================
  // RESIZE HANDLES (delegates to ResizeHandleManager)
  // ============================================
  
  addResizeHandles(section) {
    return ResizeHandleManager.addResizeHandles(section);
  },

  updateResizeHandles(section) {
    return ResizeHandleManager.updateHandlePositions(section);
  },

  removeResizeHandles(section) {
    return ResizeHandleManager.removeResizeHandles(section);
  },

  resizeGASection(section, newWidth, newHeight) {
    try {
      section.resize(newWidth, newHeight);
      if (section.resizeHandles) {
        ResizeHandleManager.updateHandlePositions(section);
      }
    } catch (error) {
      console.error('Failed to resize GA section:', error.message);
      throw error;
    }
  },

  // ============================================
  // SEATS (delegates to SeatManager)
  // ============================================
  
  createSeats(section, x, y, width, height, rows, seatsPerRow) {
    return SeatManager.createSeats(section, x, y, width, height, rows, seatsPerRow);
  },

  setupSeatInteractions(seat) {
    return SeatManager.setupSeatInteractions(seat);
  },

  updateSeatNumbers(section) {
    return SeatManager.updateSeatNumbers(section);
  },

  getRowLabelText(index, type, startValue) {
    return SeatManager.getRowLabelText(index, type, startValue);
  },

  createRowLabel(text, isHidden = false) {
    return SeatManager.createRowLabel(text, isHidden);
  },

  // ============================================
  // INTERACTIONS (delegates to SectionInteractionHandler)
  // ============================================
  
  setupSectionInteractions(section) {
    return SectionInteractionHandler.setupSectionInteractions(section);
  },

  selectSection(section) {
    return SectionInteractionHandler.selectSection(section);
  },

  deselectSection(section) {
    return SectionInteractionHandler.deselectSection(section);
  },

  deselectAll() {
    return SectionInteractionHandler.deselectAll();
  },

  showContextMenu(x, y, section) {
    return SectionInteractionHandler.showContextMenu(x, y, section);
  },

  // ============================================
  // TRANSFORMATIONS (delegates to SectionTransformations)
  // ============================================
  
  applyStretch(section) {
    return SectionTransformations.applyStretch(section);
  },

  applyCurve(section) {
    return SectionTransformations.applyCurve(section);
  },

  calculateMaxCurve(section) {
    return SectionTransformations.calculateMaxCurve(section);
  },

  alignRows(section, alignment) {
    return SectionTransformations.alignRows(section, alignment);
  },

  recalculateSectionDimensions(section) {
    return SectionTransformations.recalculateSectionDimensions(section);
  },

  positionSeatsAndLabels(section) {
    return SectionTransformations.positionSeatsAndLabels(section);
  },

  // ============================================
  // GRAPHICS & RENDERING
  // ============================================
  
  updateSectionGraphics(section) {
    section.redrawGraphics();
  },

  setSectionColor(section, colorHex) {
    if (!colorHex || typeof colorHex !== 'string') {
      throw new Error('Invalid color hex');
    }
    
    // Convert hex string to number
    const colorValue = parseInt(colorHex.replace('#', ''), 16);
    section.sectionColor = colorValue;
    
    console.log(`✓ Updated section color to ${colorHex}`);
  },

  setSeatColor(section, colorHex) {
    if (!colorHex || typeof colorHex !== 'string') {
      throw new Error('Invalid color hex');
    }
    
    // Convert hex string to number
    const colorValue = parseInt(colorHex.replace('#', ''), 16);
    section.seatColor = colorValue;
    
    // Update all existing seats (if any)
    SeatManager.updateAllSeats(section);
    
    console.log(`✓ Updated seat color to ${colorHex}`);
  },

  setSeatTextColor(section, colorHex) {
    if (!colorHex || typeof colorHex !== 'string') {
      throw new Error('Invalid color hex');
    }
    
    // Convert hex string to number
    const colorValue = parseInt(colorHex.replace('#', ''), 16);
    section.seatTextColor = colorValue;
    
    // Update all existing seats (if any)
    SeatManager.updateAllSeats(section);
    
    console.log(`✓ Updated seat text color to ${colorHex}`);
  },

  setRowLabelColor(section, colorHex) {
    if (!colorHex || typeof colorHex !== 'string') {
      throw new Error('Invalid color hex');
    }
    
    // Convert hex string to number
    const colorValue = parseInt(colorHex.replace('#', ''), 16);
    section.rowLabelColor = colorValue;
    
    // Update only the color of existing row labels (don't recalculate positions)
    section.rowLabels.forEach(label => {
      label.style.fill = colorValue;
    });
    
    console.log(`✓ Updated row label color to ${colorHex}`);
  },

  setGlowEnabled(section, enabled) {
    section.glowEnabled = enabled;
    SeatManager.updateAllSeats(section);
    console.log(`✓ Updated glow enabled to ${enabled}`);
  },

  setGlowColor(section, colorHex) {
    if (!colorHex || typeof colorHex !== 'string') {
      throw new Error('Invalid color hex');
    }
    const colorValue = parseInt(colorHex.replace('#', ''), 16);
    section.glowColor = colorValue;
    SeatManager.updateAllSeats(section);
    console.log(`✓ Updated glow color to ${colorHex}`);
  },

  setGlowOpacity(section, opacity) {
    section.glowOpacity = opacity;
    SeatManager.updateAllSeats(section);
    console.log(`✓ Updated glow opacity to ${opacity}`);
  },

  setGlowStrength(section, strength) {
    section.glowStrength = strength;
    SeatManager.updateAllSeats(section);
    console.log(`✓ Updated glow strength to ${strength}`);
  },

  setGlowBlur(section, blur) {
    section.glowBlur = blur;
    SeatManager.updateAllSeats(section);
    console.log(`✓ Updated glow blur to ${blur}`);
  },

  setSectionPadding(section, padding) {
    if (typeof padding !== 'number' || padding < 0) {
      throw new Error('Invalid padding value');
    }
    section.sectionPadding = padding;
    
    // Recalculate dimensions to apply the new padding
    if (section.rowLabels && section.rowLabels.length > 0) {
       SeatManager.updateRowLabels(section);
    } else {
       SectionTransformations.recalculateSectionDimensions(section);
       SectionTransformations.positionSeatsAndLabels(section);
    }
    
    console.log(`✓ Updated section padding to ${padding}`);
  },

  // ============================================
  // LEGACY/COMPATIBILITY METHODS
  // ============================================
  
  // Methods that may still be called by old code but are deprecated
  createSectionLabel(section) {
    console.warn('createSectionLabel is deprecated - labels are now part of Section class');
  },

  editSectionLabel(section, label, labelBg) {
    console.warn('editSectionLabel is deprecated - labels are now part of Section class');
  },

  updateRowLabels(section) {
    return SeatManager.updateRowLabels(section);
  },

  updateRowLabelPositions(section) {
    // Stub for compatibility
    console.warn('updateRowLabelPositions should use SectionTransformations');
  },

  updateZoneVisibility(scale) {
    const ZOOM_THRESHOLD = 1.5; // Start fading out at 1.5x zoom
    const FADE_RANGE = 0.5; // Fully transparent at 2.0x zoom
    
    State.sections.forEach(section => {
      if (section.isZone) {
        let opacity = section.fillOpacity || 0.2;
        
        if (scale > ZOOM_THRESHOLD) {
          const fade = Math.max(0, 1 - (scale - ZOOM_THRESHOLD) / FADE_RANGE);
          opacity *= fade;
        }
        
        // Update the graphics alpha directly
        if (section.bgGraphics) {
          section.bgGraphics.alpha = opacity;
        }
        // Also fade label
        if (section.labelContainer) {
          section.labelContainer.alpha = opacity > 0.05 ? 1 : 0;
        }
      }
    });
  },

  // ============================================
  // ZONE OPERATIONS
  // ============================================

  async joinZones(zones) {
    if (!zones || zones.length < 2) {
      console.warn('Need at least 2 zones to join');
      return;
    }

    try {
      // Dynamic import to avoid loading turf unless needed
      // Pin to v6.5.0 to ensure pairwise union support
      const { default: union } = await import('https://cdn.jsdelivr.net/npm/@turf/union@6.5.0/+esm');
      const { polygon } = await import('https://cdn.jsdelivr.net/npm/@turf/helpers@6.5.0/+esm');

      // 1. Convert zones to Turf polygons
      const turfPolys = zones.map(zone => {
        // Get global coordinates of the zone corners
        // We need to account for rotation and position
        
        let coords;
        if (zone.points && zone.points.length > 0) {
           // Convert flat array [x,y, x,y] to [[x,y], [x,y]...]
           // Points are local to the zone's top-left (0,0)
           // We need to transform them to global space
           
           const pts = [];
           const cos = Math.cos(zone.rotation);
           const sin = Math.sin(zone.rotation);
           
           // Zone global position (center)
           const cx = zone.x;
           const cy = zone.y;
           
           // Pivot offset (center relative to top-left)
           const px = zone.contentWidth / 2;
           const py = zone.contentHeight / 2;

           for(let i=0; i<zone.points.length; i+=2) {
             const lx = zone.points[i];
             const ly = zone.points[i+1];
             
             // Transform to global
             // 1. Shift to center-relative
             const dx = lx - px;
             const dy = ly - py;
             
             // 2. Rotate and translate
             const gx = cx + (dx * cos - dy * sin);
             const gy = cy + (dx * sin + dy * cos);
             
             pts.push([gx, gy]);
           }
           
           // Close the loop
           if (pts.length > 0 && (pts[0][0] !== pts[pts.length-1][0] || pts[0][1] !== pts[pts.length-1][1])) {
             pts.push([pts[0][0], pts[0][1]]);
           }
           coords = [pts];
        } else {
           // Rectangle
           // Zone x/y is the center (pivot).
           const w = zone.contentWidth;
           const h = zone.contentHeight;
           const x = zone.x;
           const y = zone.y;
           const rot = zone.rotation; // radians
           
           // Corners relative to center
           const corners = [
             {x: -w/2, y: -h/2},
             {x: w/2, y: -h/2},
             {x: w/2, y: h/2},
             {x: -w/2, y: h/2}
           ];
           
           // Rotate and translate
           const cos = Math.cos(rot);
           const sin = Math.sin(rot);
           
           const transformed = corners.map(p => ({
             x: x + (p.x * cos - p.y * sin),
             y: y + (p.x * sin + p.y * cos)
           }));
           
           coords = [[
             [transformed[0].x, transformed[0].y],
             [transformed[1].x, transformed[1].y],
             [transformed[2].x, transformed[2].y],
             [transformed[3].x, transformed[3].y],
             [transformed[0].x, transformed[0].y] // Close loop
           ]];
        }
        
        return polygon(coords);
      });

      // 2. Union them sequentially
      let merged = turfPolys[0];
      for (let i = 1; i < turfPolys.length; i++) {
        merged = union(merged, turfPolys[i]);
      }

      if (!merged) {
        throw new Error('Failed to merge zones');
      }

      // 3. Convert back to points
      let finalCoords;
      if (merged.geometry.type === 'Polygon') {
        finalCoords = merged.geometry.coordinates[0];
      } else if (merged.geometry.type === 'MultiPolygon') {
        console.warn('Merged zone resulted in MultiPolygon. Using first polygon.');
        finalCoords = merged.geometry.coordinates[0][0];
      }

      // Convert [[x,y]...] to [x,y, x,y...]
      const flatPoints = [];
      // Calculate bounds to set x,y, width, height
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      finalCoords.forEach(pt => {
        flatPoints.push(pt[0], pt[1]);
        minX = Math.min(minX, pt[0]);
        minY = Math.min(minY, pt[1]);
        maxX = Math.max(maxX, pt[0]);
        maxY = Math.max(maxY, pt[1]);
      });

      // 4. Create new Zone
      const width = maxX - minX;
      const height = maxY - minY;
      
      // Center of the bounding box
      const centerX = minX + width / 2;
      const centerY = minY + height / 2;

      // Create the zone
      // Note: createZone takes top-left x/y if we look at SectionFactory usually, 
      // but SectionManager.createZone calls SectionFactory.createZone.
      // Let's check SectionFactory.createZone signature.
      // Usually it takes x, y, w, h.
      // And Section constructor takes x, y.
      // Section.js: this.x = config.x + config.width / 2;
      // So config.x should be top-left.
      
      const newZone = this.createZone(minX, minY, width, height);
      
      // Transform global points to local points relative to top-left (minX, minY)
      // Since the new zone is unrotated (rotation 0), the local space aligns with global axes.
      const localPoints = [];
      for(let i=0; i<flatPoints.length; i+=2) {
        localPoints.push(flatPoints[i] - minX);
        localPoints.push(flatPoints[i+1] - minY);
      }
      
      newZone.points = localPoints;
      newZone.zoneLabel = zones[0].zoneLabel + " +";
      
      // 5. Remove old zones
      // Create a copy of the array because deleteSection modifies State.selectedSections
      // which 'zones' might be a reference to.
      [...zones].forEach(z => this.deleteSection(z));
      
      // Select the new zone
      this.deselectAll();
      this.selectSection(newZone);
      
      return newZone;

    } catch (e) {
      console.error('Error joining zones:', e);
    }
  },
};

/**
 * Architecture Benefits:
 * 
 * ✅ Single Responsibility - Each manager handles one concern
 * ✅ Easier Testing - Test each manager independently
 * ✅ Better Maintainability - Changes isolated to specific modules
 * ✅ Reduced Coupling - Managers don't depend on each other
 * ✅ Cleaner Code - ~300 lines vs 1500+ lines per module
 * ✅ Backward Compatible - Existing code continues to work
 */
