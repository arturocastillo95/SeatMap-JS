import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as PIXI from 'pixi.js';
import { State } from '../src/core/state.js';
import { SMFValidator } from '../src/core/smfValidator.js';
import { FileManager } from '../src/managers/fileManager.js';
import { replaceMap } from '../src/core/mapTransaction.js';

globalThis.PIXI = PIXI;
globalThis.document = new EventTarget();
globalThis.localStorage = { getItem: () => null };
const underlays = { disableInteractions() {}, enableInteractions() {}, addResizeHandles() {} };
const sectionData = () => ({ id: 'a', x: 0, y: 0, width: 64, height: 64,
  base: { rows: 2, columns: 2, baseWidth: 64, baseHeight: 64 },
  transform: {}, rowLabels: { type: 'none' } });
const map = () => ({ format: 'SMF', version: '2.1.0', created: '2020-01-01T00:00:00Z',
  venue: { name: 'The venue', location: { city: 'Mexico City' }, metadata: { venueId: 'v1' } },
  metadata: { custom: { organizer: 'A' } }, groups: [{ id: 'group' }], objects: [], sections: [] });
beforeEach(() => {
  Object.assign(State, { isImporting: false, mapDocument: null, sections: [], selectedSections: [],
    world: new PIXI.Container(), app: { screen: { width: 800, height: 600 } },
    zoneLayer: new PIXI.Container(), sectionLayer: new PIXI.Container(),
    seatLayer: new PIXI.Container(), underlayLayer: new PIXI.Container(), underlaySprite: null,
    underlayData: null, underlaySourceUrl: null });
});
test('malformed roots and incomplete sections return validation errors', () => {
  for (const root of [null, [], 'SMF', 3]) assert.equal(SMFValidator.validate(root).valid, false);
  const data = map(); data.sections = [{ id: 'a', x: 0, y: 0, width: 100, height: 100 }];
  assert.equal(SMFValidator.validate(data).valid, false);
  data.sections = [sectionData()]; assert.equal(SMFValidator.validate(data).valid, true);
  data.sections[0].base.rows = -1; assert.equal(SMFValidator.validate(data).valid, false);
});
test('a failed staged import keeps live sections, selection, underlay, viewport and metadata', async () => {
  const old = new PIXI.Container(); State.sectionLayer.addChild(old); State.sections = [old];
  State.selectedSections = [old]; State.world.position.set(12, 34); State.world.scale.set(2);
  State.mapDocument = { venue: { name: 'Existing venue' } };
  const original = { ...State };
  let staged;
  await assert.rejects(replaceMap(map(), async () => {
    staged = new PIXI.Container(); State.sectionLayer.addChild(staged); State.sections.push(staged);
    throw new Error('image load failed');
  }, underlays), /image load failed/);
  assert.equal(State.sections, original.sections);
  assert.equal(State.selectedSections, original.selectedSections);
  assert.equal(State.underlayLayer, original.underlayLayer);
  assert.equal(State.mapDocument, original.mapDocument);
  assert.equal(State.world.x, 12); assert.equal(State.world.scale.x, 2);
  assert.equal(old.destroyed, false); assert.equal(staged.destroyed, true);
  assert.equal(State.isImporting, false);
});
test('successful replacement clears old underlay and round-trips document metadata independently', async () => {
  const old = new PIXI.Container(); State.underlayLayer.addChild(old);
  State.underlaySprite = old; State.underlayData = 'old image';
  const data = map();
  await replaceMap(data, async () => {}, underlays);
  assert.equal(old.destroyed, true); assert.equal(State.underlaySprite, null);
  const exported = FileManager.exportToJSON();
  assert.equal(exported.created, data.created);
  assert.deepEqual(exported.venue, { ...data.venue, capacity: 0 });
  assert.deepEqual(exported.metadata, data.metadata); assert.deepEqual(exported.groups, data.groups);
  assert.equal(exported.underlay, null);
  exported.metadata.custom.organizer = 'changed';
  assert.equal(FileManager.exportToJSON().metadata.custom.organizer, 'A');
  assert.equal(data.metadata.custom.organizer, 'A');
});
test('fresh exports keep creation time and contain no invented address', () => {
  const first = FileManager.exportToJSON(); const second = FileManager.exportToJSON();
  assert.equal(first.created, second.created); assert.equal(first.venue.location, undefined);
});
test('GA section metadata and group survive deserialization and serialization', async () => {
  const { SectionManager } = await import('../src/managers/sectionManager.js');
  const data = { ...sectionData(), type: 'ga', ga: { capacity: 20 }, metadata: { tier: 'VIP' }, groupId: 'group' };
  const section = await FileManager.deserializeSection(data, SectionManager);
  const exported = FileManager.serializeSection(section);
  assert.deepEqual(exported.metadata, data.metadata); assert.equal(exported.groupId, 'group');
  exported.metadata.tier = 'Other'; assert.equal(section.smfMetadata.tier, 'VIP');
});
test('public import rejects malformed data without clearing the current map', async () => {
  const old = new PIXI.Container(); State.sections = [old]; State.sectionLayer.addChild(old);
  const data = map(); data.sections = [{ x: 0, y: 0, width: 10, height: 10 }];
  assert.equal(await FileManager.importFromJSON(data), false);
  assert.equal(State.sections[0], old); assert.equal(old.destroyed, false);
});
test('public import rolls back a failure after an earlier section was constructed', async () => {
  const old = new PIXI.Container(); State.sections = [old]; State.sectionLayer.addChild(old);
  const data = map(); data.sections = [
    { ...sectionData(), type: 'ga', ga: { capacity: 10 } },
    { ...sectionData(), id: 'bad', type: 'ga', ga: { capacity: -10 } },
  ];
  assert.equal(await FileManager.importFromJSON(data), false);
  assert.equal(State.sections[0], old); assert.equal(old.destroyed, false);
  assert.equal(State.sectionLayer.children.length, 1);
});
test('public GA import and export preserve metadata and creation time', async () => {
  const data = map(); data.sections = [{ ...sectionData(), type: 'ga', ga: { capacity: 10 } }];
  assert.equal(await FileManager.importFromJSON(data), true);
  const exported = FileManager.exportToJSON();
  assert.deepEqual(exported.venue, { ...data.venue, capacity: 10 });
  assert.equal(exported.created, data.created); assert.deepEqual(exported.metadata, data.metadata);
  assert.equal(SMFValidator.validate(exported).valid, true);
});
test('an overlapping replacement is rejected and cannot disturb the in-flight import', async () => {
  let finish;
  const gate = new Promise(resolve => { finish = resolve; });
  const first = replaceMap(map(), () => gate, underlays);
  assert.throws(() => FileManager.exportToJSON(), /Wait for the current map import/);
  await assert.rejects(replaceMap(map(), async () => {}, underlays), /already in progress/);
  finish(); await first;
  assert.equal(State.isImporting, false);
});
