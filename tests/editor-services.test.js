import test from 'node:test';
import assert from 'node:assert/strict';
import { DraftStore, DRAFT_KEY } from '../src/services/DraftStore.js';
import { createEditorApi, validateEditorMap } from '../src/services/editorApi.js';

const empty = () => ({ format: 'SMF', version: '2.1.0', created: '2026-01-01T00:00:00Z', venue: { name: 'Venue' }, sections: [] });
const memory = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
};
function setupDraft(storage = memory()) {
  let map = empty();
  const drafts = new DraftStore({ snapshot: () => structuredClone(map), storage: () => storage,
    validate: validateEditorMap, restore: async value => { map = structuredClone(value); return true; } });
  return { drafts, storage, get map() { return map; } };
}

test('drafts persist changed content, ignore timestamps and viewport, and clear on export', () => {
  const { drafts, map, storage } = setupDraft();
  drafts.flush(); assert.equal(storage.getItem(DRAFT_KEY), null);
  map.modified = 'later'; map.canvas = { zoom: 2 }; drafts.flush();
  assert.equal(drafts.dirty, false);
  map.venue.name = 'Edited'; drafts.flush();
  assert.equal(drafts.dirty, true); assert.equal(drafts.state, 'saved');
  assert.equal(JSON.parse(storage.getItem(DRAFT_KEY)).map.venue.name, 'Edited');
  drafts.markSaved(); assert.equal(drafts.dirty, false); assert.equal(storage.getItem(DRAFT_KEY), null);
});
test('reload offers recovery without overwriting the draft and keeps recovered work dirty', async () => {
  const first = setupDraft(); first.map.venue.name = 'Recovered'; first.drafts.flush();
  const second = setupDraft(first.storage);
  second.map.venue.name = 'New tab edit'; second.drafts.flush();
  assert.equal(JSON.parse(first.storage.getItem(DRAFT_KEY)).map.venue.name, 'Recovered');
  assert.equal(second.drafts.pending, true);
  assert.equal(await second.drafts.recover(), true);
  assert.equal(second.map.venue.name, 'Recovered'); assert.equal(second.drafts.dirty, true);
});
test('corrupt drafts are retained until explicitly discarded', async () => {
  const storage = memory(); storage.setItem(DRAFT_KEY, '{bad');
  const { drafts } = setupDraft(storage);
  assert.equal(await drafts.recover(), false); assert.equal(drafts.state, 'invalid');
  drafts.flush(); assert.equal(storage.getItem(DRAFT_KEY), '{bad');
  assert.equal(drafts.discard(), true); assert.equal(storage.getItem(DRAFT_KEY), null);
});
test('quota failures retain the previous draft and leave unsaved-change protection enabled', () => {
  const { drafts, map, storage } = setupDraft();
  map.venue.name = 'First'; drafts.flush(); const previous = storage.getItem(DRAFT_KEY);
  storage.setItem = () => { throw new Error('Quota exceeded'); };
  map.venue.name = 'Second'; assert.equal(drafts.flush(), false);
  assert.equal(drafts.state, 'unavailable'); assert.equal(drafts.dirty, true);
  assert.equal(storage.getItem(DRAFT_KEY), previous);
});
test('unavailable storage never prevents editing or dirty detection', () => {
  let map = empty();
  const drafts = new DraftStore({ snapshot: () => map, storage: () => { throw new Error('Disabled'); } });
  assert.equal(drafts.state, 'unavailable'); map.venue.name = 'Changed'; drafts.flush();
  assert.equal(drafts.dirty, true);
});
test('another tab cannot silently overwrite a newer draft', () => {
  const storage = memory(); const a = setupDraft(storage); const b = setupDraft(storage);
  a.map.venue.name = 'A'; a.drafts.flush(); const saved = storage.getItem(DRAFT_KEY);
  b.map.venue.name = 'B'; assert.equal(b.drafts.flush(), false);
  assert.equal(b.drafts.state, 'conflict'); assert.equal(b.drafts.discard(), false);
  assert.equal(storage.getItem(DRAFT_KEY), saved);
});
function setupApi() {
  let map = empty(); let beforeCommit;
  const api = createEditorApi({ snapshot: () => map,
    importMap: async (next, options) => { await beforeCommit?.(); options.beforeReplace(); map = next; return true; } });
  return { api, get map() { return map; }, intercept: callback => { beforeCommit = callback; } };
}
test('agent batches create stable seats, edit metadata, and return independent snapshots', async () => {
  const { api } = setupApi(); const initial = api.getSnapshot();
  const result = await api.apply({ expectedRevision: initial.revision, commands: [
    { type: 'section.create', id: 'a', rows: 2, columns: 3 },
    { type: 'section.update', id: 'a', patch: { metadata: { tier: 'VIP' } } },
    { type: 'seats.remove', id: 'a', seatIds: ['a:r0:c1'] },
  ] });
  assert.equal(result.ok, true); assert.equal(result.summary.seats, 5);
  assert.equal(result.map.sections[0].metadata.tier, 'VIP');
  result.map.venue.name = 'Mutation'; assert.equal(api.getSnapshot().map.venue.name, 'Venue');
  assert.notEqual(result.revision, initial.revision);
});
test('stale revisions and failed batches leave the map untouched', async () => {
  const { api, map } = setupApi(); const revision = api.getSnapshot().revision;
  map.venue.name = 'Human edit';
  const stale = await api.apply({ expectedRevision: revision, commands: [{ type: 'venue.update', patch: { name: 'Agent' } }] });
  assert.equal(stale.error.code, 'REVISION_CONFLICT'); assert.equal(map.venue.name, 'Human edit');
  const current = api.getSnapshot();
  const invalid = await api.apply({ expectedRevision: current.revision, commands: [
    { type: 'section.create', id: 'a', rows: 2, columns: 2 },
    { type: 'section.remove', id: 'missing' },
  ] });
  assert.equal(invalid.ok, false); assert.deepEqual(api.getSnapshot(), current);
});
test('human edits during asynchronous preparation cause a revision conflict at commit', async () => {
  const state = setupApi(); const revision = state.api.getSnapshot().revision;
  state.intercept(() => { state.map.venue.name = 'Human wins'; });
  const result = await state.api.apply({ expectedRevision: revision, commands: [{ type: 'venue.update', patch: { name: 'Agent' } }] });
  assert.equal(result.error.code, 'REVISION_CONFLICT'); assert.equal(state.map.venue.name, 'Human wins');
});
test('API rejects invalid maps, excessive grids and unknown patch fields', async () => {
  const { api } = setupApi();
  assert.equal(api.validate(null).valid, false);
  const revision = api.getSnapshot().revision;
  for (const command of [
    { type: 'section.create', id: 'a', rows: 20000, columns: 20000 },
    { type: 'venue.update', patch: { unexpected: true } },
  ]) assert.equal((await api.apply({ expectedRevision: revision, commands: [command] })).ok, false);
  assert.equal((await api.replaceMap({ expectedRevision: revision, map: null })).error.code, 'VALIDATION_FAILED');
});
test('command schemas reject wrong property types and invalid seat positions', async () => {
  const { api } = setupApi();
  const first = await api.apply({ expectedRevision: api.getSnapshot().revision, commands: [{ type: 'section.create', id: 'a', rows: 2, columns: 2 }] });
  assert.equal(first.ok, true);
  for (const patch of [{ pricing: 'free' }, { metadata: [] }, { name: 12 }, { groupId: {} }]) {
    const result = await api.apply({ expectedRevision: first.revision, commands: [{ type: 'section.update', id: 'a', patch }] });
    assert.equal(result.error.code, 'INVALID_REQUEST');
  }
  const map = api.getSnapshot().map; map.sections[0].seats[0].r = 999;
  assert.equal(api.validate(map).valid, false);
});
test('concurrent agent edits return BUSY and failed imports report IMPORT_FAILED', async () => {
  let finish;
  const state = setupApi(); state.intercept(() => new Promise(resolve => { finish = resolve; }));
  const revision = state.api.getSnapshot().revision;
  const request = { expectedRevision: revision, commands: [{ type: 'venue.update', patch: { name: 'New name' } }] };
  const first = state.api.apply(request);
  assert.equal((await state.api.apply(request)).error.code, 'BUSY');
  finish(); assert.equal((await first).ok, true);
  const api = createEditorApi({ snapshot: empty, importMap: async () => { throw new Error('Image failed'); } });
  const result = await api.apply({ ...request, expectedRevision: api.getSnapshot().revision });
  assert.equal(result.error.code, 'IMPORT_FAILED'); assert.equal(api.getSnapshot().map.venue.name, 'Venue');
});
