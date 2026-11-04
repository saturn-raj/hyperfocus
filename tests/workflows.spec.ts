import { test, expect } from '@playwright/test';
import { createState } from '../src/domain/seed';
test.beforeEach(async ({ page }) => {
  await page.addInitScript((seed) => {
    if (!localStorage.getItem('hyperfocus:v1'))
      localStorage.setItem('hyperfocus:v1', JSON.stringify(seed));
  }, createState(true));
});
test('goals, tasks, calendar, focus and reflection survive reloads', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('link', { name: 'My season', exact: true }).click();
  await page.getByRole('button', { name: 'New goal' }).click();
  await page.getByLabel('What do you want to achieve?').fill('Ship an open-source planner');
  await page.getByLabel('Why does this matter to you?').fill('Help people make progress.');
  await page.getByRole('button', { name: 'Save goal', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ship an open-source planner' })).toBeVisible();
  await page.getByRole('button', { name: 'Quick add' }).click();
  await page.getByLabel('Task', { exact: true }).fill('Write meaningful tests');
  await page.getByLabel('Connected goal').selectOption({ label: 'Ship an open-source planner' });
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await page.getByRole('link', { name: 'My week', exact: true }).click();
  await page.getByRole('button', { name: 'Schedule Write meaningful tests', exact: true }).click();
  await page.getByLabel('Start time').fill('18:00');
  await page.getByRole('button', { name: 'Save block', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Edit Write meaningful tests', exact: true }),
  ).toBeAttached();
  await page.getByRole('link', { name: 'Focus', exact: true }).click();
  await page.getByLabel('Session intention').fill('Build carefully');
  await page.getByRole('button', { name: 'Start focusing' }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Finish & reflect' }).click();
  await page.getByRole('button', { name: 'Save session', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What deserves your attention?' })).toBeVisible();
  await page.getByRole('link', { name: 'Compass', exact: true }).click();
  await page.getByRole('button', { name: 'Reflect on today' }).click();
  await page.getByLabel('What moved forward?').fill('The whole planning loop works.');
  await page.getByRole('button', { name: 'Save reflection' }).click();
  await page.reload();
  await expect(page.getByText('The whole planning loop works.')).toBeVisible();
  expect(errors).toEqual([]);
});
test('overlapping blocks show an actionable error and leave the form open', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add time block', exact: true }).click();
  await page.getByLabel('What will you work on?').fill('Conflicting meeting');
  await page.getByRole('button', { name: 'Save block', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('overlaps');
  await expect(page.getByRole('dialog')).toBeVisible();
});
test('backup download, appearance, keyboard search, and empty workspace', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Appearance').selectOption('dark');
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/hyperfocus.*json/);
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByRole('searchbox').fill('prototype');
  await expect(
    page.getByRole('button', { name: 'Build the first working prototype Task' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Start empty', exact: true }).click();
  await page.getByRole('link', { name: 'My week', exact: true }).click();
  await expect(page.getByText('Add your first goal in Season.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Add your first goal in Season.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
