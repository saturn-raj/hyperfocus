import { it, expect } from 'vitest';
import { createState } from './seed';
import { addDays, stateSchema } from './model';
import {
  buildOnboardingPlan,
  createOnboardingDraft,
  goalsFromBrainDump,
  validateOnboardingStep,
} from './onboarding';
function ready() {
  const draft = createOnboardingDraft(createState(false));
  draft.name = 'Raj';
  draft.brainDump = 'Launch my project\nRun consistently';
  draft.goals = goalsFromBrainDump(draft.brainDump, []).map((g) => ({
    ...g,
    why: 'Make meaningful progress',
    success: 'Finish the first milestone',
    firstAction: `Start ${g.title}`,
    weeklyMinutes: 120,
  }));
  draft.commitment = 'I will make room for what matters.';
  draft.signature = 'Raj';
  return draft;
}
it('turns explicit lines into unique goals and preserves edited details', () => {
  const first = goalsFromBrainDump(' - Launch something\n2. Read more\nRead more', []);
  expect(first).toHaveLength(2);
  first[0].why = 'Independence';
  expect(goalsFromBrainDump('Launch something', first)[0]).toEqual(first[0]);
  expect(() => goalsFromBrainDump('\n', [])).toThrow();
  expect(() => goalsFromBrainDump('a\nb\nc\nd\ne\nf', [])).toThrow('five');
});
it('requires a meaningful goal, one core focus, a realistic time budget and signature', () => {
  const draft = ready();
  expect(validateOnboardingStep({ ...draft, step: 3 })).toBeNull();
  expect(
    validateOnboardingStep({
      ...draft,
      step: 3,
      goals: draft.goals.map((g) => ({ ...g, priority: 'core' })),
    }),
  ).toContain('exactly one');
  expect(validateOnboardingStep({ ...draft, step: 4, weeklyCapacity: 30 })).toContain('more time');
  expect(validateOnboardingStep({ ...draft, step: 6, signature: ' ' })).toContain('sign');
});
it('creates linked goals, milestones, first actions and an optional conflict-free block atomically', () => {
  const original = createState(false),
    draft = ready();
  draft.firstBlock = { date: draft.start, start: 540 };
  const plan = buildOnboardingPlan(original, draft);
  expect(plan.goals).toHaveLength(2);
  expect(plan.tasks).toHaveLength(2);
  expect(plan.blocks[0].taskId).toBe(plan.tasks[0].id);
  expect(plan.blocks[0].goalId).toBe(plan.goals[0].id);
  expect(plan.goals[0].milestones[0].title).toBe(draft.goals[0].success);
  expect(plan.season.end).toBe(addDays(draft.start, 83));
  expect(plan.onboarding.completedAt).toBeGreaterThan(0);
  expect(original.goals).toHaveLength(0);
  expect(stateSchema.safeParse(plan).success).toBe(true);
});
it('preserves existing work and rejects conflicting or out-of-season first blocks', () => {
  const original = createState(),
    draft = ready();
  draft.firstBlock = { date: original.blocks[0].date, start: 540 };
  expect(() => buildOnboardingPlan(original, draft)).toThrow('overlaps');
  draft.firstBlock = { date: addDays(draft.start, -1), start: 540 };
  expect(() => buildOnboardingPlan(original, draft)).toThrow('within your season');
  draft.firstBlock = null;
  const plan = buildOnboardingPlan(original, draft);
  expect(plan.blocks).toEqual(original.blocks);
  expect(plan.tasks.slice(0, original.tasks.length)).toEqual(original.tasks);
  expect(plan.goals).toHaveLength(original.goals.length + 2);
});
it('reads old backups without onboarding metadata without discarding existing data', () => {
  const original = createState();
  const legacy = JSON.parse(JSON.stringify(original));
  delete legacy.onboarding;
  const restored = stateSchema.parse(legacy);
  expect(restored.onboarding).toEqual({ completedAt: null, draft: null });
  expect(restored.goals).toEqual(original.goals);
});
