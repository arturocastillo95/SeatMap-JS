# Renderer 2.0 architecture

`BookingStore` owns normalized seat records, availability, selected IDs, GA quantities, prices, and promotions. Its selection algorithm operates on plain records, using the existing adjacency/orphan rules. No Pixi object belongs to booking state.

`SeatMapRenderer` orchestrates the store and scene. It validates a cloned map before replacing the active one, uses a generation-specific AbortController for asynchronous work, and emits detached event snapshots. Inventory is applied atomically and projected into both views once per update.

`MapUI` owns the instance's accessible picker, native modal dialog, controls, announcements, and tooltip. It uses public selection methods and the same store as the canvas. Search results contain at most 50 seats per page.

Rendering helpers build section geometry, row labels, and cached seat textures. Underlay images use a reference-counted registry separate from the host's Pixi Assets cache. Viewport animations, gesture timers, resize observers, highlight frames, and load frames are canceled during reset/destruction.

Only `SeatMapRenderer` and `RendererError` are package exports. Internal managers and scene fields are not integration APIs. Use the declarations and migration guide for supported contracts.
