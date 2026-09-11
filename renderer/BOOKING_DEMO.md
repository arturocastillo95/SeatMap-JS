# Booking examples

The main Renderer 2.0 demo is `examples/booking/index.html`. It restores the complete event, section browser, selection summary, mobile drawer, and order-review experience while using only the supported public renderer API. Run `pnpm dev:renderer` and open `/examples/booking/`, or run `pnpm build:renderer-pages` and serve `renderer/.pages`.

The demo uses the maintained 863-seat venue and deterministic simulated inventory. Prices are VIP $1,000, Oro $700, General $500, and accessible seats $0 MXN. The review dialog creates no reservation and processes no payment. The built Pages artifact includes the installed Pixi runtime and license without a CDN.

The smaller `examples/compact/index.html` remains available as a focused integration sample. `examples/vanilla.js` and `examples/ReactSeatMap.tsx` demonstrate lifecycle-safe integration with application endpoints. Read `MIGRATION.md` for breaking changes and `VALIDATION.md` for the remaining real-device and assistive-technology release gates.
