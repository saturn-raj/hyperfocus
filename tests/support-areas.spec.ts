import { test, expect } from '@playwright/test';
import { createState } from '../src/domain/seed';
test('area work stays separate from goals through scheduling and focus history', async ({
  page,
}) => {
  await page.addInitScript(
    (seed) => localStorage.setItem('hyperfocus:v1', JSON.stringify(seed)),
    createState(true),
  );
  await page.goto('/#season');
  await page.getByRole('button', { name: 'Add support area', exact: true }).click();
  await page.getByLabel('Support area name').fill('Life admin');
  await page
    .getByLabel('What belongs here?')
    .fill('Keep home tasks and everyday responsibilities in order.');
  await page.getByRole('button', { name: 'Save support area', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Life admin', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quick add', exact: true }).click();
  await page.getByLabel('Task', { exact: true }).fill('Sort household paperwork');
  await page.getByLabel('Connected goal', { exact: true }).selectOption({ label: 'Life admin' });
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await page.getByRole('link', { name: 'My week', exact: true }).click();
  await page
    .getByRole('button', { name: 'Schedule Sort household paperwork', exact: true })
    .click();
  await page.getByLabel('Start time').fill('18:00');
  await page.getByRole('button', { name: 'Save block', exact: true }).click();
  await page.getByRole('link', { name: 'Focus', exact: true }).click();
  await page.getByLabel('Choose a next action').selectOption({ label: 'Sort household paperwork' });
  await page.getByRole('button', { name: 'Start focusing', exact: true }).click();
  await page.waitForTimeout(1100);
  await page.getByRole('button', { name: 'Finish & reflect', exact: true }).click();
  await page.getByRole('button', { name: 'Save session', exact: true }).click();
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('hyperfocus:v1')!));
  expect(data.goals).toHaveLength(3);
  const task = data.tasks.find((t: { title: string }) => t.title === 'Sort household paperwork');
  expect(task.goalId).toBeNull();
  expect(task.areaId).toBeTruthy();
  expect(data.blocks.find((b: { taskId: string }) => b.taskId === task.id).areaId).toBe(
    task.areaId,
  );
  expect(data.sessions.at(-1).areaId).toBe(task.areaId);
});
