/**
 * GASelectionManager - Handles GA (General Admission) quantity selection
 */

export class GASelectionManager {
    /**
     * @param {Object} options - Configuration options
     * @param {HTMLElement} options.container - DOM container for events
     * @param {number} options.maxSelectedSeats - Maximum total selections allowed
     * @param {Function} options.getCurrentSelectionCount - Function to get current seat selection count
     * @param {Function} options.onConfirm - Callback when GA selection is confirmed
     * @param {Function} options.onCancel - Callback when GA selection is cancelled
     */
    constructor(options = {}) {
        this.options = {
            maxSelectedSeats: 10,
            ...options
        };
        
        this.container = options.container;
        this.getCurrentSelectionCount = options.getCurrentSelectionCount || (() => 0);
        this.onConfirm = options.onConfirm;
        this.onCancel = options.onCancel;
        
        // GA selections: { sectionId: { data, quantity } }
        this.gaSelections = {};
        
        // GA inventory: { sectionId: { available, total } }
        this.gaInventory = {};
        
        this.dialog = null;
        this.currentSection = null;
    }

    /**
     * Load GA inventory data
     * @param {Object} inventoryData - Inventory data with ga array
     */
    loadInventory(inventoryData) {
        if (!inventoryData || !inventoryData.ga) return;
        
        inventoryData.ga.forEach(item => {
            if (item.sectionId || item.id) {
                const id = item.sectionId || item.id;
                this.gaInventory[id] = {
                    available: item.available ?? item.capacity ?? Infinity,
                    total: item.total ?? item.capacity ?? Infinity,
                    status: item.status || 'available'
                };
            }
        });
    }

    /**
     * Get available quantity for a GA section
     * @param {string} sectionId 
     * @returns {number}
     */
    getAvailableQuantity(sectionId) {
        const inventory = this.gaInventory[sectionId];
        if (!inventory) return Infinity;
        if (inventory.status === 'sold-out' || inventory.status === 'unavailable') return 0;
        return inventory.available;
    }

    /**
     * Get current GA selection count for a section
     * @param {string} sectionId 
     * @returns {number}
     */
    getSelectionCount(sectionId) {
        return this.gaSelections[sectionId]?.quantity || 0;
    }

    /**
     * Get total GA selections across all sections
     * @returns {number}
     */
    getTotalGASelections() {
        return Object.values(this.gaSelections).reduce((sum, sel) => sum + sel.quantity, 0);
    }

    /**
     * Get remaining slots available for selection
     * @returns {number}
     */
    getRemainingSlots() {
        const seatCount = this.getCurrentSelectionCount();
        const gaCount = this.getTotalGASelections();
        return this.options.maxSelectedSeats - seatCount - gaCount;
    }

    /**
     * Get max quantity user can select for a section
     * @param {string} sectionId 
     * @returns {number}
     */
    getMaxSelectableQuantity(sectionId) {
        const available = this.getAvailableQuantity(sectionId);
        const currentSelection = this.getSelectionCount(sectionId);
        const remaining = this.getRemainingSlots() + currentSelection; // Add back current selection
        return Math.min(available, remaining);
    }

    /**
     * Show GA selection dialog
     * @param {Object} sectionData - Section data
     */
    show(sectionData) {
        this.currentSection = sectionData;
        const sectionId = sectionData.id || sectionData.name;
        const currentQty = this.getSelectionCount(sectionId);
        const maxQty = this.getMaxSelectableQuantity(sectionId);
        
        // Create dialog if not exists
        if (!this.dialog) {
            this.createDialog();
        }
        
        // Update dialog content
        this.updateDialog(sectionData, currentQty, maxQty);
        
        // Show dialog
        this.dialog.style.display = 'flex';
    }

