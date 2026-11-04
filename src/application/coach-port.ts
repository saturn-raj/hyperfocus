import type { CoachingContext, CoachingPlan, CoachingQuestion } from '../domain/coach';

/** Provider selection and credentials belong to the adapter, never to planning policy or UI. */
export interface PlanningCoach {
  questions(context: CoachingContext, signal?: AbortSignal): Promise<CoachingQuestion[]>;
  plan(context: CoachingContext, signal?: AbortSignal): Promise<CoachingPlan>;
  commitment(context: CoachingContext, plan?: CoachingPlan, signal?: AbortSignal): Promise<string>;
}
