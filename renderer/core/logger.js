export function createDebugLogger(enabled = false) {
    return (...args) => {
        if (enabled) {
            console.debug(...args);
        }
    };
}
