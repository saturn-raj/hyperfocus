import {
  coachingQuestionsSchema,
  coachingPlanSchema,
  coachingCommitmentSchema,
  type CoachingContext,
  type CoachingPlan,
  type CoachingRequest,
  type CoachingStatus,
} from '../domain/coach';
import type { PlanningCoach } from '../application/coach-port';
async function request(body: CoachingRequest, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch('/api/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(35000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      typeof error.error === 'string'
        ? error.error
        : 'The connected coach is unavailable. Your answers are saved.',
    );
  }
  return response.json();
}
export async function coachStatus(): Promise<CoachingStatus> {
  try {
    const response = await fetch('/api/coach/status', { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return { configured: false, provider: null };
    const data = await response.json();
    return {
      configured: data.configured === true,
      provider: typeof data.provider === 'string' ? data.provider : null,
    };
  } catch {
    return { configured: false, provider: null };
  }
}
export class ConnectedCoach implements PlanningCoach {
  async questions(context: CoachingContext, signal?: AbortSignal) {
    const result = coachingQuestionsSchema.safeParse(
      await request({ action: 'questions', context }, signal),
    );
    if (!result.success)
      throw new Error('The coach returned invalid questions. Your story is saved. Try again.');
    return result.data.questions;
  }
  async plan(context: CoachingContext, signal?: AbortSignal) {
    const result = (await request({ action: 'plan', context }, signal)) as { plan: unknown };
    const parsed = coachingPlanSchema.safeParse(result.plan);
    if (!parsed.success)
      throw new Error(
        'The coach returned an invalid plan. Your answers are saved. Try drafting your season again.',
      );
    return parsed.data;
  }
  async commitment(context: CoachingContext, plan?: CoachingPlan, signal?: AbortSignal) {
    const result = coachingCommitmentSchema.safeParse(
      await request({ action: 'commitment', context, plan }, signal),
    );
    if (!result.success)
      throw new Error('The coach returned an invalid commitment. Your plan is saved. Try again.');
    return result.data.commitment;
  }
}
