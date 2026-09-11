import { useEffect, useRef, useState } from "react";
import {
  SeatMapRenderer,
  type Cart,
  type Inventory,
  type SMFMap,
} from "@seatmap-js/renderer";
import "@seatmap-js/renderer/styles.css";

export function ReactSeatMap({
  mapUrl,
  inventoryUrl,
  onCartChange,
}: {
  mapUrl: string;
  inventoryUrl: string;
  onCartChange: (cart: Cart) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const callback = useRef(onCartChange);
  const [error, setError] = useState("");
  useEffect(() => {
    callback.current = onCartChange;
  }, [onCartChange]);
  useEffect(() => {
    const controller = new AbortController();
    let renderer: SeatMapRenderer | undefined;
    const mount = async () => {
      const instance = await SeatMapRenderer.create(host.current!, {
        signal: controller.signal,
        onCartChange: (cart) => {
          if (!controller.signal.aborted) callback.current(cart);
        },
      });
      renderer = instance;
      const getJSON = async (url: string) => {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      };
      const [map, inventory]: [SMFMap, Inventory] = await Promise.all([
        getJSON(mapUrl),
        getJSON(inventoryUrl),
      ]);
      await instance.loadData(map, { signal: controller.signal });
      controller.signal.throwIfAborted();
      instance.loadInventory(inventory);
    };
    setError("");
    mount().catch((error) => {
      renderer?.destroy();
      if (!controller.signal.aborted) setError(error.message);
    });
    // Strict Mode remounts and URL changes each get a fresh controller.
    return () => {
      controller.abort();
      renderer?.destroy();
    };
  }, [mapUrl, inventoryUrl]);
  return (
    <>
      <div ref={host} style={{ height: 600, width: "100%" }} />
      {error && <p role="alert">{error}</p>}
    </>
  );
}
