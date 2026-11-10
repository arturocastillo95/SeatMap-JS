import { test, expect } from '@playwright/test';
test.use({ viewport: { width: 1280, height: 800 } });
const editorURL = 'http://127.0.0.1:3101';
const draftKey = 'seatmap:editor-draft:v1';
async function ready(page) {
  await page.goto(editorURL);
  await page.waitForFunction(() => window.seatmapEditor);
}
async function createSection(page) {
  return page.evaluate(async () => {
    const api = window.seatmapEditor;
    return api.apply({ expectedRevision: api.getSnapshot().revision,
      commands: [{ type: 'section.create', id: 'agent-section', name: 'Agent section', rows: 2, columns: 3 }] });
  });
}
test('agent edits autosave, survive reload, recover explicitly, and clear after export', async ({ page }, testInfo) => {
  await ready(page);
  expect((await createSection(page)).ok).toBe(true);
  await expect(page.locator('#draftStatus')).toContainText('Draft saved');
  await page.screenshot({ path: testInfo.outputPath('autosave.png') });
  const data = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), draftKey);
  expect(data.map.sections[0].seats).toHaveLength(6);
  const dirty = await page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented;
  });
  expect(dirty).toBe(true);
  const acceptLeave = dialog => dialog.accept(); page.on('dialog', acceptLeave);
  await page.reload(); page.off('dialog', acceptLeave);
  await page.waitForFunction(() => window.seatmapEditor);
  await expect(page.getByRole('button', { name: 'Restore draft' })).toBeVisible();
  expect(await page.evaluate(() => window.seatmapEditor.getSnapshot().summary.sections)).toBe(0);
  await page.getByRole('button', { name: 'Restore draft' }).click();
  await expect(page.getByRole('button', { name: 'Restore draft' })).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.seatmapEditor.getSnapshot().summary.seats)).toBe(6);
  const download = page.waitForEvent('download');
  await page.locator('#saveBtn').click(); await download;
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), draftKey)).toBeNull();
  const clean = await page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented;
  });
  expect(clean).toBe(false);
});
test('stale revisions and invalid batches do not change the editor', async ({ page }) => {
  await ready(page);
  const result = await page.evaluate(async () => {
    const api = window.seatmapEditor;
    const original = api.getSnapshot();
    const first = await api.apply({ expectedRevision: original.revision, commands: [{ type: 'section.create', id: 'a', rows: 1, columns: 2 }] });
    const stale = await api.apply({ expectedRevision: original.revision, commands: [{ type: 'section.remove', id: 'a' }] });
    const before = api.getSnapshot();
    const invalid = await api.apply({ expectedRevision: before.revision, commands: [
      { type: 'section.update', id: 'a', patch: { name: 'Changed' } }, { type: 'section.remove', id: 'missing' },
    ] });
    return { first: first.ok, stale, invalid, before, after: api.getSnapshot(), capabilities: api.capabilities() };
  });
  expect(result.first).toBe(true); expect(result.stale.error.code).toBe('REVISION_CONFLICT');
  expect(result.invalid.ok).toBe(false); expect(result.after.map.sections).toEqual(result.before.map.sections);
  expect(result.after.revision).toBe(result.before.revision);
  expect(result.capabilities.commandSchemas['section.create'].required).toContain('rows');
});
test('blocked storage keeps editing functional and displays a useful status', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Disabled', 'SecurityError'); } }));
  await ready(page);
  await expect(page.locator('#draftStatus')).toContainText('Local draft unavailable');
  expect((await createSection(page)).ok).toBe(true);
  expect(await page.evaluate(() => window.seatmapEditor.getSnapshot().summary.seats)).toBe(6);
});
test('human edits to section names are detected as revision conflicts and autosaved', async ({ page }) => {
  await ready(page); expect((await createSection(page)).ok).toBe(true);
  const before = await page.evaluate(() => window.seatmapEditor.getSnapshot());
  // The public API is not used for the edit: exercise the editor's existing input handler.
  await page.locator('#app canvas').click({ position: { x: 124, y: 92 } });
  const name = page.locator('#sectionNameInput');
  await expect(name).toBeVisible(); await name.fill('Human edit');
  const result = await page.evaluate(revision => window.seatmapEditor.apply({ expectedRevision: revision,
    commands: [{ type: 'section.remove', id: 'agent-section' }] }), before.revision);
  expect(result.error.code).toBe('REVISION_CONFLICT');
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null')?.map.sections[0].name, draftKey)).toBe('Human edit');
});
