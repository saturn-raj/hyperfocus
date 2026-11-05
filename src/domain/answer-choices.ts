/** Small, explicit text rules for private guided mode. No model or network calls. */
export function narrativeIntentions(narrative: string): string[] {
  return narrative
    .replace(/\r/g, '')
    .split(
      /\n+|[.;](?:\s+|$)|\s+(?:and (?:I |i )?(?:want|need|plan|hope) to|also (?:I |i )?(?:want|need) to)\s+/,
    )
    .map((text) =>
      text
        .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '')
        .replace(/^(?:I (?:also )?(?:want|need|plan|hope|would like) to|I'd like to)\s+/i, '')
        .trim(),
    )
    .filter((text) => text.length >= 5);
}
function distinct(choices: string[]): string[] {
  return [
    ...new Set(choices.map((text) => text.slice(0, 220).replace(/^./, (c) => c.toUpperCase()))),
  ].slice(0, 6);
}
export function guidedAnswerChoices(questionId: string, narrative: string): string[] {
  switch (questionId) {
    case 'north-star': {
      const choices = distinct(narrativeIntentions(narrative));
      if (choices.length < 2)
        choices.push(
          'Build a sustainable routine around this goal',
          'Get clearer on the direction before committing',
        );
      return choices;
    }
    case 'build':
      return [
        'Land a first paying customer',
        'Ship a useful first version',
        'Grow consistent revenue',
        'Validate the idea with real users',
      ];
    case 'career':
      return [
        'Start interviews at target companies',
        'Reach final-round interviews',
        'Receive a suitable offer',
        'Improve my portfolio and interview readiness',
        'Choose a career direction before applying',
      ];
    case 'create': {
      const channels: string[] = [];
      if (/twitter|\bx\b/i.test(narrative)) channels.push('Post on Twitter daily');
      if (/insta|instagram/i.test(narrative)) channels.push('Publish an Instagram video daily');
      if (/youtube/i.test(narrative)) channels.push('Publish one YouTube video each week');
      return distinct([
        ...channels,
        'Publish something small each day',
        'Create two or three times a week',
        'Publish one thoughtful piece each week',
        'Build a repeatable routine before increasing output',
      ]);
    }
    case 'health':
      return [
        'Build a repeatable weekly routine',
        'Complete a specific milestone this season',
        'Maintain a routine that already works',
        'Start gently and build consistency',
      ];
    case 'capacity':
      return [2, 5, 10, 15, 20].map((hours) => `About ${hours} hours a week`);
    case 'support':
      return [
        'Health & fitness',
        'Home & relationships',
        'Life admin & finances',
        'Rest & recovery',
        'Learning & creativity',
      ];
    default:
      return [];
  }
}
