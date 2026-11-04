import { afterEach, describe, expect, it, vi } from 'vitest';
import { coachingPlanSchema, coachingQuestionsSchema, type CoachingContext } from '../domain/coach';
import { GuidedCoach } from './guided-coach';
const context = (brainDump: string): CoachingContext => ({
  brainDump,
  seasonDays: 84,
  name: 'Avery',
  answers: [],
});
afterEach(() => vi.restoreAllMocks());
describe('explicit local guided coaching', () => {
  it('asks different follow-ups for business and health narratives without network requests', async () => {
    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('No network should be used'));
    const coach = new GuidedCoach();
    const business = await coach.questions(
      context('I want to launch a product, understand my customers and earn my first revenue.'),
    );
    const health = await coach.questions(
      context(
        'I want to run a five-kilometre race safely, exercise regularly and improve my sleep.',
      ),
    );
    expect(business.some((q) => q.id === 'build')).toBe(true);
    expect(business.some((q) => q.id === 'health')).toBe(false);
    expect(health.some((q) => q.id === 'health')).toBe(true);
    expect(health.some((q) => q.id === 'build')).toBe(false);
    expect(coachingQuestionsSchema.safeParse({ questions: business }).success).toBe(true);
    expect(coachingQuestionsSchema.safeParse({ questions: health }).success).toBe(true);
    expect(network).not.toHaveBeenCalled();
  });
  it('keeps four outcomes as core or secondary and builds maintenance areas separately', async () => {
    const input = context(
      'Launch a useful product\nFind a new role\nPublish helpful essays\nFinish a local race',
    );
    input.answers = [
      {
        questionId: 'north-star',
        prompt: 'What comes first?',
        answer: 'Find a new role would make the biggest difference.',
      },
      {
        questionId: 'support',
        prompt: 'What needs maintaining?',
        answer: 'Health, fitness, family relationships and home admin.',
      },
    ];
    const before = structuredClone(input),
      coach = new GuidedCoach(),
      result = await coach.plan(input);
    expect(result.goals).toHaveLength(4);
    expect(result.goals.filter((g) => g.priority === 'core')).toHaveLength(1);
    expect(result.goals.find((g) => g.priority === 'core')?.title).toBe('Find a new role');
    expect(result.goals.every((g) => ['core', 'secondary'].includes(g.priority))).toBe(true);
    expect(result.supportAreas.map((a) => a.title)).toEqual([
      'Health & Fitness',
      'Home & Relationships',
      'Life admin',
    ]);
    expect(coachingPlanSchema.safeParse(result).success).toBe(true);
    expect(input).toEqual(before);
  });
  it('adds career and creative questions only when the narrative supplies those concerns', async () => {
    const coach = new GuidedCoach();
    const result = await coach.questions(
      context(
        'I am preparing for interviews at companies and want a sustainable publishing rhythm on Twitter.',
      ),
    );
    expect(result.map((q) => q.id)).toEqual(
      expect.arrayContaining(['career', 'create', 'capacity', 'support']),
    );
    expect(new Set(result.map((q) => q.id)).size).toBe(result.length);
  });
  it('drafts a commitment grounded in the chosen core outcome and distinct support areas', async () => {
    const coach = new GuidedCoach(),
      input = context('Launch a useful product and learn what its first customers need.');
    input.answers = [
      {
        questionId: 'support',
        prompt: 'What needs maintaining?',
        answer: 'Health and relationships.',
      },
    ];
    const plan = await coach.plan(input),
      before = structuredClone(plan);
    const result = await coach.commitment(input, plan);
    expect(result).toContain('84 days');
    expect(result).toContain(plan.goals.find((g) => g.priority === 'core')!.title.toLowerCase());
    expect(result).toContain('health & fitness');
    expect(result).toContain('home & relationships');
    expect(plan).toEqual(before);
  });
});
