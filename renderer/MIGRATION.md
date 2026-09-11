# Migrating to Renderer 2.0

The initial package is `2.0.0-rc.1`. Use it in staging; the physical-device and VoiceOver release gates in VALIDATION.md remain required before a stable 2.0.0 release. Nothing in the renderer creates a server reservation.

## Installation and lifecycle

Install `@seatmap-js/renderer` and `pixi.js` (8.14.3 or newer within major 8). Import `@seatmap-js/renderer/styles.css` explicitly. ES module output does **not** automatically import CSS. UMD consumers load `dist/renderer.css` alongside the bundle and provide global `PIXI`.

Use `await SeatMapRenderer.create(element, options)`. Module import is safe without a DOM; creation requires a browser. Supply an AbortSignal to creation and `loadData`. Superseded loads and aborted operations reject with `AbortError`. Catch this error when changing routes/maps. `destroy()` may be called repeatedly. Wait for `loadData` before calling inventory or selection APIs.

`mapFullyLoaded` and the load promise now include underlay settlement. Failed images generate a diagnostic and fall back to section bounds. Invalid maps reject before replacing the current map; failures during rendering clear the incomplete scene. Changing maps clears selections, inventory, and promotions.

## Availability and money

Booking mode is the default. Map status is not proof of availability: every item starts unknown/unavailable. Load explicit inventory before allowing bookings. `mode: 'preview'` displays a non-bookable map.

`loadInventory(data, { mode: 'snapshot' })` replaces availability; omitted entries become unknown. Use `{ mode: 'patch' }` for incremental changes. A price-only patch preserves status. Malformed batches fail before applying changes. Seat and GA arrays are independently optional. Supply stable seat IDs or unique legacy keys. Unknown IDs appear in the returned `unmatched` list and diagnostic event.

All public inventory, promotion, and cart money is now in integer **minor units**. MXN 150.50 is `15050`. SMF 2.0/2.1 map prices remain in major units and are converted exactly once. Do not convert SMF input yourself. Currency precision follows the configured currency (e.g. JPY has zero decimals). One currency per instance; inventory currency must match. Defaults are `es-MX` and `MXN`.

Seat updates remove unavailable selections. GA updates clamp quantities. A valid batch emits one `cartChange`, including when only prices change. Revalidate inventory, prices, and holds on the server before checkout.

## Identity and promotions

Use section **IDs**, not names, for promotions and GA selection. Maps with duplicate section IDs, seat IDs, or lookup keys reject. Seats without IDs receive deterministic `legacy:` IDs based on section ID, row index, and seat label; renumbering changes those IDs.

The legacy `demo-venue.json` contains repeated `accessible_forward` labels in “Zona accesible”. Correct those labels from the venue's authoritative numbering before using that map. The editor exporter now saves `seatNumber` rather than the displayed icon. Existing corrupted labels cannot be recovered automatically.

`n` / `number` determine the seat label. `sn` / `specialNeeds` indicate accessible seating only. Row labels follow the map's numbering, including reversal and labels beyond Z.

`buyX: 2, getY: 1` means **buy two, get one additional ticket free** (three tickets total). Eligible cheapest seats are free, with stable ID tie-breaking. Discounts are grouped by section ID. Each section accepts one promotion type. Percentage discounts round per item to the nearest minor unit; fixed discounted prices are also minor units. Changing promos immediately recalculates the cart.

## API and event changes

The supported exports are `SeatMapRenderer` and `RendererError`. Low-level manager and PIXI re-exports are removed; import PIXI from `pixi.js` if needed. Internal scene/manager fields are unsupported.

Use `getSeats`, `getSections`, `getCart`, `selectSeat`, `deselectSeat`, and `setGAQuantity` instead of reading or mutating Pixi containers. Selection methods return `{ success, reason?, ... }`. Getters and events provide detached plain-data snapshots; mutating them never updates the renderer. Selection callbacks receive a seat snapshot.

`cartChange` includes line totals, `sectionSummaries` keyed by ID, `grandTotal`, `grandOriginalTotal`, and `totalSavings`. GA lines use `pricePerTicket`. Seat `price` is the base unit price; `totalPrice` is the payable line amount after promotions. `orphan-seat-blocked` no longer exposes containers. `seatLoadProgress` is aggregate `{ loaded, total, percent }` across the map.

Listen for `renderer-error` (code, message, path) and `renderer-diagnostic` (nonfatal asset/inventory issues). No telemetry leaves the app automatically.

## UI and React

Remove old tooltip HTML and global tooltip IDs. Each instance owns its tooltip, dialog, controls, and paginated picker. Do not create two renderers in the same host element. The picker provides keyboard and non-canvas booking access; it is included by default. Override visible text using `strings`, and formatting using `locale` / `currency`.

The bundled wheelchair mark replaces the external Material Symbols font. Reduced-motion preference disables movement animations.

See `examples/vanilla.js` and `examples/ReactSeatMap.tsx` for cleanup and fetch cancellation. In Next.js, use the React example in a client component. React is not a runtime dependency of the renderer.

## License

The package remains GPL-3.0-only. This release does not change or relicense project or third-party code.

## Removed 1.x presentation hooks

`SeatMapRenderer.CONFIG` and direct manager/scene mutation are no longer supported; configure each instance through `RendererOptions`. The old global-tooltip animation options, hover-scale tuning, deferred-label toggle, custom orphan pulse settings, and double-tap zoom tuning are not part of the 2.0 API. Labels are created on hover; orphan feedback uses a brief tint; viewport motion follows reduced-motion preference. The built-in accessible controls replace the old canvas-only control UI. Review `index.d.ts` rather than carrying an entire 1.x options object forward.
