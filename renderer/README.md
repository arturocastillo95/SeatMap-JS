# SeatMap Renderer 2.0 release candidate

Framework-neutral PixiJS renderer for SMF 2.0/2.1 maps, with inventory-driven booking state and a built-in accessible HTML picker. The package is a staging release candidate; see [validation gates](VALIDATION.md) before deploying a stable release.

```js
import { SeatMapRenderer } from '@seatmap-js/renderer';
import '@seatmap-js/renderer/styles.css';

const abort = new AbortController();
const renderer = await SeatMapRenderer.create(container, {
  signal: abort.signal,
  locale: 'es-MX',
  currency: 'MXN',
  onCartChange: cart => updateCheckoutPreview(cart)
});
await renderer.loadData(map, { signal: abort.signal });
renderer.loadInventory({
  currency: 'MXN',
  seats: [{ id: 'seat-id', status: 'available', price: 15000 }],
  ga: [{ sectionId: 'floor-id', available: 100, price: 10000 }]
});
// On unmount:
abort.abort();
renderer.destroy();
```

Provide a host element with an explicit height. Install PixiJS 8.14.3+ (major 8) as a peer dependency. Prices above are minor units: 15000 means MXN 150.00. Map prices remain legacy SMF major units.

## Behavior

- Seats and GA are unavailable until inventory explicitly permits selection. Preview mode disables booking.
- Snapshot inventory resets omitted entries. Patch inventory preserves them. Invalid batches do not partially apply.
- Cart, canvas, dialog, and picker share canonical state. Sold seats are removed and GA quantities are reconciled.
- Quantity promotions make the cheapest eligible items free within each section. Section IDs are authoritative.
- Loading can be aborted or superseded; destruction is idempotent. Underlay failure produces diagnostics.
- Keyboard users can select through the section/search picker with 50 seats per page. Multiple instances own independent UI.
- No network booking, payment, reservation, or analytics service is included. The consuming backend remains authoritative.

## API

See [index.d.ts](index.d.ts) for options, snapshots, errors, and event types. Primary methods:

| Method | Purpose |
| --- | --- |
| `loadData(map, { signal })` | Validate and load an SMF map |
| `loadInventory(data, { mode })` | Apply snapshot (default) or patch inventory |
| `getSeats()`, `getSections()`, `getCart()` | Read detached snapshots |
| `selectSeat(id)`, `deselectSeat(id)` | Validated selection through shared rules |
| `setGAQuantity(id, quantity)` | Set GA quantity with availability/limit checks |
| `clearSelections()` | Clear seat and GA selections |
| `setSectionPromo(id, promo)` | Set a section's promotion |
| `setSectionPromos(promos)` | Atomically set multiple promotions |
| `fitToView()`, `zoomToSectionById(id)` | Navigate the map |
| `getDiagnostics()` | Inspect owned resource counts |
| `destroy()` | Release resources and owned DOM |

Events are dispatched on the host element: `cartChange`, `seat-selected`, `seat-deselected`, `ga-selection-change`, `gaSelectionConfirm`, `selection-limit-reached`, `selection-blocked`, `orphan-seat-blocked`, `selections-cleared`, `mapZonesLoaded`, `seatLoadProgress`, `mapFullyLoaded`, `renderer-error`, and `renderer-diagnostic`.

## Development

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm test                  # unit tests, both builds, packed consumer checks
pnpm exec playwright install chromium firefox webkit
pnpm test:browser
pnpm build:renderer-pages  # self-contained demo artifact in renderer/.pages
```

From `renderer/`, run `SEATMAP_BENCHMARK=1 pnpm exec playwright test performance.spec.js --project=chromium` for 1,000/10,000-seat measurements. Add `SEATMAP_ENFORCE_PERF=1` only on the documented target hardware.

ES, CJS, and UMD bundles are built. ES/CJS consumers explicitly import `@seatmap-js/renderer/styles.css`; UMD consumers supply global PIXI and link the CSS file. The module is safe to import during SSR; creation requires browser APIs.

Read [MIGRATION.md](MIGRATION.md) before upgrading from 1.x. Examples include framework-neutral mounting and React Strict Mode cleanup. Legacy demos describe 1.x and are not 2.0 integration references.

License: GPL-3.0-only; see LICENSE.md.
