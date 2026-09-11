# Booking example

The 2.0 example is `examples/index.html`. Run `pnpm dev:renderer` and open `/examples/index.html`, or run `pnpm build:renderer-pages` and serve `renderer/.pages`.

The example uses generated map data and simulated inventory. It creates no reservations or payments. The built artifact includes the installed Pixi runtime and license rather than depending on a CDN.

Use `examples/vanilla.js` or `examples/ReactSeatMap.tsx` for integration with your own map and inventory endpoints. Read MIGRATION.md for the breaking changes and VALIDATION.md for remaining release gates.
