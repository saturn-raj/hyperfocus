import { test, expect, type Page } from '@playwright/test';
const narrative =
  'I want to launch an open-source planner that people find useful. I want to interview at three companies. I also want to write regularly and keep my health and relationships in a good place.';
async function start(page: Page) {
  await page.goto('/#planner');
  await expect(page.getByRole('heading', { name: /A lot on your mind/ })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).not.toBeAttached();
  await page.getByRole('button', { name: 'Plan my season', exact: true }).click();
  await page.getByLabel('What should we call you?').fill('Avery');
  await page.getByRole('button', { name: 'Make some space', exact: true }).click();
  await page.getByLabel('What would you like to achieve or experience?').fill(narrative);
}
async function answerGuided(page: Page) {
  await page.getByRole('button', { name: 'Shape my goals', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: /If only one thing moved forward/ }),
  ).toBeVisible();
  let count = 0;
  while (await page.locator('.question-track').count()) {
    if (count++ > 10) throw new Error('Too many follow-ups');
    const text = await page.locator('h1').innerText();
    const answer = /maintaining|maintain/i.test(text)
      ? 'Health, fitness, home, and relationships need regular attention.'
      : /hours/i.test(text)
        ? 'I can protect ten hours each week alongside my job.'
        : /only one/i.test(text)
          ? 'Launching the open-source planner is the most meaningful outcome.'
          : 'A small useful release, three interviews, and a steady routine would count as progress.';
    if (!(await page.getByLabel('Your answer', { exact: true }).count()))
      await page.getByRole('button', { name: 'Write my own answer', exact: true }).click();
    await page.getByLabel('Your answer', { exact: true }).fill(answer);
    if (count === 1) {
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.reload();
      await expect(page.getByRole('group', { name: 'Suggested answers' })).toBeVisible();
      await expect(page.getByLabel('Your answer', { exact: true })).not.toBeAttached();
      await expect(page.getByRole('heading', { name: /concrete result/ })).toBeVisible();
      continue;
    }
    const last = await page.getByRole('button', { name: 'Draft my season', exact: true }).count();
    await page
      .getByRole('button', { name: last ? 'Draft my season' : 'Continue', exact: true })
      .click();
    if (last) break;
  }
  await expect(
    page.getByRole('heading', { name: 'Your plan for this season', exact: true }),
  ).toBeVisible();
}
test('guided onboarding resumes exact questions, reviews separate areas and preserves original answers', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page);
  await page.reload();
  await expect(page.getByLabel('What would you like to achieve or experience?')).toHaveValue(
    narrative,
  );
  await answerGuided(page);
  await expect(page.getByRole('heading', { name: 'Support areas', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Edit support area Health & Fitness', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: /^Edit goal / })
    .first()
    .click();
  await page.getByLabel('Goal title', { exact: true }).fill('Ship a useful first release');
  await page.getByRole('button', { name: 'Keep this goal', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Edit goal Ship a useful first release', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Add support area', exact: true }).click();
  await page.getByLabel('Area name', { exact: true }).fill('Learning circle');
  await page
    .getByLabel('What do you want to maintain?')
    .fill('Stay connected to people who are learning with me.');
  await page.getByRole('button', { name: 'Keep this area', exact: true }).click();
  await page.getByText('Make the plan realistic', { exact: false }).first().click();
  await page.getByLabel('Protect time for my first action').check();
  await page.getByLabel('Season name', { exact: true }).fill('Build with intention');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Signed', { exact: true }).fill('Avery');
  await page.getByRole('button', { name: 'Begin my season', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your season.', exact: true })).toBeVisible();
  await expect(page.getByText(/Signed Avery/)).toBeVisible();
  await page.reload();
  await page.getByText('Your planning notes and original answers', { exact: true }).click();
  await expect(page.getByText(narrative, { exact: true })).toBeVisible();
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('hyperfocus:v1')!));
  expect(data.onboarding.history[0].brainDump).toBe(narrative);
  expect(data.onboarding.draft).toBeNull();
  expect(data.onboarding.commitments).toHaveLength(1);
  expect(data.supportAreas).toHaveLength(3);
  expect(data.blocks).toHaveLength(1);
  expect(
    data.goals.every((g: { priority: string }) => ['core', 'secondary'].includes(g.priority)),
  ).toBe(true);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Edit and re-sign my commitment' }).click();
  await page
    .getByLabel('Your commitment', { exact: true })
    .fill('I will protect meaningful work and a sustainable life.');
  await page.getByRole('button', { name: 'Sign new revision', exact: true }).click();
  await expect(
    page.getByText('I will protect meaningful work and a sustainable life.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Revisit season setup' }).click();
  await expect(page.getByRole('heading', { name: /A lot on your mind/ })).toBeVisible();
  await page.getByRole('button', { name: 'Return to my current season' }).click();
  await expect(
    page.getByText('I will protect meaningful work and a sustainable life.', { exact: true }),
  ).toBeVisible();
});
test('connected coaching consumes structured responses and retries invalid proposals without losing answers', async ({
  page,
}) => {
  const requests: Array<{ action: string; context: { brainDump: string; answers: unknown[] } }> =
    [];
  let plans = 0;
  await page.route('**/api/coach/status', (route) =>
    route.fulfill({ json: { configured: true, provider: 'fixture.example' } }),
  );
  const goals = [
    'Launch a useful product',
    'Interview at three companies',
    'Write every week',
    'Publish short videos',
  ].map((title, i) => ({
    title,
    why: 'Make meaningful progress.',
    success: `Complete ${title.toLowerCase()}`,
    priority: i === 0 ? 'core' : 'secondary',
    weeklyMinutes: 60,
    firstAction: `Take the first step on ${title.toLowerCase()}`,
    firstDuration: 30,
  }));
  await page.route('**/api/coach', async (route) => {
    const body = route.request().postDataJSON();
    requests.push(body);
    expect(route.request().headers()['authorization']).toBeUndefined();
    if (body.action === 'questions')
      await route.fulfill({
        json: {
          questions: [
            {
              id: 'tradeoff',
              prompt: 'Which outcome would you protect first?',
              options: ['Launch the product', 'Find my next role'],
            },
            { id: 'maintenance', prompt: 'What needs maintaining alongside the work?' },
          ],
        },
      });
    else if (body.action === 'plan') {
      plans++;
      await route.fulfill({
        json:
          plans === 1
            ? { plan: { goals: [] } }
            : {
                plan: {
                  goals,
                  supportAreas: [
                    { title: 'Health & Fitness', description: 'Maintain exercise and recovery.' },
                    {
                      title: 'Home & Relationships',
                      description: 'Keep time for important people.',
                    },
                  ],
                },
              },
      });
    } else
      await route.fulfill({
        json: {
          commitment:
            'I choose a useful release, a sustainable week, and time for the people I care about.',
        },
      });
  });
  await start(page);
  await page.getByLabel('Connected AI coach', { exact: false }).check();
  await page.getByRole('button', { name: 'Shape my goals', exact: true }).click();
  await page.getByRole('button', { name: 'Launch the product', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page
    .getByLabel('Your answer', { exact: true })
    .fill('Exercise, recovery, home and family.');
  await page.getByRole('button', { name: 'Draft my season', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Your answer', { exact: true })).toHaveValue(
    'Exercise, recovery, home and family.',
  );
  await page.getByRole('button', { name: 'Draft my season', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your plan for this season', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.proposal-row:not(.area-row)')).toHaveCount(4);
  await expect(page.locator('.proposal-row.area-row')).toHaveCount(2);
  await expect(page.getByLabel('Priority for Launch a useful product')).toHaveValue('core');
  await expect(page.getByLabel('Priority for Publish short videos')).toHaveValue('secondary');
  await page
    .getByRole('button', { name: 'Remove proposed goal Publish short videos', exact: true })
    .click();
  await expect(page.locator('.proposal-row:not(.area-row)')).toHaveCount(3);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByLabel('Your commitment', { exact: true })).toHaveValue(
    'I choose a useful release, a sustainable week, and time for the people I care about.',
  );
  await page.getByLabel('Signed', { exact: true }).fill('Avery');
  await page.getByRole('button', { name: 'Begin my season', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your season.', exact: true })).toBeVisible();
  expect(requests[0].context.brainDump).toBe(narrative);
  expect(requests.find((r) => r.action === 'plan')?.context.answers).toHaveLength(2);
  expect(plans).toBe(2);
});
