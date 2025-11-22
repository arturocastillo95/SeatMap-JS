/**
 * TooltipManager
 * Handles the DOM manipulation and positioning of the seat tooltip.
 * Separates DOM concerns from the Canvas renderer.
 */
export class TooltipManager {
    constructor(options = {}) {
        this.options = {
            animationSpeed: 0.15,
            ...options
        };
        
        this.tooltip = document.getElementById('seat-tooltip');
        this.elements = {
            section: document.getElementById('tt-section'),
            row: document.getElementById('tt-row'),
            seat: document.getElementById('tt-seat'),
            category: document.getElementById('tt-category'),
            price: document.getElementById('tt-price'),
            footer: document.getElementById('tt-footer')
        };

        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.isVisible = false;

        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.setup();
    }

    setup() {
        if (this.tooltip) {
            this.tooltip.style.transition = `opacity ${this.options.animationSpeed}s ease-out`;
        }
        window.addEventListener('mousemove', this.handleMouseMove);
    }

    destroy() {
        window.removeEventListener('mousemove', this.handleMouseMove);
        this.tooltip = null;
        this.elements = null;
    }

    handleMouseMove(e) {
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        
        if (this.isVisible) {
            this.updatePosition(e.clientX, e.clientY);
        }
    }

    updatePosition(x, y) {
        if (!this.tooltip) return;

        const rect = this.tooltip.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        const margin = 20; // Space from cursor
        const padding = 10; // Space from screen edge

        // Horizontal positioning (Clamp)
        let left = x;
        const halfWidth = rect.width / 2;
        
        // Check left edge
        if (left - halfWidth < padding) {
            left = padding + halfWidth;
        }
        // Check right edge
        else if (left + halfWidth > screenWidth - padding) {
            left = screenWidth - padding - halfWidth;
        }

        this.tooltip.style.left = `${left}px`;

        // Vertical positioning (Flip)
        const height = this.tooltip.offsetHeight;
        
        // Check if there is space above
        if (y - height - margin < padding) {
            // Not enough space above, place below
            this.tooltip.classList.add('bottom');
            this.tooltip.style.top = `${y}px`;
        } else {
            // Place above
            this.tooltip.classList.remove('bottom');
            this.tooltip.style.top = `${y}px`;
        }
    }

    /**
     * Show the tooltip with the provided content
     * @param {Object} content - The content to display
     * @param {string} content.section
     * @param {string} content.row
     * @param {string} content.seat
     * @param {string} content.price
     * @param {string} content.category
     * @param {string} [content.color] - Hex color for background
     * @param {string} [content.textColor] - Hex color for text
     */
    show(content) {
        if (!this.tooltip) return;

        // Update DOM
        if (this.elements.section) this.elements.section.textContent = content.section || '--';
        if (this.elements.row) this.elements.row.textContent = content.row || '--';
        if (this.elements.seat) this.elements.seat.textContent = content.seat || '--';
        if (this.elements.price) this.elements.price.textContent = content.price || '';
        if (this.elements.category) this.elements.category.textContent = content.category || '';

        if (this.elements.footer) {
            if (content.color) this.elements.footer.style.backgroundColor = content.color;
            if (content.textColor) this.elements.footer.style.color = content.textColor;
        }

        this.tooltip.style.opacity = '1';
        this.isVisible = true;
        
        // Update position immediately
        this.updatePosition(this.lastMouseX, this.lastMouseY);
    }

    hide() {
        if (this.tooltip) {
            this.tooltip.style.opacity = '0';
        }
        this.isVisible = false;
    }
}