    /**
     * Create the dialog DOM element
     */
    createDialog() {
        this.dialog = document.createElement('div');
        this.dialog.className = 'ga-selection-dialog';
        this.dialog.innerHTML = `
            <div class="ga-dialog-backdrop"></div>
            <div class="ga-dialog-content">
                <div class="ga-dialog-header">
                    <span class="ga-dialog-title">General</span>
                </div>
                <div class="ga-dialog-section-info">
                    <span class="ga-dialog-section-name"></span>
                    <span class="ga-dialog-section-price"></span>
                </div>
                <div class="ga-dialog-body">
                    <p class="ga-dialog-label">Seleccione cantidad</p>
                    <div class="ga-dialog-quantity">
                        <button class="ga-qty-btn ga-qty-minus" type="button">
                            <span>−</span>
                        </button>
                        <span class="ga-qty-value">0</span>
                        <button class="ga-qty-btn ga-qty-plus" type="button">
                            <span>+</span>
                        </button>
                    </div>
                </div>
                <div class="ga-dialog-footer">
                    <button class="ga-dialog-btn ga-dialog-cancel" type="button">
                        <span>✕</span> Cancelar
                    </button>
                    <button class="ga-dialog-btn ga-dialog-confirm" type="button">
                        <span>✓</span> Confirmar
                    </button>
                </div>
            </div>
        `;
        
        // Add styles
        this.addStyles();
        
        // Add to container or body
        (this.container || document.body).appendChild(this.dialog);
        
        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Add CSS styles for the dialog
     */
    addStyles() {
        if (document.getElementById('ga-dialog-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'ga-dialog-styles';
        style.textContent = `
            .ga-selection-dialog {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
                align-items: center;
                justify-content: center;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .ga-dialog-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
            }
            
            .ga-dialog-content {
                position: relative;
                background: white;
                border-radius: 16px;
                padding: 24px;
                min-width: 300px;
                max-width: 90%;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                animation: ga-dialog-appear 0.2s ease-out;
            }
            
            @keyframes ga-dialog-appear {
                from {
                    opacity: 0;
                    transform: scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            .ga-dialog-header {
                text-align: center;
                margin-bottom: 16px;
            }
            
            .ga-dialog-title {
                font-size: 18px;
                font-weight: 600;
                color: #333;
            }
            
            .ga-dialog-section-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 0;
                border-bottom: 1px solid #eee;
                margin-bottom: 20px;
            }
            
            .ga-dialog-section-name {
                font-size: 16px;
                font-weight: 500;
                color: #f59e0b;
            }
            
            .ga-dialog-section-price {
                font-size: 16px;
                font-weight: 600;
                color: #f59e0b;
            }
            
            .ga-dialog-body {
                text-align: center;
                padding: 16px 0;
            }
            
            .ga-dialog-label {
                font-size: 14px;
                color: #666;
                margin-bottom: 16px;
            }
            
            .ga-dialog-quantity {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 24px;
            }
            
            .ga-qty-btn {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                border: 2px solid #ddd;
                background: white;
                font-size: 24px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s ease;
                color: #333;
            }
            
            .ga-qty-btn:hover:not(:disabled) {
                border-color: #6366f1;
                color: #6366f1;
            }
            
            .ga-qty-btn:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }
            
            .ga-qty-btn.ga-qty-plus {
                border-color: #6366f1;
                color: #6366f1;
            }
            
            .ga-qty-value {
                font-size: 36px;
                font-weight: 300;
                min-width: 60px;
                text-align: center;
                color: #333;
            }
            
            .ga-dialog-footer {
                display: flex;
                gap: 12px;
                margin-top: 24px;
            }
            
            .ga-dialog-btn {
                flex: 1;
                padding: 12px 20px;
                border-radius: 24px;
                border: none;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                transition: all 0.15s ease;
            }
            
            .ga-dialog-cancel {
                background: #6b7280;
                color: white;
            }
            
            .ga-dialog-cancel:hover {
                background: #4b5563;
            }
            
            .ga-dialog-confirm {
                background: #6366f1;
                color: white;
            }
            
            .ga-dialog-confirm:hover {
                background: #4f46e5;
            }
            
            .ga-dialog-confirm:disabled {
                background: #c7d2fe;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Setup dialog event listeners
     */
    setupEventListeners() {
        const backdrop = this.dialog.querySelector('.ga-dialog-backdrop');
        const minusBtn = this.dialog.querySelector('.ga-qty-minus');
        const plusBtn = this.dialog.querySelector('.ga-qty-plus');
        const cancelBtn = this.dialog.querySelector('.ga-dialog-cancel');
        const confirmBtn = this.dialog.querySelector('.ga-dialog-confirm');
        
        backdrop.addEventListener('click', () => this.hide());
        cancelBtn.addEventListener('click', () => this.hide());
        
        minusBtn.addEventListener('click', () => {
            const valueEl = this.dialog.querySelector('.ga-qty-value');
            let value = parseInt(valueEl.textContent) || 0;
            if (value > 0) {
                value--;
                valueEl.textContent = value;
                this.updateButtonStates();
            }
        });
        
        plusBtn.addEventListener('click', () => {
            const valueEl = this.dialog.querySelector('.ga-qty-value');
            let value = parseInt(valueEl.textContent) || 0;
            const sectionId = this.currentSection?.id || this.currentSection?.name;
            const max = this.getMaxSelectableQuantity(sectionId);
            if (value < max) {
                value++;
                valueEl.textContent = value;
                this.updateButtonStates();
            }
        });
        
        confirmBtn.addEventListener('click', () => this.confirm());
    }

    /**
     * Update dialog content
     * @param {Object} sectionData 
     * @param {number} currentQty 
     * @param {number} maxQty 
     */
    updateDialog(sectionData, currentQty, maxQty) {
        const nameEl = this.dialog.querySelector('.ga-dialog-section-name');
        const priceEl = this.dialog.querySelector('.ga-dialog-section-price');
        const valueEl = this.dialog.querySelector('.ga-qty-value');
        
        nameEl.textContent = sectionData.name || 'GA';
        
        const pricing = sectionData.pricing || {};
        const price = pricing.basePrice || 0;
        priceEl.textContent = price > 0 ? `$${price.toLocaleString()} MXN` : '';
        
        valueEl.textContent = currentQty;
        
        this._maxQty = maxQty;
        this.updateButtonStates();
    }

    /**
     * Update plus/minus button disabled states
     */
    updateButtonStates() {
        const valueEl = this.dialog.querySelector('.ga-qty-value');
        const minusBtn = this.dialog.querySelector('.ga-qty-minus');
        const plusBtn = this.dialog.querySelector('.ga-qty-plus');
        
        const value = parseInt(valueEl.textContent) || 0;
        
        minusBtn.disabled = value <= 0;
        plusBtn.disabled = value >= this._maxQty;
    }

    /**
     * Hide the dialog
     */
    hide() {
        if (this.dialog) {
            this.dialog.style.display = 'none';
        }
        
        if (this.onCancel) {
            this.onCancel();
        }
        
        this.currentSection = null;
    }

    /**
     * Confirm the selection
     */
    confirm() {
        if (!this.currentSection) return;
        
        const sectionId = this.currentSection.id || this.currentSection.name;
        const valueEl = this.dialog.querySelector('.ga-qty-value');
        const quantity = parseInt(valueEl.textContent) || 0;
        
        // Update selection
        if (quantity > 0) {
            this.gaSelections[sectionId] = {
                data: this.currentSection,
                quantity: quantity
            };
        } else {
            delete this.gaSelections[sectionId];
        }
        
        // Hide dialog
        this.dialog.style.display = 'none';
        
        // Dispatch event
        this.dispatchEvent('ga-selection-change', {
            sectionId,
            quantity,
            sectionData: this.currentSection,
            allSelections: this.getSelectionsArray()
        });
        
        // Call callback
        if (this.onConfirm) {
            this.onConfirm({
                sectionId,
                quantity,
                sectionData: this.currentSection,
                allSelections: this.getSelectionsArray()
            });
        }
        
        this.currentSection = null;
    }

    /**
     * Get all GA selections as array
     * @returns {Array}
     */
    getSelectionsArray() {
        return Object.entries(this.gaSelections).map(([sectionId, sel]) => ({
            sectionId,
            sectionName: sel.data.name,
            quantity: sel.quantity,
            pricePerItem: sel.data.pricing?.basePrice || 0,
            totalPrice: (sel.data.pricing?.basePrice || 0) * sel.quantity
        }));
    }

    /**
     * Clear all GA selections
     */
    clearSelections() {
        this.gaSelections = {};
        this.dispatchEvent('ga-selection-change', {
            sectionId: null,
            quantity: 0,
            allSelections: []
        });
    }

    /**
     * Clear all GA selections (alias)
     */
    clearAll() {
        this.clearSelections();
    }

    /**
     * Dispatch a custom event
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
        if (this.dialog && this.dialog.parentNode) {
            this.dialog.parentNode.removeChild(this.dialog);
        }
        this.dialog = null;
        this.gaSelections = {};
        this.gaInventory = {};
        this.currentSection = null;
    }
}
