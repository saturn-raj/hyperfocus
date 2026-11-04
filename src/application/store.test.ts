import { describe, it, expect, vi, afterEach } from 'vitest';
import { createState } from '../domain/seed';
import { createOnboardingDraft, goalsFromBrainDump } from '../domain/onboarding';
import type { State } from '../domain/model';
import { createWorkspaceStore } from './store';
import type { Repository } from './ports';
function setup(initial = createState()) {
  let saved = initial;
  const repository: Repository = {
    load: () => saved,
    save: (next) => {
      saved = next;
    },
  };
  return { repository, store: createWorkspaceStore(repository) };
}

function reviewedDraft(state: State) {
  const draft = createOnboardingDraft(state);
  draft.name = 'Avery';
  draft.brainDump =
    'I want to release a useful first version of my project this season while protecting a manageable weekly schedule.';
  draft.goals = goalsFromBrainDump('Release the first useful version', []).map((g) => ({
    ...g,
    why: 'Help people solve a real problem',
    success: 'Three people use the first version',
    firstAction: 'Write the first release scope',
    weeklyMinutes: 120,
  }));
  draft.questions = [{ id: 'north-star', prompt: 'What comes first?' }];
  draft.answers = [
    {
      questionId: 'north-star',
      prompt: 'What comes first?',
      answer: 'Release a useful first version.',
    },
  ];
  draft.commitment =
    'I will protect a manageable amount of time for this goal and adjust as needed.';
  draft.signature = 'Avery';
  draft.step = 5;
  return draft;
}

afterEach(() => vi.useRealTimers());
describe('workspace commands', () => {
  it('starts an untouched browser with onboarding and no example goals or blocks', () => {
    const store = createWorkspaceStore({ load: () => null, save: () => {} });
    expect(store.getState().goals).toEqual([]);
    expect(store.getState().blocks).toEqual([]);
    expect(store.getState().onboarding.completedAt).toBeNull();
  });
  it('publishes only after persistence succeeds and keeps the old snapshot on quota failure', () => {
    const { store, repository } = setup();
    const before = store.getState(),
      listener = vi.fn();
    store.subscribe(listener);
    repository.save = () => {
      throw new Error('Quota exceeded');
    };
    expect(() => store.updateSettings({ name: 'Raj' })).toThrow('Quota exceeded');
    expect(store.getState()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });
  it('detaches deleted goal and task references while preserving historical blocks', () => {
    const { store } = setup();
    store.deleteGoal('g1');
    expect(store.getState().tasks.find((t) => t.id === 't1')?.goalId).toBeNull();
    store.deleteTask('t1');
    expect(store.getState().blocks.find((b) => b.id === 'b1')?.taskId).toBeNull();
    expect(store.getState().blocks.find((b) => b.id === 'b1')).toBeDefined();
  });
  it('preserves elapsed focus across pause, reload, resume and finish without completing the task', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T09:00:00Z'));
    const { store, repository } = setup();
    store.startFocus('Prototype', 25, 'g1', 't1');
    vi.advanceTimersByTime(60_000);
    store.toggleTimer();
    vi.advanceTimersByTime(120_000);
    const restored = createWorkspaceStore(repository);
    restored.toggleTimer();
    vi.advanceTimersByTime(60_000);
    restored.finishFocus(4);
    expect(restored.getState().sessions[0].minutes).toBe(2);
    expect(restored.getState().tasks.find((t) => t.id === 't1')?.done).toBe(false);
    expect(restored.getState().timer).toBeNull();
  });
  it('leaves corrupt data untouched until an explicit replacement', () => {
    const save = vi.fn();
    const store = createWorkspaceStore({
      load: () => {
        throw new Error('Corrupt');
      },
      save,
    });
    expect(store.getStartupError()).toContain('left untouched');
    expect(save).not.toHaveBeenCalled();
    expect(() => store.updateSettings({ name: 'Raj' })).toThrow('Recover');
    store.replaceState(createState(false));
    expect(store.getStartupError()).toBe('');
    expect(save).toHaveBeenCalledOnce();
  });
  it('persists source answers and the current question so a fresh store resumes the same draft', () => {
    const { store, repository } = setup(createState(false)),
      draft = reviewedDraft(store.getState());
    draft.step = 3;
    draft.questions.push({ id: 'constraints', prompt: 'What commitments need protecting?' });
    draft.questionIndex = 1;
    store.saveOnboardingDraft(draft);
    const restored = createWorkspaceStore(repository);
    expect(restored.getState().onboarding.draft).toEqual(draft);
    expect(restored.getState().onboarding.completedAt).toBeNull();
  });
  it('preserves the accepted commitment and season while restarting and cancelling setup', () => {
    const { store } = setup(createState(false));
    store.completeOnboarding(reviewedDraft(store.getState()));
    const accepted = structuredClone(store.getState());
    store.restartOnboarding();
    expect(store.getState().onboarding.completedAt).toBe(accepted.onboarding.completedAt);
    expect(store.getState().onboarding.commitments).toEqual(accepted.onboarding.commitments);
    expect(store.getState().onboarding.history).toEqual(accepted.onboarding.history);
    expect(store.getState().onboarding.draft).not.toBeNull();
    store.cancelOnboarding();
    expect(store.getState().onboarding.draft).toBeNull();
    expect(store.getState().goals).toEqual(accepted.goals);
    expect(store.getState().tasks).toEqual(accepted.tasks);
    expect(store.getState().season).toEqual(accepted.season);
    expect(store.getState().onboarding.commitments).toEqual(accepted.onboarding.commitments);
  });
  it('does not publish or partially accept a proposal when persistence fails', () => {
    const { store, repository } = setup(createState(false)),
      draft = reviewedDraft(store.getState()),
      before = structuredClone(store.getState()),
      listener = vi.fn();
    store.subscribe(listener);
    repository.save = () => {
      throw new Error('Quota exceeded');
    };
    expect(() => store.completeOnboarding(draft)).toThrow('Quota exceeded');
    expect(store.getState()).toEqual(before);
    expect(listener).not.toHaveBeenCalled();
  });
  it('does not duplicate accepted proposals and keeps earlier commitment revisions after re-signing', () => {
    const { store } = setup(createState(false)),
      draft = reviewedDraft(store.getState());
    store.completeOnboarding(draft);
    const first = structuredClone(store.getState());
    store.completeOnboarding(draft);
    expect(store.getState()).toEqual(first);
    store.signCommitment('I will share my progress and change the plan when needed.', 'Avery');
    expect(store.getState().onboarding.commitments).toHaveLength(2);
    expect(store.getState().onboarding.commitments[0]).toEqual(first.onboarding.commitments[0]);
    expect(store.getState().onboarding.commitments[1].revision).toBe(2);
  });
  it('requires first-run setup to be completed before it can be cancelled', () => {
    const { store } = setup(createState(false)),
      before = store.getState();
    expect(() => store.cancelOnboarding()).toThrow('Complete your first season');
    expect(store.getState()).toBe(before);
  });
});
