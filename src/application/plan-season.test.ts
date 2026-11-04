import { describe, expect, it, vi } from 'vitest';
import { createState } from '../domain/seed';
import { createOnboardingDraft, applyCoachingPlan } from '../domain/onboarding';
import type { CoachingPlan, CoachingQuestion } from '../domain/coach';
import type { PlanningCoach } from './coach-port';
import { createSeasonPlanner } from './plan-season';
const plan: CoachingPlan = {
  goals: [
    {
      title: 'Release a useful product',
      why: 'Help a small group solve a problem',
      success: 'Three people try a first version',
      priority: 'core',
      weeklyMinutes: 180,
      firstAction: 'Write a small release scope',
      firstDuration: 30,
    },
  ],
  supportAreas: [{ title: 'Health', description: 'Maintain rest and exercise' }],
};
function draft() {
  return {
    ...createOnboardingDraft(createState(false)),
    name: 'Avery',
    brainDump:
      'I want to launch a useful product this season while keeping a realistic amount of room for life.',
    answers: [
      {
        questionId: 'north-star',
        prompt: 'What matters most?',
        answer: 'Launch a useful first version.',
      },
    ],
  };
}
function provider(): PlanningCoach {
  return {
    questions: vi.fn(async () => [
      { id: 'audience', prompt: 'Who would benefit from this first?' },
    ]),
    plan: vi.fn(async () => structuredClone(plan)),
    commitment: vi.fn(
      async () =>
        'I will protect a manageable amount of time, share progress and revise the plan when needed.',
    ),
  };
}
describe('season planning application boundary', () => {
  it('returns validated questions and proposal drafts without mutating or accepting the input', async () => {
    const input = draft(),
      before = structuredClone(input),
      coach = provider(),
      planner = createSeasonPlanner(coach),
      controller = new AbortController();
    const questions = await planner.questions(input, controller.signal);
    expect(questions.step).toBe(3);
    expect(questions.questions[0].id).toBe('audience');
    const proposal = await planner.proposal(questions, controller.signal);
    expect(proposal.step).toBe(4);
    expect(proposal.proposalGenerated).toBe(true);
    expect(proposal.proposedSupportAreas[0].title).toBe('Health');
    expect(proposal.brainDump).toBe(before.brainDump);
    expect(input).toEqual(before);
    expect(coach.plan).toHaveBeenCalledWith(
      { brainDump: input.brainDump, name: 'Avery', seasonDays: 84, answers: input.answers },
      controller.signal,
    );
  });
  it('rejects malformed connected plan output and leaves all source answers unchanged', async () => {
    const input = draft(),
      before = structuredClone(input),
      coach = provider();
    coach.plan = vi.fn(
      async () => ({ ...plan, goals: [...plan.goals, ...plan.goals] }) as CoachingPlan,
    );
    await expect(createSeasonPlanner(coach).proposal(input)).rejects.toThrow();
    expect(input).toEqual(before);
  });
  it('rejects invalid or duplicated provider questions rather than exposing an unusable step', async () => {
    const input = draft(),
      before = structuredClone(input),
      coach = provider();
    coach.questions = vi.fn(
      async () =>
        [
          { id: 'same', prompt: 'First?' },
          { id: 'same', prompt: 'Second?' },
        ] as CoachingQuestion[],
    );
    await expect(createSeasonPlanner(coach).questions(input)).rejects.toThrow();
    expect(input).toEqual(before);
  });
  it('drafts a commitment from the reviewed plan and never signs it for the user', async () => {
    const input = applyCoachingPlan(draft(), plan),
      before = structuredClone(input),
      coach = provider(),
      controller = new AbortController();
    const result = await createSeasonPlanner(coach).commitment(input, controller.signal);
    expect(result.step).toBe(5);
    expect(result.commitment).toContain('manageable');
    expect(result.signature).toBe('');
    expect(input).toEqual(before);
    expect(coach.commitment).toHaveBeenCalledWith(
      { brainDump: input.brainDump, name: 'Avery', seasonDays: 84, answers: input.answers },
      plan,
      controller.signal,
    );
  });
  it('propagates provider failures and abort signals without changing the draft', async () => {
    const input = draft(),
      before = structuredClone(input),
      coach = provider(),
      controller = new AbortController(),
      failure = new DOMException('Cancelled', 'AbortError');
    controller.abort();
    coach.plan = vi.fn(async (_context, signal) => {
      expect(signal?.aborted).toBe(true);
      throw failure;
    });
    await expect(createSeasonPlanner(coach).proposal(input, controller.signal)).rejects.toBe(
      failure,
    );
    expect(input).toEqual(before);
  });
  it('rejects an empty generated commitment without replacing a user-written draft', async () => {
    const input = { ...applyCoachingPlan(draft(), plan), commitment: 'My existing words.' },
      before = structuredClone(input),
      coach = provider();
    coach.commitment = vi.fn(async () => '   ');
    await expect(createSeasonPlanner(coach).commitment(input)).rejects.toThrow();
    expect(input).toEqual(before);
  });
});
