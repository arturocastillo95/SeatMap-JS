import { test, expect } from '@playwright/test';
test('editor import/export preserves deleted seats, metadata, and an empty section', async ({ page }) => {
  await page.goto('/tests/browser/editor.html');
  await page.waitForFunction(() => window.editor);
  const result = await page.evaluate(async () => {
    const { State, FileManager } = editor;
    const source = { format: 'SMF', version: '2.1.0', created: '2020-01-01T00:00:00Z',
      venue: { name: 'Venue', metadata: { code: 'v1' } }, metadata: { custom: { source: 'test' } },
      sections: [{ id: 'regular', name: 'A', x: 0, y: 0, width: 88, height: 64,
        base: { rows: 2, columns: 3, baseWidth: 88, baseHeight: 64 },
        transform: { rotation: 0, curve: 0, stretchH: 0, stretchV: 0 }, rowLabels: { type: 'none' },
        metadata: { tier: 'VIP' }, seats: [
          { id: 's1', r: 0, c: 0, x: 20, y: 20, n: '1', m: { code: 'one' } },
          { id: 's3', r: 0, c: 2, x: 68, y: 20, n: '3' },
        ] }] };
    const loaded = await FileManager.importFromJSON(source);
    const first = FileManager.exportToJSON();
    const reloaded = await FileManager.importFromJSON(first);
    const second = FileManager.exportToJSON();
    const empty = structuredClone(source); empty.sections[0].seats = [];
    const emptyLoaded = await FileManager.importFromJSON(empty);
    const emptyExport = FileManager.exportToJSON();
    const emptyReloaded = await FileManager.importFromJSON(emptyExport);
    return { loaded, reloaded, first, second, emptyLoaded, emptyReloaded,
      emptySeats: State.sections[0]?.seats.length };
  });
  expect(result.loaded).toBe(true); expect(result.reloaded).toBe(true);
  expect(result.second.sections[0].seats.map(s => s.id)).toEqual(['s1', 's3']);
  expect(result.second.sections[0].seats[0].m).toEqual({ code: 'one' });
  expect(result.second.sections[0].metadata).toEqual({ tier: 'VIP' });
  expect(result.second.metadata).toEqual(result.first.metadata);
  expect(result.second.created).toBe('2020-01-01T00:00:00Z');
  expect(result.emptyLoaded).toBe(true); expect(result.emptyReloaded).toBe(true);
  expect(result.emptySeats).toBe(0);
});
test('failed underlay load preserves the original map and releases the input lock', async ({ page }) => {
  await page.goto('/tests/browser/editor.html');
  await page.waitForFunction(() => window.editor);
  await page.route('**/missing-underlay.png', route => route.abort());
  const result = await page.evaluate(async () => {
    const { State, FileManager, PIXI } = editor;
    const old = new PIXI.Container(); State.sections = [old]; State.sectionLayer.addChild(old);
    State.selectedSections = [old]; State.world.position.set(10, 20);
    const loaded = await FileManager.importFromJSON({ format: 'SMF', version: '2.1.0',
      venue: { name: 'Replacement' }, sections: [],
      underlay: { sourceUrl: new URL('/missing-underlay.png', location.href).href } });
    return { loaded, sameSection: State.sections[0] === old, sameSelection: State.selectedSections[0] === old,
      destroyed: old.destroyed, x: State.world.x, inert: document.body.inert, importing: State.isImporting };
  });
  expect(result).toEqual({ loaded: false, sameSection: true, sameSelection: true,
    destroyed: false, x: 10, inert: false, importing: false });
});
