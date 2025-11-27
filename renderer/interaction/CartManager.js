/**
 * CartManager - Handles cart state and events
 */

export class CartManager {
    /**
     * @param {Object} options - Configuration options
     * @param {HTMLElement} options.container - DOM container for events
     * @param {Function} options.onCartChange - Cart change callback
     */
    constructor(options = {}) {
        this.container = options.container;
        this.onCartChange = options.onCartChange;
    }

    /**
     * Get seat price with fallback to section pricing
     * @param {Object} seatData 
     * @param {Object} sectionPricing 
     * @returns {number}
     */
    getSeatPrice(seatData, sectionPricing) {
        return seatData.price ?? sectionPricing?.basePrice ?? 0;
    }

    /**
     * Build cart data from selected seats and GA selections
     * @param {Set<PIXI.Container>} selectedSeats
     * @param {Array} gaSelections - Array of GA selections
     * @returns {Object} Cart data
     */
    buildCartData(selectedSeats, gaSelections = []) {
        const seats = Array.from(selectedSeats).map(container => {
            const data = container.seatData;
            const price = this.getSeatPrice(data, container.sectionPricing);
            
            // Convert numeric seat color to hex string
            const seatColorNum = container.seatColor;
            const seatColorHex = seatColorNum !== undefined 
                ? '#' + seatColorNum.toString(16).padStart(6, '0')
                : '#3b82f6';

            return {
                id: data.id,
                key: container.key,
                sectionId: container.sectionId,
                sectionName: container.sectionName || container.sectionId,
                row: data.rn || data.rowName || data.row || (data.r !== undefined ? String.fromCharCode(65 + data.r) : ''),
                seat: data.sn || data.seatNumber || data.seat || data.c || '',
                price: price,
                special: data.sn || data.specialNeeds || data.special || null,
                color: seatColorHex
            };
        });

        // Format GA selections for cart
        const ga = gaSelections.map(selection => ({
            sectionId: selection.sectionId,
            sectionName: selection.sectionName,
            quantity: selection.quantity,
            pricePerTicket: selection.pricePerItem,
            totalPrice: selection.totalPrice,
            color: selection.color || '#3b82f6'
        }));

        // Calculate total item count (seats + GA tickets)
        const gaCount = ga.reduce((sum, item) => sum + item.quantity, 0);
        const totalCount = seats.length + gaCount;

        return {
            seats: seats,
            ga: ga,
            seatCount: seats.length,
            gaCount: gaCount,
            totalCount: totalCount
        };
    }

    /**
     * Dispatch cart change event
     * @param {Set<PIXI.Container>} selectedSeats
     * @param {Array} gaSelections - Array of GA selections
     */
    handleCartChange(selectedSeats, gaSelections = []) {
        const cartData = this.buildCartData(selectedSeats, gaSelections);

        // Dispatch custom event
        if (this.container) {
            const event = new CustomEvent('cartChange', { detail: cartData });
            this.container.dispatchEvent(event);
        }

        // Call callback if provided
        if (this.onCartChange) {
            this.onCartChange(cartData);
        }

        return cartData;
    }

    /**
     * Get total price of selected seats
     * @param {Set<PIXI.Container>} selectedSeats
     * @param {Array} gaSelections - Array of GA selections
     * @returns {number}
     */
    getTotalPrice(selectedSeats, gaSelections = []) {
        let total = 0;
        for (const container of selectedSeats) {
            total += this.getSeatPrice(container.seatData, container.sectionPricing);
        }
        // Add GA totals
        for (const ga of gaSelections) {
            total += ga.totalPrice || 0;
        }
        return total;
    }

    /**
     * Get cart summary
     * @param {Set<PIXI.Container>} selectedSeats
     * @param {Array} gaSelections - Array of GA selections
     * @returns {Object}
     */
    getSummary(selectedSeats, gaSelections = []) {
        const cartData = this.buildCartData(selectedSeats, gaSelections);
        return {
            seatCount: selectedSeats.size,
            gaCount: gaSelections.reduce((sum, ga) => sum + ga.quantity, 0),
            totalPrice: this.getTotalPrice(selectedSeats, gaSelections),
            seats: cartData.seats,
            ga: cartData.ga
        };
    }

    /**
     * Update container reference
     * @param {HTMLElement} container
     */
    setContainer(container) {
        this.container = container;
    }

    /**
     * Update callback
     * @param {Function} callback
     */
    setOnCartChange(callback) {
        this.onCartChange = callback;
    }

    /**
     * Cleanup
     */
    destroy() {
        this.container = null;
        this.onCartChange = null;
    }
}
