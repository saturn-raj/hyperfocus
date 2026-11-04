import {
  addDays,
  localDate,
  uid,
  onboardingDraftSchema,
  stateSchema,
  type OnboardingDraft,
  type OnboardingGoal,
  type State,
  type Goal,
} from './model';
import { canSchedule } from './planning';
const colors: Goal['color'][] = ['blue', 'green', 'orange', 'violet'];
export function createOnboardingDraft(state: State): OnboardingDraft {
  const goals = state.goals.slice(0, 5).map((g) => ({
    ...g,
    success: g.milestones.find((m) => !m.done)?.title ?? '',
    firstAction: '',
    firstDuration: 30,
  }));
  return {
    step: 0,
    name: state.settings.name,
    seasonTitle: '',
    start: localDate(),
    lengthDays: 84,
    brainDump: goals.map((g) => g.title).join('\n'),
    goals,
    weeklyCapacity: 600,
    commitment: '',
    signature: '',
    firstBlock: null,
  };
}
/** One explicit line is one goal. No claim of semantic or AI interpretation. */
export function goalsFromBrainDump(text: string, existing: OnboardingGoal[]): OnboardingGoal[] {
  const lines = [
    ...new Set(
      text
        .split('\n')
        .map((t) => t.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
        .filter(Boolean),
    ),
  ];
  if (!lines.length) throw new Error('Write at least one goal, one per line.');
  if (lines.length > 5)
    throw new Error('Choose up to five goals for this season. Save the others for later.');
  if (lines.some((t) => t.length > 300))
    throw new Error('Keep each goal under 300 characters. Put the details in the next step.');
  return lines.map(
    (title, i) =>
      existing.find((g) => g.title === title) ?? {
        id: uid(),
        title,
        why: '',
        success: '',
        firstAction: '',
        firstDuration: 30,
        color: colors[i % colors.length],
        priority: i === 0 ? 'core' : i === 1 ? 'secondary' : 'support',
        weeklyMinutes: i === 0 ? 240 : 120,
        milestones: [],
      },
  );
}
export function validateOnboardingStep(draft: OnboardingDraft): string | null {
  if (draft.step === 1 && !draft.name.trim()) return 'What should we call you?';
  if (draft.step === 2) {
    try {
      goalsFromBrainDump(draft.brainDump, draft.goals);
    } catch (e) {
      return (e as Error).message;
    }
  }
  if (draft.step === 3) {
    if (!draft.goals.length) return 'Add at least one goal before continuing.';
    if (
      draft.goals.some(
        (g) => !g.title.trim() || !g.why.trim() || !g.success.trim() || !g.firstAction.trim(),
      )
    )
      return 'Give each goal a reason, a finish line, and one first action.';
    if (draft.goals.filter((g) => g.priority === 'core').length !== 1)
      return 'Choose exactly one core focus. Everything cannot come first.';
  }
  if (
    draft.step === 4 &&
    draft.goals.reduce((sum, g) => sum + g.weeklyMinutes, 0) > draft.weeklyCapacity
  )
    return 'Your goals need more time than you have available. Lower a goal’s hours or adjust your capacity.';
  if (draft.step === 6 && (!draft.commitment.trim() || !draft.signature.trim()))
    return 'Write your commitment and sign it to begin your season.';
  return null;
}
export function suggestedCommitment(draft: OnboardingDraft): string {
  const core = draft.goals.find((g) => g.priority === 'core');
  return `For the next ${draft.lengthDays} days, I’m making room for ${core?.title.toLowerCase() ?? 'what matters'}. I’ll protect ${draft.goals.reduce((sum, g) => sum + g.weeklyMinutes, 0) / 60} hours each week, begin with small actions, and reflect when the plan needs to change. Progress matters more than a perfect week.`;
}
export function buildOnboardingPlan(state: State, input: OnboardingDraft): State {
  const draft = onboardingDraftSchema.parse(input);
  for (const step of [1, 2, 3, 4, 6]) {
    const error = validateOnboardingStep({ ...draft, step });
    if (error) throw new Error(error);
  }
  const goals: Goal[] = draft.goals.map((g) => ({
    id: g.id,
    title: g.title.trim(),
    why: g.why.trim(),
    color: g.color,
    priority: g.priority,
    weeklyMinutes: g.weeklyMinutes,
    milestones: g.milestones.some((m) => m.title === g.success.trim())
      ? g.milestones
      : [...g.milestones, { id: uid(), title: g.success.trim(), done: false }],
  }));
  const tasks = draft.goals.map((g) => ({
    id: uid(),
    goalId: g.id,
    title: g.firstAction.trim(),
    duration: g.firstDuration,
    done: false,
  }));
  const next: State = {
    ...state,
    settings: { ...state.settings, name: draft.name.trim() },
    season: {
      title: draft.seasonTitle.trim() || `${draft.name.trim()}’s season of progress`,
      start: draft.start,
      end: addDays(draft.start, draft.lengthDays - 1),
    },
    goals: [...state.goals.filter((g) => !goals.some((x) => x.id === g.id)), ...goals],
    tasks: [...state.tasks, ...tasks],
    onboarding: {
      completedAt: Date.now(),
      draft: { ...draft, commitment: draft.commitment.trim(), signature: draft.signature.trim() },
    },
  };
  const core = tasks.find((t) => draft.goals.find((g) => g.id === t.goalId)?.priority === 'core');
  if (
    draft.firstBlock &&
    (draft.firstBlock.date < draft.start ||
      draft.firstBlock.date > addDays(draft.start, draft.lengthDays - 1))
  )
    throw new Error('Choose a first focus date within your season.');
  if (draft.firstBlock && core) {
    const block = {
      id: uid(),
      taskId: core.id,
      goalId: core.goalId,
      title: core.title,
      date: draft.firstBlock.date,
      start: draft.firstBlock.start,
      duration: core.duration,
      done: false,
    };
    if (!canSchedule(next.blocks, block))
      throw new Error(
        'Your first focus block overlaps existing work or goes past midnight. Pick another time in the review step.',
      );
    next.blocks = [...next.blocks, block];
  }
  return stateSchema.parse(next);
}
