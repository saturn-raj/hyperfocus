import { test, expect } from '@playwright/test';
import { createState } from '../src/domain/seed';
import { createOnboardingDraft } from '../src/domain/onboarding';

function savedQuestionnaire(answer = '') {
  const state = createState(false),
    draft = createOnboardingDraft(state);
  draft.name = 'Avery';
  draft.step = 3;
  draft.brainDump =
    'Launch a useful product\nInterview at three companies\nPost on Twitter daily\nPublish Instagram videos';
  // A real pre-fix shape: these saved guided questions have no options property.
  draft.questions = [
    {
      id: 'north-star',
      prompt:
        'If only one thing moved forward this season, what would make the biggest difference to you?',
    },
    {
      id: 'capacity',
      prompt: 'How many hours a week can you realistically protect for these goals?',
    },
    { id: 'support', prompt: 'What needs maintaining while you pursue these goals?' },
  ];
  if (answer)
    draft.answers = [{ questionId: 'north-star', prompt: draft.questions[0].prompt, answer }];
  state.onboarding.draft = draft;
  return state;
}
test('saved questions gain goal choices, persist selection, and allow multiple support areas', async ({
  page,
}) => {
  const initial = savedQuestionnaire();
  await page.addInitScript((seed) => {
    if (!localStorage.getItem('hyperfocus:v1'))
      localStorage.setItem('hyperfocus:v1', JSON.stringify(seed));
  }, initial);
  await page.goto('/');
  const choice = page.getByRole('button', { name: 'Interview at three companies', exact: true });
  await expect(choice).toBeVisible();
  await expect(page.getByLabel('Your answer', { exact: true })).not.toBeAttached();
  await choice.click();
  await expect(choice).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(choice).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'About 5 hours a week', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'About 5 hours a week', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('hyperfocus:v1')!).onboarding.draft.weeklyCapacity,
    ),
  ).toBe(300);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const health = page.getByRole('button', { name: 'Health & fitness', exact: true }),
    home = page.getByRole('button', { name: 'Home & relationships', exact: true });
  await health.click();
  await home.click();
  await page.reload();
  await expect(health).toHaveAttribute('aria-pressed', 'true');
  await expect(home).toHaveAttribute('aria-pressed', 'true');
  await health.click();
  await expect(health).toHaveAttribute('aria-pressed', 'false');
  await expect(home).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Add detail or write my own', exact: true }).click();
  await expect(page.getByLabel('Your answer', { exact: true })).toHaveValue('Home & relationships');
  await page
    .getByLabel('Your answer', { exact: true })
    .fill('Home & relationships\nKeep Sunday evenings free for close friends.');
  await page.reload();
  await expect(page.getByLabel('Your answer', { exact: true })).toHaveValue(
    'Home & relationships\nKeep Sunday evenings free for close friends.',
  );
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('hyperfocus:v1')!).onboarding.draft,
  );
  expect(saved.brainDump).toBe(initial.onboarding.draft!.brainDump);
  expect(
    saved.answers.find((a: { questionId: string }) => a.questionId === 'north-star').answer,
  ).toBe('Interview at three companies');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('existing written answers remain visible and unchanged when choices are introduced', async ({
  page,
}) => {
  const answer = 'I want to finish the community project I have already started.';
  await page.addInitScript((seed) => {
    if (!localStorage.getItem('hyperfocus:v1'))
      localStorage.setItem('hyperfocus:v1', JSON.stringify(seed));
  }, savedQuestionnaire(answer));
  await page.goto('/');
  await expect(page.getByRole('group', { name: 'Suggested answers' })).toBeVisible();
  await expect(page.getByLabel('Your answer', { exact: true })).toHaveValue(answer);
  await page.getByRole('button', { name: 'Write my own answer', exact: true }).click();
  await expect(page.getByLabel('Your answer', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Your answer', { exact: true })).toHaveValue(answer);
  await page.reload();
  await expect(page.getByLabel('Your answer', { exact: true })).toHaveValue(answer);
});
