// ============================================
// SMF (Seat Map Format) Validator
// Validates venue map files against the SMF schema
// ============================================

export const SMFValidator = {
  /**
   * Validate an SMF file and return validation results
   * @param {Object} data - The parsed JSON data to validate
   * @returns {Object} - { valid: boolean, errors: string[], warnings: string[] }
   */
  validate(data) {
    const errors = [];
    const warnings = [];

    // Root level validation
    this.validateRoot(data, errors, warnings);

    // Venue validation
    if (data.venue) {
      this.validateVenue(data.venue, errors, warnings);
    }

    // Canvas validation
    if (data.canvas) {
      this.validateCanvas(data.canvas, errors, warnings);
    }

    // Underlay validation
    if (data.underlay) {
      this.validateUnderlay(data.underlay, errors, warnings);
    }

    // Sections validation
    if (data.sections) {
      this.validateSections(data.sections, errors, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  },

  /**
   * Validate root level fields
   */
  validateRoot(data, errors, warnings) {
    // Required fields
    if (!data.format) {
      errors.push('Missing required field: format');
    } else if (data.format !== 'SMF') {
      errors.push(`Invalid format: expected "SMF", got "${data.format}"`);
    }

    if (!data.version) {
      errors.push('Missing required field: version');
    } else if (!this.isValidVersion(data.version)) {
      warnings.push(`Unrecognized version: ${data.version}. Expected format: x.y.z`);
    }

    if (!data.venue) {
      errors.push('Missing required field: venue');
    }

    if (!data.sections) {
      errors.push('Missing required field: sections');
    } else if (!Array.isArray(data.sections)) {
      errors.push('Field "sections" must be an array');
    }

    // Optional but recommended
    if (!data.created) {
      warnings.push('Missing recommended field: created (ISO 8601 timestamp)');
    }

    if (!data.modified) {
      warnings.push('Missing recommended field: modified (ISO 8601 timestamp)');
    }
  },

  /**
   * Validate venue object
   */
  validateVenue(venue, errors, warnings) {
    if (typeof venue !== 'object' || venue === null) {
      errors.push('Field "venue" must be an object');
      return;
    }

    if (!venue.name) {
      warnings.push('Missing venue.name');
    } else if (typeof venue.name !== 'string') {
      errors.push('Field "venue.name" must be a string');
    }

    if (venue.capacity !== undefined && typeof venue.capacity !== 'number') {
      errors.push('Field "venue.capacity" must be a number');
    }

    // Validate location if present
    if (venue.location) {
      this.validateLocation(venue.location, errors, warnings);
    }
  },

  /**
   * Validate location object
   */
  validateLocation(location, errors, warnings) {
    if (typeof location !== 'object' || location === null) {
      errors.push('Field "venue.location" must be an object');
      return;
    }

    const stringFields = ['address', 'city', 'state', 'country'];
    for (const field of stringFields) {
      if (location[field] !== null && location[field] !== undefined && typeof location[field] !== 'string') {
        errors.push(`Field "venue.location.${field}" must be a string or null`);
      }
    }

    // Validate coordinates if present
    if (location.coordinates) {
      if (typeof location.coordinates !== 'object' || location.coordinates === null) {
        errors.push('Field "venue.location.coordinates" must be an object');
      } else {
        if (location.coordinates.lat !== null && location.coordinates.lat !== undefined) {
          if (typeof location.coordinates.lat !== 'number') {
            errors.push('Field "venue.location.coordinates.lat" must be a number or null');
          } else if (location.coordinates.lat < -90 || location.coordinates.lat > 90) {
            errors.push('Field "venue.location.coordinates.lat" must be between -90 and 90');
          }
        }
        if (location.coordinates.lng !== null && location.coordinates.lng !== undefined) {
          if (typeof location.coordinates.lng !== 'number') {
            errors.push('Field "venue.location.coordinates.lng" must be a number or null');
          } else if (location.coordinates.lng < -180 || location.coordinates.lng > 180) {
            errors.push('Field "venue.location.coordinates.lng" must be between -180 and 180');
          }
        }
      }
    }
  },

  /**
   * Validate canvas object
   */
  validateCanvas(canvas, errors, warnings) {
    if (typeof canvas !== 'object' || canvas === null) {
      errors.push('Field "canvas" must be an object');
      return;
    }

    const numericFields = ['width', 'height', 'zoom', 'panX', 'panY'];
    for (const field of numericFields) {
      if (canvas[field] !== undefined && typeof canvas[field] !== 'number') {
        errors.push(`Field "canvas.${field}" must be a number`);
      }
    }

    if (canvas.zoom !== undefined && (canvas.zoom <= 0 || canvas.zoom > 10)) {
      warnings.push('Field "canvas.zoom" has unusual value (expected 0 < zoom <= 10)');
    }

    if (canvas.width !== undefined && canvas.width <= 0) {
      errors.push('Field "canvas.width" must be positive');
    }

    if (canvas.height !== undefined && canvas.height <= 0) {
      errors.push('Field "canvas.height" must be positive');
    }
  },

  /**
   * Validate underlay object
   */
  validateUnderlay(underlay, errors, warnings) {
    if (typeof underlay !== 'object' || underlay === null) {
      errors.push('Field "underlay" must be an object or null');
      return;
    }

    // Must have either dataUrl or sourceUrl
    if (!underlay.dataUrl && !underlay.sourceUrl) {
      warnings.push('Underlay has neither dataUrl nor sourceUrl - image may not load');
    }

    if (underlay.dataUrl && typeof underlay.dataUrl !== 'string') {
      errors.push('Field "underlay.dataUrl" must be a string');
    }

    if (underlay.sourceUrl && typeof underlay.sourceUrl !== 'string') {
      errors.push('Field "underlay.sourceUrl" must be a string');
    }

    // Validate numeric fields
    const numericFields = ['x', 'y', 'scale', 'opacity'];
    for (const field of numericFields) {
      if (underlay[field] !== undefined && typeof underlay[field] !== 'number') {
        errors.push(`Field "underlay.${field}" must be a number`);
      }
    }

    if (underlay.scale !== undefined && (underlay.scale < 0.1 || underlay.scale > 5)) {
      warnings.push('Field "underlay.scale" has unusual value (expected 0.1 to 5.0)');
    }

    if (underlay.opacity !== undefined && (underlay.opacity < 0 || underlay.opacity > 1)) {
      errors.push('Field "underlay.opacity" must be between 0 and 1');
    }

    if (underlay.visible !== undefined && typeof underlay.visible !== 'boolean') {
      errors.push('Field "underlay.visible" must be a boolean');
    }
  },

  /**
   * Validate sections array
   */
  validateSections(sections, errors, warnings) {
    if (!Array.isArray(sections)) {
      errors.push('Field "sections" must be an array');
      return;
    }

    const sectionIds = new Set();

    sections.forEach((section, index) => {
      this.validateSection(section, index, errors, warnings, sectionIds);
    });
  },

  /**
   * Validate a single section
   */
  validateSection(section, index, errors, warnings, sectionIds) {
    const prefix = `sections[${index}]`;

    if (typeof section !== 'object' || section === null) {
      errors.push(`${prefix} must be an object`);
      return;
    }

    // Check for unique ID
    if (!section.id) {
      warnings.push(`${prefix}: Missing "id" field`);
    } else {
      if (sectionIds.has(section.id)) {
        errors.push(`${prefix}: Duplicate section ID "${section.id}"`);
      }
      sectionIds.add(section.id);
    }

    // Validate type
    const validTypes = ['regular', 'ga'];
    if (section.type && !validTypes.includes(section.type)) {
      errors.push(`${prefix}: Invalid type "${section.type}". Expected: ${validTypes.join(', ')}`);
    }

    // Required position/dimension fields
    const positionFields = ['x', 'y', 'width', 'height'];
    for (const field of positionFields) {
      if (section[field] === undefined) {
        errors.push(`${prefix}: Missing required field "${field}"`);
      } else if (typeof section[field] !== 'number') {
        errors.push(`${prefix}: Field "${field}" must be a number`);
      }
    }

    // Validate base object
    if (section.base) {
      this.validateSectionBase(section.base, prefix, errors, warnings);
    }

    // Validate transform object
    if (section.transform) {
      this.validateSectionTransform(section.transform, prefix, errors, warnings);
    }

    // Validate rowLabels object
    if (section.rowLabels) {
      this.validateRowLabels(section.rowLabels, prefix, errors, warnings);
    }

    // Validate seatNumbering object
    if (section.seatNumbering) {
      this.validateSeatNumbering(section.seatNumbering, prefix, errors, warnings);
    }

    // Validate seats array
    if (section.seats) {
      this.validateSeats(section.seats, prefix, section.type, errors, warnings);
    }

    // Validate style object
    if (section.style) {
      this.validateSectionStyle(section.style, prefix, errors, warnings);
    }

    // GA-specific validation
    if (section.type === 'ga') {
      if (!section.ga) {
        warnings.push(`${prefix}: GA section missing "ga" object with capacity`);
      } else if (typeof section.ga.capacity !== 'number') {
        errors.push(`${prefix}: GA section "ga.capacity" must be a number`);
      }
    }

    // Zone-specific validation
    if (section.isZone) {
      if (section.points && !Array.isArray(section.points)) {
        errors.push(`${prefix}: Zone "points" must be an array`);
      } else if (section.points && section.points.length < 6) {
        errors.push(`${prefix}: Zone "points" must have at least 6 values (3 vertices)`);
      }
    }
  },

  /**
   * Validate section base object
   */
  validateSectionBase(base, prefix, errors, warnings) {
    const fields = ['rows', 'columns', 'baseWidth', 'baseHeight'];
    for (const field of fields) {
      if (base[field] !== undefined && typeof base[field] !== 'number') {
        errors.push(`${prefix}.base.${field} must be a number`);
      }
    }
  },

  /**
   * Validate section transform object
   */
  validateSectionTransform(transform, prefix, errors, warnings) {
    const fields = ['rotation', 'curve', 'stretchH', 'stretchV'];
    for (const field of fields) {
      if (transform[field] !== undefined && typeof transform[field] !== 'number') {
        errors.push(`${prefix}.transform.${field} must be a number`);
      }
    }

    if (transform.rotation !== undefined && (transform.rotation < -180 || transform.rotation > 180)) {
      warnings.push(`${prefix}.transform.rotation should be between -180 and 180`);
    }

    if (transform.curve !== undefined && (transform.curve < 0 || transform.curve > 100)) {
      warnings.push(`${prefix}.transform.curve should be between 0 and 100`);
    }
  },

  /**
   * Validate row labels object
   */
  validateRowLabels(rowLabels, prefix, errors, warnings) {
    const validTypes = ['none', 'numbers', 'letters'];
    if (rowLabels.type && !validTypes.includes(rowLabels.type)) {
      errors.push(`${prefix}.rowLabels.type must be one of: ${validTypes.join(', ')}`);
    }

    if (rowLabels.reversed !== undefined && typeof rowLabels.reversed !== 'boolean') {
      errors.push(`${prefix}.rowLabels.reversed must be a boolean`);
    }

    if (rowLabels.showLeft !== undefined && typeof rowLabels.showLeft !== 'boolean') {
      errors.push(`${prefix}.rowLabels.showLeft must be a boolean`);
    }

    if (rowLabels.showRight !== undefined && typeof rowLabels.showRight !== 'boolean') {
      errors.push(`${prefix}.rowLabels.showRight must be a boolean`);
    }

    if (rowLabels.spacing !== undefined) {
      if (typeof rowLabels.spacing !== 'number') {
        errors.push(`${prefix}.rowLabels.spacing must be a number`);
      } else if (rowLabels.spacing < 5 || rowLabels.spacing > 50) {
        warnings.push(`${prefix}.rowLabels.spacing should be between 5 and 50`);
      }
    }
  },

  /**
   * Validate seat numbering object
   */
  validateSeatNumbering(seatNumbering, prefix, errors, warnings) {
    if (seatNumbering.start !== undefined && typeof seatNumbering.start !== 'number') {
      errors.push(`${prefix}.seatNumbering.start must be a number`);
    }

    if (seatNumbering.reversed !== undefined && typeof seatNumbering.reversed !== 'boolean') {
      errors.push(`${prefix}.seatNumbering.reversed must be a boolean`);
    }
  },

  /**
   * Validate seats array
   */
  validateSeats(seats, prefix, sectionType, errors, warnings) {
    if (!Array.isArray(seats)) {
      errors.push(`${prefix}.seats must be an array`);
      return;
    }

    // GA sections should have empty seats array
    if (sectionType === 'ga' && seats.length > 0) {
      warnings.push(`${prefix}: GA section should have empty seats array`);
    }

    const seatIds = new Set();

    seats.forEach((seat, seatIndex) => {
      this.validateSeat(seat, `${prefix}.seats[${seatIndex}]`, errors, warnings, seatIds);
    });
  },

  /**
   * Validate a single seat
   */
  validateSeat(seat, prefix, errors, warnings, seatIds) {
    if (typeof seat !== 'object' || seat === null) {
      errors.push(`${prefix} must be an object`);
      return;
    }

    // Check for unique seat ID
    if (seat.id) {
      if (seatIds.has(seat.id)) {
        errors.push(`${prefix}: Duplicate seat ID "${seat.id}"`);
      }
      seatIds.add(seat.id);
    }

    // Support both sparse format (r, c, x, y, n) and legacy format (rowIndex, colIndex, etc.)
    const hasSparseFormat = seat.r !== undefined || seat.c !== undefined;
    const hasLegacyFormat = seat.rowIndex !== undefined || seat.colIndex !== undefined;

    if (hasSparseFormat) {
      // Sparse format validation
      if (seat.r !== undefined && typeof seat.r !== 'number') {
        errors.push(`${prefix}.r must be a number`);
      }
      if (seat.c !== undefined && typeof seat.c !== 'number') {
        errors.push(`${prefix}.c must be a number`);
      }
      if (seat.x !== undefined && typeof seat.x !== 'number') {
        errors.push(`${prefix}.x must be a number`);
      }
      if (seat.y !== undefined && typeof seat.y !== 'number') {
        errors.push(`${prefix}.y must be a number`);
      }
    } else if (hasLegacyFormat) {
      // Legacy format validation
      if (seat.rowIndex !== undefined && typeof seat.rowIndex !== 'number') {
        errors.push(`${prefix}.rowIndex must be a number`);
      }
      if (seat.colIndex !== undefined && typeof seat.colIndex !== 'number') {
        errors.push(`${prefix}.colIndex must be a number`);
      }
      if (seat.baseX !== undefined && typeof seat.baseX !== 'number') {
        errors.push(`${prefix}.baseX must be a number`);
      }
      if (seat.baseY !== undefined && typeof seat.baseY !== 'number') {
        errors.push(`${prefix}.baseY must be a number`);
      }
    }
  },

  /**
   * Validate section style object
   */
  validateSectionStyle(style, prefix, errors, warnings) {
    if (typeof style !== 'object' || style === null) {
      errors.push(`${prefix}.style must be an object`);
      return;
    }

    // Numeric color fields
    const numericColorFields = ['seatColor', 'seatTextColor', 'sectionColor'];
    for (const field of numericColorFields) {
      if (style[field] !== undefined && typeof style[field] !== 'number') {
        errors.push(`${prefix}.style.${field} must be a number`);
      }
    }

    // String color fields (legacy)
    const stringColorFields = ['fillColor', 'borderColor'];
    for (const field of stringColorFields) {
      if (style[field] !== undefined && typeof style[field] !== 'string') {
        errors.push(`${prefix}.style.${field} must be a string`);
      }
    }

    // Boolean fields
    const booleanFields = ['fillVisible', 'strokeVisible'];
    for (const field of booleanFields) {
      if (style[field] !== undefined && typeof style[field] !== 'boolean') {
        errors.push(`${prefix}.style.${field} must be a boolean`);
      }
    }

    // Opacity
    if (style.opacity !== undefined) {
      if (typeof style.opacity !== 'number') {
        errors.push(`${prefix}.style.opacity must be a number`);
      } else if (style.opacity < 0 || style.opacity > 1) {
        errors.push(`${prefix}.style.opacity must be between 0 and 1`);
      }
    }
  },

  /**
   * Check if version string is valid semver format
   */
  isValidVersion(version) {
    return /^\d+\.\d+\.\d+$/.test(version);
  },

  /**
   * Quick validation - just check if file can be loaded
   * @param {Object} data - The parsed JSON data
   * @returns {boolean}
   */
  isValid(data) {
    return this.validate(data).valid;
  },

  /**
   * Format validation results as a readable string
   * @param {Object} results - Results from validate()
   * @returns {string}
   */
  formatResults(results) {
    const lines = [];

    if (results.valid) {
      lines.push('✓ SMF file is valid');
    } else {
      lines.push('✗ SMF file has validation errors');
    }

    if (results.errors.length > 0) {
      lines.push('\nErrors:');
      results.errors.forEach(err => lines.push(`  ✗ ${err}`));
    }

    if (results.warnings.length > 0) {
      lines.push('\nWarnings:');
      results.warnings.forEach(warn => lines.push(`  ⚠ ${warn}`));
    }

    return lines.join('\n');
  }
};
