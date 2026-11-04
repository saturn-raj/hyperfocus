import { test, expect } from '@playwright/test';
test('first visit stays in onboarding, resumes answers, and creates a personal season', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#planner');
  await expect(page.getByRole('heading', { name: /Before you plan your week/ })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).not.toBeAttached();
  await page.getByRole('button', { name: 'Let’s find your focus' }).click();
  await page.getByLabel('What should we call you?').fill('Raj');
  await page.reload();
  await expect(page.getByLabel('What should we call you?')).toHaveValue('Raj');
  await page.getByRole('button', { name: 'Make some space', exact: true }).click();
  await page
    .getByLabel('What would you like to achieve or experience?')
    .fill('Launch my open-source project\nBuild a running habit');
  await page.getByRole('button', { name: 'Find the direction', exact: true }).click();
  await page.getByLabel('Why does this matter to you?').fill('Build something useful for people.');
  await page
    .getByLabel('What would “done” or meaningful progress look like?')
    .fill('Five people using a first release');
  await page.getByLabel('What’s the first small action?').fill('Write the first release scope');
  await page.getByRole('button', { name: 'Next goal', exact: true }).click();
  await page.getByLabel('Why does this matter to you?').fill('Have more energy every day.');
  await page
    .getByLabel('What would “done” or meaningful progress look like?')
    .fill('Run three times a week');
  await page.getByLabel('What’s the first small action?').fill('Take a short run');
  await page.getByRole('button', { name: 'Make it realistic', exact: true }).click();
  await page.getByLabel('Available hours each week', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'See my season', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('more time');
  await page.getByLabel('Available hours each week', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'See my season', exact: true }).click();
  await page.getByLabel('Give this season a name').fill('Build with intention');
  await page.getByLabel('Protect time for my first action').check();
  await page.getByRole('button', { name: 'Make a commitment', exact: true }).click();
  await page.getByLabel('Signed', { exact: true }).fill('Raj');
  await page.getByRole('button', { name: 'Begin my season', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your season.', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Build with intention' })).toBeVisible();
  await expect(page.getByText(/Signed Raj/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your season.', exact: true })).toBeVisible();
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('hyperfocus:v1')!));
  expect(data.goals).toHaveLength(2);
  expect(data.tasks).toHaveLength(2);
  expect(data.blocks).toHaveLength(1);
  expect(data.onboarding.completedAt).toBeGreaterThan(0);
  expect(data.onboarding.draft.signature).toBe('Raj');
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('going back preserves goal details, and no existing work is erased', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Explore an example/ }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Revisit season setup' }).click();
  await expect(
    page.getByText('Your existing goals, calendar, and focus history will be kept.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Let’s find your focus' }).click();
  await page.getByLabel('What should we call you?').fill('Raj');
  await page.getByRole('button', { name: 'Make some space', exact: true }).click();
  await page.getByRole('button', { name: 'Find the direction', exact: true }).click();
  await page.getByLabel('Why does this matter to you?').fill('My personal reason');
  await page.reload();
  await expect(page.getByLabel('Why does this matter to you?')).toHaveValue('My personal reason');
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('hyperfocus:v1')!));
  expect(data.blocks).toHaveLength(3);
  expect(data.tasks).toHaveLength(5);
  expect(data.goals).toHaveLength(3);
});
