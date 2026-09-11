# Renderer 2.0 checkpoint and resumption plan

Saved: September 11, 2026. Work resumed on the same date; the production-map
audit described below is now implemented.

This document belongs to the local Git checkpoint containing the Renderer 2.0
implementation. The starting commit was `661c49a` (`Add live demo link to README`).
The checkpoint branch is `codex/renderer-v2-checkpoint`. Nothing has been pushed
or published as part of this checkpoint. The renderer is version `2.0.0-rc.1`;
stable production readiness has not been declared.

## What is implemented

- Canonical normalized map and booking state, detached public snapshots, stable
  seat identifiers, section-ID grouping, shared SMF seat/row labels, and duplicate
  identifier/inventory-key validation. Selection and orphan rules operate on
  plain records independently of Pixi objects.
- Inventory is required for booking. Snapshot and patch updates are validated
  transactionally; seat-only and GA-only payloads are supported. Updates remove
  unavailable selections, clamp GA quantities, refresh prices, and emit a
  consistent cart snapshot with diagnostics.
- Integer minor-unit prices, currency validation, mixed seat prices, percentage
  rounding, fixed discounted unit prices, and cheapest-free buy-X/get-Y offers.
  Totals are recalculated when selection, inventory, or promotions change.
- Abortable initialization and map loading, generation-based supersession,
  progressive rendering cleanup, shared underlay ownership, safe fitting and
  hidden-container resizing, and idempotent teardown. Failed initialization after
  GPU allocation and destruction during active animations have regression tests.
- Instance-owned Spanish UI: searchable/filterable HTML picker with pages of 50,
  selected-seat summary, keyboard viewport controls, live announcements, GA modal
  focus handling, configurable strings, and reduced-motion support. Canvas,
  picker, tooltip, and cart use the canonical state. Accessibility icons are
  bundled instead of relying on an external font.
- Public declarations, explicit CSS export, ES/CJS/UMD builds, SSR-safe imports,
  framework-neutral and React examples, migration documentation, reproducible
  synthetic performance fixtures, packed-consumer checks, and CI configuration.
- Editor export now preserves the seat number instead of the accessibility icon
  label. Old renderer demos redirect to the maintained integration example.

Obsolete tooltip/cart/inventory/GA/UI managers have been removed. The new
implementation deliberately changes the public contract; review `MIGRATION.md`
before connecting an existing consumer. React is a development/test dependency,
not a renderer runtime dependency. GPL-3.0-only licensing is unchanged.

## Verified at this checkpoint

The final local run completed successfully:

- 19 unit/lifecycle/audit tests.
- Editor and renderer production builds.
- Isolated packed-consumer ES/CJS imports without a DOM, stylesheet export,
  public TypeScript declarations, and compilation of the actual React example.
- 65 browser scenarios across Chromium, Firefox, WebKit, and touch-emulated
  Chromium, including the actual React Strict Mode example and automated axe
  checks. The default run skips eight opt-in benchmarks and three native-touch
  cases on profiles that do not support them.
- Owned resource counters return to baseline after 20 mount/load/destroy cycles.
- Separate synthetic desktop benchmarks are recorded in `VALIDATION.md`.

These are local results on macOS with Node 26.8.2. The updated CI targets Node
22.13.0 on Linux; remote CI has not run. Editor build warnings about large chunks
and mixed static/dynamic imports remain. Physical-device testing, VoiceOver,
real backend integration, and full retained-heap profiling remain outstanding.

## Resume in this order

### 1. Reestablish the baseline and review the migration

