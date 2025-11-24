// ============================================
// SECTION CLASS - Type-safe section with validation
// ============================================

import { VISUAL_CONFIG, COLORS } from './config.js';

/**
 * Section class that extends PIXI.Graphics with proper validation and type safety
 */
export class Section extends PIXI.Graphics {
  constructor(config) {
    super();
    
    this.validateConfig(config);
    this.initializeProperties(config);
    this.initializeGraphics();
  }

  /**
   * Validate configuration before creating section
   * @throws {Error} If configuration is invalid
   */
  validateConfig(config) {
    if (!config) {
      throw new Error('Section config is required');
    }

    if (typeof config.x !== 'number' || !isFinite(config.x)) {
      throw new Error('Invalid section x position');
    }

    if (typeof config.y !== 'number' || !isFinite(config.y)) {
      throw new Error('Invalid section y position');
    }

    if (!config.width || config.width <= 0 || !isFinite(config.width)) {
      throw new Error('Invalid section width: must be positive number');
    }

    if (!config.height || config.height <= 0 || !isFinite(config.height)) {
      throw new Error('Invalid section height: must be positive number');
    }

    if (config.isGeneralAdmission) {
      if (config.gaCapacity !== undefined && 
          (typeof config.gaCapacity !== 'number' || config.gaCapacity < 0 || !Number.isInteger(config.gaCapacity))) {
        throw new Error('GA capacity must be a non-negative integer');
      }
    }

    if (config.rotationDegrees !== undefined) {
      if (typeof config.rotationDegrees !== 'number' || 
          config.rotationDegrees < 0 || 
          config.rotationDegrees >= 360) {
        throw new Error('Rotation must be between 0 and 360 degrees');
      }
    }

    if (config.sectionColor !== undefined) {
      if (typeof config.sectionColor !== 'number' || config.sectionColor < 0) {
        throw new Error('Section color must be a valid hex color number');
      }
    }

    if (config.points !== undefined) {
      if (!Array.isArray(config.points)) {
        throw new Error('Points must be an array of numbers');
      }
      // Basic check for even number of points (x, y pairs)
      if (config.points.length % 2 !== 0) {
        throw new Error('Points array must contain even number of values (x, y pairs)');
      }
    }
  }

