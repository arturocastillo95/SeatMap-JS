/**
 * SelectionManager - Handles seat selection logic and orphan detection
 */

export class SelectionManager {
    /**
     * @param {Object} options - Configuration options
     * @param {number} options.maxSelectedSeats - Maximum seats allowed
     * @param {boolean} options.preventOrphanSeats - Enable orphan prevention
     * @param {HTMLElement} options.container - DOM container for events
     */
    constructor(options = {}) {
        this.options = {
            maxSelectedSeats: 10,
            preventOrphanSeats: true,
            ...options
        };
        
        this.selectedSeats = new Set();
        this.seatsByRow = {}; // seatsByRow[sectionId][rowIndex] = [sorted seats]
        this.container = options.container;
    }

    /**
     * Register a seat in the row-indexed lookup
     * @param {PIXI.Container} seatContainer - The seat container
     * @param {string} sectionId - Section identifier
     * @param {number} rowIndex - Row index
     */
    registerSeat(seatContainer, sectionId, rowIndex) {
        if (!this.seatsByRow[sectionId]) {
            this.seatsByRow[sectionId] = {};
        }
        if (!this.seatsByRow[sectionId][rowIndex]) {
            this.seatsByRow[sectionId][rowIndex] = [];
        }
        this.seatsByRow[sectionId][rowIndex].push(seatContainer);
    }

    /**
     * Sort all registered rows by x-position for adjacency detection
     */
    sortAllRows() {
        for (const sectionId in this.seatsByRow) {
            for (const rowIndex in this.seatsByRow[sectionId]) {
                this.seatsByRow[sectionId][rowIndex].sort((a, b) => a.x - b.x);
            }
        }
    }

    /**
     * Clear all seat registrations
     */
    clearRegistrations() {
        this.seatsByRow = {};
    }

    /**
     * Check if selection limit is reached
     * @returns {boolean}
     */
    isLimitReached() {
        return this.selectedSeats.size >= this.options.maxSelectedSeats;
    }

    /**
     * Get current selection count
     * @returns {number}
     */
    getSelectionCount() {
        return this.selectedSeats.size;
    }

    /**
     * Get all selected seats
     * @returns {Set<PIXI.Container>}
     */
    getSelectedSeats() {
        return this.selectedSeats;
    }

    /**
     * Select a seat
     * @param {PIXI.Container} seatContainer
     * @returns {boolean} Success
     */
    select(seatContainer) {
        if (this.isLimitReached()) {
            return false;
        }
        this.selectedSeats.add(seatContainer);
        seatContainer.selected = true;
        return true;
    }

    /**
     * Deselect a seat
     * @param {PIXI.Container} seatContainer
     */
    deselect(seatContainer) {
        this.selectedSeats.delete(seatContainer);
        seatContainer.selected = false;
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        for (const seat of this.selectedSeats) {
            seat.selected = false;
        }
        this.selectedSeats.clear();
    }

    /**
     * Check if a seat is available (not booked/reserved)
     * @param {PIXI.Container} seatContainer 
     * @returns {boolean}
     */
    isSeatAvailable(seatContainer) {
        const status = seatContainer.seatData.status || 'available';
        return status === 'available';
    }

    /**
     * Get adjacent seats (left and right neighbors)
     * @param {PIXI.Container} seatContainer 
     * @returns {{ left: PIXI.Container|null, right: PIXI.Container|null }}
     */
    getAdjacentSeats(seatContainer) {
        const sectionId = seatContainer.sectionId;
        const rowIndex = seatContainer.seatData.r ?? seatContainer.seatData.rowIndex;
        
        if (!this.seatsByRow[sectionId] || !this.seatsByRow[sectionId][rowIndex]) {
            return { left: null, right: null };
        }
        
        const rowSeats = this.seatsByRow[sectionId][rowIndex];
        const index = rowSeats.indexOf(seatContainer);
        
        if (index === -1) {
            return { left: null, right: null };
        }
        
        return {
            left: index > 0 ? rowSeats[index - 1] : null,
            right: index < rowSeats.length - 1 ? rowSeats[index + 1] : null
        };
    }

