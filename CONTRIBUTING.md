# Contributing

Thanks for helping improve SeatMap JS. This repo contains two related pieces:

- The editor app in the repo root, launched from `index.html`.
- The embeddable renderer package in `renderer/`, published as `@seatmap-js/renderer`.

## Requirements

- Node.js 22.13 or newer
- pnpm 11.3.0 or newer

## Setup

```bash
pnpm install
```

## Development

Run the editor:

```bash
pnpm dev:editor
```

Open `http://localhost:8000`.

Run the renderer demo server:

```bash
pnpm dev:renderer
```

Open the URL printed by Vite. The booking demo is available at `/demo-booking.html`.

## Checks

Run the full smoke test before opening a pull request:

```bash
pnpm test
```

The root `pnpm test` script runs ESLint, editor and renderer unit tests, both production builds, and isolated packed-consumer checks. Run `pnpm test:browser` for editor recovery/API tests and renderer browser/accessibility tests. Install test browsers first with `pnpm exec playwright install`.

ESLint checks JavaScript correctness across the repository. Unused-variable checking is strict in the new editor services; legacy modules retain compatibility arguments without an unused-variable gate. Generated output is excluded. The existing TypeScript/React consumer check remains part of package verification.

Dependabot is configured for weekly pnpm workspace and GitHub Actions update PRs once this configuration reaches the default branch. Compatible npm updates are grouped; major versions remain separate. Updates are reviewed and tested, not automatically merged.

The [Editor API](docs/EDITOR_API.md) documents the supported interface for AI agents and browser automation. Prefer it over direct mutations to internal state.

## Pull Requests

- Keep changes focused on one feature or fix.
- Update docs when behavior, setup, file format, or public APIs change.
- Include manual test notes for editor interactions that are not covered by automated checks.
- Do not commit `node_modules/`, local environment files, OS metadata, or generated backup files.
