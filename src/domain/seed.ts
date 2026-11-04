import { addDays, localDate, monday, type State } from './model';
export function createState(demo = true): State {
  const today = localDate(),
    start = monday(today);
  return {
    version: 1,
    onboarding: {
      completedAt: demo ? Date.now() : null,
      draft: null,
      commitments: [],
      acceptedProposalIds: [],
      history: [],
    },
    supportAreas: demo
      ? [
          {
            id: 'area-health',
            title: 'Health & Fitness',
            description: 'Keep space for movement, recovery, and everyday health.',
            color: 'green',
          },
          {
            id: 'area-home',
            title: 'Home & Relationships',
            description: 'Look after home and make time for the people who matter.',
            color: 'violet',
          },
        ]
      : [],
    season: { title: 'A season of meaningful progress', start, end: addDays(start, 83) },
    goals: demo
      ? [
          {
            id: 'g1',
            title: 'Launch something I’m proud of',
            why: 'Turn a useful idea into something real. Make steady progress, one small release at a time.',
            color: 'blue',
            priority: 'core',
            weeklyMinutes: 480,
            milestones: [
              { id: 'm1', title: 'Define the problem and first release', done: true },
              { id: 'm2', title: 'Build and share the first version', done: false },
              { id: 'm3', title: 'Get feedback from five people', done: false },
            ],
          },
          {
            id: 'g2',
            title: 'Build a stronger, healthier me',
            why: 'Have more energy for the people and projects I care about.',
            color: 'green',
            priority: 'secondary',
            weeklyMinutes: 180,
            milestones: [{ id: 'm4', title: 'Find a routine I can sustain', done: false }],
          },
          {
            id: 'g3',
            title: 'Make space to learn',
            why: 'Stay curious. Read, reflect, and put a new idea into practice each week.',
            color: 'orange',
            priority: 'secondary',
            weeklyMinutes: 120,
            milestones: [],
          },
        ]
      : [],
    tasks: demo
      ? [
          {
            id: 't1',
            goalId: 'g1',
            title: 'Build the first working prototype',
            duration: 90,
            done: false,
          },
          {
            id: 't2',
            goalId: 'g1',
            title: 'Write down the core user journey',
            duration: 45,
            done: false,
          },
          { id: 't3', goalId: 'g2', title: 'Get outside for a run', duration: 45, done: false },
          {
            id: 't4',
            goalId: 'g3',
            title: 'Read a chapter, capture one idea',
            duration: 30,
            done: false,
          },
          {
            id: 't5',
            goalId: 'g1',
            title: 'Share an update and ask for feedback',
            duration: 30,
            done: false,
          },
        ]
      : [],
    blocks: demo
      ? [
          {
            id: 'b1',
            taskId: 't1',
            goalId: 'g1',
            title: 'Build the first working prototype',
            date: today,
            start: 9 * 60,
            duration: 90,
            done: false,
          },
          {
            id: 'b2',
            taskId: 't3',
            goalId: 'g2',
            title: 'Get outside for a run',
            date: today,
            start: 12 * 60 + 30,
            duration: 45,
            done: false,
          },
          {
            id: 'b3',
            taskId: 't4',
            goalId: 'g3',
            title: 'Read a chapter, capture one idea',
            date: today,
            start: 16 * 60,
            duration: 30,
            done: false,
          },
        ]
      : [],
    sessions: [],
    reflections: [],
    timer: null,
    settings: {
      name: '',
      theme: 'dark',
      sound: false,
      blockedDomains: ['youtube.com', 'reddit.com', 'x.com', 'instagram.com'],
    },
  };
}
