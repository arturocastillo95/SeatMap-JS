# Editor API

The running editor exposes `window.seatmapEditor` (API version `1.0.0`). An agent with access to the editor's browser page can inspect and edit maps without manipulating canvas coordinates. The API uses JSON values and stable section/seat IDs. It does not connect to a model provider, send maps to a server, or expose an HTTP endpoint.

Wait for `window.seatmapEditor` to exist, or listen for the `seatmap:ready` window event. For browser automation:

```js
await page.waitForFunction(() => window.seatmapEditor);
const snapshot = await page.evaluate(() => window.seatmapEditor.getSnapshot());
```

## Read and discover

- `capabilities()` returns the API version, methods, commands, command JSON schemas, allowed patch fields, and size limits.
- `getSnapshot()` returns `{ revision, map, selectedSectionIds, summary }`. `map` is a detached SMF document; changing it does not change the editor. The summary includes section count, seat count, and GA capacity.
- `validate(map)` returns `{ valid, errors, warnings }` without changing the scene. This checks structural requirements and size limits; loading can still fail, for example if an underlay URL is unavailable.

Revisions cover venue content, including changes made through the visible editor. Selecting a section, panning, zooming, and export timestamps do not advance the content revision. A page reload starts a new revision session. Read operations can throw `BUSY` while an import owns the scene.

## Apply commands

Pass the revision you inspected. Each batch is all-or-nothing: commands modify a copy, then the editor builds the replacement scene before committing it. A failed command or failed image load keeps the original map. Changes made while asynchronous imports are preparing are checked again immediately before the scene is replaced.

```js
const api = window.seatmapEditor;
const { revision } = api.getSnapshot();
const result = await api.apply({
  expectedRevision: revision,
  commands: [
    { type: 'section.create', id: 'orchestra', name: 'Orchestra',
      x: 100, y: 100, rows: 10, columns: 20, spacing: 24 },
    { type: 'section.update', id: 'orchestra',
      patch: { pricing: { basePrice: 250, serviceFee: 0,
        serviceFeeEnabled: false, serviceFeeType: 'fixed' } } },
  ],
});
```

A successful mutation returns `{ ok: true, revision, map, selectedSectionIds, summary, warnings }`. A rejected mutation returns `{ ok: false, error: { code, message } }`, with `validation` included when structural validation fails. Error codes include `BUSY`, `REVISION_CONFLICT`, `INVALID_REQUEST`, `VALIDATION_FAILED`, `NOT_FOUND`, `LIMIT_EXCEEDED`, and `IMPORT_FAILED`. On a revision conflict, read a new snapshot and reconsider the edit; do not blindly retry an old replacement map.

| Command | Fields |
| --- | --- |
| `section.create` | `id`, `rows`, `columns`; optional `name`, `x`, `y`, `spacing`. Creates a regular grid with letter row labels. Default position is `(0, 0)` and spacing is 24. |
| `section.update` | `id`, `patch`. Supported fields: `name`, `pricing`, `metadata`, `groupId`. Nested fields are replaced as whole objects. |
| `section.remove` | `id`. Removes the section and its seats. |
| `seats.remove` | Section `id` and `seatIds`. Every seat must belong to that section. Remaining seat IDs and numbers are retained. |
| `venue.update` | `patch` with `name`, `location`, or `metadata`. Nested fields are replaced as whole objects. |

Generated seat IDs follow `SECTION_ID:rROW:cCOLUMN`, with zero-based indices. Rows and columns must be positive integers; spacing must be at least 20. Batches accept up to 100 commands. Maps accept up to 2,000 sections and 20,000 generated grid positions, counting deleted positions too. These limits apply to this agent API.

## Replace an SMF document

Use `replaceMap({ expectedRevision, map })` for changes not covered by commands, including GA areas and full geometry edits. Start from a fresh snapshot, preserve stable IDs, and consult [FILE_FORMAT.md](FILE_FORMAT.md). All sections need unique string IDs and all individual seats need globally unique string IDs.

```js
const snapshot = api.getSnapshot();
snapshot.map.venue.name = 'Updated venue';
const validation = api.validate(snapshot.map);
if (validation.valid) {
  await api.replaceMap({ expectedRevision: snapshot.revision, map: snapshot.map });
}
```

Successful mutations clear the current selection. They count as unsaved edits and participate in local draft recovery. The normal **Save** button exports an SMF file; saving a browser draft does not replace that export.

The API is available only inside the editor page's JavaScript context. Give browser access only to agents you trust to edit the map. There is no API key or remote access service to configure.
