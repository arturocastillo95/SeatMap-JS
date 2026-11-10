# Booking examples

The main Renderer 2.0 demo is `examples/booking/index.html`. It restores the complete event, section browser, selection summary, mobile drawer, and order-review experience while using only the supported public renderer API. Run `pnpm dev:renderer` and open `/examples/booking/`, or run `pnpm build:renderer-pages` and serve `renderer/.pages`.

The demo uses the maintained 863-seat venue and deterministic simulated inventory. Prices are VIP $1,000, Oro $700, General $500, and accessible seats $0 MXN. The review dialog creates no reservation and processes no payment. The built Pages artifact includes the installed Pixi runtime and license without a CDN.

The smaller `examples/compact/index.html` remains available as a focused integration sample. `examples/vanilla.js` and `examples/ReactSeatMap.tsx` demonstrate lifecycle-safe integration with application endpoints. Read `MIGRATION.md` for breaking changes and `VALIDATION.md` for the remaining real-device and assistive-technology release gates.

### Map controls and presentation

The booking example uses a light map surface, section-colored ticket rows, and a local stage underlay. `examples/booking/booking-map.js` applies presentation styles to a copy of the sample map; seat identities, pricing, and inventory stay intact. Custom underlay URLs are retained.

The map controls provide accessible **Acercar**, **Alejar**, and **Centrar mapa** buttons, plus a compact **Buscar asiento** keyboard picker. Choosing a section highlights its row and focuses the map. On mobile it closes the section drawer and moves focus to the map controls; centering the map clears the highlighted section. A legend distinguishes selected and unavailable seats. The demo enables `seatPickerSearchOnly`: individual seats appear only after entering a row or seat query, and the picker omits its duplicate cart summary. General-admission quantity selection remains available through the section filter. Other renderer consumers retain the full picker unless they enable this option.

Selected seats grow by 60%, retain their section color and show a white checkmark and inner ring (white seats use a green fill for contrast). Hover details separate the section, row/seat, price, and availability, and flip at viewport edges. Touch interactions skip hover tooltips.