    /**
     * Check if selecting/deselecting a seat would create an orphan
     * @param {PIXI.Container} seatContainer - The seat being clicked
     * @param {string} action - 'select' or 'deselect'
     * @returns {{ wouldCreateOrphan: boolean, orphanSeats: PIXI.Container[] }}
     */
    wouldCreateOrphan(seatContainer, action) {
        const sectionId = seatContainer.sectionId;
        const rowIndex = seatContainer.seatData.r ?? seatContainer.seatData.rowIndex;
        
        if (!this.seatsByRow[sectionId] || !this.seatsByRow[sectionId][rowIndex]) {
            return { wouldCreateOrphan: false, orphanSeats: [] };
        }
        
        const rowSeats = this.seatsByRow[sectionId][rowIndex];
        const seatIndex = rowSeats.indexOf(seatContainer);
        
        if (seatIndex === -1) {
            return { wouldCreateOrphan: false, orphanSeats: [] };
        }
        
        // Simulate the state after the action
        const simulatedSelection = rowSeats.map((seat, idx) => {
            if (!this.isSeatAvailable(seat)) return false;
            if (idx === seatIndex) return action === 'select';
            return seat.selected;
        });
        
        const totalSelected = simulatedSelection.filter(s => s).length;
        
        if (totalSelected <= 1) {
            return { wouldCreateOrphan: false, orphanSeats: [] };
        }
        
        const orphanSeats = [];
        
        if (action === 'select') {
            // Check for single-seat gaps
            for (let i = 0; i < simulatedSelection.length; i++) {
                if (simulatedSelection[i]) continue;
                if (!this.isSeatAvailable(rowSeats[i])) continue;
                
                let leftBoundary = false;
                let leftSelected = false;
                
                if (i === 0) {
                    leftBoundary = true;
                } else {
                    for (let j = i - 1; j >= 0; j--) {
                        if (!this.isSeatAvailable(rowSeats[j])) {
                            leftBoundary = true;
                            break;
                        }
                        if (simulatedSelection[j]) {
                            leftSelected = true;
                            break;
                        }
                        break;
                    }
                }
                
                let rightBoundary = false;
                let rightSelected = false;
                
                if (i === simulatedSelection.length - 1) {
                    rightBoundary = true;
                } else {
                    for (let j = i + 1; j < simulatedSelection.length; j++) {
                        if (!this.isSeatAvailable(rowSeats[j])) {
                            rightBoundary = true;
                            break;
                        }
                        if (simulatedSelection[j]) {
                            rightSelected = true;
                            break;
                        }
                        break;
                    }
                }
                
                const isMiddleGap = leftSelected && rightSelected;
                const isLeftEdgeGap = leftBoundary && rightSelected;
                const isRightEdgeGap = leftSelected && rightBoundary;
                const isAdjacentToClicked = (i === seatIndex - 1) || (i === seatIndex + 1);
                
                if (isMiddleGap) {
                    orphanSeats.push(rowSeats[i]);
                } else if ((isLeftEdgeGap || isRightEdgeGap) && !isAdjacentToClicked) {
                    orphanSeats.push(rowSeats[i]);
                }
            }
        } else {
            // For deselecting: check for isolated seats
            for (let i = 0; i < simulatedSelection.length; i++) {
                if (!simulatedSelection[i]) continue;
                if (!this.isSeatAvailable(rowSeats[i])) continue;
                
                let hasSelectedNeighbor = false;
                
                if (i > 0 && this.isSeatAvailable(rowSeats[i - 1]) && simulatedSelection[i - 1]) {
                    hasSelectedNeighbor = true;
                }
                
                if (i < simulatedSelection.length - 1 && this.isSeatAvailable(rowSeats[i + 1]) && simulatedSelection[i + 1]) {
                    hasSelectedNeighbor = true;
                }
                
                if (!hasSelectedNeighbor) {
                    orphanSeats.push(rowSeats[i]);
                }
            }
        }
        
        return {
            wouldCreateOrphan: orphanSeats.length > 0,
            orphanSeats: orphanSeats
        };
    }

    /**
     * Validate and attempt a selection/deselection action
     * @param {PIXI.Container} seatContainer - The seat being clicked
     * @returns {{ success: boolean, reason?: string, orphanSeats?: Array }}
     */
    validateAction(seatContainer) {
        const status = seatContainer.seatData.status || 'available';
        
        // Check if seat is available
        if (status !== 'available') {
            return { success: false, reason: 'unavailable', status };
        }
        
        const action = seatContainer.selected ? 'deselect' : 'select';
        
        // Check selection limit
        if (action === 'select' && this.isLimitReached()) {
            this.dispatchEvent('selection-limit-reached', { limit: this.options.maxSelectedSeats });
            return { success: false, reason: 'limit-reached', limit: this.options.maxSelectedSeats };
        }
        
        // Check orphan prevention
        if (this.options.preventOrphanSeats) {
            const orphanCheck = this.wouldCreateOrphan(seatContainer, action);
            
            if (orphanCheck.wouldCreateOrphan) {
                const orphanSeatLabels = orphanCheck.orphanSeats.map(s => {
                    const row = s.seatData.rl || s.seatData.rowLabel || s.seatData.r;
                    const seat = s.seatData.n || s.seatData.sl || s.seatData.seatLabel || s.seatData.s;
                    return `Row ${row}, Seat ${seat}`;
                }).join('; ');
                
                const message = action === 'deselect'
                    ? `Cannot deselect this seat: it would leave ${orphanCheck.orphanSeats.length === 1 ? 'a single seat' : 'single seats'} isolated (${orphanSeatLabels})`
                    : `Cannot select this seat: it would leave ${orphanCheck.orphanSeats.length === 1 ? 'a single seat' : 'single seats'} isolated (${orphanSeatLabels})`;
                
                this.dispatchEvent('orphan-seat-blocked', {
                    action,
                    seat: seatContainer.seatData,
                    sectionId: seatContainer.sectionId,
                    orphanSeats: orphanCheck.orphanSeats.map(s => s.seatData),
                    message,
                    orphanCount: orphanCheck.orphanSeats.length
                });
                
                return { 
                    success: false, 
                    reason: 'orphan-prevention', 
                    message,
                    orphanSeats: orphanCheck.orphanSeats 
                };
            }
        }
        
        return { success: true, action };
    }

    /**
     * Toggle seat selection with validation
     * @param {PIXI.Container} seatContainer
     * @returns {{ success: boolean, selected?: boolean, reason?: string }}
     */
    toggleSelection(seatContainer) {
        const validation = this.validateAction(seatContainer);
        
        if (!validation.success) {
            return validation;
        }
        
        if (seatContainer.selected) {
            this.deselect(seatContainer);
            return { success: true, selected: false };
        } else {
            this.select(seatContainer);
            return { success: true, selected: true };
        }
    }

    /**
     * Dispatch a custom event on the container
     * @param {string} eventName
     * @param {Object} detail
     */
    dispatchEvent(eventName, detail) {
        if (this.container) {
            const event = new CustomEvent(eventName, { detail });
            this.container.dispatchEvent(event);
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        this.selectedSeats.clear();
        this.seatsByRow = {};
        this.container = null;
    }
}
