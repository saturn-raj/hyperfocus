import type { PlanningCoach } from '../application/coach-port';
import type { CoachingContext, CoachingPlan, CoachingQuestion } from '../domain/coach';
/** Explicit, local heuristics. This adapter never represents itself as a language model. */
export class GuidedCoach implements PlanningCoach {
  async questions(context: CoachingContext): Promise<CoachingQuestion[]> {
    const text = context.brainDump.toLowerCase();
    const questions: CoachingQuestion[] = [
      {
        id: 'north-star',
        prompt:
          'If only one thing moved forward this season, what would make the biggest difference to you?',
      },
    ];
    if (/customer|business|startup|launch|ship|product|build|revenue/.test(text))
      questions.push({
        id: 'build',
        prompt:
          'For the thing you want to build or grow, what concrete result would count as success? What is the biggest obstacle today?',
      });
    if (/interview|job|career|compan|role/.test(text))
      questions.push({
        id: 'career',
        prompt:
          'What kind of role or career change are you aiming for, and what would be a concrete sign of progress this season?',
      });
    if (/post|twitter|instagram|insta|youtube|content|video|write/.test(text))
      questions.push({
        id: 'create',
        prompt:
          'Which creative channel matters most, and what publishing rhythm can you keep on an ordinary busy week?',
      });
    if (/run|health|fitness|exercise|gym|sleep/.test(text))
      questions.push({
        id: 'health',
        prompt:
          'What would a sustainable health routine look like for you? Is this a seasonal achievement or something you want to keep maintaining?',
      });
    questions.push(
      {
        id: 'capacity',
        prompt:
          'How many hours a week can you realistically protect for these goals, and what commitments do we need to plan around?',
      },
      {
        id: 'support',
        prompt:
          'What needs maintaining while you pursue these goals? Think health, relationships, home, admin, and time to rest.',
      },
    );
    return questions.slice(0, 7);
  }
  async plan(context: CoachingContext): Promise<CoachingPlan> {
    const raw = context.brainDump.replace(/\r/g, '');
    const pieces = raw
      .split(
        /\n+|[.;](?:\s+|$)|\s+(?:and (?:I |i )?(?:want|need|plan|hope) to|also (?:I |i )?(?:want|need) to)\s+/,
      )
      .map((t) =>
        t
          .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '')
          .replace(/^(?:I (?:want|need|plan|hope|would like) to|I'd like to)\s+/i, '')
          .trim(),
      )
      .filter((t) => t.length >= 5);
    const maintenance = pieces.filter(
      (t) =>
        /maintain|keep|look after/i.test(t) &&
        /health|fitness|home|relationship|family|sleep/i.test(t) &&
        !/\d|marathon|race|finish|complete/i.test(t),
    );
    const outcomes = pieces.filter((t) => !maintenance.includes(t));
    const unique = [...new Set(outcomes)].slice(0, 5);
    if (!unique.length) unique.push(raw.trim());
    const first =
      context.answers.find((a) => a.questionId === 'north-star')?.answer.toLowerCase() ?? '';
    const candidate = unique.map((title, index) => ({
      title: title.slice(0, 300).replace(/^./, (x) => x.toUpperCase()),
      why:
        context.answers.find((a) => a.questionId === 'north-star')?.answer ||
        'This is an intention I chose for this season.',
      success: title.slice(0, 300),
      priority: 'secondary' as 'core' | 'secondary',
      weeklyMinutes: index === 0 ? 240 : 60,
      firstAction: `Define the first small step for: ${title}`.slice(0, 300),
      firstDuration: 30,
    }));
    const core = Math.max(
      0,
      candidate.findIndex((g) =>
        first.includes(g.title.toLowerCase().split(' ').slice(0, 3).join(' ')),
      ),
    );
    candidate[core].priority = 'core';
    const support = [
      context.answers.find((a) => a.questionId === 'support')?.answer ?? '',
      ...maintenance,
    ].join(' ');
    const areas = [];
    if (/health|fitness|sleep|exercise|gym|run/i.test(support))
      areas.push({
        title: 'Health & Fitness',
        description: 'Keep a sustainable routine alongside the work.',
      });
    if (/home|relationship|family|partner|friend/i.test(support))
      areas.push({
        title: 'Home & Relationships',
        description: 'Make room for the people and responsibilities that matter.',
      });
    if (/admin|finance|money|errand/i.test(support))
      areas.push({
        title: 'Life admin',
        description: 'Keep everyday responsibilities from becoming a backlog.',
      });
    return { goals: candidate, supportAreas: areas };
  }
  async commitment(context: CoachingContext, plan?: CoachingPlan): Promise<string> {
    const core = plan?.goals.find((g) => g.priority === 'core');
    return `For the next ${context.seasonDays} days, I’m choosing ${core?.title.toLowerCase() ?? 'a few goals that matter'}. I will take small, repeatable actions and protect time for the work. I will also make room for ${plan?.supportAreas.map((a) => a.title.toLowerCase()).join(', ') || 'health, relationships, and rest'}. I will measure progress honestly, adjust when life changes, and return to my intentions without expecting a perfect week.`;
  }
}
