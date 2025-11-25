// ============================================
// UTILITY FUNCTIONS
// ============================================

import { State, Elements } from './state.js';
import { CONFIG } from './config.js';

export const Utils = {
  screenToWorld(screenX, screenY) {
    const rect = State.app.canvas.getBoundingClientRect();
    const x = (screenX - rect.left - State.world.x) / State.world.scale.x;
    const y = (screenY - rect.top - State.world.y) / State.world.scale.y;
    return { x, y };
  },

  flash(gfx, color = 0xffffff) {
    const orig = gfx.tint;
    gfx.tint = color;
    setTimeout(() => gfx.tint = orig !== undefined ? orig : 0xFFFFFF, 120);
  },

  showTooltip(text) {
    Elements.tooltip.textContent = text;
    Elements.tooltip.style.opacity = 1;
  },

  hideTooltip() {
    Elements.tooltip.style.opacity = 0;
  },

  moveTooltip(x, y) {
    const r = State.app.canvas.getBoundingClientRect();
    Elements.tooltip.style.left = (x + r.left) + 'px';
    Elements.tooltip.style.top = (y + r.top) + 'px';
  },

  showDragInfo(seats, rows, x, y) {
    Elements.dragInfo.innerHTML = `${seats} seats × ${rows} rows<br><strong>${seats * rows} total</strong>`;
    Elements.dragInfo.style.left = (x + 15) + 'px';
    Elements.dragInfo.style.top = (y + 15) + 'px';
    Elements.dragInfo.classList.add('show');
  },

  hideDragInfo() {
    Elements.dragInfo.classList.remove('show');
  },

  calculateSeatDimensions(rawWidth, rawHeight) {
    const innerWidth = Math.max(0, rawWidth - (CONFIG.SECTION_MARGIN * 2));
    const innerHeight = Math.max(0, rawHeight - (CONFIG.SECTION_MARGIN * 2));
    const seats = Math.max(2, Math.floor(innerWidth / CONFIG.SEAT_SIZE) + 1);
    const rows = Math.max(2, Math.floor(innerHeight / CONFIG.SEAT_SIZE) + 1);
    
    const snappedInnerWidth = (seats - 1) * CONFIG.SEAT_SIZE;
    const snappedInnerHeight = (rows - 1) * CONFIG.SEAT_SIZE;
    const snappedWidth = snappedInnerWidth + (CONFIG.SECTION_MARGIN * 2);
    const snappedHeight = snappedInnerHeight + (CONFIG.SECTION_MARGIN * 2);
    
    return { seats, rows, snappedWidth, snappedHeight };
  },

  /**
   * Generate a short unique identifier
   * @param {number} length - Length of the ID (default 8)
   * @returns {string} Short random ID
   */
  generateShortId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(values);
      return Array.from(values)
        .map(x => chars[x % chars.length])
        .join('');
    } else {
      // Fallback for older environments
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }
  },

  /**
   * Convert hex number to hex string (e.g. 0xff0000 -> "#ff0000")
   */
  numberToHex(num) {
    let hex = num.toString(16);
    while (hex.length < 6) hex = '0' + hex;
    return '#' + hex;
  },

  /**
   * Convert hex string to number (e.g. "#ff0000" -> 0xff0000)
   */
  hexToNumber(hex) {
    if (hex.startsWith('#')) hex = hex.substring(1);
    return parseInt(hex, 16);
  }
};
