import { test, expect } from '@playwright/test';

test('overview tracks zoom, pans by pointer and keyboard, and survives reload and resize', async ({ page }, testInfo) => {
  await page.goto('/tests/browser/host.html');
  await page.waitForFunction(() => window.ready);
  await page.evaluate(() => window.ready(100));
  const overview = page.locator('.seatmap-minimap');
  const frame = overview.locator('rect.seatmap-minimap-viewport');
  await expect(overview).toBeHidden();
  const width = Number(await frame.getAttribute('width'));
  await page.evaluate(() => window.r.zoomBy(3));
  await expect(overview).toBeVisible();
  expect(Number(await frame.getAttribute('width'))).toBeLessThan(width);
  const before = await page.evaluate(() => window.r.viewport.x);
  const box = await overview.locator('svg').boundingBox();
  await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.5);
  expect(await page.evaluate(() => window.r.viewport.x)).toBeLessThan(before);
  await overview.locator('svg').focus();
  const clicked = await page.evaluate(() => window.r.viewport.x);
  await page.keyboard.press('ArrowLeft');
  expect(await page.evaluate(() => window.r.viewport.x)).toBeGreaterThan(clicked);
  const dragBox = await frame.boundingBox();
  const dragStart = await page.evaluate(() => window.r.viewport.x);
  await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(dragBox.x + dragBox.width / 2 - 10, dragBox.y + dragBox.height / 2, { steps: 4 });
  await page.mouse.up();
  expect(await page.evaluate(() => window.r.viewport.x)).toBeGreaterThan(dragStart);
  expect(await page.evaluate(() => window.r.getCart().totalCount)).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => window.r.app.screen.width)).toBe(390);
  await page.screenshot({ path: testInfo.outputPath('minimap-mobile.png') });
  await overview.locator('svg').focus();
  await page.keyboard.press('Home');
  await expect(overview).toBeHidden();
  await page.evaluate(() => window.r.zoomBy(3));
  await expect(overview).toBeVisible();
  await page.evaluate(() => window.r.zoomBy(1 / 3));
  await expect(overview).toBeHidden();
  await page.evaluate(() => window.r.loadData(window.api.makeMap(50)));
  await expect(overview.locator('g > rect')).toHaveCount(1);
  await page.evaluate(() => window.r.destroy());
  await expect(overview).toHaveCount(0);
  await page.evaluate(() => window.ready(100, { showMinimap: false }));
  await expect(overview).toHaveCount(0);
});

test('booking overview includes venue artwork', async ({ page }, testInfo) => {
  await page.goto('/examples/booking/index.html');
  await expect(page.locator('[data-status]')).toContainText('Recinto listo');
  await expect(page.locator('.seatmap-minimap image')).toHaveCount(1);
  await expect(page.locator('.seatmap-minimap')).toBeHidden();
  await page.getByRole('button', { name: 'Acercar', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.bookingDemo.renderer.getDiagnostics().viewportAnimation)).toBe(false);
  await expect(page.locator('.seatmap-minimap')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('minimap-booking.png') });
  await page.getByRole('button', { name: 'Centrar mapa', exact: true }).click();
  await expect(page.locator('.seatmap-minimap')).toBeHidden();
});

test.describe('minimap reset gestures', () => {
  test.use({ hasTouch: true });
  for (const input of ['mouse', 'touch']) {
    test(`double ${input === 'mouse' ? 'click' : 'tap'} restores full-map zoom`, async ({ page, browserName }) => {
      await page.goto('/tests/browser/host.html');
      await page.waitForFunction(() => window.ready);
      await page.evaluate(() => window.ready(100));
      const initial = await page.evaluate(() => window.r.viewport.scale.x);
      await page.evaluate(() => window.r.zoomBy(3));
      const overview = page.locator('.seatmap-minimap');
      await expect(overview).toBeVisible();
      const box = await overview.locator('svg').boundingBox();
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      if (input === 'mouse') await page.mouse.dblclick(x, y);
      else if (browserName === 'chromium') {
        const cdp = await page.context().newCDPSession(page);
        // Playwright tap calls can take over 500 ms each on loaded CI runners.
        // Supply the gesture's timestamps independently of command latency.
        const start = (Date.now() - 250) / 1000;
        try {
          for (const delay of [0, 0.15]) {
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchStart', touchPoints: [{ x, y }], timestamp: start + delay,
            });
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchEnd', touchPoints: [], timestamp: start + delay + 0.05,
            });
          }
        } finally {
          await cdp.detach();
        }
      }
      else {
        await page.touchscreen.tap(x, y);
        await page.touchscreen.tap(x, y);
      }
      await expect(overview).toBeHidden();
      expect(await page.evaluate(() => window.r.viewport.scale.x)).toBeCloseTo(initial);
      expect(await page.evaluate(() => window.r.getCart().totalCount)).toBe(0);
    });
  }
});