Read this file, `MIGRATION.md`, `VALIDATION.md`, and `ARCHITECTURE.md`. Confirm the
checkpoint branch and working tree before editing. Use pnpm 11.3.0 from the root
package's `packageManager` field and a supported Node version.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium firefox webkit
pnpm test
pnpm test:browser
```

Review the removed 1.x presentation hooks and changed event payloads against the
target consumer. Preserve the settled requirements: booking by default,
es-MX/MXN defaults, explicit inventory availability, minor-unit public money,
section IDs for offers, seat IDs for selection, and backend-owned reservations,
payments, and authoritative checkout calculations.

Acceptance: the checkpoint can be reproduced and any host API incompatibilities
are listed concretely before further changes. Fix a reproduced regression before
adding more features; do not restart the renderer rewrite.

### 2. Audit and correct the real venue data

The maintained `renderer/demo-venue.json` now uses separate `accessible-left`
and `accessible-right` section IDs and demo seat labels `L1`–`L5` and `R1`–`R5`.
The `sn` field continues to carry accessibility metadata. These labels are stable
demo identifiers; they do not claim to recover the original venue numbering.

The read-only `audit:renderer-map` command now reports all duplicate IDs,
ambiguous section/row/seat keys, malformed geometry, and invalid labels with JSON
paths. It has valid and invalid fixtures and is also shipped as
`seatmap-renderer-audit`. The source map is never modified. Obtain the
authoritative venue labels and IDs before changing the real map; do not
automatically renumber seats or invent mappings to live inventory.

Running it against `demo-venue.json` now reports zero errors for 16 sections and
863 seats. The maintained browser demo loads this map with simulated inventory,
and browser coverage selects an accessible seat and verifies its GA section.

Acceptance: a real target map normalizes successfully, identifiers match the
inventory API, accessibility metadata is separate from labels, and an approved
representative fixture can be used for integration regression tests.

### 3. Connect a staging application and inventory adapter

Needed at resumption: the target application/repository and its map, inventory,
reservation, and pricing contracts. No endpoint, credentials, or reservation API
has been assumed or implemented in this library.

Use the examples as the integration baseline: import CSS explicitly, create and
load with cancellation, load inventory only after map loading completes, and
destroy on cleanup. Discard stale network responses when switching maps or
remounting. Apply a fresh snapshot after reconnecting and use patches only for
intentional partial updates.

Add host-level tests for stale responses, sold seats, GA availability changes
while its dialog is open, price changes, reservation expiry, concurrent purchases,
backend rejection, and reconnect recovery. Keep server hold and checkout logic
in the application. Translate backend major-unit amounts only at a clearly
defined boundary, if its contract requires conversion.

Acceptance: complete seated and GA booking in staging, including recovery from
each rejection/expiry case, with no stale selection or misleading client total.

### 4. Complete manual accessibility and device validation

Use `VALIDATION.md` as the evidence checklist. Run the full booking path with
keyboard and VoiceOver: section filter, search, pagination, selection/removal,
GA quantity, Escape dismissal, focus restoration, limits, and live inventory
invalidation. Check multiple instances and reduced motion. Fix issues with a
focused regression test when automation can meaningfully cover them.

Run physical iPhone 11-class Safari and Pixel 6a-class Chrome checks in both
orientations, including pan/pinch/tap, resizing, seated-only maps, real underlays,
and the 10,000-seat fixture. Browser emulation is not evidence of passing this
gate. Record device model, OS/browser versions, map/options, and measurements.

Acceptance: all booking operations work through HTML controls; no focus trap or
announcement failures remain. Target devices render 10,000 seats within five
seconds excluding network, show selection feedback within 100 ms, and have
median pan/zoom frame time within 33 ms.

### 5. Profile production-like performance and retained resources

Repeat the benchmark on the approved real map and representative options. The
current synthetic fixture excludes decorative glow and per-seat labels until
hover. From `renderer/`, run:

```sh
SEATMAP_BENCHMARK=1 pnpm exec playwright test performance.spec.js --project=chromium
```

Set `SEATMAP_ENFORCE_PERF=1` when asserting the agreed hardware thresholds.
Capture heap/GPU evidence across 20 mount/load/destroy cycles with real underlays
and multiple instances. Existing counters cover owned resources but cannot prove
the entire browser heap is leak-free. Investigate a persistent upward retained
memory trend. Profile before introducing culling or changing rendering strategy.

Acceptance: recorded target-device results meet the thresholds, retained
resources stabilize, and any necessary optimization preserves booking/lifecycle
behavior under the full regression suite.

### 6. Validate CI and release through staging

Run the configured Linux/Node 22.13.0 CI and inspect its browser traces and
benchmark artifacts. Review the packed file list, declaration exports, CSS
installation, UMD example, migration instructions, and license. Resolve any
environment-specific failures before release.

Publish a prerelease with the `next` tag only as an explicit release step after
the package and staging setup have been reviewed. No release credentials or
registry actions were used here. Exercise that published artifact in staging.
Publish stable `2.0.0` only after staging, manual accessibility, physical-device,
and performance evidence is recorded as passing. Update supported-capability
claims to reflect that evidence.

## File map for the next session

| Concern                                 | Starting files                                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Normalization, inventory, money, cart   | `booking/BookingStore.js`, `tests/booking.test.js`                                                                |
| Renderer orchestration and cancellation | `SeatMapRenderer.js`, `core/Lifecycle.js`, `tests/lifecycle.test.js`                                              |
| Assets, viewport, input cleanup         | `rendering/UnderlayRenderer.js`, `core/TextureCache.js`, `core/ViewportManager.js`, `interaction/InputHandler.js` |
| Booking rules                           | `interaction/SelectionManager.js`                                                                                 |
| Accessible UI and styles                | `ui/MapUI.js`, `assets/tooltip.css`, `assets/accessibleIcon.js`                                                   |
| Public contract                         | `index.js`, `index.d.ts`, `package.json`, `MIGRATION.md`                                                          |
| Integration and browser regressions     | `examples/`, `tests/browser/`, `playwright.config.js`                                                             |
| Packing and hosted demo                 | `../scripts/verify-renderer-package.mjs`, `../scripts/build-renderer-pages.mjs`                                   |
| CI and release evidence                 | `../.github/workflows/ci.yml`, `VALIDATION.md`                                                                    |

## Local tooling note

The host's global pnpm wrapper attempted an unavailable package-manager download
under sandbox restrictions. Verification used pnpm 11.3.0 installed temporarily
at `/private/tmp/seatmap-browser-tools/node_modules/.bin/pnpm`, prepended to
`PATH`. This path is disposable and must not become a project dependency. Browser
execution and local test servers required tool sandbox escalation. Use the
declared package manager normally on the next machine/session; these restrictions
were tooling constraints, not test failures.

## Suggested next-session request

“Resume from `renderer/CHECKPOINT.md` on `codex/renderer-v2-checkpoint`. Use the
map audit from step 2 to validate an authoritative production map without
inventing seat labels or IDs. Then continue with staging integration once I
provide the target application and inventory contract; do not publish the
package yet.”
