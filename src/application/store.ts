import {
  stateSchema,
  localDate,
  uid,
  type State,
  type Goal,
  type Task,
  type Block,
} from '../domain/model';
import { createState } from '../domain/seed';
import { canSchedule, remaining } from '../domain/planning';
import type { Repository } from './ports';
import { buildOnboardingPlan } from '../domain/onboarding';
import { onboardingDraftSchema, type OnboardingDraft } from '../domain/model';

export function createWorkspaceStore(repository: Repository) {
  let startupError = '';
  let state: State;
  try {
    state = repository.load() ?? createState(false);
  } catch {
    state = createState(false);
    startupError =
      'Saved data could not be read. It has been left untouched. Export a recovery copy in Settings before saving changes.';
  }
  let blockedByCorruption = !!startupError;
  const listeners = new Set<() => void>();
  function emit() {
    listeners.forEach((l) => l());
  }
  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
  function getState() {
    return state;
  }
  function getStartupError() {
    return startupError;
  }
  function commit(next: State) {
    if (blockedByCorruption)
      throw new Error('Recover or replace the unreadable data in Settings before saving.');
    const valid = stateSchema.parse(next);
    try {
      repository.save(valid);
    } catch (e) {
      throw new Error(
        e instanceof Error
          ? `Could not save: ${e.message}`
          : 'Storage is unavailable. Export your data before closing this page.',
      );
    }
    state = valid;
    emit();
  }
  function replaceState(next: State) {
    const valid = stateSchema.parse(next);
    repository.save(valid);
    state = valid;
    blockedByCorruption = false;
    startupError = '';
    emit();
  }
  function updateSettings(patch: Partial<State['settings']>) {
    commit({ ...state, settings: { ...state.settings, ...patch } });
  }
  function saveGoal(goal: Goal) {
    commit({
      ...state,
      goals: state.goals.some((g) => g.id === goal.id)
        ? state.goals.map((g) => (g.id === goal.id ? goal : g))
        : [...state.goals, goal],
    });
  }
  function deleteGoal(id: string) {
    commit({
      ...state,
      goals: state.goals.filter((g) => g.id !== id),
      tasks: state.tasks.map((t) => (t.goalId === id ? { ...t, goalId: null } : t)),
      blocks: state.blocks.map((b) => (b.goalId === id ? { ...b, goalId: null } : b)),
      sessions: state.sessions.map((s) => (s.goalId === id ? { ...s, goalId: null } : s)),
      timer: state.timer?.goalId === id ? { ...state.timer, goalId: null } : state.timer,
    });
  }
  function saveTask(task: Task) {
    commit({
      ...state,
      tasks: state.tasks.some((t) => t.id === task.id)
        ? state.tasks.map((t) => (t.id === task.id ? task : t))
        : [...state.tasks, task],
    });
  }
  function completeTask(id: string) {
    const t = state.tasks.find((t) => t.id === id);
    if (t)
      commit({
        ...state,
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        blocks: state.blocks.map((b) => (b.taskId === id ? { ...b, done: !t.done } : b)),
      });
  }
  function deleteTask(id: string) {
    commit({
      ...state,
      tasks: state.tasks.filter((t) => t.id !== id),
      blocks: state.blocks.map((b) => (b.taskId === id ? { ...b, taskId: null } : b)),
      sessions: state.sessions.map((s) => (s.taskId === id ? { ...s, taskId: null } : s)),
      timer: state.timer?.taskId === id ? { ...state.timer, taskId: null } : state.timer,
    });
  }
  function saveBlock(block: Block) {
    if (!canSchedule(state.blocks, block))
      throw new Error('That time overlaps another block. Choose a free slot.');
    commit({
      ...state,
      blocks: state.blocks.some((b) => b.id === block.id)
        ? state.blocks.map((b) => (b.id === block.id ? block : b))
        : [...state.blocks, block],
    });
  }
  function removeBlock(id: string) {
    commit({ ...state, blocks: state.blocks.filter((b) => b.id !== id) });
  }
  function startFocus(
    title: string,
    duration: number,
    goalId: string | null,
    taskId: string | null,
  ) {
    if (state.timer) throw new Error('Finish or discard your current session first.');
    const now = Date.now();
    commit({
      ...state,
      timer: {
        id: uid(),
        title,
        goalId,
        taskId,
        durationSeconds: duration * 60,
        remainingSeconds: duration * 60,
        startedAt: now,
        runningSince: now,
      },
    });
  }
  function toggleTimer() {
    const t = state.timer;
    if (!t) return;
    commit({
      ...state,
      timer: {
        ...t,
        remainingSeconds: remaining(t, Date.now()),
        runningSince: t.runningSince === null ? Date.now() : null,
      },
    });
  }
  function finishFocus(quality: number) {
    const t = state.timer;
    if (!t) return;
    const minutes = (t.durationSeconds - remaining(t, Date.now())) / 60;
    if (minutes < 1 / 60) throw new Error('Focus for at least one second before saving.');
    commit({
      ...state,
      timer: null,
      sessions: [
        ...state.sessions,
        {
          id: t.id,
          title: t.title,
          goalId: t.goalId,
          taskId: t.taskId,
          startedAt: t.startedAt,
          endedAt: Date.now(),
          minutes,
          quality,
        },
      ],
    });
  }
  function discardFocus() {
    commit({ ...state, timer: null });
  }
  function addReflection(win: string, improve: string, energy: number) {
    const date = localDate();
    commit({
      ...state,
      reflections: [
        ...state.reflections.filter((r) => r.date !== date),
        { id: uid(), date, win, improve, energy },
      ],
    });
  }
  function saveOnboardingDraft(draft: OnboardingDraft) {
    commit({
      ...state,
      onboarding: { ...state.onboarding, draft: onboardingDraftSchema.parse(draft) },
    });
  }
  function completeOnboarding(draft: OnboardingDraft) {
    if (state.onboarding.completedAt !== null)
      throw new Error('Your season is already set up. Revisit setup from Settings to plan again.');
    commit(buildOnboardingPlan(state, draft));
  }
  function restartOnboarding() {
    commit({ ...state, onboarding: { completedAt: null, draft: null } });
  }
  function reload() {
    try {
      const next = repository.load();
      if (next) {
        state = stateSchema.parse(next);
        blockedByCorruption = false;
        startupError = '';
        emit();
      }
    } catch {
      /* Preserve the last valid snapshot if another tab writes invalid data. */
    }
  }
  return {
    saveOnboardingDraft,
    completeOnboarding,
    restartOnboarding,
    subscribe,
    getState,
    getStartupError,
    commit,
    replaceState,
    updateSettings,
    saveGoal,
    deleteGoal,
    saveTask,
    completeTask,
    deleteTask,
    saveBlock,
    removeBlock,
    startFocus,
    toggleTimer,
    finishFocus,
    discardFocus,
    addReflection,
    reload,
  };
}
