/**
 * CartManager - Handles cart state and events
 */

export class CartManager {
    /**
     * @param {Object} options - Configuration options
     * @param {HTMLElement} options.container - DOM container for events
     * @param {Function} options.onCartChange - Cart change callback
     * @param {Function} options.getPromo - Function to get promo for a section
     */
    constructor(options = {}) {
        this.container = options.container;
        this.onCartChange = options.onCartChange;
        this.getPromo = options.getPromo || (() => null);
    }

    /**
     * Set the promo lookup function
     * @param {Function} getPromoFn - Function that takes sectionName and returns promo object
     */
    setPromoLookup(getPromoFn) {
        this.getPromo = getPromoFn;
    }

    /**
     * Get seat price with fallback to section pricing
     * @param {Object} seatData 
     * @param {Object} sectionPricing 
     * @returns {number}
     */
    getBaseSeatPrice(seatData, sectionPricing) {
        return seatData.price ?? sectionPricing?.basePrice ?? 0;
    }

    /**
     * Calculate quantity-based promo pricing for a group of items
     * @param {number} quantity - Number of items
     * @param {number} basePrice - Base price per item
     * @param {Object} promo - Promo configuration
     * @returns {Object} { totalPrice, originalTotal, paidItems, freeItems, pricePerItem, promoId, promoType }
     */
    calculateQuantityPromo(quantity, basePrice, promo) {
        const originalTotal = quantity * basePrice;
        
        if (!promo || basePrice <= 0) {
            return {
                totalPrice: originalTotal,
                originalTotal,
                paidItems: quantity,
                freeItems: 0,
                pricePerItem: basePrice,
                promoId: null,
                promoType: null
            };
        }

        // Quantity-based promo (2x1, 3x1, etc.)
        if (promo.buyX !== undefined && promo.getY !== undefined) {
            const groupSize = promo.buyX + promo.getY;  // e.g., 2+1=3
            const fullGroups = Math.floor(quantity / groupSize);
            const remainder = quantity % groupSize;
            
            // Full groups: pay for buyX, get getY free
            const paidInGroups = fullGroups * promo.buyX;
            // Remainder: pay full price (no free seats unless you complete the group)
            const paidRemainder = remainder;
            
            const totalPaid = paidInGroups + paidRemainder;
            const freeItems = fullGroups * promo.getY;
            
            return {
                totalPrice: totalPaid * basePrice,
                originalTotal,
                paidItems: totalPaid,
                freeItems,
                pricePerItem: basePrice,  // Individual items still show base price
                promoId: promo.id || null,
                promoType: 'quantity',
                buyX: promo.buyX,
                getY: promo.getY
            };
        }

        // Percentage discount
        if (promo.discount !== undefined) {
            const discountedPrice = Math.round(basePrice * (1 - promo.discount));
            return {
                totalPrice: quantity * discountedPrice,
                originalTotal,
                paidItems: quantity,
                freeItems: 0,
                pricePerItem: discountedPrice,
                originalPricePerItem: basePrice,
                promoId: promo.id || null,
                promoType: 'percentage',
                discountPercent: promo.discount * 100
            };
        }

        // Fixed discounted price
        if (promo.discountedPrice !== undefined) {
            return {
                totalPrice: quantity * promo.discountedPrice,
                originalTotal,
                paidItems: quantity,
                freeItems: 0,
                pricePerItem: promo.discountedPrice,
                originalPricePerItem: basePrice,
                promoId: promo.id || null,
                promoType: 'fixed'
            };
        }

        return {
            totalPrice: originalTotal,
            originalTotal,
            paidItems: quantity,
            freeItems: 0,
            pricePerItem: basePrice,
            promoId: null,
            promoType: null
        };
    }

    /**
     * Get seat price with promo discount applied (for individual seat display)
     * Note: For quantity-based promos (2x1), this returns the base price since
     * the discount only applies when calculating the total.
     * @param {Object} seatData 
     * @param {Object} sectionPricing 
     * @param {string} sectionName - Section name for promo lookup
     * @returns {Object} { price, originalPrice, hasDiscount, promoId, isQuantityPromo }
     */
    getSeatPrice(seatData, sectionPricing, sectionName = null) {
        const basePrice = this.getBaseSeatPrice(seatData, sectionPricing);
        
        if (!sectionName) {
            return { price: basePrice, originalPrice: null, hasDiscount: false, promoId: null, isQuantityPromo: false };
        }

        const promo = this.getPromo(sectionName);
        if (promo && basePrice > 0) {
            // Quantity-based promos don't show per-seat discount
            if (promo.buyX !== undefined && promo.getY !== undefined) {
                return { 
                    price: basePrice, 
                    originalPrice: null, 
                    hasDiscount: false, 
                    promoId: promo.id || null,
                    isQuantityPromo: true,
                    buyX: promo.buyX,
                    getY: promo.getY
                };
            }
            
            // Percentage discount
            if (promo.discount !== undefined) {
                const discountedPrice = Math.round(basePrice * (1 - promo.discount));
                return { price: discountedPrice, originalPrice: basePrice, hasDiscount: true, promoId: promo.id || null, isQuantityPromo: false };
            }
            
            // Fixed discounted price
            if (promo.discountedPrice !== undefined) {
                return { price: promo.discountedPrice, originalPrice: basePrice, hasDiscount: true, promoId: promo.id || null, isQuantityPromo: false };
            }
        }

        return { price: basePrice, originalPrice: null, hasDiscount: false, promoId: null, isQuantityPromo: false };
    }

