import { z } from 'zod';
const id = z.string().min(1).max(100);
const text = z.string().trim().min(1).max(300);
export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T12:00:00`);
    return !Number.isNaN(d.valueOf()) && localDate(d) === s;
  }, 'Invalid date');
export const goalSchema = z.object({
  id,
  title: text,
  why: z.string().max(2000),
  color: z.enum(['blue', 'green', 'orange', 'violet']),
  priority: z.enum(['core', 'secondary', 'support']),
  weeklyMinutes: z.number().int().min(30).max(2400),
  milestones: z.array(z.object({ id, title: text, done: z.boolean() })).max(100),
});
export const taskSchema = z.object({
  id,
  goalId: id.nullable(),
  title: text,
  duration: z.number().int().min(5).max(480),
  done: z.boolean(),
});
export const blockSchema = z
  .object({
    id,
    taskId: id.nullable(),
    goalId: id.nullable(),
    title: text,
    date: dateKeySchema,
    start: z.number().int().min(0).max(1435),
    duration: z.number().int().min(5).max(480),
    done: z.boolean(),
  })
  .refine((b) => b.start + b.duration <= 1440, 'Block must end on the same day');
export const sessionSchema = z
  .object({
    id,
    goalId: id.nullable(),
    taskId: id.nullable(),
    title: text,
    startedAt: z.number().finite().nonnegative(),
    endedAt: z.number().finite().nonnegative(),
    minutes: z.number().min(0).max(480),
    quality: z.number().int().min(1).max(5),
  })
  .refine((s) => s.endedAt >= s.startedAt, 'Session ends before it starts');
export const timerSchema = z
  .object({
    id,
    goalId: id.nullable(),
    taskId: id.nullable(),
    title: text,
    startedAt: z.number().finite().nonnegative(),
    durationSeconds: z.number().int().min(300).max(28800),
    remainingSeconds: z.number().min(0).max(28800),
    runningSince: z.number().finite().nonnegative().nullable(),
  })
  .refine((t) => t.remainingSeconds <= t.durationSeconds, 'Timer remaining exceeds duration');
export const onboardingGoalSchema = goalSchema.extend({
  title: z.string().max(300),
  success: z.string().max(300),
  firstAction: z.string().max(300),
  firstDuration: z.number().int().min(5).max(240),
});
export const onboardingDraftSchema = z.object({
  step: z.number().int().min(0).max(6),
  name: z.string().max(60),
  seasonTitle: z.string().max(300),
  start: dateKeySchema,
  lengthDays: z.number().int().min(7).max(366),
  brainDump: z.string().max(6000),
  goals: z.array(onboardingGoalSchema).max(5),
  weeklyCapacity: z.number().int().min(30).max(2400),
  commitment: z.string().max(2000),
  signature: z.string().max(60),
  firstBlock: z
    .object({ date: dateKeySchema, start: z.number().int().min(0).max(1435) })
    .nullable(),
});
export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;
export type OnboardingGoal = z.infer<typeof onboardingGoalSchema>;
export const stateSchema = z
  .object({
    version: z.literal(1),
    onboarding: z
      .object({
        completedAt: z.number().finite().nonnegative().nullable(),
        draft: onboardingDraftSchema.nullable(),
      })
      .default({ completedAt: null, draft: null }),
    season: z
      .object({ title: text, start: dateKeySchema, end: dateKeySchema })
      .refine((s) => s.end >= s.start, 'Season must end after it starts'),
    goals: z.array(goalSchema).max(100),
    tasks: z.array(taskSchema).max(5000),
    blocks: z.array(blockSchema).max(10000),
    sessions: z.array(sessionSchema).max(20000),
    reflections: z
      .array(
        z.object({
          id,
          date: dateKeySchema,
          win: z.string().trim().min(1).max(4000),
          improve: z.string().max(4000),
          energy: z.number().int().min(1).max(5),
        }),
      )
      .max(5000),
    timer: timerSchema.nullable(),
    settings: z.object({
      name: z.string().max(60),
      theme: z.enum(['light', 'dark', 'system']),
      sound: z.boolean(),
      blockedDomains: z
        .array(
          z
            .string()
            .max(253)
            .regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/),
        )
        .max(50),
    }),
  })
  .superRefine((s, ctx) => {
    for (const key of ['goals', 'tasks', 'blocks', 'sessions', 'reflections'] as const)
      if (new Set(s[key].map((x) => x.id)).size !== s[key].length)
        ctx.addIssue({ code: 'custom', message: `Duplicate ${key} IDs` });
    const sorted = [...s.blocks].sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1],
        b = sorted[i];
      if (a.date === b.date && a.start + a.duration > b.start)
        ctx.addIssue({ code: 'custom', message: 'Calendar blocks overlap' });
    }
    const goals = new Set(s.goals.map((g) => g.id)),
      tasks = new Set(s.tasks.map((t) => t.id));
    for (const item of [...s.tasks, ...s.blocks, ...s.sessions, ...(s.timer ? [s.timer] : [])])
      if (item.goalId && !goals.has(item.goalId))
        ctx.addIssue({ code: 'custom', message: 'Unknown goal reference' });
    for (const item of [...s.blocks, ...s.sessions, ...(s.timer ? [s.timer] : [])])
      if (item.taskId && !tasks.has(item.taskId))
        ctx.addIssue({ code: 'custom', message: 'Unknown task reference' });
  });
export type Goal = z.infer<typeof goalSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Block = z.infer<typeof blockSchema>;
export type Timer = z.infer<typeof timerSchema>;
export type State = z.infer<typeof stateSchema>;
export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localDate(d);
}
export function monday(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return addDays(date, -((d.getDay() + 6) % 7));
}
export function uid(): string {
  return crypto.randomUUID();
}
export function clock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
export function hours(minutes: number): string {
  return minutes < 60
    ? `${Math.round(minutes)}m`
    : `${Math.floor(minutes / 60)}h${Math.round(minutes % 60) ? ` ${Math.round(minutes % 60)}m` : ''}`;
}
