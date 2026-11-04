import { describe, it, expect } from 'vitest';
import { createState } from './seed';
import { addDays, stateSchema, type State, type OnboardingDraft } from './model';
import type { CoachingPlan } from './coach';
import {
  applyCoachingPlan,
  buildOnboardingPlan,
  coachingContext,
  createOnboardingDraft,
  goalsFromBrainDump,
  validateOnboardingStep,
} from './onboarding';

const narrative =
  'I want to launch a useful independent project this season. I also want to read more consistently, while protecting time for health and the people close to me.';
const proposal: CoachingPlan = {
  goals: [
    {
      title: 'Ship the first useful release',
      why: 'Turn an idea into a useful tool',
      success: 'Three people use the first release',
      priority: 'core',
      weeklyMinutes: 240,
      firstAction: 'Write the first release scope',
      firstDuration: 30,
    },
    {
      title: 'Read four books',
      why: 'Make space for learning',
      success: 'Finish four books and capture the useful ideas',
      priority: 'secondary',
      weeklyMinutes: 120,
      firstAction: 'Choose the first book',
      firstDuration: 20,
    },
  ],
  supportAreas: [
    { title: 'Health & Fitness', description: 'Maintain a sustainable exercise and sleep routine' },
    { title: 'Home & Relationships', description: 'Keep time for close relationships' },
  ],
};
function ready(state = createState(false)): OnboardingDraft {
  const draft = createOnboardingDraft(state);
  draft.name = 'Avery';
  draft.brainDump = narrative;
  draft.start = '2026-11-04';
  draft.questions = [
    { id: 'north-star', prompt: 'Which outcome comes first?' },
    { id: 'capacity', prompt: 'What time can you protect?' },
  ];
  draft.answers = [
    {
      questionId: 'north-star',
      prompt: 'Which outcome comes first?',
      answer: 'The first useful release matters most.',
    },
    {
      questionId: 'capacity',
      prompt: 'What time can you protect?',
      answer: 'Six hours most weeks.',
    },
  ];
  return {
    ...applyCoachingPlan(draft, proposal),
    commitment: 'I will protect time for the goals I chose and adjust the plan when life changes.',
    signature: 'Avery',
    step: 5,
  };
}
function ids() {
  let next = 0;
  return () => `generated-${++next}`;
}

describe('onboarding decisions and source answers', () => {
  it('requires a real narrative, explicit question decisions, a viable plan and a signature', () => {
    const draft = ready();
    expect(validateOnboardingStep({ ...draft, step: 2, brainDump: 'Launch a thing' })).toContain(
      'little more',
    );
    expect(validateOnboardingStep({ ...draft, step: 3, answers: [draft.answers[0]] })).toContain(
      'explicitly skip',
    );
    expect(
      validateOnboardingStep({
        ...draft,
        step: 3,
        answers: [draft.answers[0], { ...draft.answers[1], answer: '' }],
      }),
    ).toBeNull();
    expect(
      validateOnboardingStep({
        ...draft,
        step: 4,
        goals: draft.goals.map((g) => ({ ...g, priority: 'core' })),
      }),
    ).toContain('exactly one');
    expect(validateOnboardingStep({ ...draft, step: 4, weeklyCapacity: 30 })).toContain(
      'more time',
    );
    expect(validateOnboardingStep({ ...draft, step: 5, signature: ' ' })).toContain('sign');
    expect(validateOnboardingStep({ ...draft, step: 4 })).toBeNull();
  });
  it('preserves the original narrative and answered context when a proposed title is edited', () => {
    const draft = ready(),
      before = structuredClone(draft);
    const revised = applyCoachingPlan(draft, {
      ...proposal,
      goals: proposal.goals.map((g, i) =>
        i === 0 ? { ...g, title: 'An edited outcome chosen by me' } : g,
      ),
    });
    expect(draft).toEqual(before);
    expect(revised.brainDump).toBe(narrative);
    expect(revised.answers).toEqual(before.answers);
    expect(coachingContext(revised)).toEqual({
      brainDump: narrative,
      seasonDays: 84,
      name: 'Avery',
      answers: before.answers,
    });
    expect(revised.goals[0].title).toBe('An edited outcome chosen by me');
  });
  it('keeps support areas separate from all core and secondary outcomes', () => {
    const draft = ready();
    expect(draft.goals).toHaveLength(2);
    expect(draft.proposedSupportAreas).toHaveLength(2);
    expect(draft.goals.map((g) => g.priority)).toEqual(['core', 'secondary']);
    expect(draft.goals.some((g) => g.title === 'Health & Fitness')).toBe(false);
    const legacyLines = goalsFromBrainDump(
      'First outcome\nSecond outcome\nThird outcome\nFourth outcome',
      [],
    );
    expect(legacyLines.map((g) => g.priority)).toEqual([
      'core',
      'secondary',
      'secondary',
      'secondary',
    ]);
  });
});