    /**
     * Build cart data from selected seats and GA selections
     * @param {Set<PIXI.Container>} selectedSeats
     * @param {Array} gaSelections - Array of GA selections
     * @returns {Object} Cart data
     */
    buildCartData(selectedSeats, gaSelections = []) {
        // Group seats by section for quantity-based promo calculations
        const sectionGroups = new Map();
        
        const seats = Array.from(selectedSeats).map(container => {
            const data = container.seatData;
            const sectionName = container.sectionName || container.sectionId;
            const basePrice = this.getBaseSeatPrice(data, container.sectionPricing);
            const priceInfo = this.getSeatPrice(data, container.sectionPricing, sectionName);
            
            // Track seats by section for quantity promo calculation
            if (!sectionGroups.has(sectionName)) {
                sectionGroups.set(sectionName, {
                    seats: [],
                    basePrice: basePrice,
                    promo: this.getPromo(sectionName)
                });
            }
            sectionGroups.get(sectionName).seats.push(container);
            
            // Convert numeric seat color to hex string
            const seatColorNum = container.seatColor;
            const seatColorHex = seatColorNum !== undefined 
                ? '#' + seatColorNum.toString(16).padStart(6, '0')
                : '#3b82f6';

            return {
                id: data.id,
                key: container.key,
                sectionId: container.sectionId,
                sectionName: sectionName,
                row: data.rn || data.rowName || data.row || (data.r !== undefined ? String.fromCharCode(65 + data.r) : ''),
                seat: data.sn || data.seatNumber || data.seat || data.c || '',
                price: priceInfo.price,
                originalPrice: priceInfo.originalPrice,
                hasDiscount: priceInfo.hasDiscount,
                isQuantityPromo: priceInfo.isQuantityPromo,
                promoId: priceInfo.promoId,
                special: data.sn || data.specialNeeds || data.special || null,
                color: seatColorHex
            };
        });

        // Calculate section summaries with quantity-based promos
        const sectionSummaries = {};
        for (const [sectionName, group] of sectionGroups) {
            const promoCalc = this.calculateQuantityPromo(
                group.seats.length,
                group.basePrice,
                group.promo
            );
            sectionSummaries[sectionName] = {
                quantity: group.seats.length,
                basePrice: group.basePrice,
                ...promoCalc
            };
        }

        // Format GA selections for cart (with promo support)
        const ga = gaSelections.map(selection => {
            const sectionName = selection.sectionName || selection.sectionId;
            const promo = this.getPromo(sectionName);
            const basePrice = selection.pricePerItem || 0;
            
            // Calculate with quantity promo
            const promoCalc = this.calculateQuantityPromo(
                selection.quantity,
                basePrice,
                promo
            );

            return {
                sectionId: selection.sectionId,
                sectionName: sectionName,
                quantity: selection.quantity,
                pricePerTicket: promoCalc.pricePerItem,
                originalPricePerTicket: promoCalc.originalPricePerItem || null,
                hasDiscount: promoCalc.promoType !== null,
                isQuantityPromo: promoCalc.promoType === 'quantity',
                promoId: promoCalc.promoId,
                paidItems: promoCalc.paidItems,
                freeItems: promoCalc.freeItems,
                totalPrice: promoCalc.totalPrice,
                originalTotal: promoCalc.originalTotal,
                color: selection.color || '#3b82f6'
            };
        });

        // Calculate total item count (seats + GA tickets)
        const gaCount = ga.reduce((sum, item) => sum + item.quantity, 0);
        const totalCount = seats.length + gaCount;
        
        // Calculate grand totals
        let seatsTotal = 0;
        let seatsOriginalTotal = 0;
        for (const summary of Object.values(sectionSummaries)) {
            seatsTotal += summary.totalPrice;
            seatsOriginalTotal += summary.originalTotal;
        }
        
        const gaTotal = ga.reduce((sum, item) => sum + item.totalPrice, 0);
        const gaOriginalTotal = ga.reduce((sum, item) => sum + item.originalTotal, 0);

        return {
            seats: seats,
            ga: ga,
            sectionSummaries: sectionSummaries,
            seatCount: seats.length,
            gaCount: gaCount,
            totalCount: totalCount,
            seatsTotal: seatsTotal,
            seatsOriginalTotal: seatsOriginalTotal,
            gaTotal: gaTotal,
            gaOriginalTotal: gaOriginalTotal,
            grandTotal: seatsTotal + gaTotal,
            grandOriginalTotal: seatsOriginalTotal + gaOriginalTotal,
            totalSavings: (seatsOriginalTotal + gaOriginalTotal) - (seatsTotal + gaTotal)
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
     * Get total price of selected seats (with discounts applied)
     * @param {Set<PIXI.Container>} selectedSeats
     * @param {Array} gaSelections - Array of GA selections
     * @returns {number}
     */
    getTotalPrice(selectedSeats, gaSelections = []) {
        const cartData = this.buildCartData(selectedSeats, gaSelections);
        return cartData.grandTotal;
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
            seatCount: cartData.seatCount,
            gaCount: cartData.gaCount,
            totalCount: cartData.totalCount,
            totalPrice: cartData.grandTotal,
            originalTotal: cartData.grandOriginalTotal,
            totalSavings: cartData.totalSavings,
            sectionSummaries: cartData.sectionSummaries,
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