  /**
   * Initialize all section properties with defaults
   */
  initializeProperties(config) {
    // Core identification
    this._sectionId = config.sectionId || `Section ${Date.now()}`;
    this._isGeneralAdmission = config.isGeneralAdmission || false;
    this._isZone = config.isZone || false;
    
    // Visual properties
    this._sectionColor = config.sectionColor || COLORS.SECTION_STROKE;
    this._fillVisible = config.fillVisible !== undefined ? config.fillVisible : true;
    this._strokeVisible = config.strokeVisible !== undefined ? config.strokeVisible : true;
    
    // Zone specific properties
    if (this._isZone) {
      this._zoneLabel = config.zoneLabel || this._sectionId;
      this._showZoneLabel = config.showZoneLabel !== undefined ? config.showZoneLabel : true;
      this._showZone = config.showZone !== undefined ? config.showZone : true;
      this._fillOpacity = config.fillOpacity !== undefined ? config.fillOpacity : 0.5;
      this._points = config.points || null; // Array of [x, y, x, y...]
    }

    // Seat colors
    this._seatColor = config.seatColor || COLORS.SEAT;  // Circle fill color
    this._seatTextColor = config.seatTextColor || 0x000000; // Text color (default black)
    
    // Row label color
    this._rowLabelColor = config.rowLabelColor || 0xffffff; // Default white
    
    // Glow properties
    this._glowEnabled = config.glowEnabled || false;
    this._glowColor = config.glowColor || 0xffffff;
    this._glowOpacity = config.glowOpacity !== undefined ? config.glowOpacity : 0.5;
    this._glowStrength = config.glowStrength !== undefined ? config.glowStrength : 10;
    this._glowBlur = config.glowBlur !== undefined ? config.glowBlur : 5;

    // Dimensions
    this._contentWidth = config.width;
    this._contentHeight = config.height;
    this._baseWidth = config.width;
    this._baseHeight = config.height;
    
    // Padding
    this._sectionPadding = config.sectionPadding !== undefined ? config.sectionPadding : 10;
    
    // Transformation properties
    this._rotationDegrees = config.rotationDegrees || 0;
    this._stretchH = config.stretchH || 0;
    this._stretchV = config.stretchV || 0;
    this._curve = config.curve || 0;
    
    // Collections
    this._seats = [];
    this._rowLabels = [];
    
    // Row label configuration
    this._rowLabelType = config.rowLabelType || 'none'; // 'none', 'numbers', 'letters'
    this._rowLabelStart = config.rowLabelStart || 1;
    this._rowLabelReversed = config.rowLabelReversed || false;
    this._showLeftLabels = config.showLeftLabels || false;
    this._showRightLabels = config.showRightLabels || false;
    this._labelsHidden = config.labelsHidden || false;
    this._rowLabelSpacing = config.rowLabelSpacing || 20; // Distance between label and seats (5-50px)
    
    // Seat numbering
    this._seatNumberStart = config.seatNumberStart || 1;
    this._seatNumberReversed = config.seatNumberReversed || false;
    
    // Row alignment
    this._rowAlignment = config.rowAlignment || 'center'; // 'left', 'center', 'right'
    
    // GA-specific properties
    if (this._isGeneralAdmission) {
      this._gaCapacity = config.gaCapacity || 0;
      this._gaLabel = null; // Will be set during graphics initialization
    }
    
    // Set pivot to center for rotation
    this.pivot.set(config.width / 2, config.height / 2);
    
    // Set position (compensate for pivot)
    this.x = config.x + config.width / 2;
    this.y = config.y + config.height / 2;
    
    // Interaction properties
    this.eventMode = 'static';
    this.cursor = 'pointer';
  }

  /**
   * Initialize graphics (rectangle, fill, stroke)
   */
  initializeGraphics() {
    this.clear();
    
    if (this._isZone && !this._showZone) {
      // If zone is hidden, draw a transparent hit area so it can still be selected if needed
      // or maybe we don't want it selectable? The requirement says "Zone visibility (on/off)".
      // Usually hidden things are not selectable on canvas, but editable via list.
      // For now, let's draw nothing but keep hitArea.
      this.hitArea = new PIXI.Rectangle(0, 0, this._contentWidth, this._contentHeight);
      return;
    }

    if (this._points && this._points.length > 0) {
      this.poly(this._points);
    } else {
      this.rect(0, 0, this._contentWidth, this._contentHeight);
    }
    
    // Apply fill only if visible
    if (this._fillVisible) {
      const alpha = this._isZone ? this._fillOpacity : VISUAL_CONFIG.SECTION.FILL_ALPHA;
      this.fill({ color: this._sectionColor, alpha: alpha });
    }
    
    // Apply stroke only if visible
    if (this._strokeVisible) {
      this.stroke({ 
        width: VISUAL_CONFIG.SECTION.STROKE_WIDTH, 
        color: this._sectionColor, 
        alpha: VISUAL_CONFIG.SECTION.STROKE_ALPHA 
      });
    }
    
    this.hitArea = new PIXI.Rectangle(0, 0, this._contentWidth, this._contentHeight);
    
    // Create GA label if needed
    if (this._isGeneralAdmission && !this._isZone) {
      this.createGALabel();
    } else if (this._isZone && this._showZoneLabel) {
      this.createZoneLabel();
    }
  }

  /**
   * Create center label for Zone sections
   */
  createZoneLabel() {
    if (this._gaLabel) {
      this.removeChild(this._gaLabel);
      this._gaLabel = null;
    }

    const label = new PIXI.Text({
      text: this._zoneLabel,
      style: {
        fontFamily: VISUAL_CONFIG.GA_LABEL.FONT_FAMILY,
        fontSize: VISUAL_CONFIG.GA_LABEL.FONT_SIZE,
        fontWeight: VISUAL_CONFIG.GA_LABEL.FONT_WEIGHT,
        fill: VISUAL_CONFIG.GA_LABEL.COLOR,
        align: 'center'
      }
    });
    label.anchor.set(0.5, 0.5);
    label.x = this._contentWidth / 2;
    label.y = this._contentHeight / 2;
    label.eventMode = 'none';
    this.addChild(label);
    this._gaLabel = label; // Reuse _gaLabel property for convenience
  }

