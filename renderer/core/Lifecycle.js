export const abortError = () =>
  new DOMException("Operation aborted", "AbortError");
export function checkSignal(signal) {
  if (signal?.aborted) throw abortError();
}
export function abortable(promise, signal) {
  checkSignal(signal);
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const abort = () => {
      cleanup();
      reject(abortError());
    };
    const cleanup = () => signal.removeEventListener("abort", abort);
    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve(promise).then(
      (v) => {
        cleanup();
        resolve(v);
      },
      (e) => {
        cleanup();
        reject(e);
      },
    );
  });
}
export function nextFrame(signal) {
  checkSignal(signal);
  return new Promise((resolve, reject) => {
    const abort = () => {
      cancelAnimationFrame(id);
      signal?.removeEventListener("abort", abort);
      reject(abortError());
    };
    const id = requestAnimationFrame(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    });
    signal?.addEventListener("abort", abort, { once: true });
  });
}
