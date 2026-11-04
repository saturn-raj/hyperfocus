import {
  coachingQuestionsSchema,
  coachingPlanSchema,
  coachingCommitmentSchema,
} from '../domain/coach';
import { applyCoachingPlan, coachingContext, draftAsPlan } from '../domain/onboarding';
import type { OnboardingDraft } from '../domain/model';
import type { PlanningCoach } from './coach-port';
/** Generate a proposal without mutating or accepting the user's workspace. */
export function createSeasonPlanner(coach: PlanningCoach) {
  return {
    async questions(draft: OnboardingDraft, signal?: AbortSignal): Promise<OnboardingDraft> {
      const result = coachingQuestionsSchema.parse({
        questions: await coach.questions(coachingContext(draft), signal),
      });
      return { ...draft, questions: result.questions, questionIndex: 0, step: 3 };
    },
    async proposal(draft: OnboardingDraft, signal?: AbortSignal): Promise<OnboardingDraft> {
      const result = coachingPlanSchema.parse(await coach.plan(coachingContext(draft), signal));
      return applyCoachingPlan(draft, result);
    },
    async commitment(draft: OnboardingDraft, signal?: AbortSignal): Promise<OnboardingDraft> {
      const plan = coachingPlanSchema.parse(draftAsPlan(draft));
      const result = coachingCommitmentSchema.parse({
        commitment: await coach.commitment(coachingContext(draft), plan, signal),
      });
      return { ...draft, commitment: result.commitment, step: 5 };
    },
  };
}
