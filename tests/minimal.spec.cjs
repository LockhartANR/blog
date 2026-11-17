const { test, expect } = require('@playwright/test');
const article = '/2026/11/16/sub40/';
test('首页只展示原文摘要和文字列表', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Lockhart');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('文章');
  await expect(page.locator('.post-summary p')).toHaveText('2026年11月9日，下午5:14，在元扫雷达成原教旨sub40，成绩37.701s。');
  await expect(page.locator('.site-main img')).toHaveCount(0);
  await page.getByRole('link', { name: '阅读全文' }).click();
  await expect(page).toHaveURL(/2026\/11\/16\/sub40/);
});
test('完整文章、中文目录与标签链接有效', async ({ page }) => {
  await page.goto(article);
  await expect(page.locator('.prose img')).toHaveCount(5);
  await expect(page.locator('.prose')).toContainText('元网的小游戏和强无猜给了我加强操作和判雷的动机和途径');
  await page.locator('.post-toc summary').click();
  await page.locator('.post-toc').getByRole('link', { name: '淡游', exact: true }).click();
  await expect.poll(() => page.evaluate(() => decodeURIComponent(location.hash))).toBe('#淡游');
  await page.locator('.post-meta').getByRole('link', { name: '扫雷' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('标签：扫雷');
  await expect(page.getByRole('link', { name: '阅读全文' })).toBeVisible();
  await page.getByRole('link', { name: '归档', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('归档');
});
test('外观选择跨页面持久保存', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '切换到深色外观' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.goto(article);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: '切换到浅色外观' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
test('原图可放大、关闭后焦点返回，五图均能加载', async ({ page }) => {
  await page.goto(article);
  for (const image of await page.locator('.prose img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(el => el.complete && el.naturalWidth > 0)).toBeTruthy();
  }
  const opener = page.getByRole('button', { name: '放大图片：现场', exact: true });
  await opener.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect.poll(() => page.locator('.image-viewer img').evaluate(el => el.complete && el.naturalWidth > 0)).toBeTruthy();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(opener).toBeFocused();
});
test('手机与平板不产生整页横向溢出', async ({ page }) => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 850 });
    for (const path of ['/', article, '/archives/', '/tags/%E6%89%AB%E9%9B%B7/']) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    }
  }
});
test('禁用脚本仍可阅读并使用目录', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4180' + article);
  await expect(page.locator('.prose img')).toHaveCount(5);
  await expect(page.locator('.prose h2')).toHaveCount(4);
  await expect(page.locator('.theme-toggle')).not.toBeVisible();
  await page.locator('.post-toc summary').click();
  await expect(page.locator('.post-toc').getByRole('link', { name: '淡游', exact: true })).toBeVisible();
  await context.close();
});
test('小屏触摸设备的导航可点击且不溢出', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 800 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4180/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole('link', { name: '阅读全文' }).tap();
  await expect(page.locator('.post-header h1')).toHaveText('sub40历程');
  await context.close();
});

