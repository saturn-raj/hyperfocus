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
import type { CoachingContext, CoachingPlan } from './coach';
import { canSchedule } from './planning';
const colors: Goal['color'][] = ['orange', 'blue', 'violet', 'green'];
export function createOnboardingDraft(state: State): OnboardingDraft {
  return onboardingDraftSchema.parse({
    revisionId: uid(),
    step: 0,
    name: state.settings.name,
    seasonTitle: '',
    start: localDate(),
    lengthDays: 84,
    brainDump: '',
    goals: state.goals.slice(0, 5).map((g, i) => ({
      ...g,
      priority: i === 0 ? 'core' : 'secondary',
      success: g.milestones.find((m) => !m.done)?.title ?? '',
      firstAction: '',
      firstDuration: 30,
    })),
    proposedSupportAreas: state.supportAreas,
    weeklyCapacity: 600,
    commitment: '',
    signature: '',
    firstBlock: null,
  });
}
/** Retained for old integrations. Narrative coaching uses the PlanningCoach port. */
export function goalsFromBrainDump(text: string, existing: OnboardingGoal[]): OnboardingGoal[] {
  const lines = [
    ...new Set(
      text
        .split('\n')
        .map((t) => t.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
        .filter(Boolean),
    ),
  ];
  if (!lines.length) throw new Error('Write at least one goal.');
  if (lines.length > 5) throw new Error('Choose up to five goals for this season.');
  if (lines.some((t) => t.length > 300)) throw new Error('Keep each goal under 300 characters.');
  return lines.map(
    (title, i) =>
      existing.find((g) => g.title === title) ?? {
        id: uid(),
        title,
        why: '',
        success: '',
        firstAction: '',
        firstDuration: 30,
        color: colors[i % 4],
        priority: i === 0 ? 'core' : 'secondary',
        weeklyMinutes: i === 0 ? 240 : 120,
        milestones: [],
      },
  );
}
export function coachingContext(draft: OnboardingDraft): CoachingContext {
  return {
    brainDump: draft.brainDump,
    seasonDays: draft.lengthDays,
    name: draft.name,
    answers: draft.answers.filter((a) => a.answer.trim()),
  };
}
export function applyCoachingPlan(draft: OnboardingDraft, plan: CoachingPlan): OnboardingDraft {
  const goals = plan.goals.map((g, i) => {
    const existing = draft.goals.find((x) => x.title.toLowerCase() === g.title.toLowerCase());
    return {
      ...g,
      id: existing?.id ?? uid(),
      color: existing?.color ?? colors[i % 4],
      milestones: existing?.milestones ?? [],
    };
  });
  const areas = plan.supportAreas.map((a) => ({
    ...a,
    id:
      draft.proposedSupportAreas.find((x) => x.title.toLowerCase() === a.title.toLowerCase())?.id ??
      uid(),
    color: 'green' as const,
  }));
  return { ...draft, goals, proposedSupportAreas: areas, proposalGenerated: true, step: 4 };
}
export function draftAsPlan(draft: OnboardingDraft): CoachingPlan {
  return {
    goals: draft.goals.map((g) => ({
      title: g.title,
      why: g.why,
      success: g.success,
      firstAction: g.firstAction,
      firstDuration: g.firstDuration,
      weeklyMinutes: g.weeklyMinutes,
      priority: g.priority === 'core' ? 'core' : 'secondary',
    })),
    supportAreas: draft.proposedSupportAreas.map((a) => ({
      title: a.title,
      description: a.description,
    })),
  };
}
export function validateOnboardingStep(draft: OnboardingDraft): string | null {
  if (draft.step === 1 && !draft.name.trim()) return 'What should we call you?';
  if (draft.step === 2 && draft.brainDump.trim().length < 40)
    return 'Tell us a little more about what you want from this season. A few sentences gives the coach useful context.';
  if (
    draft.step === 3 &&
    draft.questions.length &&
    !draft.questions.every((q) => draft.answers.some((a) => a.questionId === q.id))
  )
    return 'Answer or explicitly skip each follow-up question.';
  if (draft.step === 4) {
    if (!draft.goals.length) return 'Add at least one seasonal goal.';
    if (
      draft.goals.some(
        (g) => !g.title.trim() || !g.why.trim() || !g.success.trim() || !g.firstAction.trim(),
      )
    )
      return 'Open each incomplete goal and add a reason, a finish line and a first action.';
    if (draft.goals.filter((g) => g.priority === 'core').length !== 1)
      return 'Choose exactly one core focus.';
    if (draft.goals.reduce((sum, g) => sum + g.weeklyMinutes, 0) > draft.weeklyCapacity)
      return 'Your goals need more time than you have available. Adjust the time budget before continuing.';
  }
  if (draft.step >= 5 && (!draft.commitment.trim() || !draft.signature.trim()))
    return 'Write your commitment and sign it to begin your season.';
  return null;
}
export function buildOnboardingPlan(
  state: State,
  input: OnboardingDraft,
  options: { now?: number; makeId?: () => string } = {},
): State {
  const draft = onboardingDraftSchema.parse(input);
  if (state.onboarding.acceptedProposalIds.includes(draft.revisionId)) return state;
  for (const step of [1, 2, 3, 4, 5]) {
    const error = validateOnboardingStep({ ...draft, step });
    if (error) throw new Error(error);
  }
  const makeId = options.makeId ?? uid,
    now = options.now ?? Date.now();
  const goals: Goal[] = draft.goals.map((g) => ({
    id: g.id,
    title: g.title.trim(),
    why: g.why.trim(),
    color: g.color,
    priority: g.priority === 'core' ? 'core' : 'secondary',
    weeklyMinutes: g.weeklyMinutes,
    milestones: g.milestones.some((m) => m.title === g.success.trim())
      ? g.milestones
      : [...g.milestones, { id: makeId(), title: g.success.trim(), done: false }],
  }));
  const tasks = draft.goals.map((g) => ({
    id: `first:${g.id}`,
    goalId: g.id,
    areaId: null,
    title: g.firstAction.trim(),
    duration: g.firstDuration,
    done: state.tasks.find((t) => t.id === `first:${g.id}`)?.done ?? false,
  }));
  const next: State = {
    ...state,
    settings: { ...state.settings, name: draft.name.trim() },
    season: {
      title: draft.seasonTitle.trim() || `${draft.name.trim()}’s season`,
      start: draft.start,
      end: addDays(draft.start, draft.lengthDays - 1),
    },
    goals: [...state.goals.filter((g) => !goals.some((x) => x.id === g.id)), ...goals],
    supportAreas: [
      ...state.supportAreas.filter((a) => !draft.proposedSupportAreas.some((x) => x.id === a.id)),
      ...draft.proposedSupportAreas,
    ],
    tasks: [...state.tasks.filter((t) => !tasks.some((x) => x.id === t.id)), ...tasks],
    onboarding: {
      ...state.onboarding,
      completedAt: now,
      draft: null,
      history: [...state.onboarding.history, draft],
      acceptedProposalIds: [...state.onboarding.acceptedProposalIds, draft.revisionId],
      commitments: [
        ...state.onboarding.commitments,
        {
          id: makeId(),
          text: draft.commitment.trim(),
          signature: draft.signature.trim(),
          signedAt: now,
          revision: (state.onboarding.commitments.at(-1)?.revision ?? 0) + 1,
        },
      ],
    },
  };
  const core = tasks.find((t) => draft.goals.find((g) => g.id === t.goalId)?.priority === 'core');
  if (draft.firstBlock && core) {
    if (draft.firstBlock.date < draft.start || draft.firstBlock.date > next.season.end)
      throw new Error('Choose a first focus date within your season.');
    const block = {
      id: `first-block:${core.goalId}`,
      taskId: core.id,
      goalId: core.goalId,
      areaId: null,
      title: core.title,
      date: draft.firstBlock.date,
      start: draft.firstBlock.start,
      duration: core.duration,
      done: false,
    };
    if (!canSchedule(next.blocks, block))
      throw new Error(
        'Your first focus block overlaps existing work or goes past midnight. Pick another time.',
      );
    next.blocks = [...next.blocks.filter((b) => b.id !== block.id), block];
  }
  return stateSchema.parse(next);
}
