import { describe, expect, it } from 'vitest';
import { createState } from './seed';
import { migrateBackup } from './migration';
import { stateSchema, type State } from './model';

function legacyDocument() {
  const document = JSON.parse(JSON.stringify(createState())) as Record<string, unknown>;
  delete document.supportAreas;
  (document.goals as Array<{ id: string; priority: string }>).find((g) => g.id === 'g3')!.priority =
    'support';
  document.onboarding = { completedAt: null, draft: null };
  return document;
}

function signedLegacyDocument() {
  const document = legacyDocument();
  document.onboarding = {
    completedAt: 1_793_786_400_000,
    draft: {
      step: 6,
      name: 'Raj',
      seasonTitle: 'A season that matters',
      start: '2026-11-04',
      lengthDays: 84,
      brainDump: 'Build something useful',
      goals: [],
      weeklyCapacity: 600,
      commitment: 'I will make room for work that matters.',
      signature: 'Raj',
      firstBlock: null,
    },
  };
  return document;
}

describe('backup evolution', () => {
  it('reads old documents with no onboarding metadata and preserves existing records', () => {
    const document = legacyDocument();
    delete document.onboarding;
    const snapshot = JSON.stringify(document);
    const restored = migrateBackup(document);
    expect(restored.onboarding).toEqual({
      completedAt: null,
      draft: null,
      commitments: [],
      acceptedProposalIds: [],
      history: [],
    });
    expect(restored.supportAreas).toEqual([]);
    expect(restored.goals).toEqual(document.goals);
    expect(restored.tasks).toEqual(document.tasks);
    expect(restored.blocks).toEqual(document.blocks);
    expect(JSON.stringify(document)).toBe(snapshot);
  });

  it('keeps ambiguous support-priority goals as goals rather than silently reclassifying them', () => {
    const document = legacyDocument();
    const restored = migrateBackup(document);
    expect(restored.goals.find((goal) => goal.id === 'g3')?.priority).toBe('support');
    expect(restored.tasks.find((task) => task.id === 't4')?.goalId).toBe('g3');
    expect(restored.supportAreas).toEqual([]);
  });

  it('promotes a previously signed completed draft into a stable accepted commitment', () => {
    const document = signedLegacyDocument();
    const snapshot = JSON.stringify(document);
    const restored = migrateBackup(document);
    expect(restored.onboarding.commitments).toEqual([
      {
        id: 'legacy-commitment-1793786400000',
        text: 'I will make room for work that matters.',
        signature: 'Raj',
        signedAt: 1_793_786_400_000,
        revision: 1,
      },
    ]);
    expect(restored.onboarding.draft).toMatchObject({
      revisionId: 'legacy',
      coachMode: 'guided',
      questions: [],
      answers: [],
      questionIndex: 0,
      proposedSupportAreas: [],
      proposalGenerated: false,
      brainDump: 'Build something useful',
    });
    expect(JSON.stringify(document)).toBe(snapshot);
    expect(migrateBackup(JSON.parse(JSON.stringify(restored)))).toEqual(restored);
  });

  it('does not promote an unfinished signature or add a second accepted commitment on repeated reads', () => {
    const unfinished = signedLegacyDocument();
    const onboarding = unfinished.onboarding as Record<string, unknown>;
    onboarding.completedAt = null;
    expect(migrateBackup(unfinished).onboarding.commitments).toEqual([]);
    const restored = migrateBackup(signedLegacyDocument());
    expect(migrateBackup(restored).onboarding.commitments).toHaveLength(1);
  });

  it('preserves explicit empty commitment history instead of inferring a new acceptance', () => {
    const document = signedLegacyDocument();
    (document.onboarding as Record<string, unknown>).commitments = [];
    expect(migrateBackup(document).onboarding.commitments).toEqual([]);
  });
});

function areaWorkspace(): State {
  const state = createState(false);
  state.supportAreas = [
    {
      id: 'health',
      title: 'Health & Fitness',
      description: 'Keep a sustainable routine.',
      color: 'green',
    },
  ];
  state.tasks = [
    {
      id: 'routine',
      title: 'Go for a walk',
      goalId: null,
      areaId: 'health',
      duration: 30,
      done: false,
    },
  ];
  state.blocks = [
    {
      id: 'walk',
      title: 'Go for a walk',
      goalId: null,
      areaId: 'health',
      taskId: 'routine',
      date: '2026-11-04',
      start: 720,
      duration: 30,
      done: false,
    },
  ];
  state.sessions = [
    {
      id: 'walk-session',
      title: 'Go for a walk',
      goalId: null,
      areaId: 'health',
      taskId: 'routine',
      startedAt: 1000,
      endedAt: 1_801_000,
      minutes: 30,
      quality: 4,
    },
  ];
  state.timer = {
    id: 'walk-timer',
    title: 'Go for a walk',
    goalId: null,
    areaId: 'health',
    taskId: 'routine',
    startedAt: 2_000_000,
    durationSeconds: 1800,
    remainingSeconds: 1800,
    runningSince: null,
  };
  return state;
}

describe('separate support-area references', () => {
  it('can link area work throughout task, calendar and focus without inventing a goal', () => {
    const state = areaWorkspace();
    expect(stateSchema.parse(state)).toEqual(state);
    expect(migrateBackup(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(state.goals).toEqual([]);
  });

  it.each(['tasks', 'blocks', 'sessions', 'timer'] as const)(
    'rejects a dangling %s area reference',
    (key) => {
      const state = areaWorkspace();
      if (key === 'timer') state.timer!.areaId = 'missing';
      else state[key][0].areaId = 'missing';
      const result = stateSchema.safeParse(state);
      expect(result.success).toBe(false);
      if (!result.success)
        expect(
          result.error.issues.some((issue) => issue.message === 'Unknown support area reference'),
        ).toBe(true);
    },
  );

  it.each(['tasks', 'blocks', 'sessions', 'timer'] as const)(
    'rejects a %s belonging to both a goal and area',
    (key) => {
      const state = areaWorkspace();
      state.goals = createState().goals;
      if (key === 'timer') state.timer!.goalId = 'g1';
      else state[key][0].goalId = 'g1';
      const result = stateSchema.safeParse(state);
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues.some((issue) => issue.message.includes('not both'))).toBe(true);
    },
  );

  it('rejects duplicate support area and accepted-proposal identities', () => {
    const state = areaWorkspace();
    state.supportAreas.push({ ...state.supportAreas[0] });
    expect(stateSchema.safeParse(state).success).toBe(false);
    state.supportAreas.pop();
    state.onboarding.acceptedProposalIds = ['proposal', 'proposal'];
    expect(stateSchema.safeParse(state).success).toBe(false);
  });
});
