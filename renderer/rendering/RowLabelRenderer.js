/**
 * RowLabelRenderer - Handles row label generation and rendering
 */

import * as PIXI from 'pixi.js';

/**
 * Generate label text based on index and type
 * @param {number} index - Row index (0-based)
 * @param {string} type - 'numbers' or 'letters'
 * @param {string|number} startValue - Starting value
 * @returns {string}
 */
export function getRowLabelText(index, type, startValue) {
    if (type === 'numbers') {
        const start = parseInt(startValue) || 1;
        return (index + start).toString();
    } else if (type === 'letters') {
        const start = startValue || 'A';
        const startCharCode = start.charCodeAt(0);
        const offset = startCharCode - 65;
        
        let labelIndex = index + offset;
        let label = '';
        
        while (labelIndex >= 0) {
            label = String.fromCharCode(65 + (labelIndex % 26)) + label;
            labelIndex = Math.floor(labelIndex / 26) - 1;
        }
        return label;
    }
    return '';
}

/**
 * Build a map of row indices to label text
 * @param {Array} seats - Array of seat data
 * @param {Object} rowLabelsConfig - Row labels configuration
 * @returns {Object} Map of rowIndex -> labelText
 */
export function buildRowLabelMap(seats, rowLabelsConfig) {
    const rowLabelMap = {};
    
    if (!seats || seats.length === 0) {
        return rowLabelMap;
    }

    // Group seats by row index
    const rows = {};
    seats.forEach(seat => {
        const r = seat.r !== undefined ? seat.r : seat.rowIndex;
        if (r !== undefined) rows[r] = true;
    });

    const rowIndices = Object.keys(rows).map(Number).sort((a, b) => a - b);
    const config = rowLabelsConfig || { type: 'numbers' };
    const totalRows = rowIndices.length;
    
    rowIndices.forEach((rowIndex, arrayIndex) => {
        const labelIndex = config.reversed ? (totalRows - 1 - arrayIndex) : arrayIndex;
        rowLabelMap[rowIndex] = getRowLabelText(labelIndex, config.type, config.start);
    });

    return rowLabelMap;
}

/**
 * Render row labels for a section
 * @param {PIXI.Container} container - Container to add labels to
 * @param {Object} sectionData - Section data with seats and rowLabels config
 */
export function renderRowLabels(container, sectionData) {
    const config = sectionData.rowLabels;
    if (!config || config.type === 'none') return;

    const seats = sectionData.seats || [];
    if (seats.length === 0) return;

    // Get layout shift
    const layoutShiftX = sectionData.layoutShiftX || 0;
    const layoutShiftY = sectionData.layoutShiftY || 0;

    // Group seats by row index
    const rows = {};
    seats.forEach(seat => {
        const r = seat.r !== undefined ? seat.r : seat.rowIndex;
        if (!rows[r]) rows[r] = [];
        rows[r].push(seat);
    });

    const rowIndices = Object.keys(rows).map(Number).sort((a, b) => a - b);
    const spacing = config.spacing || 20;
    const color = config.color ?? 0xffffff;

    rowIndices.forEach((rowIndex, arrayIndex) => {
        const rowSeats = rows[rowIndex];
        // Sort by x position
        rowSeats.sort((a, b) => {
            const ax = a.x ?? a.relativeX ?? a.baseX;
            const bx = b.x ?? b.relativeX ?? b.baseX;
            return ax - bx;
        });

        // Determine label text
        const totalRows = rowIndices.length;
        const labelIndex = config.reversed ? (totalRows - 1 - arrayIndex) : arrayIndex;
        const labelText = getRowLabelText(labelIndex, config.type, config.start);

        const firstSeat = rowSeats[0];
        const lastSeat = rowSeats[rowSeats.length - 1];
        
        let firstX = firstSeat.x ?? firstSeat.relativeX ?? firstSeat.baseX;
        let firstY = firstSeat.y ?? firstSeat.relativeY ?? firstSeat.baseY;
        
        let lastX = lastSeat.x ?? lastSeat.relativeX ?? lastSeat.baseX;
        let lastY = lastSeat.y ?? lastSeat.relativeY ?? lastSeat.baseY;
        
        // Apply layout shift
        firstX += layoutShiftX;
        firstY += layoutShiftY;
        lastX += layoutShiftX;
        lastY += layoutShiftY;

        const style = {
            fontFamily: 'system-ui, sans-serif',
            fontSize: 14,
            fontWeight: 'bold',
            fill: color,
            align: 'center'
        };

        if (config.showLeft) {
            const text = new PIXI.Text({ text: labelText, style });
            text.anchor.set(0.5);
            text.x = firstX - 10 - spacing;
            text.y = firstY;
            text.eventMode = 'none';
            if (config.hidden) text.alpha = 0.65;
            container.addChild(text);
        }

        if (config.showRight) {
            const text = new PIXI.Text({ text: labelText, style });
            text.anchor.set(0.5);
            text.x = lastX + 10 + spacing;
            text.y = lastY;
            text.eventMode = 'none';
            if (config.hidden) text.alpha = 0.65;
            container.addChild(text);
        }
    });
}