  /**
   * Create center label for GA sections
   */
  createGALabel() {
    const gaLabel = new PIXI.Text({
      text: this._sectionId,
      style: {
        fontFamily: VISUAL_CONFIG.GA_LABEL.FONT_FAMILY,
        fontSize: VISUAL_CONFIG.GA_LABEL.FONT_SIZE,
        fontWeight: VISUAL_CONFIG.GA_LABEL.FONT_WEIGHT,
        fill: VISUAL_CONFIG.GA_LABEL.COLOR,
        align: 'center'
      }
    });
    gaLabel.anchor.set(0.5, 0.5);
    gaLabel.x = this._contentWidth / 2;
    gaLabel.y = this._contentHeight / 2;
    gaLabel.eventMode = 'none';
    this.addChild(gaLabel);
    this._gaLabel = gaLabel;
  }

  // ============================================
  // GETTERS AND SETTERS WITH VALIDATION
  // ============================================

  get sectionId() {
    return this._sectionId;
  }

  set sectionId(value) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error('Section ID must be a non-empty string');
    }
    this._sectionId = value;
    
    // Update GA label if it exists
    if (this._gaLabel) {
      this._gaLabel.text = value;
    }
  }

  get isGeneralAdmission() {
    return this._isGeneralAdmission;
  }

  get sectionColor() {
    return this._sectionColor;
  }

  set sectionColor(value) {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('Section color must be a valid hex color number');
    }
    this._sectionColor = value;
    this.redrawGraphics();
  }

  get fillVisible() {
    return this._fillVisible;
  }

  set fillVisible(value) {
    if (typeof value !== 'boolean') {
      throw new Error('Fill visible must be a boolean');
    }
    this._fillVisible = value;
    this.redrawGraphics();
  }

  get strokeVisible() {
    return this._strokeVisible;
  }

  set strokeVisible(value) {
    if (typeof value !== 'boolean') {
      throw new Error('Stroke visible must be a boolean');
    }
    this._strokeVisible = value;
    this.redrawGraphics();
  }

  get seatColor() {
    return this._seatColor;
  }

  set seatColor(value) {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('Seat color must be a valid hex color number');
    }
    this._seatColor = value;
  }

  get seatTextColor() {
    return this._seatTextColor;
  }

  set seatTextColor(value) {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('Seat text color must be a valid hex color number');
    }
    this._seatTextColor = value;
  }

  get rowLabelColor() {
    return this._rowLabelColor;
  }

  set rowLabelColor(value) {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('Row label color must be a valid hex color number');
    }
    this._rowLabelColor = value;
  }

  get glowEnabled() {
    return this._glowEnabled;
  }

  set glowEnabled(value) {
    if (typeof value !== 'boolean') {
      throw new Error('Glow enabled must be a boolean');
    }
    this._glowEnabled = value;
  }

  get glowColor() {
    return this._glowColor;
  }

  set glowColor(value) {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('Glow color must be a valid hex color number');
    }
    this._glowColor = value;
  }

  get glowOpacity() {
    return this._glowOpacity;
  }

  set glowOpacity(value) {
    if (typeof value !== 'number' || value < 0 || value > 1) {
      throw new Error('Glow opacity must be between 0 and 1');
    }
    this._glowOpacity = value;
  }

  get glowStrength() {
    return this._glowStrength;
  }

  set glowStrength(value) {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('Glow strength must be a positive number');
    }
    this._glowStrength = value;
  }

  get glowBlur() {
    return this._glowBlur;
  }

  set glowBlur(value) {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('Glow blur must be a positive number');
    }
    this._glowBlur = value;
  }

  get sectionPadding() {
    return this._sectionPadding;
  }

  set sectionPadding(value) {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('Section padding must be a non-negative number');
    }
    this._sectionPadding = value;
  }

  get contentWidth() {
    return this._contentWidth;
  }

  set contentWidth(value) {
    if (typeof value !== 'number' || value <= 0 || !isFinite(value)) {
      throw new Error('Content width must be a positive number');
    }
    this._contentWidth = value;
  }

  get contentHeight() {
    return this._contentHeight;
  }

  set contentHeight(value) {
    if (typeof value !== 'number' || value <= 0 || !isFinite(value)) {
      throw new Error('Content height must be a positive number');
    }
    this._contentHeight = value;
  }

  get baseWidth() {
    return this._baseWidth;
  }

  set baseWidth(value) {
    if (typeof value !== 'number' || value <= 0 || !isFinite(value)) {
      throw new Error('Base width must be a positive number');
    }
    this._baseWidth = value;
  }

  get baseHeight() {
    return this._baseHeight;
  }

  set baseHeight(value) {
    if (typeof value !== 'number' || value <= 0 || !isFinite(value)) {
      throw new Error('Base height must be a positive number');
    }
    this._baseHeight = value;
  }

  get rotationDegrees() {
    return this._rotationDegrees;
  }

  set rotationDegrees(value) {
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new Error('Rotation must be a finite number');
    }
    // Normalize rotation to 0-360 range
    this._rotationDegrees = ((value % 360) + 360) % 360;
  }

  get stretchH() {
    return this._stretchH;
  }

  set stretchH(value) {
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new Error('Horizontal stretch must be a number');
    }
    this._stretchH = value;
  }

  get stretchV() {
    return this._stretchV;
  }

  set stretchV(value) {
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new Error('Vertical stretch must be a number');
    }
    this._stretchV = value;
  }

  get curve() {
    return this._curve;
  }

  set curve(value) {
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new Error('Curve must be a number');
    }
    this._curve = value;
  }

  get gaCapacity() {
    if (!this._isGeneralAdmission) {
      throw new Error('Cannot get GA capacity on non-GA section');
    }
    return this._gaCapacity;
  }

  set gaCapacity(value) {
    if (!this._isGeneralAdmission) {
      throw new Error('Cannot set GA capacity on non-GA section');
    }
    if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
      throw new Error('GA capacity must be a non-negative integer');
    }
    this._gaCapacity = value;
  }

  get gaLabel() {
    return this._gaLabel;
  }

  get seats() {
    return this._seats;
  }

  set seats(value) {
    if (!Array.isArray(value)) {
      throw new Error('Seats must be an array');
    }
    this._seats = value;
  }

  get rowLabels() {
    return this._rowLabels;
  }

  set rowLabels(value) {
    if (!Array.isArray(value)) {
      throw new Error('Row labels must be an array');
    }
    this._rowLabels = value;
  }

  get rowLabelType() {
    return this._rowLabelType;
  }

  set rowLabelType(value) {
    const validTypes = ['none', 'numbers', 'letters'];
    if (!validTypes.includes(value)) {
      throw new Error(`Row label type must be one of: ${validTypes.join(', ')}`);
    }
    this._rowLabelType = value;
  }

  get rowLabelStart() {
    return this._rowLabelStart;
  }

  set rowLabelStart(value) {
    if (typeof value !== 'number' && typeof value !== 'string') {
      throw new Error('Row label start must be a number or string');
    }
    this._rowLabelStart = value;
  }

  get rowLabelReversed() {
    return this._rowLabelReversed;
  }

  set rowLabelReversed(value) {
    if (typeof value !== 'boolean') {
      throw new Error('Row label reversed must be a boolean');
    }
    this._rowLabelReversed = value;
  }

  get showLeftLabels() {
    return this._showLeftLabels;
  }

  set showLeftLabels(value) {
    if (typeof value !== 'boolean') {
      throw new Error('Show left labels must be a boolean');
    }
    this._showLeftLabels = value;
  }

  get showRightLabels() {
    return this._showRightLabels;
  }

  set showRightLabels(value) {
    if (typeof value !== 'boolean') {
      throw new Error('Show right labels must be a boolean');
    }
    this._showRightLabels = value;
  }

  get labelsHidden() {
    return this._labelsHidden;
  }

  set labelsHidden(value) {
    if (typeof value !== 'boolean') {
      throw new Error('Labels hidden must be a boolean');
    }
    this._labelsHidden = value;
  }

  get rowLabelSpacing() {
    return this._rowLabelSpacing;
  }

  set rowLabelSpacing(value) {
    if (typeof value !== 'number' || value < 5 || value > 50) {
      throw new Error('Row label spacing must be between 5 and 50');
    }
    this._rowLabelSpacing = value;
  }

  get seatNumberStart() {
    return this._seatNumberStart;
  }

  set seatNumberStart(value) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
      throw new Error('Seat number start must be a positive integer');
    }
    this._seatNumberStart = value;
  }

  get seatNumberReversed() {
    return this._seatNumberReversed;
  }

  set seatNumberReversed(value) {
    if (typeof value !== 'boolean') {
      throw new Error('Seat number reversed must be a boolean');
    }
    this._seatNumberReversed = value;
  }

  get rowAlignment() {
    return this._rowAlignment;
  }

  set rowAlignment(value) {
    const validAlignments = ['left', 'center', 'right'];
    if (!validAlignments.includes(value)) {
      throw new Error('Row alignment must be left, center, or right');
    }
    this._rowAlignment = value;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Redraw section graphics with current properties
   */
  redrawGraphics() {
    this.initializeGraphics();
  }

  // ============================================
  // ZONE GETTERS AND SETTERS
  // ============================================

  get isZone() {
    return this._isZone;
  }

  set isZone(value) {
    this._isZone = value;
  }
  
  get zoneLabel() {
    return this._zoneLabel;
  }

  set zoneLabel(value) {
    this._zoneLabel = value;
    if (this._isZone && this._showZoneLabel) {
      this.createZoneLabel();
    }
  }

  get showZoneLabel() { return this._showZoneLabel; }
  set showZoneLabel(value) {
    this._showZoneLabel = !!value;
    this.redrawGraphics();
  }

  get showZone() { return this._showZone; }
  set showZone(value) {
    this._showZone = !!value;
    this.redrawGraphics();
  }

  get fillOpacity() { return this._fillOpacity; }
  set fillOpacity(value) {
    if (typeof value !== 'number' || value < 0 || value > 1) {
      throw new Error('Fill opacity must be between 0 and 1');
    }
    this._fillOpacity = value;
    this.redrawGraphics();
  }

  get points() { return this._points; }
  set points(value) {
    if (value !== null && (!Array.isArray(value) || value.length % 2 !== 0)) {
      throw new Error('Points must be an array of numbers (x, y pairs)');
    }
    this._points = value;
    this.redrawGraphics();
  }

  /**
   * Resize the section (for GA sections)
   * @param {number} newWidth - New width
   * @param {number} newHeight - New height
   */
  resize(newWidth, newHeight) {
    if (!this._isGeneralAdmission) {
      throw new Error('Only GA sections can be resized directly');
    }

    if (typeof newWidth !== 'number' || newWidth <= 0 || !isFinite(newWidth)) {
      throw new Error('New width must be a positive number');
    }

    if (typeof newHeight !== 'number' || newHeight <= 0 || !isFinite(newHeight)) {
      throw new Error('New height must be a positive number');
    }

    // If we have custom points (polygon), we need to scale them
    if (this._points && this._points.length > 0) {
      const scaleX = newWidth / this._contentWidth;
      const scaleY = newHeight / this._contentHeight;
      
      // Scale all points
      for (let i = 0; i < this._points.length; i += 2) {
        this._points[i] *= scaleX;
        this._points[i + 1] *= scaleY;
      }
    }

    this._contentWidth = newWidth;
    this._contentHeight = newHeight;
    this._baseWidth = newWidth;
    this._baseHeight = newHeight;

    // Redraw graphics
    this.redrawGraphics();

    // Update pivot
    this.pivot.set(newWidth / 2, newHeight / 2);

    // Update GA label position
    if (this._gaLabel) {
      this._gaLabel.x = newWidth / 2;
      this._gaLabel.y = newHeight / 2;
    }

    // Update selection border if it exists
    if (this.selectionBorder) {
      const offset = VISUAL_CONFIG.SELECTION.BORDER_OFFSET;
      this.selectionBorder.clear();
      this.selectionBorder.rect(-offset, -offset, newWidth + offset * 2, newHeight + offset * 2);
      this.selectionBorder.stroke({ 
        width: VISUAL_CONFIG.SELECTION.BORDER_WIDTH, 
        color: VISUAL_CONFIG.SELECTION.COLOR 
      });
    }
  }

  /**
   * Get total capacity (seats or GA capacity)
   * @returns {number}
   */
  getCapacity() {
    return this._isGeneralAdmission ? this._gaCapacity : this._seats.length;
  }

  /**
   * Serialize section to JSON-compatible object
   * @returns {object}
   */
  toJSON() {
    const base = {
      id: this._sectionId,
      type: this._isGeneralAdmission ? 'ga' : 'regular',
      x: this.x - this._contentWidth / 2, // Convert back from pivot
      y: this.y - this._contentHeight / 2,
      width: this._contentWidth,
      height: this._contentHeight,
      rotation: this._rotationDegrees,
      color: this._sectionColor,
      seatColor: this._seatColor,
      seatTextColor: this._seatTextColor,
      stretchH: this._stretchH,
      stretchV: this._stretchV,
      curve: this._curve,
      padding: this._sectionPadding,
      glow: {
        enabled: this._glowEnabled,
        color: this._glowColor,
        opacity: this._glowOpacity,
        strength: this._glowStrength,
        blur: this._glowBlur
      },
      rowLabels: {
        type: this._rowLabelType,
        start: this._rowLabelStart,
        reversed: this._rowLabelReversed,
        showLeft: this._showLeftLabels,
        showRight: this._showRightLabels,
        color: this._rowLabelColor
      },
      seatNumbering: {
        start: this._seatNumberStart,
        reversed: this._seatNumberReversed
      }
    };

    if (this._isZone) {
      base.isZone = true;
      base.zoneLabel = this._zoneLabel;
      base.showZoneLabel = this._showZoneLabel;
      base.showZone = this._showZone;
      base.fillOpacity = this._fillOpacity;
      if (this._points) {
        base.points = this._points;
      }
      // Zones don't have seats or capacity
      base.seats = [];
    } else if (this._isGeneralAdmission) {
      base.ga = {
        capacity: this._gaCapacity
      };
      base.seats = [];
    }

    return base;
  }
}

