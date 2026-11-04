import { z } from 'zod';

const identifier = z.string().trim().min(1).max(100);
const shortText = z.string().trim().min(1).max(300);
export const coachingContextSchema = z
  .object({
    brainDump: z.string().trim().min(1).max(12_000),
    seasonDays: z.number().int().min(7).max(366),
    name: z.string().trim().max(60),
    answers: z
      .array(
        z.object({
          questionId: identifier,
          prompt: z.string().trim().min(1).max(2000),
          answer: z.string().trim().min(1).max(6000),
        }),
      )
      .max(50),
  })
  .strict();
export const coachingQuestionSchema = z
  .object({
    id: identifier,
    prompt: z.string().trim().min(1).max(2000),
    options: z.array(shortText).min(2).max(8).optional(),
  })
  .strict();
export const coachingQuestionsSchema = z
  .object({
    questions: z.array(coachingQuestionSchema).min(1).max(12),
  })
  .strict()
  .superRefine((result, context) => {
    if (new Set(result.questions.map((question) => question.id)).size !== result.questions.length) {
      context.addIssue({ code: 'custom', message: 'Question IDs must be unique.' });
    }
  });
export const coachingPlanSchema = z
  .object({
    goals: z
      .array(
        z
          .object({
            title: shortText,
            why: z.string().trim().min(1).max(2000),
            success: shortText,
            priority: z.enum(['core', 'secondary']),
            weeklyMinutes: z.number().int().min(30).max(2400),
            firstAction: shortText,
            firstDuration: z.number().int().min(5).max(240),
          })
          .strict(),
      )
      .min(1)
      .max(10),
    supportAreas: z
      .array(
        z
          .object({
            title: shortText,
            description: z.string().trim().min(1).max(2000),
          })
          .strict(),
      )
      .max(20),
  })
  .strict()
  .superRefine((plan, context) => {
    if (plan.goals.filter((goal) => goal.priority === 'core').length !== 1) {
      context.addIssue({ code: 'custom', message: 'A plan must contain exactly one core goal.' });
    }
  });
export const coachingCommitmentSchema = z
  .object({
    commitment: z.string().trim().min(1).max(2000),
  })
  .strict();
export const coachingRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('questions'), context: coachingContextSchema }).strict(),
  z.object({ action: z.literal('plan'), context: coachingContextSchema }).strict(),
  z
    .object({
      action: z.literal('commitment'),
      context: coachingContextSchema,
      plan: coachingPlanSchema.optional(),
    })
    .strict(),
]);
export type CoachingContext = z.infer<typeof coachingContextSchema>;
export type CoachingQuestion = z.infer<typeof coachingQuestionSchema>;
export type CoachingPlan = z.infer<typeof coachingPlanSchema>;
export type CoachingRequest = z.infer<typeof coachingRequestSchema>;
export interface CoachingStatus {
  configured: boolean;
  provider: string | null;
}