describe('accepting a reviewed proposal', () => {
  it('creates linked goals, milestones, first tasks and optional block in one valid transition', () => {
    const original = createState(false),
      draft = ready(),
      makeId = ids(),
      now = 1_800_000_000_000;
    draft.firstBlock = { date: draft.start, start: 540 };
    const before = structuredClone(original);
    const plan = buildOnboardingPlan(original, draft, { makeId, now });
    expect(original).toEqual(before);
    expect(plan.goals).toHaveLength(2);
    expect(plan.supportAreas).toHaveLength(2);
    expect(plan.tasks.map((t) => t.id)).toEqual(draft.goals.map((g) => `first:${g.id}`));
    expect(plan.blocks[0].taskId).toBe(`first:${draft.goals[0].id}`);
    expect(plan.blocks[0].goalId).toBe(draft.goals[0].id);
    expect(plan.goals[0].milestones[0].title).toBe(draft.goals[0].success);
    expect(plan.season.end).toBe(addDays(draft.start, 83));
    expect(plan.onboarding.draft).toBeNull();
    expect(plan.onboarding.completedAt).toBe(now);
    expect(plan.onboarding.acceptedProposalIds).toEqual([draft.revisionId]);
    expect(plan.onboarding.commitments[0]).toMatchObject({
      signature: 'Avery',
      signedAt: now,
      revision: 1,
    });
    expect(stateSchema.safeParse(plan).success).toBe(true);
  });
  it('is idempotent for an already accepted proposal and never duplicates its first actions or signature', () => {
    const draft = ready();
    draft.firstBlock = { date: draft.start, start: 540 };
    const accepted = buildOnboardingPlan(createState(false), draft, { makeId: ids(), now: 1000 });
    const again = buildOnboardingPlan(accepted, draft, {
      makeId: () => {
        throw new Error('Should not create IDs twice');
      },
      now: 2000,
    });
    expect(again).toBe(accepted);
    expect(again.tasks).toHaveLength(2);
    expect(again.blocks).toHaveLength(1);
    expect(again.onboarding.commitments).toHaveLength(1);
  });
  it('upserts stable first tasks on a new revision and preserves their completed state and past commitments', () => {
    const draft = ready(),
      makeId = ids();
    const first = buildOnboardingPlan(createState(false), draft, { makeId, now: 1000 });
    const firstTaskId = `first:${draft.goals[0].id}`;
    const completed = {
      ...first,
      tasks: first.tasks.map((t) => (t.id === firstTaskId ? { ...t, done: true } : t)),
    };
    const revised = {
      ...structuredClone(draft),
      revisionId: 'second-reviewed-revision',
      goals: draft.goals.map((g, i) =>
        i === 0 ? { ...g, firstAction: 'Share the scope with a real user' } : g,
      ),
      commitment: 'I will share progress and listen to useful feedback.',
    };
    const second = buildOnboardingPlan(completed, revised, { makeId, now: 2000 });
    expect(second.tasks).toHaveLength(2);
    expect(second.tasks.find((t) => t.id === firstTaskId)).toMatchObject({
      title: 'Share the scope with a real user',
      done: true,
    });
    expect(second.goals).toHaveLength(2);
    expect(second.onboarding.history).toHaveLength(2);
    expect(second.onboarding.commitments[0]).toEqual(first.onboarding.commitments[0]);
    expect(second.onboarding.commitments[1]).toMatchObject({ revision: 2, signedAt: 2000 });
  });
  it('takes an independent snapshot of raw answers and the accepted plan', () => {
    const draft = ready();
    const accepted = buildOnboardingPlan(createState(false), draft, { makeId: ids(), now: 1000 });
    draft.brainDump = 'A later edit';
    draft.answers[0].answer = 'A changed answer';
    draft.goals[0].title = 'A later title';
    expect(accepted.onboarding.history[0].brainDump).toBe(narrative);
    expect(accepted.onboarding.history[0].answers[0].answer).toBe(
      'The first useful release matters most.',
    );
    expect(accepted.onboarding.history[0].goals[0].title).toBe(proposal.goals[0].title);
  });
  it('preserves existing goals, area work, calendar blocks and focus history', () => {
    const original = createState();
    original.supportAreas = [
      {
        id: 'old-area',
        title: 'Household',
        description: 'Keep everyday life running',
        color: 'green',
      },
    ];
    original.tasks.push({
      id: 'old-area-task',
      goalId: null,
      areaId: 'old-area',
      title: 'Handle household admin',
      duration: 30,
      done: false,
    });
    original.sessions.push({
      id: 'old-session',
      goalId: 'g1',
      taskId: 't1',
      title: 'Previous work',
      startedAt: 1000,
      endedAt: 61000,
      minutes: 1,
      quality: 4,
    });
    const before = structuredClone(original);
    const result = buildOnboardingPlan(original, ready(), { makeId: ids(), now: 100000 });
    expect(original).toEqual(before);
    for (const goal of before.goals) expect(result.goals).toContainEqual(goal);
    for (const task of before.tasks) expect(result.tasks).toContainEqual(task);
    expect(result.blocks).toEqual(before.blocks);
    expect(result.sessions).toEqual(before.sessions);
    expect(result.supportAreas).toContainEqual(before.supportAreas[0]);
  });
  it('rejects a conflicting or out-of-season first block without changing input state or draft', () => {
    const original = createState(),
      draft = ready();
    draft.start = original.blocks[0].date;
    draft.firstBlock = { date: draft.start, start: original.blocks[0].start };
    const before = structuredClone(original),
      beforeDraft = structuredClone(draft);
    expect(() => buildOnboardingPlan(original, draft, { makeId: ids() })).toThrow('overlaps');
    expect(original).toEqual(before);
    expect(draft).toEqual(beforeDraft);
    draft.firstBlock = { date: addDays(draft.start, -1), start: 540 };
    expect(() => buildOnboardingPlan(original, draft, { makeId: ids() })).toThrow(
      'within your season',
    );
    expect(original).toEqual(before);
  });
  it('reads older backups with safe onboarding defaults while keeping their work', () => {
    const original = createState();
    const legacy = JSON.parse(JSON.stringify(original));
    delete legacy.onboarding;
    delete legacy.supportAreas;
    const restored: State = stateSchema.parse(legacy);
    expect(restored.onboarding.completedAt).toBeNull();
    expect(restored.onboarding.draft).toBeNull();
    expect(restored.onboarding.commitments).toEqual([]);
    expect(restored.onboarding.acceptedProposalIds).toEqual([]);
    expect(restored.onboarding.history).toEqual([]);
    expect(restored.supportAreas).toEqual([]);
    expect(restored.goals).toEqual(original.goals);
    expect(restored.tasks).toEqual(original.tasks);
  });
});
