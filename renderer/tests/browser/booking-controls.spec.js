import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('light booking demo has keyboard zoom controls, matching section colors and local assets', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const externalImages = [];
  page.on('request', request => { if (request.resourceType() === 'image' && !request.url().startsWith('http://127.0.0.1')) externalImages.push(request.url()); });
  await page.goto('/examples/booking/index.html');
  await expect(page.locator('[data-status]')).toContainText('Recinto listo');
  await expect(page.getByRole('group', { name: 'Controles del mapa' })).toBeVisible();
  const scale = () => page.evaluate(() => window.bookingDemo.renderer.viewport.scale.x);
  const initial = await scale();
  await page.getByRole('button', { name: 'Acercar', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect.poll(scale).toBeGreaterThan(initial);
  await page.getByRole('button', { name: 'Centrar mapa', exact: true }).click();
  await expect.poll(scale).toBeCloseTo(initial, 3);
  const card = page.locator('[data-section-id="VIP 3"]');
  await card.click();
  await expect(card).toHaveAttribute('aria-current', 'location');
  await page.getByRole('button', { name: 'Centrar mapa', exact: true }).click();
  await expect(card).not.toHaveAttribute('aria-current');
  await expect.poll(scale).toBeCloseTo(initial, 3);
  expect(externalImages).toEqual([]);
  expect((await new AxeBuilder({ page }).include('#booking-demo').analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('booking-desktop.png') });
});

test('mobile map controls remain reachable and picking a section closes the drawer', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/examples/booking/index.html');
  await expect(page.locator('[data-status]')).toContainText('Recinto listo');
  await page.locator('.drawer-toggle').click();
  await page.locator('[data-section-id="VIP 3"]').click();
  await expect(page.locator('.drawer-toggle')).toHaveAttribute('aria-expanded', 'false');
  const reset = page.getByRole('button', { name: 'Centrar mapa', exact: true });
  await reset.click();
  await expect.poll(() => page.evaluate(() => window.bookingDemo.renderer.getDiagnostics().viewportAnimation)).toBe(false);
  await page.mouse.move(1, 1);
  const box = await reset.boundingBox();
  const drawer = await page.locator('.drawer-toggle').boundingBox();
  expect(box.y + box.height).toBeLessThan(drawer.y);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('booking-mobile.png') });
});

test('mobile seat search stays compact until a query and supports booking with the drawer', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/examples/booking/index.html');
  await expect(page.locator('[data-status]')).toContainText('Recinto listo');
  await page.getByText('Buscar asiento', { exact: true }).click();
  await expect(page.locator('.seatmap-results [data-seat-id]')).toHaveCount(0);
  await expect(page.locator('.seatmap-ui .seatmap-toolbar').last()).toBeHidden();
  await expect(page.locator('.seatmap-selection')).toBeHidden();
  await page.getByRole('combobox', { name: 'Sección', exact: true }).selectOption('accessible-left');
  await expect(page.locator('.seatmap-results [data-seat-id]')).toHaveCount(0);
  const search = page.getByRole('searchbox', { name: 'Buscar fila o asiento' });
  await search.fill('L1');
  const target = page.locator('[data-seat-id="gtqWqUrD"]');
  await expect(target).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('mobile-seat-search.png') });
  await target.click();
  await expect(page.locator('[data-selection-view]')).toBeVisible();
  await expect(page.locator('[data-footer-count]')).toHaveText('1 boleto');
  await page.locator('.drawer-toggle').click();
  await search.fill('');
  await expect(page.locator('.seatmap-results [data-seat-id]')).toHaveCount(0);
  await page.getByText('Buscar asiento', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Centrar mapa', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Revisar selección', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('mobile-selected.png') });
  await page.setViewportSize({ width: 320, height: 640 });
  await page.getByText('Buscar asiento', { exact: true }).click();
  await expect(search).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const ui = await page.locator('.seatmap-ui').boundingBox();
  expect(ui.x).toBeGreaterThanOrEqual(0);
  expect(ui.x + ui.width).toBeLessThanOrEqual(320);
  await page.screenshot({ path: testInfo.outputPath('mobile-narrow-search.png') });
});

test('seat tooltip stays within the viewport and selection uses a checkmark', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/examples/booking/index.html');
  await expect(page.locator('[data-status]')).toContainText('Recinto listo');
  await page.evaluate(() => {
    const r = window.bookingDemo.renderer;
    const seat = r.getSeats().find(s => s.status === 'available' && !s.accessible);
    window.testSeatId = seat.id;
    r.selectSeat(seat.id);
    const bounds = r.app.canvas.getBoundingClientRect();
    r.ui.showTooltip(seat, { x: innerWidth - bounds.left - 5, y: innerHeight - bounds.top - 5 });
  });
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip.locator('.seatmap-tooltip-title')).not.toBeEmpty();
  await expect(tooltip.locator('.seatmap-tooltip-price')).toContainText('$');
  const bounds = await tooltip.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(8);
  expect(bounds.y).toBeGreaterThanOrEqual(8);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(382);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(836);
  expect(await page.evaluate(() => window.bookingDemo.renderer._views.get(window.testSeatId)._selectionMark.visible)).toBe(true);
  const seatScale = () => page.evaluate(() => window.bookingDemo.renderer._views.get(window.testSeatId).scale.x);
  await expect.poll(seatScale).toBeCloseTo(2);
  await page.screenshot({ path: testInfo.outputPath('seat-tooltip.png') });
  await page.evaluate(() => window.bookingDemo.renderer.deselectSeat(window.testSeatId));
  expect(await page.evaluate(() => window.bookingDemo.renderer._views.get(window.testSeatId)._selectionMark.visible)).toBe(false);
  await expect.poll(seatScale).toBeCloseTo(1);
});

test('the mobile booking map stays in place while tapping adjacent seats', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Uses the mobile booking layout and touch input.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/examples/booking/index.html');
  await expect(page.locator('[data-status]')).toContainText('Recinto listo');
  const drawer = page.locator('.drawer-toggle');
  if (await drawer.getAttribute('aria-expanded') === 'false') await drawer.click();
  await page.locator('[data-sections] [data-section-id="VIP 3"]').click();
  const pair = await page.evaluate(() => {
    const r = window.bookingDemo.renderer;
    const rect = r.app.canvas.getBoundingClientRect();
    const visible = r.getSeats().filter(seat => seat.sectionId === 'VIP 3').map(seat => {
      const point = r._views.get(seat.id).getGlobalPosition();
      return { ...seat, x: rect.left + point.x, y: rect.top + point.y };
    }).filter(point => document.elementFromPoint(point.x, point.y) === r.app.canvas);
    for (const first of visible.filter(seat => seat.seat === '1')) {
      const second = visible.find(seat => seat.row === first.row && seat.seat === '2');
      if (second) return [first, second];
    }
    throw new Error('No adjacent VIP 3 seats are visible');
  });
  const [first, second] = pair;
  const map = page.locator('#seatmap-container');
  const bounds = await map.boundingBox();
  const selected = () => page.evaluate(() => window.bookingDemo.renderer.getCart().seats.map(seat => seat.id));
  await page.touchscreen.tap(first.x, first.y);
  await expect(drawer).toHaveAttribute('aria-expanded', 'false');
  expect(await map.boundingBox()).toEqual(bounds);
  await page.touchscreen.tap(second.x, second.y);
  expect(await selected()).toEqual([first.id, second.id]);
  await page.touchscreen.tap(second.x, second.y);
  expect(await selected()).toEqual([first.id]);
});
