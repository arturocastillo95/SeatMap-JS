/**
 * InventoryManager - Handles inventory data loading and seat status updates
 */

export class InventoryManager {
    /**
     * @param {Object} options - Configuration
     * @param {Object} options.config - Renderer configuration
     */
    constructor(options = {}) {
        this.config = options.config || {};
        this.seatsByKey = {};
        this.seatsById = {};
        this._unmatchedKeys = [];
    }

    /**
     * Register a seat for inventory lookup
     * @param {PIXI.Container} seatContainer
     * @param {string} key - Lookup key
     * @param {string} id - Seat ID
     */
    registerSeat(seatContainer, key, id) {
        if (key) {
            this.seatsByKey[key] = seatContainer;
        }
        if (id) {
            this.seatsById[id] = seatContainer;
        }
    }

    /**
     * Clear all seat registrations
     */
    clearRegistrations() {
        this.seatsByKey = {};
        this.seatsById = {};
        this._unmatchedKeys = [];
    }

    /**
     * Validate inventory data structure
     * @param {Object} data
     * @returns {boolean}
     */
    validateInventoryData(data) {
        return data 
            && typeof data === 'object' 
            && Array.isArray(data.seats);
    }

    /**
     * Load inventory data and update seats
     * @param {Object} inventoryData
     * @param {Function} updateSeatVisuals - Callback to update seat visuals
     * @returns {{ success: boolean, matched: number, unmatched: number }}
     */
    loadInventory(inventoryData, updateSeatVisuals) {
        if (!this.validateInventoryData(inventoryData)) {
            console.error('Invalid inventory data structure:', inventoryData);
            return { success: false, matched: 0, unmatched: 0 };
        }

        this._unmatchedKeys = [];
        let matched = 0;

        inventoryData.seats.forEach(item => {
            if (!item.key && !item.id) {
                console.warn('Invalid seat item, missing key or id:', item);
                return;
            }

            let seatContainer;
            let lookupKey;

            if (item.id) {
                seatContainer = this.seatsById[item.id];
                lookupKey = item.id;
            } else {
                seatContainer = this.seatsByKey[item.key];
                lookupKey = item.key;
            }

            if (seatContainer) {
                // Merge inventory data into seat data
                seatContainer.seatData = { ...seatContainer.seatData, ...item };
                
                // Update visuals
                if (updateSeatVisuals) {
                    updateSeatVisuals(seatContainer);
                }
                matched++;
            } else {
                console.warn(`Seat not found for lookup: ${lookupKey}`);
                this._unmatchedKeys.push(lookupKey);
            }
        });

        if (this._unmatchedKeys.length > 0) {
            console.warn(`Found ${this._unmatchedKeys.length} unmatched inventory keys.`);
        }

        return { 
            success: true, 
            matched, 
            unmatched: this._unmatchedKeys.length 
        };
    }

    /**
     * Get unmatched inventory keys
     * @returns {string[]}
     */
    getUnmatchedKeys() {
        return this._unmatchedKeys;
    }

    /**
     * Get a seat by key
     * @param {string} key
     * @returns {PIXI.Container|undefined}
     */
    getSeatByKey(key) {
        return this.seatsByKey[key];
    }

    /**
     * Get a seat by ID
     * @param {string} id
     * @returns {PIXI.Container|undefined}
     */
    getSeatById(id) {
        return this.seatsById[id];
    }

    /**
     * Update seat visuals based on status
     * @param {PIXI.Container} seatContainer
     * @param {Function} createTexture - Texture creation function
     * @param {Function} handleCartChange - Cart change handler (for deselection)
     */
    updateSeatVisuals(seatContainer, createTexture, handleCartChange) {
        const status = seatContainer.seatData.status || 'available';
        
        let color = seatContainer.originalColor;
        let strokeColor = seatContainer.originalStrokeColor;
        let strokeWidth = seatContainer.originalStrokeWidth;
        let cursor = 'pointer';

        if (status === 'booked' || status === 'sold') {
            color = this.config.bookedColor || 0x8B8B8B;
            cursor = 'not-allowed';
            strokeWidth = 0;
        } else if (status === 'reserved') {
            color = this.config.reservedColor || 0xff6666;
            cursor = 'not-allowed'; 
            strokeWidth = 0;
        }

        // Update texture
        if (createTexture) {
            const texture = createTexture(
                this.config.seatRadius || 6,
                color,
                strokeWidth,
                strokeColor
            );
            
            const sprite = seatContainer.children.find(c => c instanceof PIXI.Sprite);
            if (sprite) {
                sprite.texture = texture;
            }
        }

        // Handle Glow
        const glowGraphics = seatContainer.children.find(c => c instanceof PIXI.Graphics);
        if (glowGraphics) {
            glowGraphics.visible = (status === 'available');
        }

        // Update interactivity
        seatContainer.eventMode = 'static';
        seatContainer.cursor = cursor;

        // Handle selection if status changed to unavailable
        if (status !== 'available' && seatContainer.selected) {
            seatContainer.selected = false;
            
            // Reset visual state
            seatContainer.targetScale = seatContainer.baseScale || 1;
            if (seatContainer.seatData.sn || seatContainer.seatData.specialNeeds) {
                seatContainer.text.text = 'accessible_forward';
            } else {
                seatContainer.text.text = seatContainer.originalLabel;
            }
            
            if (handleCartChange) {
                handleCartChange();
            }
        }
        
        seatContainer.seatColor = color;
    }

    /**
     * Cleanup
     */
    destroy() {
        this.seatsByKey = {};
        this.seatsById = {};
        this._unmatchedKeys = [];
    }
}