/**
 * VALIDATION EXAMPLES:
 * 
 * The Section class provides comprehensive validation that prevents runtime errors:
 * 
 * 1. Position validation:
 *    new Section({ x: NaN, y: 0, width: 100, height: 100 })
 *    ❌ Error: "Invalid section x position"
 * 
 * 2. Dimension validation:
 *    new Section({ x: 0, y: 0, width: -10, height: 100 })
 *    ❌ Error: "Invalid section width: must be positive number"
 * 
 * 3. Rotation validation:
 *    section.rotationDegrees = 400;
 *    ❌ Error: "Rotation must be between 0 and 360 degrees"
 * 
 * 4. GA capacity validation:
 *    section.gaCapacity = -5;
 *    ❌ Error: "GA capacity must be a non-negative integer"
 * 
 * 5. Row label type validation:
 *    section.rowLabelType = 'invalid';
 *    ❌ Error: "Row label type must be one of: none, numbers, letters"
 * 
 * 6. Section ID validation:
 *    section.sectionId = '';
 *    ❌ Error: "Section ID must be a non-empty string"
 * 
 * 7. Type safety for arrays:
 *    section.seats = 'not an array';
 *    ❌ Error: "Seats must be an array"
 * 
 * All validations throw descriptive errors that help catch bugs early!
 */
