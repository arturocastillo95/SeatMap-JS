# Renderer 2.0 release validation

Status: **release candidate; not cleared for stable production publication**.

## Automated gates

Local verification passed 18 unit/lifecycle/audit tests and 61 active browser scenarios. Eight opt-in benchmark cases and three native-touch cases on non-touch engines are intentionally skipped in the default browser run. The desktop benchmarks were run separately.

- `pnpm test`: booking/lifecycle regression tests, editor and renderer builds, isolated packed-consumer ES/CJS/SSR imports, CSS export, and TypeScript compilation.
- `pnpm test:browser`: Chromium, Firefox, WebKit, and touch-emulated Chromium. Covers booking, inventory reconciliation, accessible picker/dialog, loading cancellation, fitting, resize, shared assets, and 20 mount/load/destroy cycles.
- Axe checks run against the picker and open GA dialog. These checks do not certify screen-reader usability.
- `SEATMAP_BENCHMARK=1 pnpm exec playwright test performance.spec.js --project=chromium`: reproducible 1,000- and 10,000-seat fixtures with JSON attachments. Run inside `renderer/`.

Resource counters measure owned scene nodes, generated textures, tracked animation work, shared image entries, and DOM cleanup. They are not a complete browser heap-leak proof.

## Local benchmark observations

A local headless desktop run on macOS on 2026-09-11 measured:

| Engine       |  Seats | Create + map load | Selection + next frame | Median frame during zoom |
| ------------ | -----: | ----------------: | ---------------------: | -----------------------: |
| Chromium 149 |  1,000 |            887 ms |                  21 ms |                    18 ms |
| Chromium 149 | 10,000 |          1,795 ms |                  32 ms |                    23 ms |
| WebKit 26.5  |  1,000 |            205 ms |                  13 ms |                    13 ms |
| WebKit 26.5  | 10,000 |            783 ms |                  23 ms |                    13 ms |

These measurements use synthetic maps, no network underlay, and software-controlled zoom. They are observations, not a mobile or universal frame-rate guarantee. The fixture excludes decorative glow and per-seat labels until hover. Rerun when maps, rendering options, browsers, or hardware change.

## Required manual gates before stable 2.0.0

- [ ] VoiceOver: complete seat and GA booking with no pointer; confirm announcements, filter/search, pagination, unavailable seats, focus restoration, and inventory invalidation.
- [ ] Physical iPhone 11-class device: Safari, portrait/landscape, pinch/pan/tap, 10,000-seat benchmark.
- [ ] Physical Pixel 6a-class device: Chrome, portrait/landscape, pinch/pan/tap, 10,000-seat benchmark.
- [ ] Target-device performance: load seats within 5 seconds excluding network, selection feedback within 100 ms, median pan/zoom frame time within 33 ms. Record device, OS, browser, options, and measurements; set `SEATMAP_ENFORCE_PERF=1` for the benchmark assertions on the agreed target hardware.
- [ ] Staging app: test backend rejections, concurrent purchases, reservation expiry, reconnects, and pricing changes. The host must discard stale inventory responses and refresh snapshots after reconnecting.
- [ ] Verify the real production map has unique IDs/keys and correct seat labels; legacy demo accessibility labels require correction from authoritative venue data.

## Publication

The package version is `2.0.0-rc.1`. It has not been published by this implementation. Publish the RC with the `next` tag only after reviewing the package contents and staging configuration. Do not publish stable `2.0.0` until the manual gates above are recorded as passed. Existing GPL-3.0-only licensing is unchanged.
