# Contributing

Thanks for helping improve SeatMap JS. This repo contains two related pieces:

- The editor app in the repo root, launched from `index.html`.
- The embeddable renderer package in `renderer/`, published as `@seatmap-js/renderer`.

## Requirements

- Node.js 18 or newer
- pnpm 10 or newer

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

The root `pnpm test` script runs the editor build, renderer build, and renderer publish dry-run.

## Pull Requests

- Keep changes focused on one feature or fix.
- Update docs when behavior, setup, file format, or public APIs change.
- Include manual test notes for editor interactions that are not covered by automated checks.
- Do not commit `node_modules/`, local environment files, OS metadata, or generated backup files.
