import { SeatMapRenderer } from "@seatmap-js/renderer";
import "@seatmap-js/renderer/styles.css";

/** A controller owns both fetches and renderer initialization for one mount. */
export function mountSeatMap(container, mapUrl, inventoryUrl, onCartChange) {
  const controller = new AbortController();
  let renderer;
  const ready = (async () => {
    renderer = await SeatMapRenderer.create(container, {
      signal: controller.signal,
      onCartChange,
    });
    const getJSON = async (url) => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      return response.json();
    };
    const [map, inventory] = await Promise.all([
      getJSON(mapUrl),
      getJSON(inventoryUrl),
    ]);
    await renderer.loadData(map, { signal: controller.signal });
    controller.signal.throwIfAborted();
    renderer.loadInventory(inventory);
    return renderer;
  })().catch((error) => {
    renderer?.destroy();
    throw error;
  });
  return {
    ready,
    destroy() {
      controller.abort();
      renderer?.destroy();
    },
  };
}
