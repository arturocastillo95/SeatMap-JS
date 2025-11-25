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
     * Build cart data from selected seats
     * @param {Set<PIXI.Container>} selectedSeats
     * @returns {Object} Cart data
     */
    buildCartData(selectedSeats) {
        const seats = Array.from(selectedSeats).map(container => {
            const data = container.seatData;
            const price = this.getSeatPrice(data, container.sectionPricing);

            return {
                id: data.id,
                key: container.key,
                price: price,
                special: data.sn || data.specialNeeds || data.special || null
            };
        });

        return {
            seats: seats,
            ga: [] // GA selection not yet implemented
        };
    }

    /**
     * Dispatch cart change event
     * @param {Set<PIXI.Container>} selectedSeats
     */
    handleCartChange(selectedSeats) {
        const cartData = this.buildCartData(selectedSeats);

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
     * @returns {number}
     */
    getTotalPrice(selectedSeats) {
        let total = 0;
        for (const container of selectedSeats) {
            total += this.getSeatPrice(container.seatData, container.sectionPricing);
        }
        return total;
    }

    /**
     * Get cart summary
     * @param {Set<PIXI.Container>} selectedSeats
     * @returns {Object}
     */
    getSummary(selectedSeats) {
        return {
            count: selectedSeats.size,
            totalPrice: this.getTotalPrice(selectedSeats),
            seats: this.buildCartData(selectedSeats).seats
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
