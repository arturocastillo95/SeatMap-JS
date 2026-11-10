export const Logger = {
  get enabled() {
    if (globalThis.SEATMAP_DEBUG === true) return true;
    try { return localStorage.getItem('seatmap:debug') === 'true'; } catch { return false; }
  },

  debug(...args) {
    if (this.enabled) {
      console.debug(...args);
    }
  }
};
