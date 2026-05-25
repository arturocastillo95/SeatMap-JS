export const Logger = {
  get enabled() {
    return globalThis.SEATMAP_DEBUG === true || localStorage.getItem('seatmap:debug') === 'true';
  },

  debug(...args) {
    if (this.enabled) {
      console.debug(...args);
    }
  }
};
